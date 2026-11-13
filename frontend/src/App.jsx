import React, { Suspense, lazy, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import AppShell from './components/layout/AppShell';
import CinematicLanding from './pages/CinematicLanding';
import RoleLogin from './pages/auth/RoleLogin';
import { RideProvider,useRide } from './context/RideContext';
const CaptainDashboard=lazy(()=>import('./pages/CaptainDashboard'));
const Booking=lazy(()=>import('./pages/Booking'));
const Tracking=lazy(()=>import('./pages/Tracking'));
import Activity from './pages/Activity';
import Profile from './pages/Profile';
const DesignSystemPreview=lazy(()=>import('./pages/DesignSystemPreview'));
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
function ApplicationPage({children,role}){
 const {auth,restoring}=useRide();
 if(restoring)return <p role="status">Restoring your session…</p>;
 if(!auth)return <Navigate replace to={role==='driver'?'/login/captain':'/login/passenger'}/>;
 if(role&&auth.user.role!==role)return <Navigate replace to={auth.user.role==='driver'?'/captain':'/book'}/>;
 return <AppShell>{children}</AppShell>;
}

export function App() {
  return (
    <BrowserRouter>
      <RideProvider>
      <ScrollReset />
      <Suspense fallback={<div role="status" style={{padding:80}}>Loading experience…</div>}>
        <Routes>
          <Route path="/" element={<CinematicLanding />} />
          <Route path="/login/passenger" element={<RoleLogin role="passenger" />} />
          <Route path="/login/captain" element={<RoleLogin role="captain" />} />
          <Route path="/captain" element={<ApplicationPage role="driver"><CaptainDashboard /></ApplicationPage>} />
          <Route path="/book" element={<ApplicationPage role="passenger"><Booking /></ApplicationPage>} />
          <Route path="/track" element={<ApplicationPage role="passenger"><Tracking /></ApplicationPage>} />
          <Route path="/ride/:rideId" element={<ApplicationPage role="passenger"><Tracking /></ApplicationPage>} />
          <Route path="/activity" element={<ApplicationPage><Activity /></ApplicationPage>} />
          <Route path="/profile" element={<ApplicationPage><Profile /></ApplicationPage>} />
          <Route path="/design-preview" element={<ApplicationPage><DesignSystemPreview /></ApplicationPage>} />
          <Route path="/3d" element={<ApplicationPage><Taxi3DPreview /></ApplicationPage>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </RideProvider>
    </BrowserRouter>
  );
}

export default App;
