import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Home,
  Box,
  Map,
  Settings,
  ClipboardCheck,
  Activity,
  UserCheck,
  Bed,
  Users,
  Shield,
} from 'lucide-react';

const Layout = ({ children }) => {
  const location = useLocation();

  const navItems = [
    { path: '/', label: 'Home', icon: Home },
    { path: '/assets', label: 'Assets', icon: Box },
    // { path: '/calibration', label: 'Calibration', icon: ClipboardCheck },
    { path: '/asset-map', label: 'Asset Tracking', icon: Map },
    // { path: '/patient-tags', label: 'People Tags', icon: UserCheck },
    { path: '/patient-map', label: 'Patient Tracking', icon: Bed },
    { path: '/staff-map', label: 'Staff Tracking', icon: Users },
    { path: '/visitor-map', label: 'Visitor Tracking', icon: Shield },
    // { path: '/rtls', label: 'RTLS', icon: Map },
    { path: '/ot-status', label: 'OT Management', icon: Activity },
    { path: '/floor-plan', label: 'Setup', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        <div className="px-6 py-3">
          <div className="flex items-center justify-between gap-4">
            <Link to="/" className="flex items-center shrink-0">
              <img src="/IISc_logo.png" alt="Kinesis Location" className="h-24 w-auto" />
            </Link>

            <nav className="flex items-center gap-1 overflow-x-auto whitespace-nowrap">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;

                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
                    className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-all duration-200 text-sm shrink-0 ${
                      isActive
                        ? 'bg-[#006CDD] text-white shadow-md'
                        : 'text-gray-600 hover:bg-blue-50 hover:text-[#006CDD]'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="font-medium">{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      </header>

      <main className="p-6 max-w-[1920px] mx-auto">
        {children}
      </main>
    </div>
  );
};

export default Layout;