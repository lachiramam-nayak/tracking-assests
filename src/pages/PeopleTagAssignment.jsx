import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import {
  Search,
  UserPlus,
  Unlink,
  Link2,
  RefreshCcw,
  Wifi,
  User,
  Users,
  Shield,
  Bed,
  Activity,
  Clock3,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  X,
} from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000';
const WS_URL = BACKEND_URL.replace(/^http/, 'ws');

const PEOPLE_STORAGE_KEY = 'peopleTagAssignments';
const LEGACY_PATIENT_STORAGE_KEY = 'patientTagAssignments';

const EMPTY_FORM = {
  entity_type: 'patient',
  device_id: '',
  name: '',
  person_id: '',
  ward: '',
  bed: '',
  doctor: '',
  role: '',
  department: '',
  shift: '',
  shift_status: 'on_duty',
  visiting_patient: '',
  allowed_zone: '',
  entry_time: '',
  visit_status: 'in_visit',
};

const entityMeta = {
  patient: {
    label: 'Patient',
    icon: Bed,
    accent: 'bg-blue-100 text-blue-700 border-blue-200',
  },
  staff: {
    label: 'Staff',
    icon: Users,
    accent: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  },
  visitor: {
    label: 'Visitor',
    icon: Shield,
    accent: 'bg-amber-100 text-amber-800 border-amber-200',
  },
};

const statusBadgeClasses = {
  active: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  inactive: 'bg-slate-100 text-slate-700 border-slate-200',
  discharged: 'bg-slate-100 text-slate-700 border-slate-200',
  on_duty: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  busy: 'bg-blue-100 text-blue-700 border-blue-200',
  break: 'bg-amber-100 text-amber-800 border-amber-200',
  in_visit: 'bg-amber-100 text-amber-800 border-amber-200',
  exited: 'bg-slate-100 text-slate-700 border-slate-200',
  admitted: 'bg-blue-100 text-blue-700 border-blue-200',
};

