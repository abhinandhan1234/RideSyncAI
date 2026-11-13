import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AppShell from './components/layout/AppShell';
import Home from './pages/Home';
import Booking from './pages/Booking';
import Tracking from './pages/Tracking';
import Activity from './pages/Activity';
import Profile from './pages/Profile';
import DesignSystemPreview from './pages/DesignSystemPreview';
import Taxi3DPreview from './pages/Taxi3DPreview';

export function App() {
  return (
    <BrowserRouter>
      <AppShell>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/book" element={<Booking />} />
          <Route path="/track" element={<Tracking />} />
          <Route path="/activity" element={<Activity />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/design-preview" element={<DesignSystemPreview />} />
          <Route path="/3d" element={<Taxi3DPreview />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AppShell>
    </BrowserRouter>
  );
}

export default App;
