import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MapPin, ArrowRight, LocateFixed } from 'lucide-react';
import { useRide } from '../context/RideContext';
import RideMap from '../components/maps/RideMap';
import { validLocation } from '../services/ride-utils';
import GlassButton from '../components/glass/GlassButton';
import GlassPanel from '../components/glass/GlassPanel';

function CoordinateFields({label,value,onChange,disabled}){
  const [error,setError]=useState('');
  function submit(event){event.preventDefault();const form=new FormData(event.currentTarget);const latText=form.get('lat'),lngText=form.get('lng');const at={lat:Number(latText),lng:Number(lngText)};if(!latText||!lngText||!validLocation(at)){setError('Enter valid latitude and longitude.');return;}setError('');onChange(at);}
  return <form className="coordinate-form" onSubmit={submit} key={`${value?.lat},${value?.lng}`}><fieldset disabled={disabled}><legend>{label}</legend><div className="coordinate-inputs"><label>Latitude<input name="lat" type="number" step="any" min="-90" max="90" required defaultValue={value?.lat.toFixed(6)||''} placeholder="15.849700"/></label><label>Longitude<input name="lng" type="number" step="any" min="-180" max="180" required defaultValue={value?.lng.toFixed(6)||''} placeholder="74.497700"/></label><button type="submit">Set</button></div></fieldset>{error&&<p role="alert" className="ride-error">{error}</p>}</form>;
}
export default function Booking(){
  const state=useRide(),navigate=useNavigate();const [selection,setSelection]=useState('pickup'),[locationError,setLocationError]=useState(''),[locating,setLocating]=useState(false);
  function choose(at,kind){if(kind==='pickup'){state.setPickup(at);setSelection('dropoff');}else state.setDropoff(at);}
  function locate(){if(!navigator.geolocation){setLocationError('Location is unavailable. Choose pickup on the map.');return;}setLocating(true);setLocationError('');navigator.geolocation.getCurrentPosition(({coords})=>{choose({lat:coords.latitude,lng:coords.longitude},'pickup');setLocating(false);},()=>{setLocationError('Location permission unavailable. Choose pickup on the map or enter coordinates.');setLocating(false);},{timeout:10000,maximumAge:30000});}
  const pending=state.mode==='simulation'?state.simulation.phase!=='ready':Boolean(state.ride);
  return <section className="booking-page"><div className="page-heading"><div><p className="page-eyebrow">BELAGAVI / YOUR NEXT JOURNEY</p><h1>Where are we taking you?</h1><p>Choose your pickup, then your destination.</p></div><Link className="text-accent text-sm" to="/track">Track your ride <ArrowRight className="inline w-4"/></Link></div>
    <div className="booking-grid"><div><div className="map-toolbar"><div className="ride-segment" aria-label="Location selection">{['pickup','dropoff'].map(kind=><button key={kind} disabled={state.locked} aria-pressed={selection===kind} onClick={()=>setSelection(kind)}><MapPin size={14}/>{kind==='pickup'?'Set pickup':'Set drop-off'}</button>)}</div><button className="location-button" disabled={state.locked||locating} onClick={locate}><LocateFixed size={16}/>{locating?'Locating…':'Use my location'}</button></div>
      <RideMap {...state} selection={selection} onChoose={choose} simulation={state.mode==='simulation'?state.simulation:null}/>
      <p className="map-caption">{state.locked?'Ride locations are locked. Cancel or finish your ride to edit.':`Tap the map to choose ${selection==='pickup'?'your pickup':'your drop-off'}, or enter coordinates below.`}</p>
      {locationError&&<p role="alert" className="ride-error">{locationError}</p>}
      <div className="coordinate-grid"><CoordinateFields label="Pickup" value={state.pickup} disabled={state.locked} onChange={at=>choose(at,'pickup')}/><CoordinateFields label="Drop-off" value={state.dropoff} disabled={state.locked} onChange={at=>choose(at,'dropoff')}/></div>
    </div><GlassPanel className="booking-panel"><p className="page-eyebrow">JOURNEY DETAILS</p><h2>Your cab, your way.</h2>
      <div className="ride-segment booking-mode" aria-label="Booking mode">{['simulation','backend'].map(mode=><button key={mode} disabled={pending||state.busy} aria-pressed={state.mode===mode} onClick={()=>state.setMode(mode)}>{mode==='simulation'?'Simulation':'Backend booking'}</button>)}</div>
      <p className="booking-explainer">{state.mode==='simulation'?'Demo only. Driver matching and movement are simulated; no real cab is booked.':'Creates a persisted ride through the authenticated backend. Driver availability determines matching.'}</p>
      {state.mode==='backend'&&!state.auth&&<Link to="/login/passenger" className="login-callout">Sign in or register as a passenger to book →</Link>}
      <label className="booking-label">Route preference<select value={state.routeType} disabled={state.locked} onChange={e=>state.setRouteType(e.target.value)}><option value="shortest">Shortest</option><option value="fastest">Fastest</option><option value="eco">Eco (shortest-route proxy)</option></select></label>
      <label className="booking-label">Passengers<select value={state.passengerCount} disabled={state.locked} onChange={e=>state.setPassengerCount(Number(e.target.value))}>{[1,2,3,4].map(n=><option key={n} value={n}>{n} {n===1?'passenger':'passengers'}</option>)}</select></label>
      {state.routeLoading&&<p role="status" className="booking-explainer">Finding a road route…</p>}
      {state.routeError&&<p role="alert" className="ride-error">{state.routeError}</p>}
      {!state.pickup&&!state.routeLoading&&<p className="booking-explainer">Start by choosing your pickup on the map.</p>}
      {state.route&&<div className="route-summary"><div><span>Distance</span><strong>{state.route.km.toFixed(2)} km</strong></div><div><span>Estimated duration</span><strong>{Math.ceil(state.route.minutes)} min</strong></div><div><span>Illustrative fare</span><strong>₹{(40+12*state.route.km+2*Math.ceil(state.route.minutes)).toFixed(2)}</strong></div><p>Road route from OSRM. Fare is an estimate; the backend quote may differ.</p><p>Estimated fuel difference versus the fastest returned route: {state.route.saved.toFixed(3)} L, assuming 6.5 L/100 km. Not measured savings.</p></div>}
      {state.error&&<p role="alert" className="ride-error">{state.error}</p>}
      {pending?<><p role="status" className="booking-explainer">{state.mode==='simulation'?`Simulation: ${state.simulation.phase}`:`Ride status: ${state.ride.status}`}</p><GlassButton variant="primary" fullWidth onClick={()=>navigate('/track')}>View tracking</GlassButton></>:<GlassButton variant="primary" fullWidth disabled={!state.route||state.routeLoading||(state.mode==='backend'&&state.auth?.user.role!=='passenger')} loading={state.busy} onClick={async()=>{if(await state.book())navigate('/track');}}>{state.mode==='simulation'?'Start demo ride':'Request cab'}</GlassButton>}
    </GlassPanel></div>
  </section>;
}
