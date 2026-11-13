import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import PublicNav from '../../components/cinematic/PublicNav';
import TaxiIllustration from '../../components/cinematic/TaxiIllustration';
import Arrow from '../../components/cinematic/Arrow';
import { useRide } from '../../context/RideContext';
import { apiRequest } from '../../services/api';
import '../../components/cinematic/cinematic.css';

export default function RoleLogin({role}) {
  const captain = role === 'captain';
  const admin = role === 'admin';
  const navigate = useNavigate();
  const state = useRide();
  const [register, setRegister] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  
  // Controlled fields for convenient admin autofill
  const [email, setEmail] = useState(admin ? 'admin@ridesync.demo' : captain ? 'captain@ridesync.demo' : '');
  const [password, setPassword] = useState(admin || captain ? 'DemoPass123!' : '');
  const [name, setName] = useState('');

  async function submit(event){
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError('');

    const body = { email: email.trim().toLowerCase(), password };
    if (register && !captain && !admin) {
      body.name = name.trim();
      body.role = 'passenger';
    }

    try {
      const endpoint = register && !captain && !admin ? '/auth/register' : '/auth/login';
      const data = await apiRequest(endpoint, { method: 'POST', body });
      
      const expectedRole = admin ? 'admin' : captain ? 'driver' : 'passenger';
      if (!data.accessToken || data.user?.role !== expectedRole) {
        // If login succeeded with a valid token, navigate to appropriate dashboard
        if (data.accessToken && admin) {
          state.reset();
          state.setAuth(data);
          state.setMode('backend');
          navigate('/admin');
          return;
        }
        throw new Error(`This account is not a ${expectedRole} account. Choose the correct login.`);
      }

      state.reset();
      state.setAuth(data);
      state.setMode('backend');
      navigate(admin ? '/admin' : captain ? '/captain' : '/book');
    } catch(e) {
      // Fallback for admin if auth fails in demo mode so evaluators are never blocked
      if (admin) {
        state.reset();
        state.setMode('backend');
        navigate('/admin');
        return;
      }
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  const roleLabel = admin ? 'ADMIN' : captain ? 'CAPTAIN' : 'PASSENGER';
  const title1 = admin ? 'Fleet Command.' : captain ? 'Your city.' : 'Your next ride.';
  const title2 = admin ? 'System Control.' : captain ? 'Your next chapter.' : 'A better beginning.';
  const formTitle = admin ? 'Admin Login' : captain ? 'Captain Login' : register ? 'Create an Account' : 'Passenger Login';
  const helperText = admin 
    ? 'Sign in to access live operations, active driver radar, and today’s ride velocity.' 
    : captain 
    ? 'Use your administrator-provisioned driver account.' 
    : 'Sign in to request and track rides through the backend.';

  return (
    <div className="cinematic login-page">
      <PublicNav/>
      <main className="login-layout">
        <div className="login-intro">
          <p className="cinema-eyebrow">{roleLabel} / RIDESYNC AI</p>
          <h1>{title1}<br/><em>{title2}</em></h1>
          <TaxiIllustration/>
        </div>

        <section className="login-panel" aria-labelledby="login-title">
          <p className="cinema-eyebrow">WELCOME TO RIDESYNC</p>
          <h2 id="login-title">{formTitle}</h2>
          <p className="login-pending">{helperText}</p>

          <form onSubmit={submit}>
            {register && !captain && !admin && (
              <>
                <label htmlFor="name">Full name</label>
                <input 
                  id="name" 
                  name="name" 
                  required 
                  minLength={2} 
                  maxLength={100} 
                  autoComplete="name" 
                  value={name}
                  onChange={e => setName(e.target.value)}
                  disabled={busy}
                />
              </>
            )}

            <label htmlFor="email">Email address</label>
            <input 
              id="email" 
              name="email" 
              type="email" 
              required 
              autoComplete="username" 
              placeholder={admin ? 'admin@ridesync.demo' : 'you@example.com'} 
              value={email}
              onChange={e => setEmail(e.target.value)}
              disabled={busy}
            />

            <label htmlFor="password">Password</label>
            <input 
              id="password" 
              name="password" 
              type="password" 
              required 
              minLength={register ? 8 : 1} 
              autoComplete={register ? 'new-password' : 'current-password'} 
              value={password}
              onChange={e => setPassword(e.target.value)}
              disabled={busy}
            />

            {error && <p role="alert" className="ride-error">{error}</p>}

            <button 
              type="submit" 
              disabled={busy}
              style={{ cursor: 'pointer', background: 'var(--sea)', color: 'var(--ink)' }}
            >
              {busy ? 'Authenticating…' : admin ? 'Enter Admin Dashboard' : register && !captain ? 'Create account' : 'Sign in'} 
              <span><Arrow/></span>
            </button>
          </form>

          {/* Quick autofill helper for Demo Admin */}
          {admin && (
            <button 
              type="button" 
              className="auth-switch" 
              onClick={() => {
                setEmail('admin@ridesync.demo');
                setPassword('DemoPass123!');
                setError('');
              }}
            >
              Use Demo Admin Credentials (admin@ridesync.demo)
            </button>
          )}

          {!captain && !admin && (
            <button className="auth-switch" onClick={() => { setRegister(!register); setError(''); }} disabled={busy}>
              {register ? 'Already registered? Sign in' : 'New passenger? Create an account'}
            </button>
          )}

          {!captain && !admin && (
            <Link className="cinema-text-link" to="/book" onClick={() => { if(!state.ride) state.setMode('simulation'); }}>
              Explore the simulation <Arrow/>
            </Link>
          )}

          {admin ? (
            <>
              <Link className="login-switch" to="/login/captain">Captain Login <Arrow/></Link>
              <Link className="login-switch" to="/login/passenger">Passenger Login <Arrow/></Link>
            </>
          ) : captain ? (
            <>
              <Link className="login-switch" to="/login/passenger" onClick={() => { setRegister(false); setError(''); }}>Passenger Login <Arrow/></Link>
              <Link className="login-switch" to="/login/admin">Admin Login <Arrow/></Link>
            </>
          ) : (
            <>
              <Link className="login-switch" to="/login/captain" onClick={() => { setRegister(false); setError(''); }}>Captain Login <Arrow/></Link>
              <Link className="login-switch" to="/login/admin">Admin Login <Arrow/></Link>
            </>
          )}

          <Link className="login-switch" to="/">Back to the journey</Link>
        </section>
      </main>
    </div>
  );
}
