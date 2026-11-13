import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useRide } from '../context/RideContext';
import { apiRequest } from '../services/api';
import GlassPanel from '../components/glass/GlassPanel';
import GlassButton from '../components/glass/GlassButton';
export default function CaptainDashboard(){
  const {auth}=useRide();const [offers,setOffers]=useState([]),[error,setError]=useState(''),[busy,setBusy]=useState(false),[ride,setRide]=useState(null),[notice,setNotice]=useState('');
  useEffect(()=>{
    if(auth?.user.role!=='driver')return;let timer;const controller=new AbortController();
    const poll=async()=>{try{const data=await apiRequest('/driver/offers',{token:auth.accessToken,signal:controller.signal});setOffers(data.offers);if(ride?.rideId){const current=await apiRequest(`/rides/${ride.rideId}`,{token:auth.accessToken,signal:controller.signal});setRide(current);}setError('');}catch(e){if(e.name!=='AbortError')setError(e.message);}finally{if(!controller.signal.aborted)timer=setTimeout(poll,2000);}};
    void poll();return()=>{controller.abort();clearTimeout(timer);};
  },[auth,ride?.rideId]);
  async function act(path,body,method='POST'){
    setBusy(true);setError('');try{const result=await apiRequest(path,{method,body,token:auth.accessToken});if(result.rideId&&result.status!=='REJECTED')setRide({...ride,...result,status:result.newStatus||result.status});setOffers([]);setNotice(result.available===undefined?'Updated successfully.':result.available?'You are available.':'You are offline.');}catch(e){setError(e.message);}finally{setBusy(false);}
  }
  if(auth?.user.role!=='driver')return <GlassPanel className="p-8 space-y-4"><h1 className="text-2xl">Captain workspace</h1><p>Sign in with your provisioned driver account.</p><div className="flex gap-4 items-center"><Link to="/login/captain" className="text-accent">Captain login →</Link><Link to="/admin" className="text-accent">Admin Dashboard →</Link></div></GlassPanel>;
  const next={ACCEPTED:'ARRIVING',ARRIVING:'ONGOING',ONGOING:'COMPLETED'}[ride?.status];
  return <section className="space-y-5 max-w-3xl mx-auto"><div className="page-heading"><div><p className="page-eyebrow">CAPTAIN WORKSPACE</p><h1>Welcome, {auth.user.name}</h1></div><Link to="/admin" className="text-accent text-xs border border-accent/40 px-3 py-1.5 rounded-full hover:bg-accent/10 transition-colors">Admin Dashboard →</Link></div><GlassPanel className="p-5 space-y-4"><h2>Availability</h2><div className="flex flex-wrap gap-3"><GlassButton disabled={busy} onClick={()=>act('/drivers/availability',{available:true},'PATCH')}>Go available</GlassButton><GlassButton disabled={busy} onClick={()=>act('/drivers/availability',{available:false},'PATCH')}>Go offline</GlassButton></div><p role="status" className="text-text-secondary">{notice}</p></GlassPanel>
    {error&&<p role="alert" className="ride-error">{error}</p>}
    {ride&&<GlassPanel className="p-5 space-y-4"><h2>Current ride</h2><p className="break-all">{ride.rideId}</p><p role="status">{ride.status}</p>{next&&<GlassButton variant="primary" disabled={busy} onClick={()=>act(`/rides/${ride.rideId}/status`,{status:next},'PATCH')}>{next==='ARRIVING'?'Heading to pickup':next==='ONGOING'?'Start ride':'Complete ride'}</GlassButton>}</GlassPanel>}
    <h2 className="text-xl">Incoming offers</h2>{offers.length===0&&<p className="text-text-secondary">No pending offers. Availability and demand determine matching.</p>}{offers.map(offer=><GlassPanel key={offer._id} className="p-5 space-y-4"><p>Pickup estimate: {offer.estimatedPickupMin} min</p><p className="text-text-secondary">Expires {new Date(offer.expiresAt).toLocaleTimeString()}</p><div className="flex gap-3"><GlassButton variant="primary" disabled={busy} onClick={()=>act(`/offers/${offer._id}/respond`,{action:'accept'})}>Accept</GlassButton><GlassButton disabled={busy} onClick={()=>act(`/offers/${offer._id}/respond`,{action:'reject'})}>Reject</GlassButton></div></GlassPanel>)}</section>;
}
