import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';
import Assets from './pages/Assets';
import RTLS from './pages/RTLS';
import FloorPlanEdit from './pages/FloorPlanEdit';
import Calibration from './pages/Calibration';
import OTStatus from './pages/OTStatus';
import AssetMap from './pages/AssetMap';
import PatientMap from './pages/PatientMap';
import StaffMap from './pages/StaffMap';
import VisitorMap from './pages/VisitorMap';
import PeopleTagAssignment from './pages/PeopleTagAssignment';
import PorterManagement from './pages/PorterManagement';
import './App.css';

function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/assets" element={<Assets />} />
          <Route path="/rtls" element={<RTLS />} />
          <Route path="/asset-map" element={<AssetMap />} />
          <Route path="/patient-map" element={<PatientMap />} />
          <Route path="/staff-map" element={<StaffMap />} />
          <Route path="/visitor-map" element={<VisitorMap />} />
          <Route path="/calibration" element={<Calibration />} />
          <Route path="/ot-status" element={<OTStatus />} />
          <Route path="/patient-tags" element={<PeopleTagAssignment />} />
          <Route path="/floor-plan" element={<FloorPlanEdit />} />
          <Route path="/porter" element={<PorterManagement />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

export default App;