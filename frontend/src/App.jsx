import React, { Suspense, lazy, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import AppShell from './components/layout/AppShell';
import CinematicLanding from './pages/CinematicLanding';
import RoleLogin from './pages/auth/RoleLogin';
import { RideProvider, useRide } from './context/RideContext';
import AdminDashboard from './pages/AdminDashboard';
import AdminApplications from './pages/AdminApplications';
const CaptainDashboard = lazy(() => import('./pages/CaptainDashboard'));
const Booking = lazy(() => import('./pages/Booking'));
const Tracking = lazy(() => import('./pages/Tracking'));
import Activity from './pages/Activity';
import Profile from './pages/Profile';
const DesignSystemPreview = lazy(() => import('./pages/DesignSystemPreview'));
import {SarathiDashboard,SarathiLogin,SarathiProfile,SarathiRegister,SarathiVerification} from './pages/sarathi/SarathiPages';
import SarathiAdmin from './pages/sarathi/SarathiAdmin';
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
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error('App ErrorBoundary caught:', error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '40px 20px', maxWidth: 560, margin: '80px auto', background: '#111827', color: '#f3f4f6', borderRadius: 12, border: '1px solid #374151', fontFamily: 'system-ui, sans-serif' }}>
          <h2 style={{ margin: '0 0 12px', fontSize: '1.25rem', color: '#f87171' }}>Something went wrong</h2>
          <p style={{ margin: '0 0 16px', fontSize: '0.9rem', color: '#9ca3af' }}>{this.state.error?.message || 'An unexpected error occurred in the application.'}</p>
          <button style={{ padding: '10px 18px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }} onClick={() => { this.setState({ hasError: false, error: null }); window.location.href = '/'; }}>Return to Home</button>
        </div>
      );
    }
    return this.props.children;
  }
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
    <ErrorBoundary>
      <BrowserRouter>
        <RideProvider>
        <ScrollReset />
        <Suspense fallback={<div role="status" style={{padding:80}}>Loading experience…</div>}>
          <Routes>
            <Route path="/" element={<CinematicLanding />} />
            <Route path="/login" element={<Navigate to="/login/admin" replace />} />
            <Route path="/login/passenger" element={<RoleLogin role="passenger" />} />
            <Route path="/login/captain" element={<RoleLogin role="captain" />} />
            <Route path="/login/admin" element={<RoleLogin role="admin" />} />
            <Route path="/captain" element={<ApplicationPage role="driver"><CaptainDashboard /></ApplicationPage>} />
            <Route path="/admin" element={<ApplicationPage><AdminDashboard /></ApplicationPage>} />
            <Route path="/admin/applications" element={<ApplicationPage><AdminApplications /></ApplicationPage>} />
            <Route path="/sarathi/login" element={<SarathiLogin/>} />
            <Route path="/sarathi/register" element={<SarathiRegister/>} />
            <Route path="/sarathi/dashboard" element={<ApplicationPage role="driver"><SarathiDashboard/></ApplicationPage>} />
            <Route path="/sarathi/profile" element={<ApplicationPage role="driver"><SarathiProfile/></ApplicationPage>} />
            <Route path="/sarathi/verification" element={<ApplicationPage role="driver"><SarathiVerification/></ApplicationPage>} />
            <Route path="/sarathi/admin" element={<SarathiAdmin/>} />
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
    </ErrorBoundary>
  );
}
  );
}

export default App;