const timeAgo = (timestamp) => {
  if (!timestamp) return 'N/A';
  const now = Date.now();
  const then = new Date(timestamp).getTime();
  if (Number.isNaN(then)) return 'N/A';
  const diffMs = Math.max(0, now - then);
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days > 1 ? 's' : ''} ago`;
};

const normalizeLegacyPatient = (item) => ({
  id: item.id || `legacy-${item.macId || item.device_id}`,
  entity_type: 'patient',
  device_id: item.macId || item.device_id || '',
  name: item.patientName || item.name || '',
  person_id: item.patientId || item.patient_id || '',
  ward: item.ward || '',
  bed: item.bed || '',
  doctor: item.doctor || '',
  transport_status: item.transportStatus || item.transport_status || 'admitted',
  status: item.status || 'active',
  assigned_at: item.assignedAt || item.assigned_at || new Date().toISOString(),
});

const PeopleTagAssignment = () => {
  const [tags, setTags] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [entityFilter, setEntityFilter] = useState('all');
  const [selectedTag, setSelectedTag] = useState(null);
  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [wsConnected, setWsConnected] = useState(false);

  useEffect(() => {
    let ws;
    let retryTimeout;

    const connect = () => {
      ws = new WebSocket(`${WS_URL}/api/ws/rtls`);

      ws.onopen = () => setWsConnected(true);

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          if (message.type === 'tag_update' && Array.isArray(message.data)) {
            setTags(message.data);
          }
        } catch (error) {
          console.error('Invalid WS payload', error);
        }
      };

      ws.onerror = () => setWsConnected(false);

      ws.onclose = () => {
        setWsConnected(false);
        retryTimeout = setTimeout(connect, 3000);
      };
    };

    connect();
    loadAssignments();

    return () => {
      if (retryTimeout) clearTimeout(retryTimeout);
      if (ws) ws.close();
    };
  }, []);

  const loadAssignments = () => {
    try {
      const raw = localStorage.getItem(PEOPLE_STORAGE_KEY);
      const legacyPatientRaw = localStorage.getItem(LEGACY_PATIENT_STORAGE_KEY);

      let people = raw ? JSON.parse(raw) : [];
      const legacyPatients = legacyPatientRaw ? JSON.parse(legacyPatientRaw) : [];

      if ((!people || people.length === 0) && Array.isArray(legacyPatients) && legacyPatients.length > 0) {
        people = legacyPatients.map(normalizeLegacyPatient);
      }

      setAssignments(Array.isArray(people) ? people : []);
    } catch (error) {
      console.error(error);
      setAssignments([]);
    }
  };

  const syncPatientStorage = (items) => {
    const patientAssignments = items
      .filter((item) => item.entity_type === 'patient')
      .map((item) => ({
        id: item.id,
        macId: item.device_id,
        patientId: item.person_id,
        patientName: item.name,
        ward: item.ward || '',
        bed: item.bed || '',
        doctor: item.doctor || '',
        transportStatus: item.transport_status || 'admitted',
        assignedAt: item.assigned_at,
        status: item.status || 'active',
      }));

    localStorage.setItem(LEGACY_PATIENT_STORAGE_KEY, JSON.stringify(patientAssignments));
  };

  const saveAssignments = (updated) => {
    setAssignments(updated);
    localStorage.setItem(PEOPLE_STORAGE_KEY, JSON.stringify(updated));
    syncPatientStorage(updated);
  };

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setSelectedTag(null);
    setIsAssignOpen(false);
  };

  const isTagAssigned = (deviceId) => {
    return assignments.some((a) => a.device_id === deviceId && a.status === 'active');
  };

  const availableTags = useMemo(() => {
    return tags.filter((tag) => !isTagAssigned(tag.device_id));
  }, [tags, assignments]);

  const stats = useMemo(() => {
    const activeAssignments = assignments.filter((a) => a.status === 'active');
    const reusable = assignments.filter((a) => a.status !== 'active');

    return {
      totalTags: tags.length,
      assigned: activeAssignments.length,
      available: Math.max(tags.length - activeAssignments.length, 0),
      patients: activeAssignments.filter((a) => a.entity_type === 'patient').length,
      staff: activeAssignments.filter((a) => a.entity_type === 'staff').length,
      visitors: activeAssignments.filter((a) => a.entity_type === 'visitor').length,
      canUnassign: reusable.length,
    };
  }, [tags, assignments]);

  const filteredAssignments = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return assignments.filter((item) => {
      const matchesEntity = entityFilter === 'all' || item.entity_type === entityFilter;
      const matchesSearch =
        !query ||
        (item.name || '').toLowerCase().includes(query) ||
        (item.person_id || '').toLowerCase().includes(query) ||
        (item.device_id || '').toLowerCase().includes(query) ||
        (item.ward || '').toLowerCase().includes(query) ||
        (item.department || '').toLowerCase().includes(query);

      return matchesEntity && matchesSearch;
    });
  }, [assignments, searchQuery, entityFilter]);

  const openAssign = (tag) => {
    setSelectedTag(tag);
    setForm((prev) => ({
      ...EMPTY_FORM,
      entity_type: prev.entity_type || 'patient',
      device_id: tag.device_id,
    }));
    setIsAssignOpen(true);
  };

  const handleAssign = () => {
    if (!selectedTag) {
      toast.error('Please choose a tag first');
      return;
    }

    if (!form.name || !form.person_id) {
      toast.error('Name and ID are required');
      return;
    }

    const base = {
      id: Date.now().toString(),
      entity_type: form.entity_type,
      device_id: selectedTag.device_id,
      name: form.name,
      person_id: form.person_id,
      status: 'active',
      assigned_at: new Date().toISOString(),
    };

    let payload = base;

    if (form.entity_type === 'patient') {
      payload = {
        ...base,
        ward: form.ward,
        bed: form.bed,
        doctor: form.doctor,
        transport_status: 'admitted',
      };
    }

    if (form.entity_type === 'staff') {
      payload = {
        ...base,
        role: form.role,
        department: form.department,
        shift: form.shift,
        shift_status: form.shift_status || 'on_duty',
      };
    }

    if (form.entity_type === 'visitor') {
      payload = {
        ...base,
        visiting_patient: form.visiting_patient,
        allowed_zone: form.allowed_zone,
        entry_time: form.entry_time || new Date().toISOString(),
        visit_status: form.visit_status || 'in_visit',
      };
    }

    saveAssignments([payload, ...assignments]);
    toast.success(`${entityMeta[form.entity_type].label} tag assigned`);
    resetForm();
  };

  const handleMarkReusable = (assignmentId) => {
    const updated = assignments.map((item) => {
      if (item.id !== assignmentId) return item;

      if (item.entity_type === 'patient') {
        return { ...item, status: 'discharged', discharged_at: new Date().toISOString() };
      }

      if (item.entity_type === 'staff') {
        return { ...item, status: 'inactive', unassigned_at: new Date().toISOString() };
      }

      return { ...item, status: 'exited', exited_at: new Date().toISOString() };
    });

    saveAssignments(updated);
    toast.success('Marked ready for unassign');
  };

  const handleUnassign = (assignmentId) => {
    const assignment = assignments.find((item) => item.id === assignmentId);
    if (!assignment) return;

    if (assignment.status === 'active') {
      toast.error('Mark this record ready first before unassigning');
      return;
    }

    const updated = assignments.filter((item) => item.id !== assignmentId);
    saveAssignments(updated);
    toast.success('Tag unassigned and available again');
  };

  const renderTypeFields = () => {
    if (form.entity_type === 'patient') {
      return (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Ward</Label>
            <Input value={form.ward} onChange={(e) => setForm((p) => ({ ...p, ward: e.target.value }))} placeholder="Ward 4" />
          </div>
          <div className="space-y-1.5">
            <Label>Bed</Label>
            <Input value={form.bed} onChange={(e) => setForm((p) => ({ ...p, bed: e.target.value }))} placeholder="Bed 12" />
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <Label>Treating doctor</Label>
            <Input value={form.doctor} onChange={(e) => setForm((p) => ({ ...p, doctor: e.target.value }))} placeholder="Dr. Meera Nair" />
          </div>
        </div>
      );
    }

    if (form.entity_type === 'staff') {
      return (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Role</Label>
            <Input value={form.role} onChange={(e) => setForm((p) => ({ ...p, role: e.target.value }))} placeholder="Nurse" />
          </div>
          <div className="space-y-1.5">
            <Label>Department</Label>
            <Input value={form.department} onChange={(e) => setForm((p) => ({ ...p, department: e.target.value }))} placeholder="ICU" />
          </div>
          <div className="space-y-1.5">
            <Label>Shift</Label>
            <Input value={form.shift} onChange={(e) => setForm((p) => ({ ...p, shift: e.target.value }))} placeholder="Morning" />
          </div>
          <div className="space-y-1.5">
            <Label>Shift status</Label>
            <Select value={form.shift_status} onValueChange={(value) => setForm((p) => ({ ...p, shift_status: value }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="on_duty">On duty</SelectItem>
                <SelectItem value="busy">Busy</SelectItem>
                <SelectItem value="break">Break</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Visiting patient</Label>
          <Input value={form.visiting_patient} onChange={(e) => setForm((p) => ({ ...p, visiting_patient: e.target.value }))} placeholder="Rohit Sharma" />
        </div>
        <div className="space-y-1.5">
          <Label>Allowed zone</Label>
          <Input value={form.allowed_zone} onChange={(e) => setForm((p) => ({ ...p, allowed_zone: e.target.value }))} placeholder="Ward 4" />
        </div>
        <div className="space-y-1.5 md:col-span-2">
          <Label>Visit status</Label>
          <Select value={form.visit_status} onValueChange={(value) => setForm((p) => ({ ...p, visit_status: value }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="in_visit">In visit</SelectItem>
              <SelectItem value="waiting">Waiting</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    );
  };

  const AssignmentCard = ({ item }) => {
    const Icon = entityMeta[item.entity_type]?.icon || User;
    const meta = entityMeta[item.entity_type] || entityMeta.patient;
    const currentTag = tags.find((tag) => tag.device_id === item.device_id);
    const isReusable = item.status !== 'active';

    return (
      <Card className="border border-slate-200 shadow-sm">
        <CardContent className="p-5">
          <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
            <div className="xl:col-span-4">
              <div className="flex items-start gap-4">
                <div className={`rounded-2xl p-3 ${meta.accent}`}>
                  <Icon className="h-6 w-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-xl font-semibold text-slate-900">{item.name}</h3>
                    <Badge className={`border ${meta.accent}`}>{meta.label}</Badge>
                    <Badge className={`border ${statusBadgeClasses[item.status] || statusBadgeClasses.active}`}>
                      {(item.status || 'active').replaceAll('_', ' ')}
                    </Badge>
                  </div>
                  <p className="mt-1 text-sm text-slate-500">ID: {item.person_id || '—'}</p>
                  <p className="mt-2 text-xs text-slate-500">
                    Assigned {timeAgo(item.assigned_at)}
                  </p>
                </div>
              </div>
            </div>

            <div className="xl:col-span-3">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center gap-2">
                  <Wifi className="h-4 w-4 text-slate-500" />
                  <p className="font-mono text-sm font-medium text-slate-900">{item.device_id}</p>
                </div>
                <div className="mt-3 space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Live status</span>
                    <span className="font-medium text-slate-900">{currentTag?.status || 'Unknown'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Location</span>
                    <span className="font-medium text-slate-900 text-right">
                      {currentTag?.location_name || currentTag?.position_ref || item.ward || item.department || item.allowed_zone || '—'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="xl:col-span-3">
              <div className="space-y-2 text-sm">
                {item.entity_type === 'patient' ? (
                  <>
                    <div><span className="text-slate-500">Ward:</span> <span className="font-medium text-slate-900">{item.ward || '—'}</span></div>
                    <div><span className="text-slate-500">Bed:</span> <span className="font-medium text-slate-900">{item.bed || '—'}</span></div>
                    <div><span className="text-slate-500">Doctor:</span> <span className="font-medium text-slate-900">{item.doctor || '—'}</span></div>
                  </>
                ) : null}

                {item.entity_type === 'staff' ? (
                  <>
                    <div><span className="text-slate-500">Role:</span> <span className="font-medium text-slate-900">{item.role || '—'}</span></div>
                    <div><span className="text-slate-500">Department:</span> <span className="font-medium text-slate-900">{item.department || '—'}</span></div>
                    <div><span className="text-slate-500">Shift:</span> <span className="font-medium text-slate-900">{item.shift || '—'}</span></div>
                  </>
                ) : null}

                {item.entity_type === 'visitor' ? (
                  <>
                    <div><span className="text-slate-500">Visiting:</span> <span className="font-medium text-slate-900">{item.visiting_patient || '—'}</span></div>
                    <div><span className="text-slate-500">Allowed zone:</span> <span className="font-medium text-slate-900">{item.allowed_zone || '—'}</span></div>
                    <div><span className="text-slate-500">Entry:</span> <span className="font-medium text-slate-900">{item.entry_time ? new Date(item.entry_time).toLocaleString() : '—'}</span></div>
                  </>
                ) : null}
              </div>
            </div>

            <div className="flex flex-col justify-center gap-2 xl:col-span-2">
              {!isReusable ? (
                <Button variant="outline" onClick={() => handleMarkReusable(item.id)} className="gap-2">
                  <CheckCircle2 className="h-4 w-4" />
                  Mark reusable
                </Button>
              ) : (
                <Button variant="destructive" onClick={() => handleUnassign(item.id)} className="gap-2">
                  <Unlink className="h-4 w-4" />
                  Unassign tag
                </Button>
              )}

              <div className="rounded-lg bg-slate-50 p-2 text-xs text-slate-500 text-center">
                {isReusable
                  ? 'This tag can now be removed and reused.'
                  : 'Set this record reusable before unassigning the tag.'}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      {isAssignOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4">
          <div className="w-full max-w-3xl rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">Assign tag to people</h2>
                <p className="mt-1 text-sm text-slate-500">
                  One screen for patient, staff, and visitor tag assignment.
                </p>
              </div>
              <Button variant="ghost" size="icon" onClick={resetForm}>
                <X className="h-5 w-5" />
              </Button>
            </div>

            <div className="space-y-4 px-6 py-5">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm text-slate-500">Selected tag</p>
                <p className="mt-1 font-mono text-lg font-semibold text-slate-900">{selectedTag?.device_id}</p>
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Type</Label>
                  <Select value={form.entity_type} onValueChange={(value) => setForm((p) => ({ ...EMPTY_FORM, entity_type: value, device_id: selectedTag?.device_id || '' }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="patient">Patient</SelectItem>
                      <SelectItem value="staff">Staff</SelectItem>
                      <SelectItem value="visitor">Visitor</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label>{form.entity_type === 'patient' ? 'Patient name' : form.entity_type === 'staff' ? 'Staff name' : 'Visitor name'}</Label>
                  <Input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} placeholder="Enter name" />
                </div>

                <div className="space-y-1.5">
                  <Label>{form.entity_type === 'patient' ? 'Patient ID' : form.entity_type === 'staff' ? 'Staff ID' : 'Visitor / Pass ID'}</Label>
                  <Input value={form.person_id} onChange={(e) => setForm((p) => ({ ...p, person_id: e.target.value }))} placeholder="Enter ID" />
                </div>
              </div>

              {renderTypeFields()}
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-6 py-4">
              <Button variant="outline" onClick={resetForm}>Cancel</Button>
              <Button onClick={handleAssign} className="gap-2">
                <Link2 className="h-4 w-4" />
                Assign tag
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">People Tag Assignment</h1>
        <p className="mt-1 text-sm text-slate-600">
          Manage tag assignment for patients, staff, and visitors in one operational screen.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3 xl:grid-cols-6">
        <Card className="border border-slate-200 shadow-sm"><CardContent className="p-4"><div className="text-sm text-slate-500">Total tags</div><div className="mt-1 text-2xl font-semibold text-slate-900">{stats.totalTags}</div></CardContent></Card>
        <Card className="border border-slate-200 shadow-sm"><CardContent className="p-4"><div className="text-sm text-slate-500">Assigned</div><div className="mt-1 text-2xl font-semibold text-slate-900">{stats.assigned}</div></CardContent></Card>
        <Card className="border border-slate-200 shadow-sm"><CardContent className="p-4"><div className="text-sm text-slate-500">Available</div><div className="mt-1 text-2xl font-semibold text-slate-900">{stats.available}</div></CardContent></Card>
        <Card className="border border-slate-200 shadow-sm"><CardContent className="p-4"><div className="text-sm text-slate-500">Patients</div><div className="mt-1 text-2xl font-semibold text-slate-900">{stats.patients}</div></CardContent></Card>
        <Card className="border border-slate-200 shadow-sm"><CardContent className="p-4"><div className="text-sm text-slate-500">Staff</div><div className="mt-1 text-2xl font-semibold text-slate-900">{stats.staff}</div></CardContent></Card>
        <Card className="border border-slate-200 shadow-sm"><CardContent className="p-4"><div className="text-sm text-slate-500">Can unassign</div><div className="mt-1 text-2xl font-semibold text-slate-900">{stats.canUnassign}</div></CardContent></Card>
      </div>

      <Card className="border border-slate-200 shadow-sm">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-12">
            <div className="relative lg:col-span-8">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name, ID, device ID, ward, or department..."
                className="pl-9"
              />
            </div>

            <div className="lg:col-span-3">
              <Select value={entityFilter} onValueChange={setEntityFilter}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All types</SelectItem>
                  <SelectItem value="patient">Patient</SelectItem>
                  <SelectItem value="staff">Staff</SelectItem>
                  <SelectItem value="visitor">Visitor</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-end lg:col-span-1">
              <Badge className={`border ${wsConnected ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-300 bg-slate-100 text-slate-700'}`}>
                {wsConnected ? 'Live' : 'Reconnecting'}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        <Card className="border border-slate-200 shadow-sm xl:col-span-4">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-3">
              <CardTitle className="text-lg">Available tags</CardTitle>
              <Badge className="border border-slate-200 bg-slate-50 text-slate-700">
                {availableTags.length}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {availableTags.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 p-10 text-center text-sm text-slate-500">
                No unassigned tags available right now.
              </div>
            ) : (
              availableTags.map((tag) => (
                <button
                  key={tag.device_id}
                  type="button"
                  onClick={() => openAssign(tag)}
                  className="w-full rounded-xl border border-slate-200 bg-white p-4 text-left transition hover:bg-slate-50"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-mono text-sm font-medium text-slate-900">{tag.device_id}</div>
                      <div className="mt-1 text-sm text-slate-500">
                        {tag.location_name || tag.position_ref || 'Unknown location'}
                      </div>
                    </div>
                    <Badge className={`border ${tag.status === 'online' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-300 bg-slate-100 text-slate-700'}`}>
                      {tag.status || 'unknown'}
                    </Badge>
                  </div>
                  <div className="mt-3 flex items-center justify-between text-sm text-slate-500">
                    <span>{tag.motion_state || 'unknown'}</span>
                    <span>{timeAgo(tag.last_seen)}</span>
                  </div>
                  <Button className="mt-3 w-full gap-2">
                    <UserPlus className="h-4 w-4" />
                    Assign tag
                  </Button>
                </button>
              ))
            )}
          </CardContent>
        </Card>

        <div className="space-y-4 xl:col-span-8">
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            <div className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4" />
              <div>
                <div className="font-medium">Unassign flow</div>
                <div className="mt-1">
                  Active records cannot be removed directly. First mark them reusable, then unassign the tag.
                </div>
              </div>
            </div>
          </div>

          {filteredAssignments.length === 0 ? (
            <Card className="border border-slate-200 shadow-sm">
              <CardContent className="p-12 text-center text-sm text-slate-500">
                No people assignments found for this filter.
              </CardContent>
            </Card>
          ) : (
            filteredAssignments.map((item) => <AssignmentCard key={item.id} item={item} />)
          )}
        </div>
      </div>
    </div>
  );
};

export default PeopleTagAssignment;