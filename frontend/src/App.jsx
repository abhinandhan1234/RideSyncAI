import React, { Suspense, lazy, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import AppShell from './components/layout/AppShell';
import CinematicLanding from './pages/CinematicLanding';
import RoleLogin from './pages/auth/RoleLogin';
import Booking from './pages/Booking';
import Tracking from './pages/Tracking';
import Activity from './pages/Activity';
import Profile from './pages/Profile';
import DesignSystemPreview from './pages/DesignSystemPreview';
const Taxi3DPreview = lazy(() => import('./pages/Taxi3DPreview'));
function ScrollReset() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (hash) {
      const frame = requestAnimationFrame(() => document.getElementById(hash.slice(1))?.scrollIntoView());
      return () => cancelAnimationFrame(frame);
    }
    window.scrollTo(0, 0);
  }, [pathname, hash]);
  return null;
}
const ApplicationPage = ({children}) => <AppShell>{children}</AppShell>;

export function App() {
  return (
    <BrowserRouter>
      <ScrollReset />
      <Suspense fallback={<div role="status" style={{padding:80}}>Loading experience…</div>}>
        <Routes>
          <Route path="/" element={<CinematicLanding />} />
          <Route path="/login/passenger" element={<RoleLogin role="passenger" />} />
          <Route path="/login/captain" element={<RoleLogin role="captain" />} />
          <Route path="/book" element={<ApplicationPage><Booking /></ApplicationPage>} />
          <Route path="/track" element={<ApplicationPage><Tracking /></ApplicationPage>} />
          <Route path="/activity" element={<ApplicationPage><Activity /></ApplicationPage>} />
          <Route path="/profile" element={<ApplicationPage><Profile /></ApplicationPage>} />
          <Route path="/design-preview" element={<ApplicationPage><DesignSystemPreview /></ApplicationPage>} />
          <Route path="/3d" element={<ApplicationPage><Taxi3DPreview /></ApplicationPage>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;
