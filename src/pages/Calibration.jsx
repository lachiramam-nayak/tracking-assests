import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import {
  Search,
  Wrench,
  AlertTriangle,
  CalendarClock,
  RefreshCcw,
  Plus,
  ClipboardCheck,
  ExternalLink,
  LocateFixed,
  Save,
  X,
  Package,
  ListChecks,
  CheckCircle2,
} from 'lucide-react';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'https://assest-backend-z6uq.onrender.com';
const API = `${BACKEND_URL}/api`;
const WS_URL = BACKEND_URL.replace(/^http/, 'ws');
const STORAGE_KEY = 'calibrationRecords_v4';

const EQUIPMENT_TYPES = [
  'Ventilator',
  'Patient Monitor',
  'ECG Monitor',
  'Infusion Pump',
  'Syringe Pump',
  'Defibrillator',
  'Portable Ultrasound',
  'Crash Cart',
  'Hospital Bed',
  'Wheelchair',
  'Other',
];

const WARDS = [
  'ICU',
  'NICU',
  'Emergency',
  'OT',
  'Ward 1',
  'Ward 2',
  'Ward 3',
  'Ward 4',
  'Recovery',
  'Radiology',
  'CSSD',
  'Biomedical',
  'General',
];

const OPERATIONAL_STATES = ['normal', 'in_calibration', 'under_maintenance', 'out_of_service'];

const EMPTY_FORM = {
  device_id: '',
  asset_id: '',
  equipment_name: '',
  equipment_type: '',
  department: '',
  ward: '',
  last_calibration: '',
  calibration_cycle_days: 180,
  technician: '',
  certification_number: '',
  notes: '',
  operational_state: 'normal',
};

const statusBadgeClasses = {
  overdue: 'bg-rose-100 text-rose-700 border-rose-200',
  due_soon: 'bg-amber-100 text-amber-800 border-amber-200',
  calibrated: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  in_calibration: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  under_maintenance: 'bg-orange-100 text-orange-700 border-orange-200',
  out_of_service: 'bg-slate-200 text-slate-700 border-slate-300',
  missing_info: 'bg-slate-100 text-slate-700 border-slate-200',
};

const statusLabel = {
  overdue: 'Overdue',
  due_soon: 'Due soon',
  calibrated: 'Calibrated',
  in_calibration: 'In calibration',
  under_maintenance: 'Under maintenance',
  out_of_service: 'Out of service',
  missing_info: 'Missing info',
};

const operationalStateLabel = {
  normal: 'Normal',
  in_calibration: 'In calibration',
  under_maintenance: 'Under maintenance',
  out_of_service: 'Out of service',
};

const priorityMap = {
  overdue: 0,
  due_soon: 1,
  in_calibration: 2,
  under_maintenance: 3,
  out_of_service: 4,
  missing_info: 5,
  calibrated: 6,
};

const safeJson = async (response) => {
  if (!response.ok) {
    const body = await response.text();
    throw new Error(body || `Request failed with status ${response.status}`);
  }
  return response.json();
};

const formatDate = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString();
};

const getDaysUntil = (dateString) => {
  if (!dateString) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dateString);
  due.setHours(0, 0, 0, 0);
  if (Number.isNaN(due.getTime())) return null;
  return Math.round((due - today) / (1000 * 60 * 60 * 24));
};

const addDaysToDate = (dateString, days) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return '';
  date.setDate(date.getDate() + Number(days || 0));
  return date.toISOString().slice(0, 10);
};

const deriveDateStatus = (nextDue) => {
  const daysLeft = getDaysUntil(nextDue);
  if (daysLeft === null) return 'missing_info';
  if (daysLeft < 0) return 'overdue';
  if (daysLeft <= 30) return 'due_soon';
  return 'calibrated';
};

const getDisplayStatus = (record) => {
  const state = record.operational_state || 'normal';
  if (state === 'in_calibration') return 'in_calibration';
  if (state === 'under_maintenance') return 'under_maintenance';
  if (state === 'out_of_service') return 'out_of_service';
  return deriveDateStatus(record.next_due);
};

