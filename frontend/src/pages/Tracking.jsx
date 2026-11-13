import { Link } from 'react-router-dom';
import { useRide } from '../context/RideContext';
import RideMap from '../components/maps/RideMap';
import GlassPanel from '../components/glass/GlassPanel';
import GlassButton from '../components/glass/GlassButton';
export default function Tracking(){
  const state=useRide();const simulated=state.mode==='simulation',phase=simulated?state.simulation.phase:state.ride?.status;
  if(!phase||phase==='ready')return <GlassPanel className="p-8 max-w-2xl mx-auto space-y-4"><p className="page-eyebrow">YOUR JOURNEY</p><h1 className="text-2xl">No active ride</h1><p className="text-text-secondary">Choose pickup and drop-off to start a journey.</p><Link to="/book" className="text-accent inline-block">Book a ride →</Link></GlassPanel>;
  const titles={searching:'Finding a simulated cab',matched:'Simulated cab at pickup',riding:'Your simulated journey is underway',complete:'Demo destination reached',REQUESTED:'Request received',OFFERED:'Waiting for a driver response',REASSIGNING:'Finding another driver',ACCEPTED:'Driver accepted',ARRIVING:'Driver approaching pickup',ONGOING:'Ride in progress',COMPLETED:'Ride completed',CANCELLED:'Ride cancelled',FAILED:'No driver available'};
  const finished=['complete','COMPLETED','CANCELLED','FAILED'].includes(phase);
  const canCancel=simulated?['searching','matched','riding'].includes(phase):['REQUESTED','OFFERED','REASSIGNING','ACCEPTED','ARRIVING'].includes(phase);
  return <section className="space-y-5"><div className="page-heading"><div><p className="page-eyebrow">{simulated?'SIMULATION / NOT LIVE GPS':'PERSISTED BACKEND RIDE'}</p><h1 role="status">{titles[phase]||phase}</h1></div><Link className="text-accent" to="/book">Booking details →</Link></div>
    <RideMap pickup={state.pickup||{lat:state.ride?.pickup?.coordinates[1],lng:state.ride?.pickup?.coordinates[0]}} dropoff={state.dropoff} route={state.route} locked simulation={simulated?state.simulation:null}/>
    <GlassPanel className="p-5 space-y-4"><p className="text-text-secondary">{simulated?'Driver matching and vehicle movement are simulated. No real cab has been booked.':'Status is polled from the backend every two seconds. Live driver GPS is not available.'}</p>
      {simulated&&<progress className="ride-progress" aria-label="Simulated trip progress" max="100" value={state.simulation.percent}/>}
      {state.ride&&!simulated&&<dl className="route-summary"><div><dt>Ride ID</dt><dd className="break-all">{state.ride.rideId}</dd></div><div><dt>Backend fare estimate</dt><dd>₹{state.ride.fareEstimate?.toFixed(2)??'Pending'}</dd></div></dl>}
      {state.error&&<p role="alert" className="ride-error">{state.error}</p>}
      {canCancel&&<GlassButton variant="outline" loading={state.busy} onClick={state.cancel}>{simulated?'Stop simulation':'Cancel ride'}</GlassButton>}
      {finished&&<Link to="/book" onClick={state.reset} className="text-accent inline-block">Plan another journey →</Link>}
    </GlassPanel></section>;
}
