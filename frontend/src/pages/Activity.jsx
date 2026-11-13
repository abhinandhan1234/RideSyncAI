import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useRide } from '../context/RideContext';
import { apiRequest } from '../services/api';
import GlassPanel from '../components/glass/GlassPanel';
export default function Activity(){
  const {auth}=useRide();const [rides,setRides]=useState([]),[error,setError]=useState(''),[loading,setLoading]=useState(false);
  useEffect(()=>{if(auth?.user.role!=='passenger')return;const controller=new AbortController();setLoading(true);apiRequest('/rides/history',{token:auth.accessToken,signal:controller.signal}).then(data=>setRides(data.rides)).catch(e=>{if(e.name!=='AbortError')setError(e.message);}).finally(()=>{if(!controller.signal.aborted)setLoading(false);});return()=>controller.abort();},[auth]);
  return <section className="max-w-3xl mx-auto space-y-5"><div className="page-heading"><div><p className="page-eyebrow">YOUR JOURNEYS</p><h1>Trip activity</h1><p>Persisted rides from your passenger account.</p></div></div>{!auth&&<Link to="/login/passenger" className="text-accent">Sign in to see your history →</Link>}{loading&&<p role="status">Loading rides…</p>}{error&&<p role="alert" className="ride-error">{error}</p>}{auth&&!loading&&!rides.length&&<p className="text-text-secondary">No booked rides yet. Simulations are not saved as real trips.</p>}{rides.map(ride=><GlassPanel key={ride._id} className="p-5 space-y-3"><div className="flex justify-between gap-4"><h2>{ride.status}</h2><span>₹{ride.fare?.total?.toFixed(2)??'—'}</span></div><p className="text-xs text-text-secondary break-all">{ride._id}</p><p className="text-sm text-text-secondary">{new Date(ride.requestedAt||ride.createdAt).toLocaleString()}</p></GlassPanel>)}</section>;
}
