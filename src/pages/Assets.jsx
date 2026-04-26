import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  Wifi,
  WifiOff,
  Battery,
  MapPin,
  Clock,
  Activity,
  Wrench,
  Package,
  RefreshCcw,
  Filter,
  Save,
  X,
  AlertTriangle,
  LocateFixed,
  ChevronRight,
  ExternalLink,
  Siren,
  Bell,
} from 'lucide-react';
import { toast } from 'sonner';

<<<<<<< HEAD
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'https://assest-backend-z6uq.onrender.com';
=======
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000';
>>>>>>> 19e96b05e597b137c0b0c12445804d6a9c9bf51f
const API = `${BACKEND_URL}/api`;
const WS_URL = BACKEND_URL.replace(/^http/, 'ws');

const ACTIVE_ALERT_WINDOW_SECONDS = 60;
const CRITICAL_ALERT_EVENTS = ['free_fall', 'long_press'];

const ASSET_TYPES = [
  'Wheelchair',
  'Hospital Bed',
  'Ventilator',
  'Infusion Pump',
  'Syringe Pump',
  'Patient Monitor',
  'ECG Monitor',
  'Defibrillator',
  'Oxygen Cylinder',
  'Portable Ultrasound',
  'Crash Cart',
  'Stretcher',
  'Portable X-Ray',
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

const EMPTY_METADATA = {
  asset_name: '',
  asset_type: '',
  asset_id: '',
  department: '',
  ward: '',
  maintenance_status: 'none',
};

// --- Updated Battery Logic ---
const formatBattery = (battery) => {
  if (battery === null || battery === undefined || Number.isNaN(Number(battery))) return 'N/A';
  // Directly report the raw value in mV
  return `${Math.round(Number(battery))} mV`;
};

const isBatteryLow = (battery) => {
  if (battery === null || battery === undefined || Number.isNaN(Number(battery))) return false;
  // Trigger low battery amber color if voltage drops below 2400 mV
  return Number(battery) <= 2400; 
};
// ------------------------------

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

const motionLabelMap = {
  moving: 'Moving',
  stationary: 'Stationary',
  still: 'Still',
  vertical: 'Vertical',
  unknown: 'NA',
};

const motionBadgeClasses = {
  moving: 'bg-blue-100 text-blue-700 border-blue-200',
  stationary: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  still: 'bg-slate-100 text-slate-700 border-slate-200',
  vertical: 'bg-violet-100 text-violet-700 border-violet-200',
  unknown: 'bg-slate-100 text-slate-500 border-slate-200',
};

const alertEventMap = {
  free_fall: { label: 'Free fall', severity: 'critical' },
  long_press: { label: 'Emergency button', severity: 'critical' },
  btn_1click: { label: 'Button pressed once', severity: 'warning' },
  btn_2click: { label: 'Button pressed twice', severity: 'warning' },
};

const getAlertInfo = (event) => {
  if (!event) return null;
  return alertEventMap[event] || { label: event, severity: 'warning' };
};

const deriveOperationalStatus = (tag, metadata) => {
  if (tag?.status === 'offline') return 'offline';
  if (metadata?.maintenance_status === 'overdue') return 'maintenance_alert';
  // if (tag?.motion_state === 'moving') return 'moving';
  return 'available';
};

const statusBadgeClasses = {
  available: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  moving: 'bg-blue-100 text-blue-700 border-blue-200',
  offline: 'bg-slate-200 text-slate-700 border-slate-300',
  maintenance_alert: 'bg-amber-100 text-amber-800 border-amber-200',
};

const labelForOperationalStatus = {
  available: 'Available',
  moving: 'Moving',
  offline: 'Offline',
  maintenance_alert: 'Maintenance alert',
};

const alertBadgeClasses = {
  critical: 'bg-rose-100 text-rose-700 border-rose-200',
  warning: 'bg-amber-100 text-amber-800 border-amber-200',
};

const isActiveEmergencyAlert = (row) => {
  if (!row?.event || !row?.last_seen) return false;
  if (!CRITICAL_ALERT_EVENTS.includes(row.event)) return false;
  const seenAt = new Date(row.last_seen).getTime();
  if (Number.isNaN(seenAt)) return false;
  const ageSeconds = (Date.now() - seenAt) / 1000;
  return ageSeconds >= 0 && ageSeconds <= ACTIVE_ALERT_WINDOW_SECONDS;
};

const AlertModal = ({ open, onClose, alerts, onSelectAlert }) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Emergency alerts</h2>
            <p className="mt-1 text-sm text-slate-500">Only active critical alerts are shown here.</p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="max-h-[70vh] overflow-y-auto px-5 py-4">
          {alerts.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 p-10 text-center text-sm text-slate-500">
              No active emergency alerts right now.
            </div>
          ) : (
            <div className="space-y-3">
              {alerts.map((alert) => (
                <button
                  key={alert.device_id}
                  type="button"
                  onClick={() => onSelectAlert(alert.device_id)}
                  className="flex w-full items-start justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4 text-left transition hover:bg-slate-50"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Badge className={`border ${alertBadgeClasses[alert.alertInfo.severity]}`}>
                        {alert.alertInfo.label}
                      </Badge>
                      <span className="truncate font-medium text-slate-900">{alert.displayName}</span>
                    </div>
                    <div className="mt-1 text-sm text-slate-600">Tag: {alert.device_id}</div>
                    <div className="mt-1 text-sm text-slate-500">
                      {alert.currentLocation} • {timeAgo(alert.last_seen)}
                    </div>
                  </div>
                  <Bell className="mt-0.5 h-5 w-5 text-rose-600" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end border-t border-slate-200 px-5 py-4">
          <Button variant="outline" onClick={onClose}>Close</Button>
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ title, value, icon: Icon, tone = 'default', onClick }) => {
  const toneMap = {
    default: 'bg-white',
    success: 'bg-emerald-50',
    warning: 'bg-amber-50',
    danger: 'bg-rose-50',
  };

  return (
    <Card
      className={`${toneMap[tone]} border border-slate-200 shadow-sm ${onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}`}
      onClick={onClick}
    >
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

const Assets = () => {
  const navigate = useNavigate();
  const [tags, setTags] = useState([]);
  const [metadataMap, setMetadataMap] = useState({});
  const [patientAssignments, setPatientAssignments] = useState([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState('');
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(EMPTY_METADATA);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [zoneFilter, setZoneFilter] = useState('all');
  const [wsConnected, setWsConnected] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [alertsOpen, setAlertsOpen] = useState(false);
  const seenCriticalAlertsRef = useRef(new Set());

  const loadPatientAssignments = useCallback(() => {
    try {
      const saved = localStorage.getItem('patientTagAssignments');
      if (!saved) {
        setPatientAssignments([]);
        return;
      }
      const parsed = JSON.parse(saved);
      setPatientAssignments(parsed.filter((item) => item.status === 'active'));
    } catch (error) {
      console.error('Unable to read patient assignments', error);
      setPatientAssignments([]);
    }
  }, []);

  const loadAssetMetadata = useCallback(async () => {
    try {
      const response = await fetch(`${API}/assets/metadata`);
      if (!response.ok) throw new Error('Failed to load asset metadata');
      const data = await response.json();
      setMetadataMap(data || {});
    } catch (error) {
      console.error(error);
      toast.error('Could not load asset metadata');
      setMetadataMap({});
    }
  }, []);

  const loadInitialTags = useCallback(async () => {
    try {
      const response = await fetch(`${API}/tags/status`);
      if (!response.ok) throw new Error('Failed to load tag status');
      const data = await response.json();
      setTags(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(error);
      toast.error('Could not load live asset data');
      setTags([]);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    const boot = async () => {
      try {
        await Promise.all([loadInitialTags(), loadAssetMetadata()]);
        loadPatientAssignments();
      } finally {
        if (mounted) setInitialLoading(false);
      }
    };
    boot();
    return () => {
      mounted = false;
    };
  }, [loadAssetMetadata, loadInitialTags, loadPatientAssignments]);

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
            if (message.data.length === 0) return prev; // never wipe on empty
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

    const handleStorage = (event) => {
      if (event.key === 'patientTagAssignments') {
        loadPatientAssignments();
      }
    };

    window.addEventListener('storage', handleStorage);

    return () => {
      if (retryTimeout) clearTimeout(retryTimeout);
      if (ws) ws.close();
      window.removeEventListener('storage', handleStorage);
    };
  }, [loadPatientAssignments]);

  const rows = useMemo(() => {
    return tags.map((tag) => {
      const metadata = metadataMap[tag.device_id] || {};
      const patient = patientAssignments.find((item) => item.macId === tag.device_id);
      const operationalStatus = deriveOperationalStatus(tag, metadata);
      const alertInfo = getAlertInfo(tag.event);
      const currentLocation =
        tag?.location_name ||
        patient?.ward ||
        metadata?.ward ||
        tag?.zone_name ||
        tag?.position_ref ||
        'Unknown';

      const displayName =
        metadata?.asset_name ||
        metadata?.asset_type ||
        (patient ? `${patient.patientName} tag` : '') ||
        '-';

      return {
        ...tag,
        metadata,
        patient,
        operationalStatus,
        alertInfo,
        displayName,
        asset_type: metadata?.asset_type || '-',
        asset_id: metadata?.asset_id || '—',
        department: metadata?.department || '—',
        ward: metadata?.ward || patient?.ward || '—',
        currentLocation,
      };
    });
  }, [tags, metadataMap, patientAssignments]);

  const activeEmergencyAlerts = useMemo(() => {
    return rows
      .filter(isActiveEmergencyAlert)
      .sort((a, b) => new Date(b.last_seen || 0) - new Date(a.last_seen || 0));
  }, [rows]);

  useEffect(() => {
    const unseenCritical = activeEmergencyAlerts.filter((item) => !seenCriticalAlertsRef.current.has(item.device_id));
    if (unseenCritical.length > 0) {
      unseenCritical.forEach((item) => seenCriticalAlertsRef.current.add(item.device_id));
      setAlertsOpen(true);
    }
  }, [activeEmergencyAlerts]);

  const filteredRows = useMemo(() => {
      const rawQuery = searchQuery.trim().toLowerCase();
      
      // Split the search bar input by commas so you can search multiple items
      const searchTerms = rawQuery.split(',').map(term => term.trim()).filter(Boolean);

      return rows
        .filter((row) => {
          // Match if the search bar is empty, OR if the row matches ANY of the comma-separated terms
          const matchesSearch =
            searchTerms.length === 0 ||
            searchTerms.some((query) =>
              row.device_id?.toLowerCase().includes(query) ||
              row.displayName?.toLowerCase().includes(query) ||
              row.asset_type?.toLowerCase().includes(query) ||
              row.asset_id?.toLowerCase().includes(query) ||
              row.department?.toLowerCase().includes(query) ||
              row.currentLocation?.toLowerCase().includes(query) ||
              row.alertInfo?.label?.toLowerCase().includes(query) ||
              (motionLabelMap[row.motion_state] || '').toLowerCase().includes(query)
            );

          const matchesType = typeFilter === 'all' || row.asset_type === typeFilter;
          const matchesStatus = statusFilter === 'all' || row.operationalStatus === statusFilter;
          const matchesZone = zoneFilter === 'all' || row.currentLocation === zoneFilter;
          return matchesSearch && matchesType && matchesStatus && matchesZone;
        })
        .sort((a, b) => {
          const alertPriority = (item) => {
            if (isActiveEmergencyAlert(item)) return 0;
            if (item.alertInfo?.severity === 'warning') return 1;
            return 2;
          };
          const ap = alertPriority(a) - alertPriority(b);
          if (ap !== 0) return ap;

          const priority = {
            offline: 0,
            maintenance_alert: 1,
            moving: 2,
            available: 3,
          };
          const statusDiff = priority[a.operationalStatus] - priority[b.operationalStatus];
          if (statusDiff !== 0) return statusDiff;
          return a.displayName.localeCompare(b.displayName);
        });
    }, [rows, searchQuery, typeFilter, statusFilter, zoneFilter]);

  useEffect(() => {
    if (editing) return;
    if (!filteredRows.length) {
      setSelectedDeviceId('');
      setDraft(EMPTY_METADATA);
      return;
    }
    const exists = filteredRows.some((item) => item.device_id === selectedDeviceId);
    const nextId = exists ? selectedDeviceId : filteredRows[0].device_id;
    if (nextId !== selectedDeviceId) setSelectedDeviceId(nextId);
  }, [filteredRows, selectedDeviceId, editing]);

  const selectedRow = useMemo(
    () => filteredRows.find((item) => item.device_id === selectedDeviceId) || null,
    [filteredRows, selectedDeviceId]
  );

  useEffect(() => {
    if (!selectedRow) {
      setDraft(EMPTY_METADATA);
      setEditing(false);
      return;
    }
    if (editing) return;
    setDraft({
      asset_name: selectedRow.metadata?.asset_name || '',
      asset_type: selectedRow.metadata?.asset_type || '',
      asset_id: selectedRow.metadata?.asset_id || '',
      department: selectedRow.metadata?.department || '',
      ward: selectedRow.metadata?.ward || '',
      maintenance_status: selectedRow.metadata?.maintenance_status || 'none',
    });
  }, [selectedRow, editing]);

  const stats = useMemo(() => {
    const online = rows.filter((row) => row.status === 'online').length;
    return {
      total: rows.length,
      online,
      offline: rows.filter((row) => row.status === 'offline').length,
      emergencyAlerts: activeEmergencyAlerts.length,
      maintenanceAlert: rows.filter((row) => row.metadata?.maintenance_status === 'overdue').length,
    };
  }, [rows, activeEmergencyAlerts]);

  const zoneOptions = useMemo(() => {
    const set = new Set();
    rows.forEach((row) => {
      if (row.currentLocation && row.currentLocation !== 'Unknown') set.add(row.currentLocation);
    });
    return Array.from(set).sort();
  }, [rows]);

  const typeOptions = useMemo(() => {
    const set = new Set(ASSET_TYPES);
    rows.forEach((row) => {
      if (row.asset_type && row.asset_type !== '-') set.add(row.asset_type);
    });
    return Array.from(set).sort();
  }, [rows]);

  const saveMetadata = async () => {
    if (!selectedRow) return;
    setSaving(true);
    const payload = { device_id: selectedRow.device_id, ...draft };

    try {
      const response = await fetch(`${API}/assets/metadata/${selectedRow.device_id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error('Failed to save asset metadata');
      const result = await response.json();
      const savedData = result?.data || payload;
      setMetadataMap((prev) => ({ ...prev, [selectedRow.device_id]: savedData }));
      toast.success('Asset details saved');
      setEditing(false);
    } catch (error) {
      console.error(error);
      toast.error('Could not save asset details');
    } finally {
      setSaving(false);
    }
  };

  const openOnMap = () => {
    if (!selectedRow?.device_id) return;
    navigate(`/rtls?device_id=${encodeURIComponent(selectedRow.device_id)}`);
  };

  const openCalibration = () => navigate('/calibration');

  const focusAlert = (deviceId) => {
    setSelectedDeviceId(deviceId);
    setAlertsOpen(false);
    const row = rows.find((item) => item.device_id === deviceId);
    if (row?.alertInfo) {
      toast.info(`${row.alertInfo.label} • ${row.device_id}`);
    }
  };

  return (
    <div className="space-y-5">
      <AlertModal
        open={alertsOpen}
        onClose={() => setAlertsOpen(false)}
        alerts={activeEmergencyAlerts}
        onSelectAlert={focusAlert}
      />

      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Assets</h1>
          <p className="mt-1 text-sm text-slate-600">Track, locate, and manage hospital equipment in real time.</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Badge className={`border px-3 py-1 text-sm ${wsConnected ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-300 bg-slate-100 text-slate-700'}`}>
            {wsConnected ? <><Wifi className="mr-1.5 h-3.5 w-3.5" />Live</> : <><WifiOff className="mr-1.5 h-3.5 w-3.5" />Reconnecting</>}
          </Badge>

          <Button variant="outline" onClick={openCalibration} className="gap-2">
            <Wrench className="h-4 w-4" />
            Calibration
          </Button>

          <Button variant="outline" onClick={() => { loadInitialTags(); loadAssetMetadata(); loadPatientAssignments(); }} className="gap-2">
            <RefreshCcw className="h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
        <StatCard title="Total tracked" value={stats.total} icon={Package} />
        <StatCard title="Online" value={stats.online} icon={Wifi} tone="success" />
        <StatCard title="Offline" value={stats.offline} icon={WifiOff} tone="danger" />
        <StatCard
          title="Emergency alerts"
          value={stats.emergencyAlerts}
          icon={Siren}
          tone="danger"
          onClick={() => {
            if (stats.emergencyAlerts > 0) setAlertsOpen(true);
            else toast.info('No active emergency alerts');
          }}
        />
        <StatCard title="Maintenance alert" value={stats.maintenanceAlert} icon={Wrench} tone="warning" />
      </div>

      <Card className="border border-slate-200 shadow-sm">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-12">
            <div className="relative lg:col-span-5">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search asset, tag ID, ward, alert..." className="pl-9" />
            </div>

            <div className="lg:col-span-2">
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger><SelectValue placeholder="Asset type" /></SelectTrigger>
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
                  <SelectItem value="available">Available</SelectItem>
                  {/* <SelectItem value="moving">Moving</SelectItem> */}
                  <SelectItem value="offline">Offline</SelectItem>
                  <SelectItem value="maintenance_alert">Maintenance alert</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="lg:col-span-2">
              <Select value={zoneFilter} onValueChange={setZoneFilter}>
                <SelectTrigger><SelectValue placeholder="Location" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All locations</SelectItem>
                  {zoneOptions.map((zone) => <SelectItem key={zone} value={zone}>{zone}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-end lg:col-span-1">
              <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                <Filter className="h-3.5 w-3.5" />
                {filteredRows.length} / {rows.length}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
        <Card className="border border-slate-200 shadow-sm xl:col-span-8">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Asset list</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="min-w-full text-left">
                <thead className="border-y border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3 font-medium">Asset</th>
                    <th className="px-4 py-3 font-medium">Type</th>
                    <th className="px-4 py-3 font-medium">Location</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Motion</th>
                    <th className="px-4 py-3 font-medium">Alert</th>
                    <th className="px-4 py-3 font-medium">Battery</th>
                    <th className="px-4 py-3 font-medium">Last seen</th>
                    <th className="px-4 py-3 font-medium">Tag ID</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {initialLoading ? (
                    <tr>
                      <td colSpan={9} className="px-4 py-12 text-center text-sm text-slate-500">Loading assets…</td>
                    </tr>
                  ) : filteredRows.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-4 py-12 text-center text-sm text-slate-500">No assets match this filter.</td>
                    </tr>
                  ) : (
                    filteredRows.map((row) => {
                      const selected = row.device_id === selectedDeviceId;
                      const motionKey = row.motion_state && motionBadgeClasses[row.motion_state] ? row.motion_state : 'unknown';
                      return (
                        <tr
                          key={row.device_id}
                          onClick={() => {
                            setSelectedDeviceId(row.device_id);
                            setEditing(false);
                          }}
                          className={`cursor-pointer transition-colors hover:bg-slate-50 ${selected ? 'bg-blue-50/70' : 'bg-white'}`}
                        >
                          <td className="px-4 py-3">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <div className="font-medium text-slate-900">{row.displayName}</div>
                                <div className="mt-1 text-xs text-slate-500">Asset ID: {row.asset_id} {row.patient ? `• Patient tag` : ''}</div>
                              </div>
                              {selected && <ChevronRight className="mt-0.5 h-4 w-4 text-blue-600" />}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-700">{row.asset_type}</td>
                          <td className="px-4 py-3 text-sm text-slate-700">{row.currentLocation}</td>
                          <td className="px-4 py-3">
                            <Badge className={`border ${statusBadgeClasses[row.operationalStatus]}`}>
                              {labelForOperationalStatus[row.operationalStatus]}
                            </Badge>
                          </td>
                          <td className="px-4 py-3">
                            <Badge className={`border ${motionBadgeClasses[motionKey]}`}>
                              {motionLabelMap[row.motion_state] || 'NA'}
                            </Badge>
                          </td>
                          <td className="px-4 py-3">
                            {isActiveEmergencyAlert(row) ? (
                              <Badge className={`border ${alertBadgeClasses[row.alertInfo.severity]}`}>
                                {row.alertInfo.label}
                              </Badge>
                            ) : (
                              <span className="text-sm text-slate-400">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2 text-sm text-slate-700">
                              <Battery className={`h-4 w-4 ${isBatteryLow(row.battery) ? 'text-amber-600' : 'text-slate-500'}`} />
                              {formatBattery(row.battery)}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-700">{timeAgo(row.last_seen)}</td>
                          <td className="px-4 py-3 text-xs font-mono text-slate-500">{row.device_id}</td>
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
                <CardTitle className="text-lg">Selected asset</CardTitle>
                <p className="mt-1 text-sm text-slate-500">View live status, motion, alerts, and metadata.</p>
              </div>
              {selectedRow && !editing && (
                <Button variant="outline" size="sm" onClick={() => setEditing(true)}>Edit</Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {!selectedRow ? (
              <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
                Select an asset from the table to view details.
              </div>
            ) : (
              <>
                {isActiveEmergencyAlert(selectedRow) ? (
                  <div className={`rounded-2xl border p-4 ${alertBadgeClasses[selectedRow.alertInfo.severity]}`}>
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4" />
                          <h3 className="font-semibold">{selectedRow.alertInfo.label}</h3>
                        </div>
                        <p className="mt-1 text-sm">Tag {selectedRow.device_id} triggered this alert.</p>
                        <p className="mt-1 text-sm">Location: {selectedRow.currentLocation}</p>
                      </div>
                      <Bell className="h-5 w-5" />
                    </div>
                  </div>
                ) : null}

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-xl font-semibold text-slate-900">{selectedRow.displayName}</h3>
                      <p className="mt-1 text-sm text-slate-500">{selectedRow.asset_type}</p>
                    </div>
                    <Badge className={`border ${statusBadgeClasses[selectedRow.operationalStatus]}`}>
                      {labelForOperationalStatus[selectedRow.operationalStatus]}
                    </Badge>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                    <div className="rounded-xl bg-white p-3">
                      <div className="text-xs uppercase tracking-wide text-slate-500">Current location</div>
                      <div className="mt-1 flex items-center gap-2 font-medium text-slate-900">
                        <MapPin className="h-4 w-4 text-slate-500" />
                        {selectedRow.currentLocation}
                      </div>
                    </div>

                    <div className="rounded-xl bg-white p-3">
                      <div className="text-xs uppercase tracking-wide text-slate-500">Last seen</div>
                      <div className="mt-1 flex items-center gap-2 font-medium text-slate-900">
                        <Clock className="h-4 w-4 text-slate-500" />
                        {timeAgo(selectedRow.last_seen)}
                      </div>
                    </div>

                    <div className="rounded-xl bg-white p-3">
                      <div className="text-xs uppercase tracking-wide text-slate-500">Battery</div>
                      <div className="mt-1 flex items-center gap-2 font-medium text-slate-900">
                        <Battery className={`h-4 w-4 ${isBatteryLow(selectedRow.battery) ? 'text-amber-600' : 'text-slate-500'}`} />
                        {formatBattery(selectedRow.battery)}
                      </div>
                    </div>

                    <div className="rounded-xl bg-white p-3">
                      <div className="text-xs uppercase tracking-wide text-slate-500">Motion</div>
                      <div className="mt-1 flex items-center gap-2 font-medium text-slate-900">
                        <Activity className="h-4 w-4 text-slate-500" />
                        {motionLabelMap[selectedRow.motion_state] || 'Unknown'}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-3 rounded-2xl border border-slate-200 p-4">
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-slate-500" />
                    <h4 className="font-medium text-slate-900">Asset details</h4>
                  </div>

                  {editing ? (
                    <div className="space-y-3">
                      <div className="space-y-1.5">
                        <label className="text-sm font-medium text-slate-700">Asset name</label>
                        <Input value={draft.asset_name} onChange={(e) => setDraft((prev) => ({ ...prev, asset_name: e.target.value }))} />
                      </div>

                      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                        <div className="space-y-1.5">
                          <label className="text-sm font-medium text-slate-700">Asset type</label>
                          <Select value={draft.asset_type || 'empty'} onValueChange={(value) => setDraft((prev) => ({ ...prev, asset_type: value === 'empty' ? '' : value }))}>
                            <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="empty">Not set</SelectItem>
                              {typeOptions.map((type) => <SelectItem key={type} value={type}>{type}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-sm font-medium text-slate-700">Asset ID</label>
                          <Input value={draft.asset_id} onChange={(e) => setDraft((prev) => ({ ...prev, asset_id: e.target.value }))} />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-sm font-medium text-slate-700">Department</label>
                          <Input value={draft.department} onChange={(e) => setDraft((prev) => ({ ...prev, department: e.target.value }))} />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-sm font-medium text-slate-700">Ward / zone</label>
                          <Select value={draft.ward || 'empty'} onValueChange={(value) => setDraft((prev) => ({ ...prev, ward: value === 'empty' ? '' : value }))}>
                            <SelectTrigger><SelectValue placeholder="Select ward" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="empty">Not set</SelectItem>
                              {WARDS.map((ward) => <SelectItem key={ward} value={ward}>{ward}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-1.5 md:col-span-2">
                          <label className="text-sm font-medium text-slate-700">Maintenance status</label>
                          <Select value={draft.maintenance_status || 'none'} onValueChange={(value) => setDraft((prev) => ({ ...prev, maintenance_status: value }))}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">No issue</SelectItem>
                              <SelectItem value="scheduled">Scheduled</SelectItem>
                              <SelectItem value="due_soon">Due soon</SelectItem>
                              <SelectItem value="overdue">Overdue</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 pt-1">
                        <Button onClick={saveMetadata} disabled={saving} className="gap-2">
                          <Save className="h-4 w-4" />
                          {saving ? 'Saving...' : 'Save asset'}
                        </Button>
                        <Button variant="outline" onClick={() => { setEditing(false); if (selectedRow) { setDraft({ asset_name: selectedRow.metadata?.asset_name || '', asset_type: selectedRow.metadata?.asset_type || '', asset_id: selectedRow.metadata?.asset_id || '', department: selectedRow.metadata?.department || '', ward: selectedRow.metadata?.ward || '', maintenance_status: selectedRow.metadata?.maintenance_status || 'none' }); } }} className="gap-2">
                          <X className="h-4 w-4" />
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <dl className="space-y-3 text-sm">
                      <div className="flex items-start justify-between gap-4"><dt className="text-slate-500">Asset ID</dt><dd className="font-medium text-slate-900">{selectedRow.asset_id}</dd></div>
                      <div className="flex items-start justify-between gap-4"><dt className="text-slate-500">Tag ID</dt><dd className="font-mono text-slate-900">{selectedRow.device_id}</dd></div>
                      <div className="flex items-start justify-between gap-4"><dt className="text-slate-500">Department</dt><dd className="font-medium text-slate-900">{selectedRow.department}</dd></div>
                      <div className="flex items-start justify-between gap-4"><dt className="text-slate-500">Ward</dt><dd className="font-medium text-slate-900">{selectedRow.ward}</dd></div>
                      <div className="flex items-start justify-between gap-4"><dt className="text-slate-500">Motion state</dt><dd className="font-medium text-slate-900">{motionLabelMap[selectedRow.motion_state] || 'Unknown'}</dd></div>
                      <div className="flex items-start justify-between gap-4"><dt className="text-slate-500">Maintenance</dt><dd className="font-medium text-slate-900">{selectedRow.metadata?.maintenance_status || 'none'}</dd></div>
                    </dl>
                  )}
                </div>

                <div className="space-y-2 rounded-2xl border border-slate-200 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <h4 className="font-medium text-slate-900">Quick actions</h4>
                    <Button variant="ghost" size="sm" onClick={openCalibration} className="gap-2">
                      <ExternalLink className="h-4 w-4" />
                      Calibration
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <Button variant="outline" className="justify-start gap-2" onClick={openOnMap}>
                      <LocateFixed className="h-4 w-4" />
                      Locate on map
                    </Button>
                    <Button variant="outline" className="justify-start gap-2" onClick={() => toast.info(`History API: /api/tags/${selectedRow.device_id}/history`)}>
                      <Clock className="h-4 w-4" />
                      View history
                    </Button>
                    <Button variant="outline" className="justify-start gap-2" onClick={() => { setEditing(true); setDraft((prev) => ({ ...prev, maintenance_status: 'overdue' })); }}>
                      <AlertTriangle className="h-4 w-4" />
                      Mark maintenance
                    </Button>
                    <Button variant="outline" className="justify-start gap-2" onClick={() => setEditing(true)}>
                      <Package className="h-4 w-4" />
                      Reassign details
                    </Button>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

<<<<<<< HEAD
export default Assets;
=======
export default Assets;
>>>>>>> 19e96b05e597b137c0b0c12445804d6a9c9bf51f
