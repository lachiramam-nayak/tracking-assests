import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Activity, AlertTriangle, Users, Box, TrendingUp } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000';
const API = `${BACKEND_URL}/api`;

const Home = () => {
  const [stats, setStats] = useState({
    total_assets: 0,
    active_assets: 0,
    alerts: 0,
    offline_assets: 0
  });

  useEffect(() => {
    const loadStats = async () => {
      try {
        const response = await fetch(`${API}/stats`);
        const data = await response.json();
        setStats(data);
      } catch (error) {
        console.error('Error loading stats:', error);
      }
    };

    loadStats();
    const interval = setInterval(loadStats, 10000);
    return () => clearInterval(interval);
  }, []);

  const StatCard = ({ title, value, icon: Icon, color, trend, link }) => (
    <Link to={link} className="block">
      <Card className={`bg-white border-2 hover:shadow-2xl hover:scale-105 transition-all duration-300 cursor-pointer ${color}`}>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-semibold text-gray-700">{title}</CardTitle>
          <Icon className={`w-8 h-8 ${color.replace('border', 'text')}`} />
        </CardHeader>
        <CardContent>
          <div className="text-5xl font-bold text-gray-900 mb-2">{value}</div>
          {trend && (
            <div className="flex items-center text-sm text-gray-600">
              <TrendingUp className="w-4 h-4 mr-1" />
              <span>{trend}</span>
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-2xl p-12 border-2 border-blue-200">
        <h1 className="text-5xl font-bold text-gray-900 mb-4">Real-Time Location System</h1>
        <p className="text-xl text-gray-600 mb-6">Monitor and track all your BLE-tagged assets in real-time</p>
        <div className="flex gap-4">
          <Link 
            to="/rtls" 
            className="px-8 py-4 bg-[#006CDD] text-white rounded-xl font-semibold hover:bg-[#0056b3] transition-all duration-300 hover:scale-105 shadow-lg"
          >
            View Live Map
          </Link>
          <Link 
            to="/assets" 
            className="px-8 py-4 bg-white text-[#006CDD] border-2 border-[#006CDD] rounded-xl font-semibold hover:bg-blue-50 transition-all duration-300"
          >
            Browse Assets
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Assets"
          value={stats.total_assets}
          icon={Box}
          color="border-blue-500"
          link="/assets"
          trend="All monitored"
        />
        <StatCard
          title="Active Now"
          value={stats.active_assets}
          icon={Activity}
          color="border-green-500"
          link="/rtls"
          trend="Online & tracking"
        />
        <StatCard
          title="Alerts"
          value={stats.alerts}
          icon={AlertTriangle}
          color="border-amber-500"
          link="/assets"
          trend={stats.alerts > 0 ? 'Needs attention' : 'All clear'}
        />
        <StatCard
          title="Offline"
          value={stats.offline_assets}
          icon={Users}
          color="border-gray-500"
          link="/assets"
          trend="Not responding"
        />
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link to="/rtls" className="group">
          <Card className="bg-white hover:shadow-xl transition-all duration-300 border-2 border-gray-200 hover:border-blue-500">
            <CardContent className="p-8 text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                <Activity className="w-8 h-8 text-[#006CDD]" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Live Tracking</h3>
              <p className="text-gray-600">View real-time asset positions on floor plan</p>
            </CardContent>
          </Card>
        </Link>

        <Link to="/assets" className="group">
          <Card className="bg-white hover:shadow-xl transition-all duration-300 border-2 border-gray-200 hover:border-blue-500">
            <CardContent className="p-8 text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                <Box className="w-8 h-8 text-[#006CDD]" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Asset Directory</h3>
              <p className="text-gray-600">Complete list of all tracked assets</p>
            </CardContent>
          </Card>
        </Link>

        <Link to="/floor-plan" className="group">
          <Card className="bg-white hover:shadow-xl transition-all duration-300 border-2 border-gray-200 hover:border-blue-500">
            <CardContent className="p-8 text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                <Users className="w-8 h-8 text-[#006CDD]" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Floor Plan Setup</h3>
              <p className="text-gray-600">Configure floor plans and anchors</p>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
};

export default Home;
