import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useRide } from '../context/RideContext';
import RideMap from '../components/maps/RideMap';
import GlassPanel from '../components/glass/GlassPanel';
import GlassButton from '../components/glass/GlassButton';

const labels=['Booking requested','Finding your Sarathi','Sarathi assigned','Sarathi arriving at pickup','Sarathi arrived','Ride started','Ride completed'];
const statusSteps={REQUESTED:0,OFFERED:1,REASSIGNING:1,UNASSIGNED:1,FAILED:1,ACCEPTED:2,ARRIVING:3,ARRIVED:4,ONGOING:5,COMPLETED:6,WITHDRAWN:-1,CANCELLED:-1};
const titles={REQUESTED:'Booking requested',OFFERED:'Finding your Sarathi',REASSIGNING:'Finding another Sarathi',UNASSIGNED:'No Sarathi is available right now',FAILED:'No Sarathi is available right now',ACCEPTED:'Your Sarathi is assigned',ARRIVING:'Your Sarathi is on the way!',ARRIVED:'Your Sarathi has arrived',ONGOING:'Your ride is underway',COMPLETED:'Ride completed',WITHDRAWN:'You left the pool',CANCELLED:'Ride cancelled'};
const reasons=['Changed my plans','Booked by mistake','Sarathi taking too long','Found another ride','Other'];
function coordinates(point){return point?.coordinates?{lat:point.coordinates[1],lng:point.coordinates[0]}:null;}

