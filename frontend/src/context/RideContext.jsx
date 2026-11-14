import {io} from 'socket.io-client';
import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { apiRequest } from '../services/api';
import { routeFromResponse, bookingPayload } from '../services/ride-utils';
const Context=createContext(null);
export const useRide=()=>useContext(Context);
function readSavedAuth(){try{return JSON.parse(sessionStorage.getItem('ridesync.auth')||'null');}catch{return null;}}
export function RideProvider({children}) {
  const [auth,setAuthState]=useState(null); // Session-scoped only, so a tracking refresh can reload its ride.
  const [pickup,setPickup]=useState(null),[dropoff,setDropoff]=useState(null),[routeType,setRouteType]=useState('shortest');
  const [passengerCount,setPassengerCount]=useState(1),[route,setRoute]=useState(null),[routeLoading,setRouteLoading]=useState(false),[routeError,setRouteError]=useState('');
  const [mode,setMode]=useState('backend'),[ride,setRide]=useState(null),[simulation,setSimulation]=useState({phase:'ready',percent:0});
  const [bookingMode,setBookingMode]=useState('INDIVIDUAL');
  const [intelligence,setIntelligence]=useState(null);
  useEffect(()=>{
    const controller=new AbortController();setIntelligence(null);
    if(auth)apiRequest('/zones/surge',{token:auth.accessToken,signal:controller.signal}).then(setIntelligence).catch(()=>{});
    return ()=>controller.abort();
  },[auth]);
  const [busy,setBusy]=useState(false),[error,setError]=useState('');const submitting=useRef(false);
  function setAuth(value){setAuthState(value);try{if(value)sessionStorage.setItem('ridesync.auth',JSON.stringify(value));else sessionStorage.removeItem('ridesync.auth');}catch{}}
  const [restoring,setRestoring]=useState(true);
  useEffect(()=>{
    const saved=readSavedAuth(), controller=new AbortController();
    if(!saved?.accessToken){setRestoring(false);return;}
    apiRequest('/auth/me',{token:saved.accessToken,signal:controller.signal})
      .then(({user})=>{if(!controller.signal.aborted)setAuth({accessToken:saved.accessToken,user});})
      .catch(()=>{if(!controller.signal.aborted)setAuth(null);})
      .finally(()=>{if(!controller.signal.aborted)setRestoring(false);});
    return ()=>controller.abort();
  },[]);
  useEffect(()=>{
    const expire=e=>{if(e.detail===auth?.accessToken){setAuth(null);reset();}};
    window.addEventListener('intellimarg:expired',expire);
    return ()=>window.removeEventListener('intellimarg:expired',expire);
  },[auth]);
  const [quote,setQuote]=useState(null),[quoting,setQuoting]=useState(false);
  useEffect(()=>{
    setQuote(null);setQuoting(false);
    if(!auth||!pickup||!dropoff||bookingMode!=='POOLING')return;
    const controller=new AbortController();setQuoting(true);
    apiRequest('/pools/quote',{token:auth.accessToken,signal:controller.signal,method:'POST',body:bookingPayload({pickup,dropoff,routeType,passengerCount})})
      .then(q=>{if(!controller.signal.aborted)setQuote(q);})
      .catch(e=>{if(!controller.signal.aborted)setQuote({error:e.message});})
      .finally(()=>{if(!controller.signal.aborted)setQuoting(false);});
    return ()=>controller.abort();
  },[auth,pickup,dropoff,routeType,passengerCount,bookingMode]);
  const locked=busy||(mode==='simulation'?simulation.phase!=='ready':ride&&!['CANCELLED','COMPLETED','FAILED','WITHDRAWN'].includes(ride.status));
  useEffect(()=>{
    setRoute(null);setRouteError('');
    if(!pickup||!dropoff){setRouteLoading(false);return;}
    const controller=new AbortController();setRouteLoading(true);
    const timeout=setTimeout(()=>controller.abort('timeout'),12000);
    if(mode==='backend' && auth){
      const params=new URLSearchParams({originLng:pickup.lng,originLat:pickup.lat,destLng:dropoff.lng,destLat:dropoff.lat,vehicleType:'cab'});
      apiRequest('/routes/compare?'+params,{token:auth.accessToken,signal:controller.signal}).then(({routes})=>{
        if(controller.signal.aborted)return;
        const r=routes[routeType];
        setRoute({points:(r.geometry?.coordinates||[]).map(([lng,lat])=>({lng,lat})),km:r.distanceKm,minutes:r.durationMin,source:r.source,saved:Math.max(0,routes.fastest.estimatedFuelL-r.estimatedFuelL)});
      }).catch(e=>{if(!controller.signal.aborted)setRouteError(e.message);}).finally(()=>{clearTimeout(timeout);setRouteLoading(false);});
      return ()=>{controller.abort();clearTimeout(timeout);};
    }
    const base=import.meta.env.VITE_ROUTING_URL||'https://router.project-osrm.org';
    fetch(`${base}/route/v1/driving/${pickup.lng},${pickup.lat};${dropoff.lng},${dropoff.lat}?alternatives=true&overview=full&geometries=geojson`,{signal:controller.signal})
      .then(async response=>{if(!response.ok)throw new Error('Routing service unavailable.');return response.json();})
      .then(data=>{if(!controller.signal.aborted)setRoute(routeFromResponse(data,routeType));})
      .catch(()=>{if(!controller.signal.aborted||controller.signal.reason==='timeout')setRouteError('Could not load a road route. Check your connection or choose a different destination.');})
      .finally(()=>{clearTimeout(timeout);if(!controller.signal.aborted||controller.signal.reason==='timeout')setRouteLoading(false);});
    return()=>{clearTimeout(timeout);controller.abort();};
  },[pickup,dropoff,routeType,mode,auth]);
  useEffect(()=>{
    if(mode!=='simulation')return;
    const next={searching:['matched',3500],matched:['riding',4000]}[simulation.phase];
    if(!next)return;
    const timer=setTimeout(()=>setSimulation({phase:next[0],percent:0}),next[1]);return()=>clearTimeout(timer);
  },[simulation.phase,mode]);
  useEffect(()=>{
    if(simulation.phase!=='riding'||!route||mode!=='simulation')return;
    const start=Date.now(),duration=Math.max(90000,Math.min(300000,route.minutes*12000));
    const timer=setInterval(()=>{const percent=Math.min(100,Math.floor((Date.now()-start)/duration*100));setSimulation({phase:percent===100?'complete':'riding',percent});},300);
    return()=>clearInterval(timer);
  },[simulation.phase,route,mode]);
  useEffect(()=>{
    if(!auth||!ride?.rideId||mode!=='backend'||['COMPLETED','CANCELLED','FAILED','WITHDRAWN'].includes(ride.status))return;
    const controller=new AbortController();let timer;
    const poll=async()=>{
      try {const next=await apiRequest(`/rides/${ride.rideId}`,{token:auth.accessToken,signal:controller.signal});setRide(next);setError('');}
      catch(e){if(e.name!=='AbortError')setError(e.message);}
      finally{if(!controller.signal.aborted)timer=setTimeout(poll,2000);}
    };
    void poll();return()=>{controller.abort();clearTimeout(timer);};
  },[auth,ride?.rideId,ride?.status,mode]);
  useEffect(()=>{
    if(!auth||mode!=='backend'||!ride?.rideId)return;
    const socket=io(import.meta.env.VITE_SOCKET_URL||location.origin,{auth:{token:auth.accessToken}});
    let active=true;
    socket.on('connect',()=>socket.emit('ride:join',ride.rideId));
    socket.onAny(async(_,event)=>{if(event?.rideId===ride.rideId){
      try {const fresh=await apiRequest('/rides/'+ride.rideId,{token:auth.accessToken});if(active)setRide(fresh);}catch{}
    }});
    return ()=>{active=false;socket.disconnect();};
  },[auth,mode,ride?.rideId]);
  async function book(opts={}){
    if(submitting.current)return false;
    setError('');
    if(!route){setError('Select pickup and drop-off and wait for the road route.');return false;}
    if(mode==='simulation'){setSimulation({phase:'searching',percent:0});return true;}
    if(auth?.user.role!=='passenger'){setError('Sign in as a Yatri to book through the backend.');return false;}
    submitting.current=true;setBusy(true);
    try{
      const payload={
        ...bookingPayload({pickup,dropoff,routeType,passengerCount}),
        bookingMode,
        ...(bookingMode==='POOLING'&&quote?.rideId?{poolRideId:quote.rideId}:{}),
        ...(opts?.preferredDriverId?{preferredDriverId:opts.preferredDriverId}:{})
      };
      const created=await apiRequest('/rides',{method:'POST',token:auth.accessToken,body:payload});
      setRide(created);
      return created;
    }
    catch(e){setError(e.message);return false;}finally{submitting.current=false;setBusy(false);}
  }
  async function loadRide(rideId){
    if(!auth?.accessToken)throw new Error('Sign in again to restore this ride.');
    setMode('backend');setBusy(true);setError('');
    try{const restored=await apiRequest(`/rides/${rideId}`,{token:auth.accessToken});setRide(restored);if(restored.pickup?.coordinates)setPickup({lat:restored.pickup.coordinates[1],lng:restored.pickup.coordinates[0],name:restored.pickupAddress||'Pickup'});if(restored.dropoff?.coordinates)setDropoff({lat:restored.dropoff.coordinates[1],lng:restored.dropoff.coordinates[0],name:restored.dropoffAddress||'Drop-off'});return restored;}
    catch(e){setError(e.message);throw e;}finally{setBusy(false);}
  }
  async function cancel(reason=''){
    setError('');
    if(mode==='simulation'){setSimulation({phase:'ready',percent:0});return true;}
    if(!ride||!auth)return false;
    setBusy(true);try{setRide({...ride,...await apiRequest(`/rides/${ride.rideId}/cancel`,{method:'POST',token:auth.accessToken,body:{reason}})});return true;}catch(e){setError(e.message);return false;}finally{setBusy(false);}
  }
  function reset(){setRide(null);setSimulation({phase:'ready',percent:0});setError('');}
  function logout(){setAuth(null);reset();setMode('backend');}
  return <Context.Provider value={{restoring,quote,quoting,bookingMode,setBookingMode,intelligence,auth,setAuth,logout,pickup,setPickup,dropoff,setDropoff,routeType,setRouteType,passengerCount,setPassengerCount,route,routeLoading,routeError,mode,setMode,ride,simulation,busy,error,locked,book,loadRide,cancel,reset}}>{children}</Context.Provider>;
}
