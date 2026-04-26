import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { toast } from 'sonner';
import { 
  Activity, 
  AlertTriangle, 
  Users, 
  Box,
  Search,
  Upload,
  MapPin,
  Clock,
  Battery,
  Circle
} from 'lucide-react';
import FloorPlanCanvas from './FloorPlanCanvas';
import AssetTable from './AssetTable';
import HistoricalTrace from './HistoricalTrace';
import FloorPlanManager from './FloorPlanManager';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'https://assest-backend-z6uq.onrender.com';

const API = `${BACKEND_URL}/api`;
const WS_URL = BACKEND_URL.replace('http', 'ws');

const Dashboard = () => {
  const [tags, setTags] = useState([]);
  const [stats, setStats] = useState({
    total_assets: 0,
    active_assets: 0,
    alerts: 0,
    offline_assets: 0
  });
  const [floorPlan, setFloorPlan] = useState(null);
  const [selectedTag, setSelectedTag] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [wsConnected, setWsConnected] = useState(false);
  const [activeTab, setActiveTab] = useState('monitor');

  // Load floor plan
  const loadFloorPlan = useCallback(async () => {
    try {
      const response = await fetch(`${API}/floor-plan`);
      const data = await response.json();
      setFloorPlan(data);
    } catch (error) {
      console.error('Error loading floor plan:', error);
    }
  }, []);

  // Load stats
  const loadStats = useCallback(async () => {
    try {
      const response = await fetch(`${API}/stats`);
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  }, []);

  // WebSocket connection
  useEffect(() => {
    let ws;
    let reconnectTimeout;

    const connect = () => {
      ws = new WebSocket(`${WS_URL}/api/ws/rtls`);

      ws.onopen = () => {
        setWsConnected(true);
        console.log('WebSocket connected');
      };

      ws.onmessage = (event) => {
        const message = JSON.parse(event.data);
        if (message.type === 'tag_update') {
          setTags(message.data);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setWsConnected(false);
      };

      ws.onclose = () => {
        setWsConnected(false);
        console.log('WebSocket disconnected, reconnecting...');
        reconnectTimeout = setTimeout(connect, 3000);
      };
    };

    connect();
    loadFloorPlan();
    loadStats();

    // Refresh stats every 10 seconds
    const statsInterval = setInterval(loadStats, 10000);

    return () => {
      if (ws) ws.close();
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      clearInterval(statsInterval);
    };
  }, [loadFloorPlan, loadStats]);

  // Filter tags based on search
  const filteredTags = tags.filter(tag => 
    tag.device_id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {/* Logo Placeholder */}
              <div className="w-48 h-12 bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg flex items-center justify-center border-2 border-dashed border-blue-300">
                <span className="text-sm font-medium text-blue-600">Company Logo</span>
              </div>
              <div className="h-8 w-px bg-gray-300"></div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900" data-testid="dashboard-title">RTLS Monitor</h1>
                <p className="text-sm text-gray-500">Real-Time Location System</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2" data-testid="connection-status">
                <Circle 
                  className={`w-2 h-2 ${wsConnected ? 'fill-green-500 text-green-500' : 'fill-red-500 text-red-500'}`} 
                />
                <span className="text-sm text-gray-600">
                  {wsConnected ? 'Connected' : 'Disconnected'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="p-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <Card className="bg-white border-gray-200 hover:shadow-lg transition-shadow duration-300" data-testid="stat-card-total">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total Assets</CardTitle>
              <Box className="w-5 h-5 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900">{stats.total_assets}</div>
              <p className="text-xs text-gray-500 mt-1">Monitored devices</p>
            </CardContent>
          </Card>

          <Card className="bg-white border-gray-200 hover:shadow-lg transition-shadow duration-300" data-testid="stat-card-active">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Active Assets</CardTitle>
              <Activity className="w-5 h-5 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">{stats.active_assets}</div>
              <p className="text-xs text-gray-500 mt-1">Currently online</p>
            </CardContent>
          </Card>

          <Card className="bg-white border-gray-200 hover:shadow-lg transition-shadow duration-300" data-testid="stat-card-alerts">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Alerts</CardTitle>
              <AlertTriangle className="w-5 h-5 text-amber-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-amber-600">{stats.alerts}</div>
              <p className="text-xs text-gray-500 mt-1">Require attention</p>
            </CardContent>
          </Card>

          <Card className="bg-white border-gray-200 hover:shadow-lg transition-shadow duration-300" data-testid="stat-card-offline">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Offline</CardTitle>
              <Users className="w-5 h-5 text-gray-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-600">{stats.offline_assets}</div>
              <p className="text-xs text-gray-500 mt-1">Not responding</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-white border border-gray-200 p-1">
            <TabsTrigger value="monitor" data-testid="tab-monitor" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">Monitor</TabsTrigger>
            <TabsTrigger value="history" data-testid="tab-history" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">History</TabsTrigger>
            <TabsTrigger value="floorplan" data-testid="tab-floorplan" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">Floor Plan</TabsTrigger>
          </TabsList>

          {/* Monitor Tab */}
          <TabsContent value="monitor" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Floor Plan */}
              <Card className="lg:col-span-2 bg-white border-gray-200" data-testid="floor-plan-card">
                <CardHeader>
                  <CardTitle className="text-xl font-semibold text-gray-900">Live Floor Plan</CardTitle>
                </CardHeader>
                <CardContent>
                  <FloorPlanCanvas 
                    floorPlan={floorPlan} 
                    tags={tags}
                    onTagClick={setSelectedTag}
                  />
                </CardContent>
              </Card>

              {/* Asset List */}
              <Card className="bg-white border-gray-200" data-testid="asset-list-card">
                <CardHeader>
                  <CardTitle className="text-xl font-semibold text-gray-900">Assets</CardTitle>
                  <div className="mt-4">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        data-testid="asset-search-input"
                        placeholder="Search by device ID..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10 border-gray-300"
                      />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <AssetTable 
                    tags={filteredTags} 
                    selectedTag={selectedTag}
                    onSelectTag={setSelectedTag}
                  />
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history">
            <HistoricalTrace selectedTag={selectedTag} />
          </TabsContent>

          {/* Floor Plan Manager Tab */}
          <TabsContent value="floorplan">
            <FloorPlanManager 
              floorPlan={floorPlan} 
              onFloorPlanUpdate={loadFloorPlan}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Dashboard;
