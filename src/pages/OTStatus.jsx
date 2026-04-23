import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BedDouble,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  Clock,
  DoorOpen,
  ExternalLink,
  LocateFixed,
  Plus,
  RefreshCcw,
  Search,
  Stethoscope,
  TimerReset,
  UserRound,
  X,
} from 'lucide-react';
import { toast } from 'sonner';

// ─── Constants ────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'otCases_v4';

const STAGES = [
  { key: 'pre_ot',      label: 'OT Booked',      short: 'Booked',   icon: CalendarClock },
  { key: 'arrived',     label: 'Arrived at OT',  short: 'Arrived',  icon: UserRound     },
  { key: 'in_progress', label: 'In Surgery',     short: 'Surgery',  icon: Activity      },
  { key: 'recovery',    label: 'Recovery',       short: 'Recovery', icon: DoorOpen      },
  { key: 'discharged',  label: 'Shifted to Bed', short: 'Shifted',  icon: BedDouble     },
];

const STAGE_INDEX = Object.fromEntries(STAGES.map((s, i) => [s.key, i]));
const NEXT_STAGE  = { pre_ot: 'arrived', arrived: 'in_progress', in_progress: 'recovery', recovery: 'discharged' };

const STAGE_CLASSES = {
  pre_ot:      'bg-slate-100 text-slate-700 border-slate-200',
  arrived:     'bg-blue-100 text-blue-700 border-blue-200',
  in_progress: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  recovery:    'bg-amber-100 text-amber-800 border-amber-200',
  discharged:  'bg-violet-100 text-violet-700 border-violet-200',
};

const STAGE_LEFT_BORDER = {
  pre_ot:      'border-l-slate-400',
  arrived:     'border-l-blue-400',
  in_progress: 'border-l-emerald-500',
  recovery:    'border-l-amber-500',
  discharged:  'border-l-violet-400',
};

const STAGE_DOT_BG = {
  pre_ot:      'bg-slate-400',
  arrived:     'bg-blue-500',
  in_progress: 'bg-emerald-500',
  recovery:    'bg-amber-500',
  discharged:  'bg-violet-500',
};

// ─── Sample data ──────────────────────────────────────────────────────────────

const ago = (m) => { const d = new Date(); d.setMinutes(d.getMinutes() - m); return d.toISOString(); };

const sampleCases = [
  {
    id: 'ot_1', ot_room: 'OT-1', patient_name: 'Rohit Sharma', patient_id: 'PT-2041',
    procedure: 'Laparoscopic Cholecystectomy', surgeon: 'Dr. Meera Nair',
    anesthetist: 'Dr. Kiran Rao', nurse_incharge: 'Nurse Asha',
    estimated_duration_min: 90, stage: 'in_progress', destination: 'Ward 4',
    patient_tag_id: 'PT-TAG-2041', notes: 'Case started on time',
    stage_timestamps: { pre_ot: ago(185), arrived: ago(155), in_progress: ago(72) },
  },
  {
    id: 'ot_2', ot_room: 'OT-2', patient_name: 'Farah Khan', patient_id: 'PT-2103',
    procedure: 'Total Knee Replacement', surgeon: 'Dr. Vivek Iyer',
    anesthetist: 'Dr. S. Thomas', nurse_incharge: 'Nurse Deepa',
    estimated_duration_min: 150, stage: 'arrived', destination: 'Recovery Bay 2',
    patient_tag_id: 'PT-TAG-2103', notes: 'Awaiting room prep completion',
    stage_timestamps: { pre_ot: ago(180), arrived: ago(38) },
  },
  {
    id: 'ot_3', ot_room: 'OT-3', patient_name: 'Mahesh R.', patient_id: 'PT-1998',
    procedure: 'Coronary Angioplasty', surgeon: 'Dr. Aditya Sen',
    anesthetist: 'Dr. Sneha G.', nurse_incharge: 'Nurse Priya',
    estimated_duration_min: 75, stage: 'recovery', destination: 'ICU',
    patient_tag_id: 'PT-TAG-1998', notes: 'Stable vitals, monitoring closely',
    stage_timestamps: { pre_ot: ago(240), arrived: ago(225), in_progress: ago(190), recovery: ago(48) },
  },
  {
    id: 'ot_4', ot_room: 'OT-4', patient_name: 'Lakshmi Devi', patient_id: 'PT-2210',
    procedure: 'Emergency C-Section', surgeon: 'Dr. Ananya Bose',
    anesthetist: 'Dr. Harish M.', nurse_incharge: 'Nurse Veena',
    estimated_duration_min: 60, stage: 'pre_ot', destination: 'Maternity Ward',
    patient_tag_id: 'PT-TAG-2210', notes: 'Emergency — prioritise room prep',
    stage_timestamps: { pre_ot: ago(42) },
  },
  {
    id: 'ot_5', ot_room: 'OT-5', patient_name: 'Arun K.', patient_id: 'PT-1756',
    procedure: 'Appendectomy', surgeon: 'Dr. Joseph Paul',
    anesthetist: 'Dr. S. Ahmed', nurse_incharge: 'Nurse Kavya',
    estimated_duration_min: 60, stage: 'discharged', destination: 'Ward 2',
    patient_tag_id: 'PT-TAG-1756', notes: 'Completed — smooth recovery',
    stage_timestamps: { pre_ot: ago(360), arrived: ago(340), in_progress: ago(305), recovery: ago(235), discharged: ago(200) },
  },
];

