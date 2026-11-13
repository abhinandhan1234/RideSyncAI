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

  async function submit(event){
    event.preventDefault();
    if(busy) return;
    if(admin) {
      navigate('/admin');
      return;
    }
    setBusy(true);
    setError('');
    const fields = new FormData(event.currentTarget);
    const body = { email: fields.get('email'), password: fields.get('password') };
    if(register && !captain && !admin) {
      body.name = fields.get('name');
      body.role = 'passenger';
    }
    try {
      const data = await apiRequest(register && !captain && !admin ? '/auth/register' : '/auth/login', { method: 'POST', body });
      if(!data.accessToken || data.user?.role !== (captain ? 'driver' : 'passenger')) {
        throw new Error(`This account is not a ${captain ? 'driver' : 'passenger'} account. Choose the correct login.`);
      }
      state.reset();
      state.setAuth(data);
      state.setMode('backend');
      navigate(captain ? '/captain' : '/book');
    } catch(e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  const roleLabel = admin ? 'ADMIN' : captain ? 'CAPTAIN' : 'PASSENGER';
  const title1 = admin ? 'Fleet Command.' : captain ? 'Your city.' : 'Your next ride.';
  const title2 = admin ? 'Real-time Operations.' : captain ? 'Your next chapter.' : 'A better beginning.';
  const formTitle = admin ? 'Admin Dashboard Login' : captain ? 'Captain login' : register ? 'Create an account' : 'Passenger login';
  const helperText = admin 
    ? 'Access operational telemetry, live active drivers, and total rides today.' 
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
                <input id="name" name="name" required minLength={2} maxLength={100} autoComplete="name" disabled={busy}/>
              </>
            )}

            {!admin && (
              <>
                <label htmlFor="email">Email address</label>
                <input id="email" name="email" type="email" required autoComplete="username" placeholder="you@example.com" disabled={busy}/>

                <label htmlFor="password">Password</label>
                <input id="password" name="password" type="password" required minLength={register ? 8 : 1} autoComplete={register ? 'new-password' : 'current-password'} disabled={busy}/>
              </>
            )}

            {error && <p role="alert" className="ride-error">{error}</p>}

            <button type="submit" disabled={busy} style={admin ? { cursor: 'pointer', background: 'var(--sea)', color: 'var(--ink)' } : {}}>
              {busy ? 'Connecting…' : admin ? 'Enter Admin Dashboard' : register && !captain ? 'Create account' : 'Sign in'} 
              <span><Arrow/></span>
            </button>
          </form>

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
              <Link className="login-switch" to="/login/passenger" onClick={() => { setRegister(false); setError(''); }}>Passenger login <Arrow/></Link>
              <Link className="login-switch" to="/admin">Admin Fleet Dashboard <Arrow/></Link>
            </>
          ) : (
            <>
              <Link className="login-switch" to="/login/captain" onClick={() => { setRegister(false); setError(''); }}>Captain login <Arrow/></Link>
              <Link className="login-switch" to="/admin">Admin Fleet Dashboard <Arrow/></Link>
            </>
          )}

          <Link className="login-switch" to="/">Back to the journey</Link>
        </section>
      </main>
    </div>
  );
}
