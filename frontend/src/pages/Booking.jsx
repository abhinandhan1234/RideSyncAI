import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, ArrowUpDown, LocateFixed, MapPin, UserCheck, Zap } from 'lucide-react';
import { useRide } from '../context/RideContext';
import RideMap from '../components/maps/RideMap';
import LocationAutocomplete from '../components/maps/LocationAutocomplete';
import { validLocation } from '../services/ride-utils';
import { apiRequest } from '../services/api';
import GlassButton from '../components/glass/GlassButton';
import GlassPanel from '../components/glass/GlassPanel';

function CoordinateFields({label,value,onChange,disabled}){
  const [error,setError]=useState('');
  function submit(event){event.preventDefault();const form=new FormData(event.currentTarget);const latText=form.get('lat'),lngText=form.get('lng');const at={lat:Number(latText),lng:Number(lngText)};if(!latText||!lngText||!validLocation(at)){setError('Enter valid latitude and longitude.');return;}setError('');onChange(at);}
  return <form className="coordinate-form" onSubmit={submit} key={`${value?.lat},${value?.lng}`}><fieldset disabled={disabled}><legend>{label}</legend><div className="coordinate-inputs"><label>Latitude<input name="lat" type="number" step="any" min="-90" max="90" required defaultValue={value?.lat.toFixed(6)||''} placeholder="15.849700"/></label><label>Longitude<input name="lng" type="number" step="any" min="-180" max="180" required defaultValue={value?.lng.toFixed(6)||''} placeholder="74.497700"/></label><button type="submit">Set</button></div></fieldset>{error&&<p role="alert" className="ride-error">{error}</p>}</form>;
}

