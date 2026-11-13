import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { apiRequest } from '../services/api';
import { routeFromResponse, bookingPayload } from '../services/ride-utils';
const Context=createContext(null);
export const useRide=()=>useContext(Context);
function readSavedAuth(){try{return JSON.parse(sessionStorage.getItem('ridesync.auth')||'null');}catch{return null;}}
export function RideProvider({children}) {
  const [auth,setAuthState]=useState(readSavedAuth); // Session-scoped only, so a tracking refresh can reload its ride.
  const [pickup,setPickup]=useState(null),[dropoff,setDropoff]=useState(null),[routeType,setRouteType]=useState('shortest');
  const [passengerCount,setPassengerCount]=useState(1),[route,setRoute]=useState(null),[routeLoading,setRouteLoading]=useState(false),[routeError,setRouteError]=useState('');
  const [mode,setMode]=useState('simulation'),[ride,setRide]=useState(null),[simulation,setSimulation]=useState({phase:'ready',percent:0});
  const [busy,setBusy]=useState(false),[error,setError]=useState('');const submitting=useRef(false);
  function setAuth(value){setAuthState(value);try{if(value)sessionStorage.setItem('ridesync.auth',JSON.stringify(value));else sessionStorage.removeItem('ridesync.auth');}catch{}}
  const locked=busy||(mode==='simulation'?simulation.phase!=='ready':ride&&!['CANCELLED','COMPLETED','FAILED'].includes(ride.status));
  useEffect(()=>{
    setRoute(null);setRouteError('');
    if(!pickup||!dropoff){setRouteLoading(false);return;}
    const controller=new AbortController();setRouteLoading(true);
    const timeout=setTimeout(()=>controller.abort('timeout'),12000);
    const base=import.meta.env.VITE_ROUTING_URL||'https://router.project-osrm.org';
    fetch(`${base}/route/v1/driving/${pickup.lng},${pickup.lat};${dropoff.lng},${dropoff.lat}?alternatives=true&overview=full&geometries=geojson`,{signal:controller.signal})
      .then(async response=>{if(!response.ok)throw new Error('Routing service unavailable.');return response.json();})
      .then(data=>{if(!controller.signal.aborted)setRoute(routeFromResponse(data,routeType));})
      .catch(()=>{if(!controller.signal.aborted||controller.signal.reason==='timeout')setRouteError('Could not load a road route. Check your connection or choose a different destination.');})
      .finally(()=>{clearTimeout(timeout);if(!controller.signal.aborted||controller.signal.reason==='timeout')setRouteLoading(false);});
    return()=>{clearTimeout(timeout);controller.abort();};
  },[pickup,dropoff,routeType]);
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
    if(!auth||!ride?.rideId||mode!=='backend'||['COMPLETED','CANCELLED','FAILED'].includes(ride.status))return;
    const controller=new AbortController();let timer;
    const poll=async()=>{
      try {const next=await apiRequest(`/rides/${ride.rideId}`,{token:auth.accessToken,signal:controller.signal});setRide(next);setError('');}
      catch(e){if(e.name!=='AbortError')setError(e.message);}
      finally{if(!controller.signal.aborted)timer=setTimeout(poll,2000);}
    };
    void poll();return()=>{controller.abort();clearTimeout(timer);};
  },[auth,ride?.rideId,ride?.status,mode]);
  async function book(){
    if(submitting.current)return false;
    setError('');
    if(!route){setError('Select pickup and drop-off and wait for the road route.');return false;}
    if(mode==='simulation'){setSimulation({phase:'searching',percent:0});return true;}
    if(auth?.user.role!=='passenger'){setError('Sign in as a passenger to book through the backend.');return false;}
    submitting.current=true;setBusy(true);
    try{const created=await apiRequest('/rides',{method:'POST',token:auth.accessToken,body:bookingPayload({pickup,dropoff,routeType,passengerCount})});setRide(created);return created;}
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
    setBusy(true);try{setRide({...ride,...await apiRequest(`/rides/${ride.rideId}/cancel`,{method:'PATCH',token:auth.accessToken,body:{reason}})});return true;}catch(e){setError(e.message);return false;}finally{setBusy(false);}
  }
  function reset(){setRide(null);setSimulation({phase:'ready',percent:0});setError('');}
  function logout(){setAuth(null);reset();setMode('simulation');}
  return <Context.Provider value={{auth,setAuth,logout,pickup,setPickup,dropoff,setDropoff,routeType,setRouteType,passengerCount,setPassengerCount,route,routeLoading,routeError,mode,setMode,ride,simulation,busy,error,locked,book,loadRide,cancel,reset}}>{children}</Context.Provider>;
}
