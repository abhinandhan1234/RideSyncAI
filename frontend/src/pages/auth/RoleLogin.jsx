import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import PublicNav from '../../components/cinematic/PublicNav';
import TaxiIllustration from '../../components/cinematic/TaxiIllustration';
import Arrow from '../../components/cinematic/Arrow';
import { useRide } from '../../context/RideContext';
import { apiRequest } from '../../services/api';
import '../../components/cinematic/cinematic.css';
export default function RoleLogin({role}) {
  const captain=role==='captain',navigate=useNavigate(),state=useRide();
  const [register,setRegister]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
  async function submit(event){
    event.preventDefault();if(busy)return;setBusy(true);setError('');
    const fields=new FormData(event.currentTarget),body={email:fields.get('email'),password:fields.get('password')};
    if(register&&!captain){body.name=fields.get('name');body.role='passenger';}
    try{
      const data=await apiRequest(register&&!captain?'/auth/register':'/auth/login',{method:'POST',body});
      if(!data.accessToken||data.user?.role!==(captain?'driver':'passenger'))throw new Error(`Choose the ${captain?'Yatri':'Sarathi'} login for this account.`);
      state.reset();state.setAuth(data);state.setMode('backend');navigate(captain?'/captain':'/book');
    }catch(e){setError(e.message);}finally{setBusy(false);}
  }
  return <div className="cinematic login-page"><PublicNav/><main className="login-layout">
    <div className="login-intro"><p className="cinema-eyebrow">{captain?'SARATHI':'YATRI'} / INTELLIMARG</p><h1>{captain?'Your city.':'Your next ride.'}<br/><em>{captain?'Your next ride.':'A better beginning.'}</em></h1><TaxiIllustration/></div>
    <section className="login-panel" aria-labelledby="login-title"><p className="cinema-eyebrow">WELCOME TO INTELLIMARG</p><h2 id="login-title">{captain?'Sarathi login':register?'Create an account':'Yatri login'}</h2>
      <p className="login-pending">{captain?'Use your administrator-provisioned Sarathi account.':'Sign in to book and track your rides.'}</p>
      <form onSubmit={submit}>{register&&!captain&&<><label htmlFor="name">Full name</label><input id="name" name="name" required minLength={2} maxLength={100} autoComplete="name" disabled={busy}/></>}
        <label htmlFor="email">Email address</label><input id="email" name="email" type="email" required autoComplete="username" placeholder="you@example.com" disabled={busy}/>
        <label htmlFor="password">Password</label><input id="password" name="password" type="password" required minLength={register?8:1} autoComplete={register?'new-password':'current-password'} disabled={busy}/>
        {error&&<p role="alert" className="ride-error">{error}</p>}
        <button type="submit" disabled={busy}>{busy?'Connecting…':register&&!captain?'Create account':'Sign in'} <span><Arrow/></span></button>
      </form>
      {!captain&&<button className="auth-switch" onClick={()=>{setRegister(!register);setError('');}} disabled={busy}>{register?'Already registered? Sign in':'New Yatri? Create an account'}</button>}
      <Link className="login-switch" to={captain?'/login/passenger':'/login/captain'} onClick={()=>{setRegister(false);setError('');}}>{captain?'Yatri login':'Sarathi login'} <Arrow/></Link>
      <Link className="login-switch" to="/">Back to the journey</Link>
    </section></main></div>;
}