export default function Booking(){
  const state=useRide(),navigate=useNavigate();const [selection,setSelection]=useState('pickup'),[locationError,setLocationError]=useState(''),[locating,setLocating]=useState(false),[advanced,setAdvanced]=useState(false);
  const [sheetOpen,setSheetOpen]=useState(true);
  const [nearbyDrivers,setNearbyDrivers]=useState([]);
  const [selectedDriverId,setSelectedDriverId]=useState('');
  const [loadingDrivers,setLoadingDrivers]=useState(false);

  useEffect(()=>{
    if(state.mode!=='backend'||!state.auth?.accessToken||!validLocation(state.pickup)){
      setNearbyDrivers([]);
      setSelectedDriverId('');
      return;
    }
    let active=true;
    setLoadingDrivers(true);
    const controller=new AbortController();
    apiRequest(`/drivers/nearby?lat=${state.pickup.lat}&lng=${state.pickup.lng}&passengerCount=${state.passengerCount}`,{
      token:state.auth.accessToken,
      signal:controller.signal
    }).then(res=>{
      if(active)setNearbyDrivers(res.drivers||[]);
    }).catch(()=>{
      if(active)setNearbyDrivers([]);
    }).finally(()=>{
      if(active)setLoadingDrivers(false);
    });
    return ()=>{active=false;controller.abort();};
  },[state.pickup,state.passengerCount,state.mode,state.auth?.accessToken]);
  async function reverse(at){
    try{const result=await apiRequest(`/locations/reverse?lat=${at.lat}&lon=${at.lng}`);return {...at,name:result.location.name,address:result.location.address};}
    catch{return {...at,name:`Map pin ${at.lat.toFixed(5)}, ${at.lng.toFixed(5)}`,address:'Selected from the map'};}
  }
  async function choose(at,kind=selection){
    if(!at){(kind==='pickup'?state.setPickup:state.setDropoff)(null);return;}
    const place=at.name?at:await reverse(at);(kind==='pickup'?state.setPickup:state.setDropoff)(place);setLocationError('');
    setSelection(kind==='pickup'?'dropoff':kind);
  }
  function locate(){if(!navigator.geolocation){setLocationError('Location is unavailable. Choose pickup on the map.');return;}setLocating(true);setLocationError('');navigator.geolocation.getCurrentPosition(({coords})=>{void choose({lat:coords.latitude,lng:coords.longitude},'pickup').finally(()=>setLocating(false));},()=>{setLocationError('Location permission unavailable. Choose pickup on the map or enter coordinates.');setLocating(false);},{timeout:10000,maximumAge:30000});}
  function swap(){const from=state.pickup;state.setPickup(state.dropoff);state.setDropoff(from);}
  const active=state.ride&&!['CANCELLED','COMPLETED','FAILED','WITHDRAWN'].includes(state.ride.status);
  const pending=state.mode==='simulation'?state.simulation.phase!=='ready':Boolean(active);
  const canBook=validLocation(state.pickup)&&validLocation(state.dropoff)&&Boolean(state.pickup?.name&&state.dropoff?.name)&&Boolean(state.route)&&!state.routeLoading;
  return <section className="booking-page"><div className="page-heading"><div><p className="page-eyebrow">BELAGAVI / YOUR NEXT JOURNEY</p><h1>Where are we taking you?</h1><p>Search for a place or select a point on the map.</p></div><Link className="text-accent text-sm" to={active?`/ride/${state.ride.rideId}`:'/track'}>Track your ride <ArrowRight className="inline w-4"/></Link></div>
    <div className="booking-grid"><div><div className="place-card">
      <LocationAutocomplete label="Pickup location" placeholder="Enter pickup location" value={state.pickup} disabled={state.locked} onChange={at=>{if(at)void choose(at,'pickup');else state.setPickup(null);}}/>
      <button className="swap-locations" type="button" onClick={swap} disabled={state.locked||!state.pickup||!state.dropoff} aria-label="Swap pickup and drop-off"><ArrowUpDown size={16}/></button>
      <LocationAutocomplete label="Drop-off location" placeholder="Where do you want to go?" value={state.dropoff} disabled={state.locked} onChange={at=>{if(at)void choose(at,'dropoff');else state.setDropoff(null);}}/>
      <div className="place-actions"><button className="location-button" disabled={state.locked||locating} onClick={locate}><LocateFixed size={16}/>{locating?'Locating…':'Use my current location'}</button><button className="advanced-toggle" type="button" aria-expanded={advanced} onClick={()=>setAdvanced(v=>!v)}>{advanced?'Hide':'Advanced location settings'}</button></div>
      {advanced&&<div className="coordinate-grid"><CoordinateFields label="Pickup coordinates" value={state.pickup} disabled={state.locked} onChange={at=>void choose(at,'pickup')}/><CoordinateFields label="Drop-off coordinates" value={state.dropoff} disabled={state.locked} onChange={at=>void choose(at,'dropoff')}/></div>}
    </div>
      <div className="map-toolbar"><div className="ride-segment" aria-label="Map location selection">{['pickup','dropoff'].map(kind=><button key={kind} disabled={state.locked} aria-pressed={selection===kind} onClick={()=>setSelection(kind)}><MapPin size={14}/>{kind==='pickup'?'Choose pickup':'Choose drop-off'}</button>)}</div><p className="map-caption">Tap the map to set the selected location.</p></div>
      <RideMap {...state} selection={selection} onChoose={choose} simulation={state.mode==='simulation'?state.simulation:null}/>
      {locationError&&<p role="alert" className="ride-error">{locationError}</p>}
    </div><GlassPanel className="booking-panel"><button type="button" className="booking-sheet-toggle" aria-controls="booking-details" aria-expanded={sheetOpen} onClick={()=>setSheetOpen(!sheetOpen)}>{sheetOpen?'Hide journey details':'Show journey details'}</button><div id="booking-details" className={sheetOpen?'':'sheet-collapsed'}><p className="page-eyebrow">JOURNEY DETAILS</p><h2>Your cab, your way.</h2>
      {state.mode==='backend'&&<label className="booking-label">Booking option<select disabled={state.locked} value={state.bookingMode} onChange={e=>state.setBookingMode(e.target.value)}><option value="INDIVIDUAL">Individual</option><option value="POOLING">Pooling</option></select></label>}
      {state.bookingMode==='POOLING'&&<div role="status">{state.quoting?'Checking shared routes…':state.quote?.error|| (state.quote?.rideId?
        <>Your share ₹{state.quote.fareEstimate}. Pickup in {state.quote.pool.pooled.passengers[1].waitMinutes.toFixed(1)} min · Detour {state.quote.pool.pooled.passengers[1].detourMinutes.toFixed(1)} min. Estimated shared-route fuel reduction {state.quote.pool.pooled.fuelLitresReductionPercent.toFixed(1)}%, distance reduction {state.quote.pool.pooled.distanceKmReductionPercent.toFixed(1)}%.</>:
        'No compatible pool quoted. You can request a cab and allow a compatible Yatri to join.')}</div>}
      {state.mode==='backend'&&state.intelligence&&<details><summary>Demand, simulated surge and repositioning</summary>{state.intelligence.zones.map(z=><p key={z.zone}>{z.zone}: {z.demand} forecast requests (synthetic model) · {z.available} available · {z.surge}×</p>)}{state.intelligence.reposition.map(m=><p key={m.origin+m.target}>{m.origin} → {m.target}: {m.drivers} recommended</p>)}</details>}
      <label className="booking-label">Route preference<select value={state.routeType} disabled={state.locked} onChange={e=>state.setRouteType(e.target.value)}><option value="shortest">Shortest</option><option value="fastest">Fastest</option><option value="eco">Eco</option></select></label>
      <label className="booking-label">Yatris<select value={state.passengerCount} disabled={state.locked} onChange={e=>state.setPassengerCount(Number(e.target.value))}>{[1,2,3,4].map(n=><option key={n} value={n}>{n} {n===1?'Yatri':'Yatris'}</option>)}</select></label>
      {state.routeLoading&&<p role="status" className="booking-explainer">Finding a road route…</p>}{state.routeError&&<p role="alert" className="ride-error">{state.routeError}</p>}
      {state.route&&<div className="route-summary"><div><span>Pickup</span><strong>{state.pickup?.name||'—'}</strong></div><div><span>Drop-off</span><strong>{state.dropoff?.name||'—'}</strong></div><div><span>Distance</span><strong>{state.route.km.toFixed(2)} km</strong></div><div><span>Estimated duration</span><strong>{Math.ceil(state.route.minutes)} min</strong></div><div><span>Estimated fare</span><strong>₹{(40+12*state.route.km+2*Math.ceil(state.route.minutes)).toFixed(2)}</strong></div><p>{state.route.source==='ESTIMATE_ONLY'?'Estimate only. Road coverage unavailable.':state.mode==='simulation'?'OSRM road estimate.':'Road-network estimate. Surge is applied at booking.'}</p></div>}
      {state.mode==='backend'&&state.auth?.user?.role==='passenger'&&state.route&&<div className="driver-selection-section">
        <label className="booking-label">Choose your Sarathi Captain</label>
        <div className="driver-cards-list">
          <button type="button" className={`driver-card ${!selectedDriverId?'selected':''}`} onClick={()=>setSelectedDriverId('')}>
            <div className="driver-card-avatar"><Zap size={18} className="text-accent"/></div>
            <div className="driver-card-info">
              <div className="driver-name-row">
                <strong>Auto-Dispatch (Fastest)</strong>
                <span className="driver-badge-recommended">Recommended</span>
              </div>
              <p>Instant dispatch with the closest available Belagavi captain</p>
            </div>
          </button>
          {nearbyDrivers.map(d=><button key={d.driverId} type="button" className={`driver-card ${selectedDriverId===d.driverId?'selected':''}`} onClick={()=>setSelectedDriverId(d.driverId)}>
            <div className="driver-card-avatar"><UserCheck size={18} className="text-accent"/></div>
            <div className="driver-card-info">
              <div className="driver-name-row">
                <strong>{d.name}</strong>
                <span className="driver-rating">★ {Number(d.rating||4.9).toFixed(1)}</span>
              </div>
              <p>{d.vehicle?.model||d.vehicle?.type||'Sarathi'} · {d.distanceKm} km away ({d.estimatedEtaMin} min pickup)</p>
            </div>
          </button>)}
          {!loadingDrivers&&nearbyDrivers.length===0&&<p className="booking-explainer" style={{fontSize:'11px',margin:'6px 0'}}>No individual captains nearby right now; Auto-dispatch will match the next available driver.</p>}
        </div>
      </div>}
      {state.error&&<p role="alert" className="ride-error">{state.error}</p>}
      {pending?<><p role="status" className="booking-explainer">{state.mode==='simulation'?`Simulation: ${state.simulation.phase}`:`Ride status: ${state.ride.status}`}</p><GlassButton variant="primary" fullWidth onClick={()=>navigate(state.mode==='simulation'?'/track':`/ride/${state.ride.rideId}`)}>View tracking</GlassButton></>:<GlassButton variant="primary" fullWidth disabled={!canBook||state.quoting||Boolean(state.quote?.error)||(state.mode==='backend'&&state.auth?.user.role!=='passenger')} loading={state.busy} onClick={async()=>{const booked=await state.book({preferredDriverId:selectedDriverId||undefined});if(booked)navigate(state.mode==='backend'?`/ride/${booked.rideId}`:'/track');}}>{state.mode==='simulation'?'Start demo ride':state.quote?.rideId?'Join pool':'Book Your Ride'}</GlassButton>}
    </div></GlassPanel></div>
  </section>;
}