const EMPTY_CASE = {
  id: '', ot_room: '', patient_name: '', patient_id: '', procedure: '',
  surgeon: '', anesthetist: '', nurse_incharge: '', estimated_duration_min: 90,
  stage: 'pre_ot', destination: '', patient_tag_id: '', notes: '',
  stage_timestamps: {},
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtTime = (iso) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const minutesSince = (iso) => {
  if (!iso) return null;
  return Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
};

const durLabel = (fromIso, toIso = null) => {
  if (!fromIso) return null;
  const m = Math.max(0, Math.round(((toIso ? new Date(toIso) : new Date()) - new Date(fromIso)) / 60000));
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60), r = m % 60;
  return r === 0 ? `${h}h` : `${h}h ${r}m`;
};

const getAlert = (item) => {
  const ts = item.stage_timestamps || {};
  if (item.stage === 'in_progress' && minutesSince(ts.in_progress) > item.estimated_duration_min)
    return { label: 'Overrun', tone: 'danger' };
  if (item.stage === 'arrived' && minutesSince(ts.arrived) > 30)
    return { label: 'Waiting', tone: 'warning' };
  if (item.stage === 'recovery' && minutesSince(ts.recovery) > 45)
    return { label: 'Recovery delay', tone: 'warning' };
  return null;
};

const alertClasses = {
  danger:  'bg-rose-100 text-rose-700 border-rose-200',
  warning: 'bg-amber-100 text-amber-800 border-amber-200',
};

// ─── Stage Stepper ─────────────────────────────────────────────────────────

