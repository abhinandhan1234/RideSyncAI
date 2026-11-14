import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { io } from 'socket.io-client';
import { useRide } from '../context/RideContext';
import { apiRequest } from '../services/api';
import GlassPanel from '../components/glass/GlassPanel';
import GlassButton from '../components/glass/GlassButton';

function playNotificationChime() {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const now = ctx.currentTime;
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, now);
    gain1.gain.setValueAtTime(0.2, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.35);

    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(880, now + 0.18);
    gain2.gain.setValueAtTime(0.25, now + 0.18);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.65);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.18);
    osc2.stop(now + 0.65);
  } catch {}
}

export default function CaptainDashboard(){
  const {auth}=useRide();
  const [offers,setOffers]=useState([]);
  const [incomingOffer,setIncomingOffer]=useState(null);
  const [secondsRemaining,setSecondsRemaining]=useState(30);
  const [error,setError]=useState('');
  const [busy,setBusy]=useState(false);
  const [ride,setRide]=useState(null);
  const [notice,setNotice]=useState('');
  const [sharing,setSharing]=useState(false);
  const [locationNotice,setLocationNotice]=useState('');
  const lastLocationSent=useRef(0);

  useEffect(()=>{
    if(auth?.user.role!=='driver'||!auth?.accessToken)return;
    const socket=io(import.meta.env.VITE_SOCKET_URL||location.origin,{
      auth:{token:auth.accessToken}
    });
    socket.on('ride:offer',offer=>{
      playNotificationChime();
      setIncomingOffer(offer);
      setOffers(prev=>{
        const id=offer.offerId||offer._id;
        const exists=prev.some(o=>(o.offerId||o._id)===id);
        return exists?prev:[offer,...prev];
      });
    });
    return ()=>socket.disconnect();
  },[auth]);

  useEffect(()=>{
    if(!incomingOffer)return;
    const expires=incomingOffer.expiresAt?new Date(incomingOffer.expiresAt).getTime():Date.now()+30000;
    const updateTime=()=>{
      const left=Math.max(0,Math.round((expires-Date.now())/1000));
      setSecondsRemaining(left);
      if(left===0)setIncomingOffer(null);
    };
    updateTime();
    const interval=setInterval(updateTime,1000);
    return ()=>clearInterval(interval);
  },[incomingOffer]);

  useEffect(()=>{
    if(auth?.user.role!=='driver')return;let timer;const controller=new AbortController();
    const poll=async()=>{try{
      const data=await apiRequest('/driver/offers',{token:auth.accessToken,signal:controller.signal});
      setOffers(data.offers);
      if(data.offers.length>0&&!incomingOffer&&!ride){
        setIncomingOffer(data.offers[0]);
      }
      if(ride?.rideId){const current=await apiRequest(`/rides/${ride.rideId}`,{token:auth.accessToken,signal:controller.signal});setRide(current);}
      setError('');
    }catch(e){if(e.name!=='AbortError')setError(e.message);}finally{if(!controller.signal.aborted)timer=setTimeout(poll,2000);}};
    void poll();return()=>{controller.abort();clearTimeout(timer);};
  },[auth,ride?.rideId,incomingOffer]);

  useEffect(()=>{
    const shareable=['ACCEPTED','ARRIVING','ARRIVED','ONGOING'].includes(ride?.status);
    if(!sharing||!shareable||!navigator.geolocation||auth?.user.role!=='driver'){if(sharing&&!navigator.geolocation)setLocationNotice('This device does not provide GPS location.');return;}
    let active=true;const watch=navigator.geolocation.watchPosition(({coords})=>{if(!active||Date.now()-lastLocationSent.current<10000)return;lastLocationSent.current=Date.now();void apiRequest('/drivers/location',{method:'PATCH',token:auth.accessToken,body:{latitude:coords.latitude,longitude:coords.longitude}}).then(()=>setLocationNotice('Live location is sharing with your Yatri.')).catch(e=>setLocationNotice(e.message));},()=>setLocationNotice('Location permission is unavailable. Enable it to share your position.'),{enableHighAccuracy:true,maximumAge:5000,timeout:15000});
    return()=>{active=false;navigator.geolocation.clearWatch(watch);};
  },[sharing,ride?.status,auth]);

  async function act(path,body,method='POST'){
    setBusy(true);setError('');try{const result=await apiRequest(path,{method,body,token:auth.accessToken});if(result.rideId&&result.status!=='REJECTED')setRide({...ride,...result,status:result.newStatus||result.status});setOffers([]);setIncomingOffer(null);setNotice(result.available===undefined?'Updated successfully.':result.available?'You are available.':'You are offline.');}catch(e){setError(e.message);}finally{setBusy(false);}
  }

  async function respondOffer(offer,action){
    const offerId=offer._id||offer.offerId;
    setIncomingOffer(null);
    await act(`/offers/${offerId}/respond`,{action});
  }

  if(auth?.user.role!=='driver')return <GlassPanel className="p-8 space-y-4"><h1 className="text-2xl">Sarathi workspace</h1><p>Sign in with your provisioned driver account.</p><div className="flex gap-4 items-center"><Link to="/sarathi/login" className="text-accent">Sarathi login →</Link><Link to="/admin" className="text-accent">Admin Dashboard →</Link></div></GlassPanel>;
  const next={ACCEPTED:'ARRIVING',ARRIVING:'ARRIVED',ARRIVED:'ONGOING',ONGOING:'COMPLETED'}[ride?.status];

  return <section className="space-y-5 max-w-3xl mx-auto">
    <div className="page-heading"><div><p className="page-eyebrow">CAPTAIN / SARATHI WORKSPACE</p><h1>Welcome, {auth.user.name}</h1></div><Link to="/admin" className="text-accent text-xs border border-accent/40 px-3 py-1.5 rounded-full hover:bg-accent/10 transition-colors">Admin Dashboard →</Link></div>

    {incomingOffer&&<div className="sarathi-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="incoming-booking-modal-title">
      <div className="sarathi-incoming-modal">
        <div className="sarathi-modal-radar-bar"/>
        <div className="sarathi-modal-top">
          <span className="sarathi-modal-badge"><span className="sarathi-beacon-dot"/>New Booking Request</span>
          <span style={{color:'#38bdf8',fontSize:'12px',fontWeight:700}}>⏱ {secondsRemaining}s left</span>
        </div>
        <div style={{marginBottom:'16px'}}>
          <p className="sarathi-eyebrow" style={{marginBottom:'4px'}}>PASSENGER</p>
          <h2 id="incoming-booking-modal-title" style={{fontSize:'22px',margin:'0 0 4px',color:'var(--theme-paper)'}}>
            {incomingOffer.ride?.passengerName||incomingOffer.passengerName||'Yatri'}
          </h2>
          <p style={{fontSize:'12px',color:'var(--text-secondary)',margin:0}}>
            {incomingOffer.ride?.passengerCount||incomingOffer.passengerCount||1} {(incomingOffer.ride?.passengerCount||incomingOffer.passengerCount||1)===1?'Passenger':'Passengers'}
            {(incomingOffer.ride?.passengerPhone||incomingOffer.passengerPhone)?` · 📞 ${incomingOffer.ride?.passengerPhone||incomingOffer.passengerPhone}`:''}
          </p>
        </div>
        <div className="sarathi-modal-route">
          <div className="sarathi-route-point">
            <div className="sarathi-point-dot pickup"/>
            <div className="sarathi-point-text">
              <span>PICKUP</span>
              <strong>{incomingOffer.ride?.pickupAddress||incomingOffer.pickupAddress||'Belagavi Pickup'}</strong>
            </div>
          </div>
          <div className="sarathi-route-point">
            <div className="sarathi-point-dot dropoff"/>
            <div className="sarathi-point-text">
              <span>DESTINATION</span>
              <strong>{incomingOffer.ride?.dropoffAddress||incomingOffer.dropoffAddress||'Belagavi Destination'}</strong>
            </div>
          </div>
        </div>
        <div className="sarathi-modal-stats">
          <div className="sarathi-stat-box"><span>Est. Fare</span><strong>₹{incomingOffer.ride?.fareEstimate||incomingOffer.fareEstimate||'80'}</strong></div>
          <div className="sarathi-stat-box"><span>Pickup ETA</span><strong>{incomingOffer.estimatedPickupMin||2} min</strong></div>
        </div>
        <div className="sarathi-timer-bar-wrap">
          <div className="sarathi-timer-label"><span>Decision window</span><span>{secondsRemaining}s</span></div>
          <div className="sarathi-timer-track"><div className="sarathi-timer-fill" style={{width:`${Math.min(100,Math.max(0,(secondsRemaining/30)*100))}%`}}/></div>
        </div>
        <div className="sarathi-modal-actions">
          <button type="button" className="sarathi-btn-reject" disabled={busy} onClick={()=>respondOffer(incomingOffer,'reject')}>✕ Decline</button>
          <button type="button" className="sarathi-btn-accept" disabled={busy} onClick={()=>respondOffer(incomingOffer,'accept')}>✓ Accept Booking</button>
        </div>
      </div>
    </div>}

    <GlassPanel className="p-5 space-y-4"><h2>Availability</h2><div className="flex flex-wrap gap-3"><GlassButton disabled={busy} onClick={()=>act('/drivers/availability',{available:true},'PATCH')}>Go available</GlassButton><GlassButton disabled={busy} onClick={()=>act('/drivers/availability',{available:false},'PATCH')}>Go offline</GlassButton></div><p role="status" className="text-text-secondary">{notice}</p></GlassPanel>
    {error&&<p role="alert" className="ride-error">{error}</p>}
    {ride&&<GlassPanel className="p-5 space-y-4"><h2>Current ride</h2><p className="break-all">{ride.rideId}</p><p role="status">{ride.status}</p>{['ACCEPTED','ARRIVING','ARRIVED','ONGOING'].includes(ride.status)&&<><GlassButton onClick={()=>setSharing(v=>!v)}>{sharing?'Stop sharing location':'Share live location'}</GlassButton><p className="text-text-secondary">{locationNotice||'Location sharing starts only after you choose to enable it.'}</p></>}{ride.pool&&['ARRIVING','ONGOING'].includes(ride.status)?<GlassButton disabled={busy} onClick={()=>act(`/rides/${ride.rideId}/stops/${ride.pool.stopIndex}`,{})}>{ride.pool.pooled.order[ride.pool.stopIndex]}</GlassButton>:next&&<GlassButton variant="primary" disabled={busy} onClick={()=>act(`/rides/${ride.rideId}/status`,{status:next},'PATCH')}>{next==='ARRIVING'?'Heading to pickup':next==='ARRIVED'?'Mark arrived':next==='ONGOING'?'Start ride':'Complete ride'}</GlassButton>}</GlassPanel>}
    <Link to="/activity">View my trip history →</Link><h2 className="text-xl">Incoming offers</h2>{offers.length===0&&<p className="text-text-secondary">No pending offers. Availability and demand determine matching.</p>}{offers.map(offer=><GlassPanel key={offer._id} className="p-5 space-y-4"><p>Pickup estimate: {offer.estimatedPickupMin} min</p><p className="text-text-secondary">Expires {new Date(offer.expiresAt).toLocaleTimeString()}</p><div className="flex gap-3"><GlassButton variant="primary" disabled={busy} onClick={()=>respondOffer(offer,'accept')}>Accept</GlassButton><GlassButton disabled={busy} onClick={()=>respondOffer(offer,'reject')}>Reject</GlassButton></div></GlassPanel>)}
  </section>;
}