export default function Tracking(){
  const state=useRide(),{rideId}=useParams(),[dialog,setDialog]=useState(false),[reason,setReason]=useState(reasons[0]),[restoreError,setRestoreError]=useState('');
  useEffect(()=>{if(rideId&&state.ride?.rideId!==rideId&&state.auth?.accessToken){setRestoreError('');void state.loadRide(rideId).catch(e=>setRestoreError(e.message));}},[rideId,state.ride?.rideId,state.auth?.accessToken]);
  const simulated=!rideId&&state.mode==='simulation',phase=simulated?state.simulation.phase:state.ride?.status;
  if(!phase||phase==='ready')return <GlassPanel className="p-8 max-w-2xl mx-auto space-y-4"><p className="page-eyebrow">YOUR JOURNEY</p><h1 className="text-2xl">{rideId?'Loading your ride…':'No active ride'}</h1><p className="text-text-secondary">{restoreError||state.error||'Choose pickup and drop-off to start a journey.'}</p>{(restoreError||state.error)&&<Link to="/login/passenger" className="text-accent">Sign in again →</Link>}<Link to="/book" className="text-accent inline-block">Book a ride →</Link></GlassPanel>;
  const ride=state.ride||{},status=simulated?state.simulation.phase:ride.status,step=simulated?({searching:1,matched:2,riding:5,complete:6}[status]??0):(statusSteps[status]??0);
  const terminal=['complete','COMPLETED','CANCELLED','FAILED','UNASSIGNED','WITHDRAWN'].includes(status);
  const canCancel=simulated?['searching','matched','riding'].includes(status):['REQUESTED','OFFERED','REASSIGNING','ACCEPTED','ARRIVING','ARRIVED'].includes(status);
  const pickup=state.pickup||coordinates(ride.pickup),dropoff=state.dropoff||coordinates(ride.dropoff),driverAt=coordinates(ride.driver?.location);
  async function confirmCancel(){if(await state.cancel(reason))setDialog(false);}
  return <section className="space-y-5"><div className="page-heading"><div><p className="page-eyebrow">{simulated?'SIMULATION / NOT LIVE GPS':'YOUR BOOKED RIDE'}</p><h1 role="status">{simulated?({searching:'Finding a simulated cab',matched:'Simulated cab at pickup',riding:'Your simulated journey is underway',complete:'Demo destination reached'}[status]||status):(titles[status]||status)}</h1></div><Link className="text-accent" to="/book">Booking details →</Link></div>
    <RideMap pickup={pickup} dropoff={dropoff} route={ride.pool?.pooled?.geometry?{points:ride.pool.pooled.geometry.coordinates.map(([lng,lat])=>({lng,lat}))}:state.route} locked simulation={simulated?state.simulation:null} vehicleType={ride.driver?.vehicleType} gps={ride.driver?.locationSource==='GPS'} driverLocation={!simulated?driverAt:null}/>
    <div className="tracking-grid"><GlassPanel className="p-5 space-y-4"><h2 className="text-lg">Ride progress</h2>{status==='CANCELLED'&&<p role="status" className="text-accent">Your ride has been cancelled successfully.</p>}{simulated&&<p className="text-text-secondary">Sarathi matching and vehicle movement are simulated. No real cab has been booked.</p>}{!simulated&&<p className="text-text-secondary">Ride details refresh from the backend every two seconds. The map shows the last reported Sarathi position.</p>}
      <ol className="ride-timeline" aria-label="Ride status">{labels.map((label,index)=><li key={label} className={index<step?'is-done':index===step?'is-current':''}><span aria-hidden="true">{index<step?'✓':index+1}</span><p>{label}</p></li>)}</ol>
      {simulated&&<progress className="ride-progress" aria-label="Simulated trip progress" max="100" value={state.simulation.percent}/>}
      {!simulated&&<dl className="route-summary"><div><dt>Ride ID</dt><dd className="break-all">{ride.rideId}</dd></div><div><dt>Pickup</dt><dd>{ride.pickupAddress||'Pickup location'}</dd></div><div><dt>Destination</dt><dd>{ride.dropoffAddress||'Drop-off location'}</dd></div><div><dt>Yatris / route</dt><dd>{ride.passengerCount||1} · {ride.routeType||'shortest'}</dd></div><div><dt>Estimated distance</dt><dd>{ride.distanceKm?`${ride.distanceKm.toFixed(2)} km`:'—'}</dd></div><div><dt>Fare estimate</dt><dd>{ride.fareEstimate!=null?`₹${Number(ride.fareEstimate).toFixed(2)}`:'Pending'}</dd></div></dl>}
      {state.error&&<p role="alert" className="ride-error">{state.error}</p>}{restoreError&&<p role="alert" className="ride-error">{restoreError}</p>}
      {canCancel&&<GlassButton variant="outline" loading={state.busy} onClick={()=>setDialog(true)}>{simulated?'Stop simulation':'Cancel Ride'}</GlassButton>}
      {terminal&&<Link to="/book" onClick={state.reset} className="text-accent inline-block">Plan another journey →</Link>}
    </GlassPanel>
    {!simulated&&ride.driver&&<GlassPanel className="driver-card p-5 space-y-3"><p className="page-eyebrow">YOUR SARATHI</p><div className="driver-avatar" aria-hidden="true">{ride.driver.name?.split(/\s+/).map(p=>p[0]).slice(0,2).join('').toUpperCase()||'R'}</div><h2>{ride.driver.name}</h2><p>{[ride.driver.vehicleType,ride.driver.vehicleModel].filter(Boolean).join(' · ')||'IntelliMarg vehicle'}</p><p>Registration: {ride.driver.registrationNumber||'Not provided'}</p>{ride.driver.rating!=null&&<p>Rating: {ride.driver.rating}</p>}<p>Pickup ETA: {ride.pickupEtaMin!=null?`${ride.pickupEtaMin} min`:'Updating'}</p><p className="driver-location-note">{driverAt?(ride.driver.locationSource==='GPS'?'Last reported Sarathi GPS position.':ride.driver.locationSource==='SYNTHETIC'?'Demo Sarathi location is synthetic, not live GPS.':'Stored Sarathi location; live GPS sharing has not been confirmed.'):'Waiting for a Sarathi location update.'}</p></GlassPanel>}
    </div>
    {dialog&&<div className="cancel-backdrop" role="presentation"><section className="cancel-dialog" role="dialog" aria-modal="true" aria-labelledby="cancel-title"><h2 id="cancel-title">Cancel this ride?</h2><p>Are you sure you want to cancel your IntelliMarg booking?</p>{!simulated&&<label className="booking-label">Reason for cancellation<select value={reason} onChange={e=>setReason(e.target.value)}>{reasons.map(item=><option key={item}>{item}</option>)}</select></label>}<div className="cancel-actions"><GlassButton variant="outline" disabled={state.busy} onClick={()=>setDialog(false)}>Keep ride</GlassButton><GlassButton variant="primary" loading={state.busy} onClick={confirmCancel}>{simulated?'Stop demo':'Confirm cancellation'}</GlassButton></div></section></div>}
  </section>;
}
