import React, { useEffect, useMemo, useState } from 'react';
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
  MapPin,
  LocateFixed,
  RefreshCcw,
  Filter,
  Activity,
  Clock,
  AlertTriangle,
  Battery,
  Wifi,
  WifiOff,
  ScanSearch,
  Layers3,
} from 'lucide-react';

const motionLabelMap = {
  moving: 'Moving',
  stationary: 'Stationary',
  still: 'Still',
  vertical: 'Vertical',
};

const motionBadgeClasses = {
  moving: 'bg-blue-100 text-blue-700 border-blue-200',
  stationary: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  still: 'bg-slate-100 text-slate-700 border-slate-200',
  vertical: 'bg-violet-100 text-violet-700 border-violet-200',
  unknown: 'bg-slate-100 text-slate-500 border-slate-200',
};

const statusBadgeClasses = {
  available: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  moving: 'bg-blue-100 text-blue-700 border-blue-200',
  offline: 'bg-slate-200 text-slate-700 border-slate-300',
  maintenance_alert: 'bg-amber-100 text-amber-800 border-amber-200',
  admitted: 'bg-blue-100 text-blue-700 border-blue-200',
  active: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  on_duty: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  in_visit: 'bg-amber-100 text-amber-800 border-amber-200',
};

const alertBadgeClasses = {
  critical: 'bg-rose-100 text-rose-700 border-rose-200',
  warning: 'bg-amber-100 text-amber-800 border-amber-200',
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

const formatBattery = (entity) => {
  if (entity?.batteryPct !== null && entity?.batteryPct !== undefined) return `${entity.batteryPct}%`;
  if (entity?.battery === null || entity?.battery === undefined) return 'N/A';
  return `${entity.battery}`;
};

const StatCard = ({ title, value, icon: Icon, tone = 'default' }) => {
  const toneMap = {
    default: 'bg-white',
    success: 'bg-emerald-50',
    warning: 'bg-amber-50',
    danger: 'bg-rose-50',
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

const TrackingMapLayout = ({
  title = 'Tracking Map',
  subtitle = 'Live tracking view',
  floorPlan,
  entities = [],
  anchors = [],
  isLive = true,
  loading = false,
  pageType = 'asset',
  typeOptions = [],
  statusOptions = [],
  onRefresh,
  onLocate,
  onPrimaryAction,
  primaryActionLabel = 'Locate on map',
  searchPlaceholder = 'Search by name, ID, location...',
  emptyStateTitle = 'No tracked items found',
  emptyStateDescription = 'Try changing the filters or assignment setup.',
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedId, setSelectedId] = useState('');

  const rows = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return entities.filter((item) => {
      const matchesSearch =
        !query ||
        (item.title || '').toLowerCase().includes(query) ||
        (item.subtitle || '').toLowerCase().includes(query) ||
        (item.device_id || '').toLowerCase().includes(query) ||
        (item.location || '').toLowerCase().includes(query) ||
        (item.type || '').toLowerCase().includes(query);

      const matchesType = typeFilter === 'all' || item.type === typeFilter;
      const matchesStatus = statusFilter === 'all' || item.status === statusFilter;

      return matchesSearch && matchesType && matchesStatus;
    });
  }, [entities, searchQuery, typeFilter, statusFilter]);

  useEffect(() => {
    if (!rows.length) {
      setSelectedId('');
      return;
    }
    const exists = rows.some((item) => item.id === selectedId);
    if (!exists) setSelectedId(rows[0].id);
  }, [rows, selectedId]);

  const selectedEntity = useMemo(
    () => rows.find((item) => item.id === selectedId) || null,
    [rows, selectedId]
  );

  const stats = useMemo(() => {
    return {
      total: entities.length,
      online: entities.filter((item) => item.status !== 'offline').length,
      offline: entities.filter((item) => item.status === 'offline').length,
      alerts: entities.filter((item) => item.alertLabel).length,
    };
  }, [entities]);

  const mapWidth = floorPlan?.width || 1200;
  const mapHeight = floorPlan?.height || 700;
  const renderHeight = 720;
  const renderWidth = Math.max(980, Math.round((mapWidth / mapHeight) * renderHeight));

  const focusEntity = (entity) => {
    setSelectedId(entity.id);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">{title}</h1>
          <p className="mt-1 text-sm text-slate-600">{subtitle}</p>
        </div>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatCard title="Total" value={stats.total} icon={Layers3} />
          <StatCard title="Online" value={stats.online} icon={Wifi} tone="success" />
          <StatCard title="Offline" value={stats.offline} icon={WifiOff} tone="danger" />
          <StatCard title="Alerts" value={stats.alerts} icon={AlertTriangle} tone="warning" />
        </div>
      </div>

      <Card className="border border-slate-200 shadow-sm">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-12">
            <div className="relative lg:col-span-6">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={searchPlaceholder}
                className="pl-9"
              />
            </div>

            <div className="lg:col-span-3">
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All types</SelectItem>
                  {typeOptions.map((option) => (
                    <SelectItem key={option} value={option}>{option}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="lg:col-span-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All status</SelectItem>
                  {statusOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-end lg:col-span-1">
              <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                <Filter className="h-3.5 w-3.5" />
                {rows.length} / {entities.length}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
        <div className="space-y-5 xl:col-span-8">
          <div className="w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <div>
                <h3 className="text-base font-semibold text-slate-900">Live floor map</h3>
                <p className="mt-1 text-sm text-slate-500">
                  Anchor names are used as location labels across all tracking pages.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Badge className={`border px-3 py-1 text-sm ${isLive ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-300 bg-slate-100 text-slate-700'}`}>
                  {isLive ? <><Wifi className="mr-1.5 h-3.5 w-3.5" />Live</> : <><WifiOff className="mr-1.5 h-3.5 w-3.5" />Offline</>}
                </Badge>

                {onRefresh ? (
                  <Button variant="outline" onClick={onRefresh} className="gap-2">
                    <RefreshCcw className="h-4 w-4" />
                    Refresh
                  </Button>
                ) : null}
              </div>
            </div>

            <div className="p-4">
              <div className="flex justify-center">
                <svg
                  width={renderWidth}
                  height={renderHeight}
                  viewBox={`0 0 ${mapWidth} ${mapHeight}`}
                  preserveAspectRatio="xMidYMid meet"
                  className="max-w-full rounded-xl border border-slate-300 bg-slate-50"
                >
                  <defs>
                    <pattern id={`grid-${pageType}`} width="50" height="50" patternUnits="userSpaceOnUse">
                      <path d="M 50 0 L 0 0 0 50" fill="none" stroke="#E2E8F0" strokeWidth="1" />
                    </pattern>
                  </defs>

                  <rect width={mapWidth} height={mapHeight} fill={`url(#grid-${pageType})`} />

                  {floorPlan?.image ? (
                    <image
                      href={floorPlan.image}
                      width={mapWidth}
                      height={mapHeight}
                      preserveAspectRatio="xMidYMid meet"
                      opacity="0.88"
                    />
                  ) : null}

                  {anchors.map((anchor) => (
                    <g key={anchor.id}>
                      <circle cx={anchor.x} cy={anchor.y} r="10" fill="#10B981" stroke="#fff" strokeWidth="3" />
                      <text
                        x={anchor.x + 14}
                        y={anchor.y + 4}
                        fontSize="12"
                        fill="#0F172A"
                        fontWeight="700"
                        fontFamily="Inter, system-ui, sans-serif"
                      >
                        {anchor.name || anchor.device_id}
                      </text>
                    </g>
                  ))}

                  {rows.map((entity) => {
                    const selected = entity.id === selectedId;
                    const x = entity.x ?? null;
                    const y = entity.y ?? null;
                    if (x === null || y === null) return null;

                    const isCritical = entity.alertSeverity === 'critical';

                    return (
                      <g key={entity.id} onClick={() => focusEntity(entity)} style={{ cursor: 'pointer' }}>
                        <circle
                          cx={x}
                          cy={y}
                          r={selected ? 17 : 13}
                          fill={isCritical ? '#EF4444' : '#2563EB'}
                          stroke="#fff"
                          strokeWidth="3"
                        />
                        {selected ? (
                          <circle
                            cx={x}
                            cy={y}
                            r="25"
                            fill="none"
                            stroke={isCritical ? '#FCA5A5' : '#93C5FD'}
                            strokeWidth="3"
                          />
                        ) : null}
                        {entity.alertLabel ? (
                          <circle
                            cx={x + 12}
                            cy={y - 12}
                            r="7"
                            fill={isCritical ? '#DC2626' : '#F59E0B'}
                            stroke="#fff"
                            strokeWidth="2"
                          />
                        ) : null}
                        <text
                          x={x + 18}
                          y={y + 4}
                          fontSize="13"
                          fill="#0F172A"
                          fontWeight="700"
                          fontFamily="Inter, system-ui, sans-serif"
                        >
                          {entity.title}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-5 xl:col-span-4">
          <Card className="border border-slate-200 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">{title} list</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {loading ? (
                <div className="rounded-xl border border-dashed border-slate-300 p-10 text-center text-sm text-slate-500">
                  Loading tracked items…
                </div>
              ) : rows.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-300 p-10 text-center text-sm text-slate-500">
                  <div className="font-medium text-slate-900">{emptyStateTitle}</div>
                  <div className="mt-1">{emptyStateDescription}</div>
                </div>
              ) : (
                rows.map((entity) => {
                  const selected = entity.id === selectedId;
                  const motionKey = entity.motion_state && motionBadgeClasses[entity.motion_state] ? entity.motion_state : 'unknown';
                  const statusClass = statusBadgeClasses[entity.status] || statusBadgeClasses.available;

                  return (
                    <button
                      key={entity.id}
                      type="button"
                      onClick={() => focusEntity(entity)}
                      className={`w-full rounded-xl border p-4 text-left transition ${
                        selected ? 'border-blue-300 bg-blue-50' : 'border-slate-200 bg-white hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="truncate font-medium text-slate-900">{entity.title}</div>
                          <div className="mt-1 truncate text-sm text-slate-500">{entity.subtitle || entity.device_id}</div>
                        </div>
                        {selected ? <LocateFixed className="h-4 w-4 text-blue-600" /> : null}
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2">
                        {entity.status ? (
                          <Badge className={`border ${statusClass}`}>
                            {entity.status.replaceAll('_', ' ')}
                          </Badge>
                        ) : null}

                        <Badge className={`border ${motionBadgeClasses[motionKey]}`}>
                          {motionLabelMap[entity.motion_state] || 'Unknown'}
                        </Badge>

                        {entity.alertLabel ? (
                          <Badge className={`border ${alertBadgeClasses[entity.alertSeverity || 'warning']}`}>
                            {entity.alertLabel}
                          </Badge>
                        ) : null}
                      </div>

                      <div className="mt-3 text-sm text-slate-600">
                        {entity.location ? `Location: ${entity.location}` : 'Location unavailable'}
                      </div>
                    </button>
                  );
                })
              )}
            </CardContent>
          </Card>

          <Card className="border border-slate-200 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Selected details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {!selectedEntity ? (
                <div className="rounded-xl border border-dashed border-slate-300 p-10 text-center text-sm text-slate-500">
                  Select an item from the list or the map to view details.
                </div>
              ) : (
                <>
                  {selectedEntity.alertLabel ? (
                    <div className={`rounded-2xl border p-4 ${alertBadgeClasses[selectedEntity.alertSeverity || 'warning']}`}>
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4" />
                        <div className="font-medium">{selectedEntity.alertLabel}</div>
                      </div>
                      <div className="mt-1 text-sm">Device: {selectedEntity.device_id}</div>
                    </div>
                  ) : null}

                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="text-xl font-semibold text-slate-900">{selectedEntity.title}</h3>
                        <p className="mt-1 text-sm text-slate-500">{selectedEntity.subtitle || selectedEntity.device_id}</p>
                      </div>
                      {selectedEntity.status ? (
                        <Badge className={`border ${statusBadgeClasses[selectedEntity.status] || statusBadgeClasses.available}`}>
                          {selectedEntity.status.replaceAll('_', ' ')}
                        </Badge>
                      ) : null}
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                      <div className="rounded-xl bg-white p-3">
                        <div className="text-xs uppercase tracking-wide text-slate-500">Location</div>
                        <div className="mt-1 flex items-center gap-2 font-medium text-slate-900">
                          <MapPin className="h-4 w-4 text-slate-500" />
                          {selectedEntity.location || 'Unknown'}
                        </div>
                      </div>

                      <div className="rounded-xl bg-white p-3">
                        <div className="text-xs uppercase tracking-wide text-slate-500">Last seen</div>
                        <div className="mt-1 flex items-center gap-2 font-medium text-slate-900">
                          <Clock className="h-4 w-4 text-slate-500" />
                          {timeAgo(selectedEntity.last_seen)}
                        </div>
                      </div>

                      <div className="rounded-xl bg-white p-3">
                        <div className="text-xs uppercase tracking-wide text-slate-500">Motion</div>
                        <div className="mt-1 flex items-center gap-2 font-medium text-slate-900">
                          <Activity className="h-4 w-4 text-slate-500" />
                          {motionLabelMap[selectedEntity.motion_state] || 'Unknown'}
                        </div>
                      </div>

                      <div className="rounded-xl bg-white p-3">
                        <div className="text-xs uppercase tracking-wide text-slate-500">Battery</div>
                        <div className="mt-1 flex items-center gap-2 font-medium text-slate-900">
                          <Battery className="h-4 w-4 text-slate-500" />
                          {formatBattery(selectedEntity)}
                        </div>
                      </div>
                    </div>
                  </div>

                  {selectedEntity.details?.length ? (
                    <div className="space-y-3 rounded-2xl border border-slate-200 p-4">
                      <div className="flex items-center gap-2">
                        <ScanSearch className="h-4 w-4 text-slate-500" />
                        <h4 className="font-medium text-slate-900">Entity details</h4>
                      </div>

                      <dl className="space-y-3 text-sm">
                        {selectedEntity.details.map((item) => (
                          <div key={item.label} className="flex items-start justify-between gap-4">
                            <dt className="text-slate-500">{item.label}</dt>
                            <dd className="font-medium text-slate-900 text-right">{item.value || '—'}</dd>
                          </div>
                        ))}
                      </dl>
                    </div>
                  ) : null}

                  {onPrimaryAction ? (
                    <Button onClick={() => onPrimaryAction(selectedEntity)} className="w-full gap-2">
                      <LocateFixed className="h-4 w-4" />
                      {primaryActionLabel}
                    </Button>
                  ) : null}

                  {onLocate ? (
                    <Button variant="outline" onClick={() => onLocate(selectedEntity)} className="w-full gap-2">
                      <MapPin className="h-4 w-4" />
                      Open focused map action
                    </Button>
                  ) : null}
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default TrackingMapLayout;