const Calibration = () => {
  const navigate = useNavigate();
  const [tags, setTags] = useState([]);
  const [assetMetadataMap, setAssetMetadataMap] = useState({});
  const [records, setRecords] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [selectedMissingDeviceId, setSelectedMissingDeviceId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [wardFilter, setWardFilter] = useState('all');
  const [editing, setEditing] = useState(false);
  const [creating, setCreating] = useState(false);
  const [showMissingPanel, setShowMissingPanel] = useState(false);
  const [saving, setSaving] = useState(false);
  const [wsConnected, setWsConnected] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  const loadAssetMetadata = useCallback(async () => {
    try {
      const response = await fetch(`${API}/assets/metadata`);
      const data = await safeJson(response);
      setAssetMetadataMap(data || {});
    } catch (error) {
      console.error(error);
      setAssetMetadataMap({});
    }
  }, []);

  const loadLiveTags = useCallback(async () => {
    try {
      const response = await fetch(`${API}/tags/status`);
      const data = await safeJson(response);
      setTags(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(error);
    }
  }, []);

  const loadCalibrationRecords = useCallback(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      const parsed = saved ? JSON.parse(saved) : [];
      setRecords(Array.isArray(parsed) ? parsed : []);
    } catch (error) {
      console.error(error);
      setRecords([]);
    }
  }, []);

  const persistCalibrationRecords = useCallback((nextRecords) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(nextRecords));
    setRecords(nextRecords);
  }, []);

  useEffect(() => {
    loadAssetMetadata();
    loadLiveTags();
    loadCalibrationRecords();
  }, [loadAssetMetadata, loadLiveTags, loadCalibrationRecords]);

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
            setTags((prev) => {
              if (message.data.length === 0 && prev.length > 0) return prev;
              return message.data;
            });
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

    return () => {
      if (retryTimeout) clearTimeout(retryTimeout);
      if (ws) ws.close();
    };
  }, []);

  const metadataAssetList = useMemo(() => {
    return Object.entries(assetMetadataMap).map(([deviceId, metadata]) => ({
      device_id: deviceId,
      asset_id: metadata.asset_id || '—',
      equipment_name: metadata.asset_name || metadata.asset_type || 'Unnamed equipment',
      equipment_type: metadata.asset_type || 'Other',
      department: metadata.department || '—',
      ward: metadata.ward || '—',
    }));
  }, [assetMetadataMap]);

  const missingAssets = useMemo(() => {
    const existingIds = new Set(records.map((record) => record.device_id));
    return metadataAssetList.filter((item) => !existingIds.has(item.device_id));
  }, [metadataAssetList, records]);

  const enrichedRecords = useMemo(() => {
    return records.map((record) => {
      const metadata = assetMetadataMap[record.device_id] || {};
      const liveTag = tags.find((tag) => tag.device_id === record.device_id);
      const next_due = addDaysToDate(record.last_calibration, record.calibration_cycle_days);
      const displayStatus = getDisplayStatus({ ...record, next_due });

      return {
        ...record,
        metadata,
        liveTag,
        next_due,
        displayStatus,
        equipment_name: record.equipment_name || metadata.asset_name || metadata.asset_type || 'Unnamed equipment',
        equipment_type: record.equipment_type || metadata.asset_type || 'Other',
        asset_id: record.asset_id || metadata.asset_id || '—',
        department: record.department || metadata.department || '—',
        ward: record.ward || metadata.ward || '—',
        current_location:
          metadata.ward ||
          liveTag?.zone_name ||
          liveTag?.position_ref ||
          record.ward ||
          'Unknown',
      };
    });
  }, [records, assetMetadataMap, tags]);

  const filteredRecords = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return enrichedRecords
      .filter((item) => {
        const matchesSearch =
          !query ||
          item.equipment_name.toLowerCase().includes(query) ||
          item.equipment_type.toLowerCase().includes(query) ||
          item.asset_id.toLowerCase().includes(query) ||
          item.device_id.toLowerCase().includes(query) ||
          item.department.toLowerCase().includes(query) ||
          item.ward.toLowerCase().includes(query) ||
          (item.technician || '').toLowerCase().includes(query);

        const matchesType = typeFilter === 'all' || item.equipment_type === typeFilter;
        const matchesStatus = statusFilter === 'all' || item.displayStatus === statusFilter;
        const matchesWard = wardFilter === 'all' || item.ward === wardFilter;

        return matchesSearch && matchesType && matchesStatus && matchesWard;
      })
      .sort((a, b) => {
        const statusDiff = priorityMap[a.displayStatus] - priorityMap[b.displayStatus];
        if (statusDiff !== 0) return statusDiff;
        const daysA = getDaysUntil(a.next_due);
        const daysB = getDaysUntil(b.next_due);
        if (daysA === null && daysB === null) return a.equipment_name.localeCompare(b.equipment_name);
        if (daysA === null) return 1;
        if (daysB === null) return -1;
        return daysA - daysB;
      });
  }, [enrichedRecords, searchQuery, typeFilter, statusFilter, wardFilter]);

  useEffect(() => {
    if (editing || creating || showMissingPanel) return;
    if (!filteredRecords.length) {
      setSelectedId('');
      return;
    }
    const exists = filteredRecords.some((item) => item.id === selectedId);
    if (!exists) setSelectedId(filteredRecords[0].id);
  }, [filteredRecords, selectedId, editing, creating, showMissingPanel]);

  useEffect(() => {
    if (showMissingPanel && !selectedMissingDeviceId && missingAssets.length > 0) {
      setSelectedMissingDeviceId(missingAssets[0].device_id);
    }
    if (!showMissingPanel) {
      setSelectedMissingDeviceId('');
    }
  }, [showMissingPanel, selectedMissingDeviceId, missingAssets]);

  const selectedRecord = useMemo(
    () => filteredRecords.find((item) => item.id === selectedId) || null,
    [filteredRecords, selectedId]
  );

  const selectedMissingAsset = useMemo(
    () => missingAssets.find((item) => item.device_id === selectedMissingDeviceId) || null,
    [missingAssets, selectedMissingDeviceId]
  );

  useEffect(() => {
    if (creating || showMissingPanel) return;
    if (!selectedRecord) {
      if (!editing) setForm(EMPTY_FORM);
      return;
    }
    if (editing) return;

    setForm({
      device_id: selectedRecord.device_id || '',
      asset_id: selectedRecord.asset_id === '—' ? '' : selectedRecord.asset_id,
      equipment_name: selectedRecord.equipment_name || '',
      equipment_type: selectedRecord.equipment_type || '',
      department: selectedRecord.department === '—' ? '' : selectedRecord.department,
      ward: selectedRecord.ward === '—' ? '' : selectedRecord.ward,
      last_calibration: selectedRecord.last_calibration || '',
      calibration_cycle_days: selectedRecord.calibration_cycle_days || 180,
      technician: selectedRecord.technician || '',
      certification_number: selectedRecord.certification_number || '',
      notes: selectedRecord.notes || '',
      operational_state: selectedRecord.operational_state || 'normal',
    });
  }, [selectedRecord, editing, creating, showMissingPanel]);

  const stats = useMemo(() => ({
    total: enrichedRecords.length,
    missing: missingAssets.length,
    overdue: enrichedRecords.filter((item) => item.displayStatus === 'overdue').length,
    dueSoon: enrichedRecords.filter((item) => item.displayStatus === 'due_soon').length,
    unavailable: enrichedRecords.filter((item) =>
      item.displayStatus === 'under_maintenance' || item.displayStatus === 'out_of_service'
    ).length,
  }), [enrichedRecords, missingAssets]);

  const typeOptions = useMemo(() => {
    const set = new Set(EQUIPMENT_TYPES);
    [...enrichedRecords, ...missingAssets].forEach((item) => {
      if (item.equipment_type && item.equipment_type !== 'Other') set.add(item.equipment_type);
    });
    return Array.from(set).sort();
  }, [enrichedRecords, missingAssets]);

  const beginCreateFromMissing = () => {
    if (missingAssets.length === 0) {
      toast.info('All known assets already have calibration information.');
      return;
    }
    setShowMissingPanel(true);
    setCreating(false);
    setEditing(false);
  };

  const startCreateRecord = () => {
    if (!selectedMissingAsset) {
      toast.error('Select a missing asset first.');
      return;
    }

    setCreating(true);
    setEditing(false);
    setSelectedId('');
    setForm({
      ...EMPTY_FORM,
      device_id: selectedMissingAsset.device_id,
      asset_id: selectedMissingAsset.asset_id === '—' ? '' : selectedMissingAsset.asset_id,
      equipment_name: selectedMissingAsset.equipment_name || '',
      equipment_type: selectedMissingAsset.equipment_type || '',
      department: selectedMissingAsset.department === '—' ? '' : selectedMissingAsset.department,
      ward: selectedMissingAsset.ward === '—' ? '' : selectedMissingAsset.ward,
      calibration_cycle_days: 180,
      operational_state: 'normal',
    });
  };

  const saveRecord = () => {
    if (!form.device_id || !form.equipment_name || !form.equipment_type || !form.last_calibration) {
      toast.error('Please fill tag ID, equipment name, type, and last calibration date.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ...form,
        id: creating ? `cal_${Date.now()}` : selectedRecord?.id || `cal_${Date.now()}`,
        updated_at: new Date().toISOString(),
      };

      const nextRecords = creating
        ? [payload, ...records]
        : records.map((record) => (record.id === selectedRecord.id ? payload : record));

      persistCalibrationRecords(nextRecords);
      setCreating(false);
      setEditing(false);
      setShowMissingPanel(false);
      setSelectedId(payload.id);
      toast.success(creating ? 'Calibration information added' : 'Calibration record updated');
    } catch (error) {
      console.error(error);
      toast.error('Could not save calibration record');
    } finally {
      setSaving(false);
    }
  };

  const deleteRecord = () => {
    if (!selectedRecord) return;
    const nextRecords = records.filter((record) => record.id !== selectedRecord.id);
    persistCalibrationRecords(nextRecords);
    setSelectedId('');
    setEditing(false);
    toast.success('Calibration record removed');
  };

  const markCompletedToday = () => {
    if (!selectedRecord) return;
    const nextRecords = records.map((record) =>
      record.id === selectedRecord.id
        ? {
            ...record,
            operational_state: 'normal',
            last_calibration: new Date().toISOString().slice(0, 10),
            updated_at: new Date().toISOString(),
          }
        : record
    );
    persistCalibrationRecords(nextRecords);
    toast.success('Calibration updated to today');
  };

  const openAsset = () => {
    if (!selectedRecord?.device_id) return;
    navigate('/assets');
  };

  const openOnMap = () => {
    if (!selectedRecord?.device_id) return;
    navigate(`/rtls?device_id=${encodeURIComponent(selectedRecord.device_id)}`);
  };

  const previewNextDue = useMemo(
    () => addDaysToDate(form.last_calibration, form.calibration_cycle_days),
    [form.last_calibration, form.calibration_cycle_days]
  );

  const previewDisplayStatus = useMemo(
    () => getDisplayStatus({ ...form, next_due: previewNextDue }),
    [form, previewNextDue]
  );

  const StatCard = ({ title, value, icon: Icon, tone = 'default' }) => {
    const toneMap = {
      default: 'bg-white',
      danger: 'bg-rose-50',
      warning: 'bg-amber-50',
      info: 'bg-blue-50',
      neutral: 'bg-slate-50',
    };

    return (
      <Card className={`${toneMap[tone]} border border-slate-200 shadow-sm`}>
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-slate-500">{title}</p>
              <p className="mt-1 text-2xl font-semibold text-slate-900">{value}</p>
            </div>
            <div className="rounded-xl bg-white p-2 shadow-sm">
              <Icon className="h-5 w-5 text-slate-700" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderForm = (saveLabel = 'Save changes') => (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-xl font-semibold text-slate-900">{form.equipment_name || 'Equipment'}</h3>
            <p className="mt-1 text-sm text-slate-500">
              {form.equipment_type || 'Select type'} • {form.ward || 'Ward not set'}
            </p>
          </div>
          <Badge className={`border ${statusBadgeClasses[previewDisplayStatus]}`}>
            {statusLabel[previewDisplayStatus]}
          </Badge>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-xl bg-white p-3">
            <div className="text-xs uppercase tracking-wide text-slate-500">Next due</div>
            <div className="mt-1 font-medium text-slate-900">{formatDate(previewNextDue)}</div>
          </div>
          <div className="rounded-xl bg-white p-3">
            <div className="text-xs uppercase tracking-wide text-slate-500">Operational state</div>
            <div className="mt-1 font-medium text-slate-900">{operationalStateLabel[form.operational_state]}</div>
          </div>
        </div>
      </div>

      <div className="space-y-3 rounded-2xl border border-slate-200 p-4">
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-slate-700">Tag ID</label>
          <Input value={form.device_id} disabled />
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Equipment name</label>
            <Input value={form.equipment_name} onChange={(e) => setForm((p) => ({ ...p, equipment_name: e.target.value }))} />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Asset ID</label>
            <Input value={form.asset_id} onChange={(e) => setForm((p) => ({ ...p, asset_id: e.target.value }))} />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Equipment type</label>
            <Select
              value={form.equipment_type || 'empty'}
              onValueChange={(value) => setForm((p) => ({ ...p, equipment_type: value === 'empty' ? '' : value }))}
            >
              <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="empty">Not set</SelectItem>
                {EQUIPMENT_TYPES.map((type) => <SelectItem key={type} value={type}>{type}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Ward</label>
            <Select
              value={form.ward || 'empty'}
              onValueChange={(value) => setForm((p) => ({ ...p, ward: value === 'empty' ? '' : value }))}
            >
              <SelectTrigger><SelectValue placeholder="Select ward" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="empty">Not set</SelectItem>
                {WARDS.map((ward) => <SelectItem key={ward} value={ward}>{ward}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Department</label>
            <Input value={form.department} onChange={(e) => setForm((p) => ({ ...p, department: e.target.value }))} />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Operational state</label>
            <Select
              value={form.operational_state}
              onValueChange={(value) => setForm((p) => ({ ...p, operational_state: value }))}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {OPERATIONAL_STATES.map((state) => <SelectItem key={state} value={state}>{operationalStateLabel[state]}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Last calibration date</label>
            <Input type="date" value={form.last_calibration} onChange={(e) => setForm((p) => ({ ...p, last_calibration: e.target.value }))} />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Cycle (days)</label>
            <Input type="number" value={form.calibration_cycle_days} onChange={(e) => setForm((p) => ({ ...p, calibration_cycle_days: Number(e.target.value || 0) }))} />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Next due (auto)</label>
            <Input value={previewNextDue} readOnly />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Technician</label>
            <Input value={form.technician} onChange={(e) => setForm((p) => ({ ...p, technician: e.target.value }))} />
          </div>

          <div className="space-y-1.5 md:col-span-2">
            <label className="text-sm font-medium text-slate-700">Certificate number</label>
            <Input value={form.certification_number} onChange={(e) => setForm((p) => ({ ...p, certification_number: e.target.value }))} />
          </div>

          <div className="space-y-1.5 md:col-span-2">
            <label className="text-sm font-medium text-slate-700">Notes</label>
            <Input value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} />
          </div>
        </div>

        <div className="flex items-center gap-2 pt-1">
          <Button onClick={saveRecord} disabled={saving} className="gap-2">
            <Save className="h-4 w-4" />
            {saving ? 'Saving...' : saveLabel}
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setCreating(false);
              setEditing(false);
              if (showMissingPanel) return;
            }}
            className="gap-2"
          >
            <X className="h-4 w-4" />
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Calibration Management</h1>
          <p className="mt-1 text-sm text-slate-600">
            Use calibration date + cycle days to automatically track what is overdue, due soon, or healthy.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Badge className={`border px-3 py-1 text-sm ${wsConnected ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-300 bg-slate-100 text-slate-700'}`}>
            {wsConnected ? 'Live context connected' : 'Reconnecting live context'}
          </Badge>
          <Button variant="outline" onClick={loadCalibrationRecords} className="gap-2">
            <RefreshCcw className="h-4 w-4" />
            Refresh
          </Button>
          <Button onClick={beginCreateFromMissing} className="gap-2">
            <Plus className="h-4 w-4" />
            Add missing equipment
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
        <StatCard title="In calibration program" value={stats.total} icon={ClipboardCheck} />
        <StatCard title="Missing calibration info" value={stats.missing} icon={ListChecks} tone="neutral" />
        <StatCard title="Overdue" value={stats.overdue} icon={AlertTriangle} tone="danger" />
        <StatCard title="Due in 30 days" value={stats.dueSoon} icon={CalendarClock} tone="warning" />
        <StatCard title="Unavailable" value={stats.unavailable} icon={Wrench} tone="info" />
      </div>

      {showMissingPanel && (
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
          <Card className="border border-slate-200 shadow-sm xl:col-span-5">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <CardTitle className="text-lg">Assets missing calibration information</CardTitle>
                  <p className="mt-1 text-sm text-slate-500">
                    Choose equipment that exists in Assets metadata but has no calibration record yet.
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={() => { setShowMissingPanel(false); setCreating(false); }}>
                  Close
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {missingAssets.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
                  Every known asset already has calibration information.
                </div>
              ) : (
                <div className="space-y-2">
                  {missingAssets.map((item) => {
                    const selected = item.device_id === selectedMissingDeviceId;
                    return (
                      <button
                        key={item.device_id}
                        type="button"
                        onClick={() => setSelectedMissingDeviceId(item.device_id)}
                        className={`w-full rounded-xl border p-3 text-left transition ${selected ? 'border-blue-300 bg-blue-50' : 'border-slate-200 bg-white hover:bg-slate-50'}`}
                      >
                        <div className="font-medium text-slate-900">{item.equipment_name}</div>
                        <div className="mt-1 text-xs text-slate-500">Asset ID: {item.asset_id} • Tag: {item.device_id}</div>
                        <div className="mt-1 text-sm text-slate-600">{item.equipment_type} • {item.ward}</div>
                      </button>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border border-slate-200 shadow-sm xl:col-span-7">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <CardTitle className="text-lg">
                    {creating ? 'Add calibration information' : 'Create calibration record'}
                  </CardTitle>
                  <p className="mt-1 text-sm text-slate-500">
                    Complete the form here for the equipment selected on the left.
                  </p>
                </div>
                {creating && (
                  <Button variant="outline" size="sm" onClick={() => setCreating(false)}>
                    Cancel
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {!selectedMissingAsset ? (
                <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
                  Select a missing asset first.
                </div>
              ) : !creating ? (
                <div className="space-y-4">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <h3 className="text-xl font-semibold text-slate-900">{selectedMissingAsset.equipment_name}</h3>
                    <p className="mt-1 text-sm text-slate-500">
                      {selectedMissingAsset.equipment_type} • {selectedMissingAsset.ward}
                    </p>
                    <div className="mt-3 text-sm text-slate-600">
                      Asset ID: {selectedMissingAsset.asset_id} • Tag ID: {selectedMissingAsset.device_id}
                    </div>
                  </div>
                  <Button onClick={startCreateRecord} className="gap-2">
                    <Plus className="h-4 w-4" />
                    Add calibration info for this equipment
                  </Button>
                </div>
              ) : (
                renderForm('Add calibration info')
              )}
            </CardContent>
          </Card>
        </div>
      )}

      <Card className="border border-slate-200 shadow-sm">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-12">
            <div className="relative lg:col-span-5">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search equipment, type, asset ID, technician, ward..." className="pl-9" />
            </div>
            <div className="lg:col-span-2">
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger><SelectValue placeholder="Type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All types</SelectItem>
                  {typeOptions.map((type) => <SelectItem key={type} value={type}>{type}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="lg:col-span-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All status</SelectItem>
                  {['overdue', 'due_soon', 'calibrated', 'in_calibration', 'under_maintenance', 'out_of_service'].map((status) => (
                    <SelectItem key={status} value={status}>{statusLabel[status]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="lg:col-span-2">
              <Select value={wardFilter} onValueChange={setWardFilter}>
                <SelectTrigger><SelectValue placeholder="Ward" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All wards</SelectItem>
                  {WARDS.map((ward) => <SelectItem key={ward} value={ward}>{ward}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-end lg:col-span-1">
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                {filteredRecords.length} / {enrichedRecords.length}
              </div>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {[
              ['all', 'All'],
              ['overdue', 'Overdue'],
              ['due_soon', 'Due soon'],
              ['in_calibration', 'In calibration'],
              ['under_maintenance', 'Maintenance'],
              ['out_of_service', 'Out of service'],
            ].map(([value, label]) => (
              <Button key={value} variant={statusFilter === value ? 'default' : 'outline'} size="sm" className="h-8 rounded-full" onClick={() => setStatusFilter(value)}>
                {label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
        <Card className="border border-slate-200 shadow-sm xl:col-span-8">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Calibration worklist</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="min-w-full text-left">
                <thead className="border-y border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3 font-medium">Equipment</th>
                    <th className="px-4 py-3 font-medium">Type</th>
                    <th className="px-4 py-3 font-medium">Location</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Last calibration</th>
                    <th className="px-4 py-3 font-medium">Next due</th>
                    <th className="px-4 py-3 font-medium">Days left</th>
                    <th className="px-4 py-3 font-medium">Technician</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {filteredRecords.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-12 text-center text-sm text-slate-500">
                        No calibration records found yet.
                      </td>
                    </tr>
                  ) : (
                    filteredRecords.map((item) => {
                      const selected = item.id === selectedId;
                      const daysLeft = getDaysUntil(item.next_due);
                      return (
                        <tr
                          key={item.id}
                          onClick={() => {
                            if (editing || creating || showMissingPanel) return;
                            setSelectedId(item.id);
                          }}
                          className={`cursor-pointer transition-colors hover:bg-slate-50 ${selected ? 'bg-blue-50/70' : 'bg-white'}`}
                        >
                          <td className="px-4 py-3">
                            <div>
                              <div className="font-medium text-slate-900">{item.equipment_name}</div>
                              <div className="mt-1 text-xs text-slate-500">Asset ID: {item.asset_id} • Tag: {item.device_id}</div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-700">{item.equipment_type}</td>
                          <td className="px-4 py-3 text-sm text-slate-700">{item.current_location}</td>
                          <td className="px-4 py-3">
                            <Badge className={`border ${statusBadgeClasses[item.displayStatus]}`}>
                              {statusLabel[item.displayStatus]}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-700">{formatDate(item.last_calibration)}</td>
                          <td className="px-4 py-3 text-sm text-slate-700">{formatDate(item.next_due)}</td>
                          <td className="px-4 py-3 text-sm font-medium text-slate-700">
                            {daysLeft === null ? '—' : daysLeft < 0 ? `${Math.abs(daysLeft)} overdue` : daysLeft}
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-700">{item.technician || '—'}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-slate-200 shadow-sm xl:col-span-4">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-4">
              <div>
                <CardTitle className="text-lg">Equipment details</CardTitle>
                <p className="mt-1 text-sm text-slate-500">
                  Review readiness and update calibration records.
                </p>
              </div>
              {!showMissingPanel && !creating && selectedRecord && !editing && (
                <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
                  Edit
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {showMissingPanel ? (
              <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
                Use the add workflow above to create calibration information for missing equipment.
              </div>
            ) : !selectedRecord && !editing ? (
              <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
                Select equipment from the worklist to view calibration details.
              </div>
            ) : editing ? (
              renderForm('Save changes')
            ) : selectedRecord ? (
              <>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-xl font-semibold text-slate-900">{selectedRecord.equipment_name}</h3>
                      <p className="mt-1 text-sm text-slate-500">{selectedRecord.equipment_type}</p>
                    </div>
                    <Badge className={`border ${statusBadgeClasses[selectedRecord.displayStatus]}`}>
                      {statusLabel[selectedRecord.displayStatus]}
                    </Badge>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                    <div className="rounded-xl bg-white p-3">
                      <div className="text-xs uppercase tracking-wide text-slate-500">Next due</div>
                      <div className="mt-1 font-medium text-slate-900">{formatDate(selectedRecord.next_due)}</div>
                    </div>
                    <div className="rounded-xl bg-white p-3">
                      <div className="text-xs uppercase tracking-wide text-slate-500">Location</div>
                      <div className="mt-1 font-medium text-slate-900">{selectedRecord.current_location}</div>
                    </div>
                  </div>
                </div>

                <div className="space-y-3 rounded-2xl border border-slate-200 p-4">
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-slate-500" />
                    <h4 className="font-medium text-slate-900">Record details</h4>
                  </div>
                  <dl className="space-y-3 text-sm">
                    <div className="flex items-start justify-between gap-4"><dt className="text-slate-500">Asset ID</dt><dd className="font-medium text-slate-900">{selectedRecord.asset_id}</dd></div>
                    <div className="flex items-start justify-between gap-4"><dt className="text-slate-500">Tag ID</dt><dd className="font-mono text-slate-900">{selectedRecord.device_id}</dd></div>
                    <div className="flex items-start justify-between gap-4"><dt className="text-slate-500">Department</dt><dd className="font-medium text-slate-900">{selectedRecord.department}</dd></div>
                    <div className="flex items-start justify-between gap-4"><dt className="text-slate-500">Ward</dt><dd className="font-medium text-slate-900">{selectedRecord.ward}</dd></div>
                    <div className="flex items-start justify-between gap-4"><dt className="text-slate-500">Last calibration</dt><dd className="font-medium text-slate-900">{formatDate(selectedRecord.last_calibration)}</dd></div>
                    <div className="flex items-start justify-between gap-4"><dt className="text-slate-500">Cycle</dt><dd className="font-medium text-slate-900">{selectedRecord.calibration_cycle_days || 180} days</dd></div>
                    <div className="flex items-start justify-between gap-4"><dt className="text-slate-500">Operational state</dt><dd className="font-medium text-slate-900">{operationalStateLabel[selectedRecord.operational_state || 'normal']}</dd></div>
                    <div className="flex items-start justify-between gap-4"><dt className="text-slate-500">Technician</dt><dd className="font-medium text-slate-900">{selectedRecord.technician || '—'}</dd></div>
                  </dl>
                </div>

                <div className="space-y-2 rounded-2xl border border-slate-200 p-4">
                  <h4 className="font-medium text-slate-900">Quick actions</h4>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <Button variant="outline" className="justify-start gap-2" onClick={markCompletedToday}>
                      <CheckCircle2 className="h-4 w-4" />
                      Mark calibrated today
                    </Button>
                    <Button variant="outline" className="justify-start gap-2" onClick={() => { setEditing(true); setForm((p) => ({ ...p, operational_state: 'in_calibration' })); }}>
                      <ClipboardCheck className="h-4 w-4" />
                      Start calibration
                    </Button>
                    <Button variant="outline" className="justify-start gap-2" onClick={() => { setEditing(true); setForm((p) => ({ ...p, operational_state: 'under_maintenance' })); }}>
                      <Wrench className="h-4 w-4" />
                      Move to maintenance
                    </Button>
                    <Button variant="outline" className="justify-start gap-2" onClick={openOnMap}>
                      <LocateFixed className="h-4 w-4" />
                      Locate on map
                    </Button>
                    <Button variant="outline" className="justify-start gap-2" onClick={openAsset}>
                      <ExternalLink className="h-4 w-4" />
                      Open assets
                    </Button>
                    <Button variant="outline" className="justify-start gap-2 text-rose-600" onClick={deleteRecord}>
                      <AlertTriangle className="h-4 w-4" />
                      Delete record
                    </Button>
                  </div>
                  {selectedRecord.notes ? (
                    <div className="rounded-xl bg-slate-50 p-3 text-sm text-slate-700">
                      <span className="font-medium text-slate-900">Notes:</span> {selectedRecord.notes}
                    </div>
                  ) : null}
                </div>
              </>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Calibration;