const StageStepper = ({ stage, timestamps }) => {
  const currentIdx = STAGE_INDEX[stage] ?? 0;
  return (
    <div className="flex items-start mt-2.5 gap-0">
      {STAGES.map((s, i) => {
        const done = i < currentIdx;
        const cur  = i === currentIdx;
        const ts   = timestamps?.[s.key];
        return (
          <React.Fragment key={s.key}>
            <div className="flex flex-col items-center" style={{ minWidth: 44 }}>
              <div
                className={`w-4 h-4 rounded-full border flex items-center justify-center text-xs
                  ${done ? 'bg-emerald-500 border-emerald-500 text-white'
                          : cur  ? `${STAGE_DOT_BG[stage]} border-transparent text-white`
                                 : 'bg-white border-slate-300'}`}
              >
                {done && <CheckCircle2 className="h-2.5 w-2.5" />}
                {cur  && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
              </div>
              <div className={`mt-1 text-center leading-tight ${cur ? 'text-slate-800' : done ? 'text-slate-500' : 'text-slate-400'}`}
                style={{ fontSize: 9, fontWeight: cur ? 600 : 400, width: 44 }}>
                {s.short}
              </div>
              {ts && (
                <div className="text-slate-400 text-center" style={{ fontSize: 8 }}>
                  {fmtTime(ts)}
                </div>
              )}
            </div>
            {i < STAGES.length - 1 && (
              <div className={`flex-1 h-px mt-2 min-w-[4px] ${i < currentIdx ? 'bg-emerald-400' : 'bg-slate-200'}`} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};

// ─── Journey Timeline ───────────────────────────────────────────────────────

const JourneyTimeline = ({ item }) => {
  const currentIdx = STAGE_INDEX[item.stage] ?? 0;
  const ts = item.stage_timestamps || {};

  return (
    <div className="space-y-0">
      {STAGES.map((s, i) => {
        const done = i < currentIdx;
        const cur  = i === currentIdx;
        const future = i > currentIdx;
        const startTs = ts[s.key];
        const endTs   = ts[STAGES[i + 1]?.key];
        const elapsed = done ? durLabel(startTs, endTs) : cur ? durLabel(startTs) : null;
        const overrun = cur && s.key === 'in_progress' && minutesSince(startTs) > item.estimated_duration_min;

        return (
          <div key={s.key} className="flex gap-3">
            <div className="flex flex-col items-center" style={{ width: 20 }}>
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0
                ${done   ? 'bg-emerald-500 border-emerald-500 text-white'
                         : cur    ? `${STAGE_DOT_BG[item.stage]} border-transparent text-white`
                                  : 'bg-white border-slate-200'}`}>
                {done && <CheckCircle2 className="h-3 w-3" />}
                {cur  && <div className="w-2 h-2 rounded-full bg-white" />}
              </div>
              {i < STAGES.length - 1 && (
                <div className={`w-px flex-1 my-0.5 min-h-[16px] ${done ? 'bg-emerald-300' : 'bg-slate-150 border-l border-dashed border-slate-200'}`} />
              )}
            </div>
            <div className={`flex-1 pb-3 ${i === STAGES.length - 1 ? 'pb-0' : ''}`}>
              <div className="flex items-center justify-between gap-2">
                <span className={`text-sm font-medium ${future ? 'text-slate-400' : 'text-slate-800'}`}>
                  {s.label}
                </span>
                {elapsed && (
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full border
                    ${overrun
                      ? 'bg-rose-100 text-rose-700 border-rose-200'
                      : cur
                        ? `${STAGE_CLASSES[item.stage]}`
                        : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
                    {elapsed}{cur && ' ▲'}
                  </span>
                )}
              </div>
              <div className="text-xs text-slate-400 mt-0.5">{startTs ? fmtTime(startTs) : '—'}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

// ─── Add / Edit Modal ─────────────────────────────────────────────────────────

const OTCaseModal = ({ open, onClose, form, setForm, onSave, creating }) => {
  if (!open) return null;
  const stageLabel = STAGES.find((s) => s.key === form.stage)?.label || form.stage;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-slate-200 bg-white px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              {creating ? 'Add OT case' : 'Edit OT case'}
            </h2>
            <p className="mt-0.5 text-sm text-slate-500">Fill patient and scheduling details.</p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="space-y-4 px-6 py-5">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 flex items-center justify-between gap-4">
            <div>
              <div className="font-semibold text-slate-900">{form.ot_room || 'OT Room'}</div>
              <div className="text-sm text-slate-500">{form.patient_name || 'Patient not set'}</div>
            </div>
            <Badge className={`border ${STAGE_CLASSES[form.stage]}`}>{stageLabel}</Badge>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {[
              ['OT room',            'ot_room',            'text'],
              ['Patient ID',         'patient_id',         'text'],
              ['Patient name',       'patient_name',       'text'],
              ['Procedure',          'procedure',          'text', true],
              ['Surgeon',            'surgeon',            'text'],
              ['Anesthetist',        'anesthetist',        'text'],
              ['Nurse in-charge',    'nurse_incharge',     'text'],
              ['Patient tag ID',     'patient_tag_id',     'text'],
              ['Estimated duration (min)', 'estimated_duration_min', 'number'],
              ['Shift destination',  'destination',        'text'],
            ].map(([lbl, key, type, wide]) => (
              <div key={key} className={`space-y-1.5${wide ? ' md:col-span-2' : ''}`}>
                <label className="text-sm font-medium text-slate-700">{lbl}</label>
                <Input
                  type={type}
                  value={form[key]}
                  onChange={(e) => setForm((p) => ({ ...p, [key]: type === 'number' ? Number(e.target.value || 0) : e.target.value }))}
                />
              </div>
            ))}

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Stage</label>
              <Select value={form.stage} onValueChange={(v) => setForm((p) => ({ ...p, stage: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STAGES.map((s) => <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <label className="text-sm font-medium text-slate-700">Notes</label>
              <Input value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} />
            </div>
          </div>
        </div>

        <div className="sticky bottom-0 flex justify-end gap-2 border-t border-slate-200 bg-white px-6 py-4">
          <Button variant="outline" onClick={onClose} className="gap-2">
            <TimerReset className="h-4 w-4" /> Cancel
          </Button>
          <Button onClick={onSave} className="gap-2">
            <Plus className="h-4 w-4" /> {creating ? 'Create case' : 'Save changes'}
          </Button>
        </div>
      </div>
    </div>
  );
};

// ─── Stat card ────────────────────────────────────────────────────────────────

const StatCard = ({ title, value, tone = 'default' }) => {
  const bg = { default: '', danger: 'bg-rose-50', warning: 'bg-amber-50', success: 'bg-emerald-50', info: 'bg-blue-50' }[tone];
  const val = { default: 'text-slate-900', danger: 'text-rose-700', warning: 'text-amber-800', success: 'text-emerald-700', info: 'text-blue-700' }[tone];
  return (
    <Card className={`${bg} border border-slate-200 shadow-sm`}>
      <CardContent className="p-3 text-center">
        <p className={`text-xl font-bold ${val}`}>{value}</p>
        <p className="text-[10px] uppercase font-bold text-slate-500 mt-1">{title}</p>
      </CardContent>
    </Card>
  );
};

// ─── Main component ───────────────────────────────────────────────────────────

const OTStatus = () => {
  const navigate = useNavigate();
  const [cases, setCases]         = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [stageFilter, setStageFilter] = useState('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [creating, setCreating]   = useState(false);
  const [form, setForm]           = useState(EMPTY_CASE);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Load
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      const parsed = saved ? JSON.parse(saved) : null;
      setCases(Array.isArray(parsed) ? parsed : sampleCases);
    } catch {
      setCases(sampleCases);
    }
  }, []);

  useEffect(() => {
    const id = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(id);
  }, []);

  const persist = (next) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    setCases(next);
  };

  // Filtering
  const filteredCases = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return cases
      .filter((c) => {
        const ms = !q || [c.ot_room, c.patient_name, c.patient_id, c.procedure, c.surgeon]
          .some((v) => (v || '').toLowerCase().includes(q));
        return ms && (stageFilter === 'all' || c.stage === stageFilter);
      })
      .sort((a, b) => {
        const af = getAlert(a) ? 0 : 1, bf = getAlert(b) ? 0 : 1;
        if (af !== bf) return af - bf;
        const order = { in_progress: 0, recovery: 1, arrived: 2, pre_ot: 3, discharged: 4 };
        return (order[a.stage] ?? 5) - (order[b.stage] ?? 5);
      });
  }, [cases, searchQuery, stageFilter]);

  // Auto-select first
  useEffect(() => {
    if (modalOpen) return;
    if (!filteredCases.length) { setSelectedId(''); return; }
    if (!filteredCases.find((c) => c.id === selectedId)) setSelectedId(filteredCases[0].id);
  }, [filteredCases, selectedId, modalOpen]);

  const selectedCase = useMemo(() => filteredCases.find((c) => c.id === selectedId) || null, [filteredCases, selectedId]);

  // Stats
  const stats = useMemo(() => ({
    total:      cases.length,
    booked:     cases.filter((c) => c.stage === 'pre_ot').length,
    arrived:    cases.filter((c) => c.stage === 'arrived').length,
    inProgress: cases.filter((c) => c.stage === 'in_progress').length,
    recovery:   cases.filter((c) => c.stage === 'recovery').length,
    flagged:    cases.filter((c) => getAlert(c)).length,
  }), [cases]);

  // 20 Theatre Grid Logic
  const otRooms = Array.from({ length: 20 }, (_, i) => {
    const roomName = `OT-${i + 1}`;
    // Find active patient in this room (not discharged)
    const patientInRoom = cases.find(c => c.ot_room === roomName && c.stage !== 'discharged');
    return { name: roomName, patient: patientInRoom };
  });

  // Action Handlers
  const handleRoomClick = (room) => {
    if (room.patient) {
      // Select existing patient
      setSelectedId(room.patient.id);
    } else {
      // Create new case pre-filled with this room
      setCreating(true);
      setForm({ ...EMPTY_CASE, ot_room: room.name, stage_timestamps: { pre_ot: new Date().toISOString() } });
      setModalOpen(true);
    }
  };

  const moveStage = (nextStage) => {
    if (!selectedCase) return;
    const next = cases.map((c) =>
      c.id !== selectedCase.id ? c : {
        ...c,
        stage: nextStage,
        stage_timestamps: { ...(c.stage_timestamps || {}), [nextStage]: new Date().toISOString() },
      }
    );
    persist(next);
    toast.success(`Moved to ${STAGES.find((s) => s.key === nextStage)?.label}`);
  };

  const openCreate = () => {
    setCreating(true);
    setForm({ ...EMPTY_CASE, stage_timestamps: { pre_ot: new Date().toISOString() } });
    setModalOpen(true);
  };
  const openEdit = () => {
    if (!selectedCase) return;
    setCreating(false);
    setForm(selectedCase);
    setModalOpen(true);
  };
  const closeModal = () => { setModalOpen(false); setForm(EMPTY_CASE); };
  const saveCase = () => {
    if (!form.ot_room || !form.patient_name || !form.patient_id || !form.procedure || !form.surgeon) {
      toast.error('Please fill OT room, patient, procedure, and surgeon.');
      return;
    }
    const payload = { ...form, id: creating ? `ot_${Date.now()}` : form.id };
    const next = creating ? [payload, ...cases] : cases.map((c) => c.id === payload.id ? payload : c);
    persist(next);
    setSelectedId(payload.id);
    closeModal();
    toast.success(creating ? 'OT case created' : 'OT case updated');
  };
  const deleteCase = () => {
    if (!selectedCase) return;
    persist(cases.filter((c) => c.id !== selectedCase.id));
    setSelectedId('');
    toast.success('OT case removed');
  };

  const nextStageKey = selectedCase ? NEXT_STAGE[selectedCase.stage] : null;
  const nextStage    = nextStageKey ? STAGES.find((s) => s.key === nextStageKey) : null;
  const selAlert     = selectedCase ? getAlert(selectedCase) : null;

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-white">
      <OTCaseModal
        open={modalOpen} onClose={closeModal}
        form={form} setForm={setForm}
        onSave={saveCase} creating={creating}
      />

      {/* ── Header Area ──────────────────────────────────────────── */}
      <div className="flex-none border-b border-slate-200 bg-white px-5 py-4 space-y-4 z-10 shadow-sm relative">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">OT Patient Status</h1>
            <p className="text-sm text-slate-500 font-medium">End-to-end OR visibility · 20 Operating Theatres · Real-time flow</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge className="border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm">
              <Clock className="mr-2 h-4 w-4 text-blue-500" />
              {currentTime.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </Badge>
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setCases([...cases])}>
              <RefreshCcw className="h-4 w-4" /> Refresh
            </Button>
            <Button size="sm" className="gap-1.5 bg-blue-600 hover:bg-blue-700 text-white" onClick={openCreate}>
              <Plus className="h-4 w-4" /> Add case
            </Button>
          </div>
        </div>

        {/* Stats & Grid Row */}
        <div className="flex flex-col xl:flex-row gap-4">
          
          {/* Stats */}
          <div className="grid grid-cols-3 md:grid-cols-6 gap-2 xl:w-1/3 shrink-0">
            <StatCard title="Active cases"   value={stats.total}      />
            <StatCard title="OT Booked"      value={stats.booked}     />
            <StatCard title="Arrived at OT"  value={stats.arrived}    tone="info"    />
            <StatCard title="In surgery"     value={stats.inProgress} tone="success" />
            <StatCard title="Recovery"       value={stats.recovery}   tone="warning" />
            <StatCard title="Attention"      value={stats.flagged}   tone="danger"  />
          </div>

          {/* 20 Theatre Interactive Grid */}
          <div className="flex-1 bg-slate-50 border border-slate-200 rounded-xl p-3">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">OT Room Overview (Click to Manage)</h2>
            </div>
            <div className="grid grid-cols-10 gap-1.5">
              {otRooms.map(room => {
                const isSelected = selectedCase?.ot_room === room.name && room.patient;
                const stageInfo = room.patient ? STAGE_CLASSES[room.patient.stage] : 'bg-white border-slate-200 text-slate-400 border-dashed';
                const highlight = isSelected ? 'ring-2 ring-blue-500 ring-offset-1 border-transparent' : 'hover:border-blue-400';
                
                return (
                  <button 
                    key={room.name} 
                    onClick={() => handleRoomClick(room)}
                    className={`flex flex-col items-center justify-center py-1.5 px-1 rounded border shadow-sm transition-all duration-200 ${stageInfo.split(' ')[0]} ${stageInfo.split(' ')[1]} ${stageInfo.split(' ')[2]} ${highlight}`}
                  >
                    <span className="text-[9px] font-bold">{room.name}</span>
                    <span className="text-[10px] font-semibold truncate w-full text-center mt-0.5">
                      {room.patient ? room.patient.patient_name.split(' ')[0] : '+ Add'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

        </div>
      </div>

      {/* ── Body: list + detail ───────────────────────────── */}
      <div className="flex flex-1 overflow-hidden bg-slate-100/50">

        {/* LEFT: patient list */}
        <div className="flex flex-col w-[420px] flex-shrink-0 border-r border-slate-200 bg-white">
          {/* Search / filter bar */}
          <div className="flex-none px-4 py-3 border-b border-slate-100 space-y-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search patient, procedure, surgeon…"
                className="pl-9 bg-slate-50"
              />
            </div>
            <div className="flex items-center gap-2">
              <Select value={stageFilter} onValueChange={setStageFilter}>
                <SelectTrigger className="h-9 text-sm flex-1 bg-slate-50">
                  <SelectValue placeholder="All stages" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All stages</SelectItem>
                  {STAGES.map((s) => <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <div className="text-xs font-semibold text-slate-500 px-3 py-2 rounded-md border border-slate-200 bg-slate-50 whitespace-nowrap">
                {filteredCases.length} / {cases.length}
              </div>
            </div>
          </div>

          {/* Scrollable list */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {filteredCases.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500 mt-4">
                No cases match your filters
              </div>
            ) : (
              filteredCases.map((item) => {
                const sel   = item.id === selectedId;
                const al    = getAlert(item);
                const sc    = STAGE_CLASSES[item.stage];
                const lb    = STAGE_LEFT_BORDER[item.stage];
                const ts    = item.stage_timestamps || {};
                const isOR  = item.stage === 'in_progress';
                const orMin = isOR ? minutesSince(ts.in_progress) : null;
                const pct   = isOR ? Math.min(100, Math.round(((orMin || 0) / item.estimated_duration_min) * 100)) : null;
                const over  = isOR && orMin > item.estimated_duration_min;

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelectedId(item.id)}
                    className={`w-full text-left rounded-xl border-l-4 p-3.5 transition-all
                      ${lb}
                      ${sel
                        ? 'border border-blue-300 bg-blue-50/50 shadow-md ring-1 ring-blue-500/10'
                        : 'border border-slate-200 bg-white shadow-sm hover:border-slate-300'}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-slate-900 text-sm">{item.ot_room}</span>
                          <span className="text-slate-300">·</span>
                          <span className="text-xs text-slate-500 font-mono font-medium">{item.patient_id}</span>
                        </div>
                        <div className="text-base font-bold text-slate-900 mt-0.5">{item.patient_name}</div>
                        <div className="text-xs text-slate-500 mt-0.5 truncate font-medium">{item.procedure}</div>
                      </div>
                      <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                        <Badge className={`border text-[10px] font-bold uppercase tracking-wide ${sc}`}>{STAGES.find(s => s.key === item.stage)?.short}</Badge>
                        {al && <Badge className={`border text-[10px] font-bold uppercase tracking-wide ${alertClasses[al.tone]}`}>{al.label}</Badge>}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 mt-2.5 text-xs text-slate-500 font-medium">
                      <span>{item.surgeon}</span>
                      <span>·</span>
                      <span>Est. {item.estimated_duration_min} min</span>
                      {isOR && (
                        <>
                          <span>·</span>
                          <span className={over ? 'text-rose-600 font-bold' : 'text-emerald-600 font-bold'}>
                            {durLabel(ts.in_progress)} elapsed{over ? ' ⚠' : ''}
                          </span>
                        </>
                      )}
                    </div>

                    {pct !== null && (
                      <div className="mt-3 h-1.5 rounded-full bg-slate-200 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${over ? 'bg-rose-500' : 'bg-emerald-500'}`}
                          style={{ width: `${pct}%`, transition: 'width 0.5s' }}
                        />
                      </div>
                    )}

                    <StageStepper stage={item.stage} timestamps={ts} />
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT: detail panel */}
        <div className="flex-1 overflow-y-auto">
          {!selectedCase ? (
            <div className="flex items-center justify-center h-full text-sm text-slate-400 font-medium">
              Select a patient case to view details
            </div>
          ) : (
            <div className="p-6 space-y-6 max-w-4xl mx-auto">
              {/* Case header */}
              <div className={`rounded-2xl border p-5 shadow-sm
                ${selAlert?.tone === 'danger' ? 'border-rose-200 bg-rose-50'
                 : selAlert?.tone === 'warning' ? 'border-amber-200 bg-amber-50'
                 : 'border-slate-200 bg-white'}`}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-3">
                      <span className="text-2xl font-bold text-slate-900">{selectedCase.patient_name}</span>
                      <span className="font-mono text-sm font-semibold bg-white border border-slate-200 px-2 py-0.5 rounded text-slate-500">{selectedCase.patient_id}</span>
                    </div>
                    <div className="text-base font-medium text-slate-700 mt-1">{selectedCase.procedure}</div>
                    <div className="text-sm font-semibold text-slate-500 mt-1.5 flex items-center gap-2">
                      <span className="text-slate-800">{selectedCase.ot_room}</span> 
                      <span>·</span> 
                      <span>Est. {selectedCase.estimated_duration_min} min</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <Badge className={`border px-3 py-1 text-sm font-bold ${STAGE_CLASSES[selectedCase.stage]}`}>
                      {STAGES.find(s => s.key === selectedCase.stage)?.label}
                    </Badge>
                    {selAlert && (
                      <Badge className={`border px-3 py-1 font-bold ${alertClasses[selAlert.tone]}`}>⚠ {selAlert.label}</Badge>
                    )}
                    <Button variant="outline" size="sm" onClick={openEdit} className="text-xs font-semibold mt-1">Edit Case</Button>
                  </div>
                </div>
                {selectedCase.notes && (
                  <div className="mt-4 rounded-lg bg-white border border-slate-100 px-4 py-3 text-sm text-slate-600 font-medium shadow-sm flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 text-slate-400 mt-0.5 shrink-0" />
                    {selectedCase.notes}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Journey timeline */}
                <Card className="border border-slate-200 shadow-sm bg-white">
                  <CardHeader className="pb-3 pt-4 px-5 border-b border-slate-100">
                    <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-500">Patient Journey</CardTitle>
                  </CardHeader>
                  <CardContent className="px-5 pt-4 pb-5">
                    <JourneyTimeline item={selectedCase} />
                  </CardContent>
                </Card>

                {/* Care team + actions */}
                <div className="space-y-6">
                  <Card className="border border-slate-200 shadow-sm bg-white">
                    <CardHeader className="pb-3 pt-4 px-5 border-b border-slate-100">
                      <div className="flex items-center gap-2">
                        <Stethoscope className="h-4 w-4 text-slate-400" />
                        <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-500">Care Team</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent className="px-5 pt-4 pb-5">
                      <dl className="space-y-3 text-sm">
                        {[
                          ['Surgeon',        selectedCase.surgeon],
                          ['Anesthetist',    selectedCase.anesthetist],
                          ['Nurse I/C',      selectedCase.nurse_incharge],
                          ['Destination',    selectedCase.destination],
                          ['Patient tag',    selectedCase.patient_tag_id],
                        ].map(([l, v]) => (
                          <div key={l} className="flex justify-between items-center gap-4 bg-slate-50 px-3 py-2 rounded-lg border border-slate-100">
                            <dt className="text-slate-500 text-xs font-bold uppercase tracking-wide">{l}</dt>
                            <dd className="font-semibold text-slate-900 text-sm text-right truncate">{v || '—'}</dd>
                          </div>
                        ))}
                      </dl>
                    </CardContent>
                  </Card>

                  <Card className="border border-slate-200 shadow-sm bg-white">
                    <CardHeader className="pb-3 pt-4 px-5 border-b border-slate-100">
                      <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-500">Actions</CardTitle>
                    </CardHeader>
                    <CardContent className="px-5 pt-4 pb-5 space-y-3">
                      {nextStage && (
                        <Button
                          className="w-full justify-between gap-2 text-sm bg-blue-600 hover:bg-blue-700 text-white font-semibold py-5"
                          onClick={() => moveStage(nextStageKey)}
                        >
                          <span className="flex items-center gap-2">
                            <ArrowRight className="h-4 w-4" />
                            Advance to {nextStage.label}
                          </span>
                          <ChevronRight className="h-4 w-4 opacity-60" />
                        </Button>
                      )}
                      <div className="grid grid-cols-2 gap-3">
                        <Button variant="outline" size="sm" className="justify-start gap-2 text-xs font-semibold py-4"
                          onClick={() => {
                            if (!selectedCase.patient_tag_id) { toast.info('No patient tag assigned.'); return; }
                            navigate(`/rtls?device_id=${encodeURIComponent(selectedCase.patient_tag_id)}`);
                          }}>
                          <LocateFixed className="h-4 w-4 text-slate-400" /> Locate Patient
                        </Button>
                        <Button variant="outline" size="sm" className="justify-start gap-2 text-xs font-semibold py-4"
                          onClick={() => navigate('/patient-tags')}>
                          <ExternalLink className="h-4 w-4 text-slate-400" /> Patient Tags
                        </Button>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full justify-center gap-2 text-xs font-semibold text-rose-600 border-rose-200 hover:bg-rose-50 py-4 mt-2"
                        onClick={deleteCase}
                      >
                        <AlertTriangle className="h-4 w-4" /> Remove Case
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OTStatus;