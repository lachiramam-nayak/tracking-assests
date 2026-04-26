import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import {
  AlertTriangle,
  ArrowRight,
  Bed,
  Box,
  Map,
  RefreshCcw,
  Settings,
  Shield,
  UserCheck,
  Users,
  Wifi,
  WifiOff,
  Stethoscope,
  Building2,
  ClipboardCheck,
  Activity,
} from 'lucide-react';
// NEW: Added Recharts imports for enterprise visualizations
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, Cell,
  PieChart, Pie
} from 'recharts';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'https://assest-backend-z6uq.onrender.com';
const API = `${BACKEND_URL}/api`;
const WS_URL = BACKEND_URL.replace(/^http/, 'ws');
const PEOPLE_STORAGE_KEY = 'peopleTagAssignments';

const Home = () => {
  const [stats, setStats] = useState({
    total_assets: 0,
    active_assets: 0,
    alerts: 0,
    offline_assets: 0,
  });
  const [peopleAssignments, setPeopleAssignments] = useState([]);
  const [wsConnected, setWsConnected] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  useEffect(() => {
    let ws;
    let retryTimeout;

    const loadStats = async () => {
      try {
        const response = await fetch(`${API}/stats`);
        const data = await response.json();
        setStats(data || {});
        setLastUpdated(new Date());
      } catch (error) {
        console.error('Error loading stats:', error);
        toast.error('Could not load dashboard summary');
      }
    };

    const loadPeopleAssignments = () => {
      try {
        const saved = localStorage.getItem(PEOPLE_STORAGE_KEY);
        const parsed = saved ? JSON.parse(saved) : [];
        setPeopleAssignments(Array.isArray(parsed) ? parsed : []);
      } catch (error) {
        console.error(error);
        setPeopleAssignments([]);
      }
    };

    const connect = () => {
      ws = new WebSocket(`${WS_URL}/api/ws/rtls`);
      ws.onopen = () => setWsConnected(true);
      ws.onerror = () => setWsConnected(false);
      ws.onclose = () => {
        setWsConnected(false);
        retryTimeout = setTimeout(connect, 3000);
      };
    };

    loadStats();
    loadPeopleAssignments();
    connect();

    const interval = setInterval(loadStats, 10000);

    const handleStorage = (event) => {
      if (event.key === PEOPLE_STORAGE_KEY) {
        loadPeopleAssignments();
      }
    };

    window.addEventListener('storage', handleStorage);

    return () => {
      clearInterval(interval);
      window.removeEventListener('storage', handleStorage);
      if (retryTimeout) clearTimeout(retryTimeout);
      if (ws) ws.close();
    };
  }, []);

  const peopleStats = useMemo(() => {
    const active = peopleAssignments.filter((item) => item.status === 'active');
    return {
      patients: active.filter((item) => item.entity_type === 'patient').length,
      staff: active.filter((item) => item.entity_type === 'staff').length,
      visitors: active.filter((item) => item.entity_type === 'visitor').length,
      total: active.length,
    };
  }, [peopleAssignments]);

  const summaryCards = [
    {
      title: 'Tracked assets',
      value: stats.total_assets || 0,
      icon: Box,
      tone: 'border-blue-200 bg-blue-50',
      link: '/assets',
      linkLabel: 'Open Assets',
    },
    {
      title: 'Live online',
      value: stats.active_assets || 0,
      icon: Wifi,
      tone: 'border-emerald-200 bg-emerald-50',
      link: '/asset-map',
      linkLabel: 'Open Asset Map',
    },
    {
      title: 'Active alerts',
      value: stats.alerts || 0,
      icon: AlertTriangle,
      tone: 'border-rose-200 bg-rose-50',
      link: '/assets',
      linkLabel: 'Review alerts',
    },
    {
      title: 'Offline tags',
      value: stats.offline_assets || 0,
      icon: WifiOff,
      tone: 'border-slate-200 bg-slate-100',
      link: '/assets',
      linkLabel: 'Check offline',
    },
    {
      title: 'People assigned',
      value: peopleStats.total,
      icon: UserCheck,
      tone: 'border-violet-200 bg-violet-50',
      link: '/patient-tags',
      linkLabel: 'Open People Tags',
    },
    {
      title: 'Patients live',
      value: peopleStats.patients,
      icon: Bed,
      tone: 'border-cyan-200 bg-cyan-50',
      link: '/patient-map',
      linkLabel: 'Open Patient Map',
    },
  ];

  const quickActions = [
    {
      title: 'Asset Map',
      description: 'Open the live map filtered only for asset-assigned tags.',
      icon: Map,
      link: '/asset-map',
    },
    {
      title: 'Patient Map',
      description: 'Track patient-tag movement and location in one view.',
      icon: Bed,
      link: '/patient-map',
    },
    {
      title: 'Staff Map',
      description: 'Monitor staff-tag assignments, role coverage, and live presence.',
      icon: Users,
      link: '/staff-map',
    },
    {
      title: 'Visitor Map',
      description: 'Review visitor-tag movement and allowed-zone visibility.',
      icon: Shield,
      link: '/visitor-map',
    },
    {
      title: 'People Tags',
      description: 'Assign or unassign tags for patients, staff, and visitors.',
      icon: UserCheck,
      link: '/patient-tags',
    },
    {
      title: 'Setup',
      description: 'Manage floor plans and anchor naming for location labels everywhere.',
      icon: Settings,
      link: '/floor-plan',
    },
  ];

  const workflowCards = [
    {
      title: 'Assets',
      icon: Box,
      bullets: [
        'Assign tags to equipment in Assets',
        'View only asset tags in Asset Map',
        'Monitor maintenance and alerts',
      ],
      link: '/assets',
    },
    {
      title: 'People',
      icon: Users,
      bullets: [
        'Assign tags for patient, staff, and visitor',
        'Reuse tags after mark reusable and unassign',
        'Drive Patient, Staff, and Visitor maps',
      ],
      link: '/patient-tags',
    },
    {
      title: 'Operations',
      icon: Stethoscope,
      bullets: [
        'Monitor OT Status and patient movement',
        'Track calibration workflow and due items',
        'Use live maps for immediate location context',
      ],
      link: '/ot-status',
    },
  ];

  // NEW: Chart data formatting mapped directly to your state variables
  const assetChartData = [
    { name: 'Online', value: stats.active_assets || 0, color: '#10b981' }, // Emerald
    { name: 'Offline', value: stats.offline_assets || 0, color: '#cbd5e1' }, // Slate
  ];

  const peopleChartData = [
    { name: 'Patients', count: peopleStats.patients, color: '#3b82f6' }, // Blue
    { name: 'Staff', count: peopleStats.staff, color: '#8b5cf6' }, // Violet
    { name: 'Visitors', count: peopleStats.visitors, color: '#f59e0b' }, // Amber
  ];

  return (
    <div className="space-y-8">
      <div className="rounded-3xl border border-slate-200 bg-gradient-to-r from-blue-50 via-white to-slate-50 p-8 shadow-sm lg:p-10">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
          <div className="max-w-4xl">
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <Badge className={`border ${wsConnected ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-300 bg-slate-100 text-slate-700'}`}>
                {wsConnected ? (
                  <>
                    <Wifi className="mr-1.5 h-3.5 w-3.5" />
                    Live system connected
                  </>
                ) : (
                  <>
                    <WifiOff className="mr-1.5 h-3.5 w-3.5" />
                    Reconnecting
                  </>
                )}
              </Badge>

              <Badge className="border border-slate-200 bg-white text-slate-700">
                <Building2 className="mr-1.5 h-3.5 w-3.5" />
                Hospital RTLS operations
              </Badge>
            </div>

            <h1 className="text-4xl font-semibold tracking-tight text-slate-900 lg:text-5xl">
              Hospital command dashboard
            </h1>
            <p className="mt-3 max-w-3xl text-base text-slate-600 lg:text-lg">
              Get one clear operational summary of assets, people tags, live maps, setup status, and workflow screens without jumping across modules first.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                to="/asset-map"
                className="inline-flex items-center gap-2 rounded-xl bg-[#006CDD] px-5 py-3 font-medium text-white transition hover:bg-[#0056b3]"
              >
                <Map className="h-4 w-4" />
                Open live maps
              </Link>

              <Link
                to="/patient-tags"
                className="inline-flex items-center gap-2 rounded-xl border border-[#006CDD] bg-white px-5 py-3 font-medium text-[#006CDD] transition hover:bg-blue-50"
              >
                <UserCheck className="h-4 w-4" />
                Manage people tags
              </Link>

              <Button variant="outline" onClick={() => window.location.reload()} className="gap-2">
                <RefreshCcw className="h-4 w-4" />
                Refresh overview
              </Button>
            </div>
          </div>

          <Card className="min-w-[280px] border border-slate-200 shadow-sm bg-white">
            <CardContent className="p-5">
              <div className="text-sm text-slate-500 font-semibold">Operational snapshot</div>
              <div className="mt-4 space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Assets online</span>
                  <span className="font-semibold text-slate-900">{stats.active_assets || 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">People tagged</span>
                  <span className="font-semibold text-slate-900">{peopleStats.total}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Patients tracked</span>
                  <span className="font-semibold text-slate-900">{peopleStats.patients}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Alerts needing review</span>
                  <span className={`font-semibold ${stats.alerts > 0 ? 'text-rose-600' : 'text-slate-900'}`}>{stats.alerts || 0}</span>
                </div>
                <div className="border-t border-slate-200 pt-3 text-xs text-slate-500">
                  Updated {lastUpdated.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', second: '2-digit' })}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* NEW: Enterprise Visualization Row injected here */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border border-slate-200 shadow-sm bg-white">
          <CardHeader className="pb-2 border-b border-slate-100">
            <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-500">Live People Distribution</CardTitle>
          </CardHeader>
          <CardContent className="pt-6 h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={peopleChartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b', fontWeight: 600 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#cbd5e1' }} />
                <RechartsTooltip cursor={{ fill: '#f1f5f9' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <Bar dataKey="count" radius={[6, 6, 0, 0]} maxBarSize={60}>
                  {peopleChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border border-slate-200 shadow-sm bg-white">
          <CardHeader className="pb-0 border-b border-slate-100">
            <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-4">Asset Connectivity Status</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center pt-4">
            <div className="h-[180px] w-full relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={assetChartData}
                    cx="50%" cy="50%"
                    innerRadius={60} outerRadius={80}
                    paddingAngle={5} dataKey="value"
                  >
                    {assetChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <RechartsTooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-3xl font-bold text-slate-900">{stats.total_assets}</span>
                <span className="text-[10px] uppercase font-bold text-slate-400">Total</span>
              </div>
            </div>
            <div className="flex justify-center gap-6 mt-4">
              {assetChartData.map(item => (
                <div key={item.name} className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <div className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: item.color }}></div>
                  {item.name} ({item.value})
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
      {/* END NEW VISUALIZATIONS */}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-6">
        {summaryCards.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.title} className={`border shadow-sm ${card.tone}`}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-sm font-medium text-slate-500">{card.title}</div>
                    <div className="mt-2 text-3xl font-semibold text-slate-900">{card.value}</div>
                    <Link
                      to={card.link}
                      className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-[#006CDD] hover:underline"
                    >
                      {card.linkLabel}
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                  <div className="rounded-2xl bg-white p-3 shadow-sm">
                    <Icon className="h-6 w-6 text-slate-700" />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        <Card className="border border-slate-200 shadow-sm xl:col-span-8">
          <CardHeader>
            <CardTitle className="text-xl">Quick actions</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <Link key={action.title} to={action.link} className="group">
                  <div className="h-full rounded-2xl border border-slate-200 bg-white p-5 transition hover:border-[#006CDD] hover:shadow-md">
                    <div className="mb-4 inline-flex rounded-2xl bg-blue-50 p-3 text-[#006CDD] transition group-hover:scale-105">
                      <Icon className="h-6 w-6" />
                    </div>
                    <div className="text-lg font-semibold text-slate-900">{action.title}</div>
                    <p className="mt-2 text-sm text-slate-600">{action.description}</p>
                    <div className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-[#006CDD]">
                      Open
                      <ArrowRight className="h-3.5 w-3.5" />
                    </div>
                  </div>
                </Link>
              );
            })}
          </CardContent>
        </Card>

        <Card className="border border-slate-200 shadow-sm xl:col-span-4">
          <CardHeader>
            <CardTitle className="text-xl">System guide</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {workflowCards.map((item) => {
              const Icon = item.icon;
              return (
                <Link key={item.title} to={item.link} className="block rounded-2xl border border-slate-200 p-4 transition hover:bg-slate-50">
                  <div className="flex items-start gap-3">
                    <div className="rounded-xl bg-slate-100 p-2">
                      <Icon className="h-5 w-5 text-slate-700" />
                    </div>
                    <div>
                      <div className="font-semibold text-slate-900">{item.title}</div>
                      <ul className="mt-2 space-y-1 text-sm text-slate-600">
                        {item.bullets.map((bullet) => (
                          <li key={bullet}>• {bullet}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </Link>
              );
            })}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="border border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Tracking overview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Asset map</span>
              <Link to="/asset-map" className="font-medium text-[#006CDD] hover:underline">Open</Link>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Patient map</span>
              <Link to="/patient-map" className="font-medium text-[#006CDD] hover:underline">Open</Link>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Staff map</span>
              <Link to="/staff-map" className="font-medium text-[#006CDD] hover:underline">Open</Link>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Visitor map</span>
              <Link to="/visitor-map" className="font-medium text-[#006CDD] hover:underline">Open</Link>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Operations overview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Calibration</span>
              <Link to="/calibration" className="font-medium text-[#006CDD] hover:underline">Open</Link>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">OT status</span>
              <Link to="/ot-status" className="font-medium text-[#006CDD] hover:underline">Open</Link>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Assets</span>
              <Link to="/assets" className="font-medium text-[#006CDD] hover:underline">Open</Link>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Configuration overview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-slate-500">People tags</span>
              <Link to="/patient-tags" className="font-medium text-[#006CDD] hover:underline">Open</Link>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Floor setup</span>
              <Link to="/floor-plan" className="font-medium text-[#006CDD] hover:underline">Open</Link>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Legacy RTLS</span>
              <Link to="/rtls" className="font-medium text-[#006CDD] hover:underline">Open</Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Home;
