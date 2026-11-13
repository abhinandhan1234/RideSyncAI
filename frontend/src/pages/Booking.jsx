import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { CarFront, Check, Radar } from 'lucide-react';
import GlassPanel from '../components/glass/GlassPanel';

const pin = (map, at, color, label) => L.circleMarker(at, {radius: 8, color: 'white', fillColor: color, fillOpacity: 1}).bindTooltip(label).addTo(map);

export function Booking() {
  const container = useRef(null), map = useRef(null), live = useRef(null), pickup = useRef(null);
  const manualPickup = useRef(false);
  const [origin, setOrigin] = useState(null), [drop, setDrop] = useState(null);
  const [route, setRoute] = useState(null);
  const [phase, setPhase] = useState('ready');
  const [percent, setPercent] = useState(0);
  const locked = useRef(false);
  const reduceMotion = useReducedMotion();
  const [notice, setNotice] = useState('Allow location access or tap the map to choose pickup.');
  useEffect(() => {
    const m = L.map(container.current).setView([15.8497,74.4977], 13);
    map.current = m;
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {maxZoom:19, attribution:'© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'}).addTo(m);
    function choosePickup(at) {
      pickup.current = at;
      setOrigin(at);
      setNotice('Tap the map to select your drop location.');
    }
    m.on('click', ({latlng}) => {
      if (locked.current) return;
      if (!pickup.current) choosePickup(latlng);
      else { setRoute(null); setDrop(latlng); }
    });
    let active = true;
    const watch = navigator.geolocation?.watchPosition(({coords}) => {
      if (!active) return;
      const at = L.latLng(coords.latitude,coords.longitude);
      if (live.current) live.current.setLatLng(at);
      else live.current = pin(m,at,'#0284c7','Current location').setRadius(13);
      if (!pickup.current && !manualPickup.current) { choosePickup(at); m.setView(at,15); }
    }, () => { if (active && !pickup.current) setNotice('Location unavailable. Tap the map to set pickup, then tap your destination.'); }, {enableHighAccuracy:true, maximumAge:5000});
    return () => { active = false; if (watch !== undefined) navigator.geolocation.clearWatch(watch); m.remove(); live.current=null; pickup.current=null; };
  }, []);
  useEffect(() => {
    if (!origin) return;
    const marker=pin(map.current,origin,'#10b981','Pickup');
    return () => marker.remove();
  },[origin]);
  useEffect(() => {
    if (!origin || !drop) return;
    const m=map.current, marker=pin(m,drop,'#f59e0b','Drop'), controller=new AbortController();
    let line;
    async function calculate() {
      setNotice('Finding cab routes on the road network…');
      try {
        const base=import.meta.env.VITE_ROUTING_URL || 'https://router.project-osrm.org';
        const response=await fetch(base+'/route/v1/driving/'+origin.lng+','+origin.lat+';'+drop.lng+','+drop.lat+'?alternatives=true&overview=full&geometries=geojson',{signal:controller.signal});
        if (!response.ok) throw Error();
        const data=await response.json();
        if (!data.routes?.length) throw Error();
        const fastest=data.routes.reduce((a,b)=>a.duration<=b.duration?a:b);
        const best=data.routes.reduce((a,b)=>a.distance<=b.distance?a:b);
        const points=best.geometry.coordinates.map(([lng,lat])=>L.latLng(lat,lng));
        const lengths=[0];
        points.slice(1).forEach((p,i)=>lengths.push(lengths[i]+points[i].distanceTo(p)));
        if (!lengths.at(-1)) throw Error();
        line=L.polyline(points,{color:'#059669',weight:5}).addTo(m);
        m.fitBounds(line.getBounds(),{padding:[25,25]});
        setRoute({points,lengths,km:best.distance/1000,minutes:best.duration/60,saved:(fastest.distance-best.distance)/1000*.065});
        setNotice('Shortest returned cab route. Tap another destination to recalculate.');
      } catch { if (!controller.signal.aborted) setNotice('Could not find a driving route. Try another destination or check your connection.'); }
    }
    calculate();
    return () => { controller.abort(); marker.remove(); line?.remove(); };
  },[origin,drop]);
  useEffect(() => {
    const next = { searching: ['matched', 3500], matched: ['riding', 4000] }[phase];
    if (!next) return;
    const timer = setTimeout(() => setPhase(next[0]), next[1]);
    return () => clearTimeout(timer);
  }, [phase]);

  useEffect(() => {
    if (!route || !['matched', 'riding', 'complete'].includes(phase)) return;
    const { points, lengths } = route;
    const cab = L.marker(phase === 'complete' ? points.at(-1) : points[0], {
      icon: L.divIcon({ html: '<span aria-hidden="true">🚕</span>', className: 'text-2xl', iconSize: [32, 32], iconAnchor: [16, 16] })
    }).bindTooltip('Simulated cab').addTo(map.current);
    let frame;
    if (phase === 'riding') {
      const start = performance.now();
      const duration = Math.max(90000, Math.min(300000, route.minutes * 12000));
      let index = 1, lastPercent = -1;
      function move(now) {
        const progress = Math.min(1, (now - start) / duration);
        const distance = progress * lengths.at(-1);
        while (index < points.length - 1 && lengths[index] < distance) index++;
        const a = points[index - 1], b = points[index];
        const t = (distance - lengths[index - 1]) / (lengths[index] - lengths[index - 1] || 1);
        cab.setLatLng([a.lat + (b.lat - a.lat) * t, a.lng + (b.lng - a.lng) * t]);
        const value = Math.floor(progress * 100);
        if (value !== lastPercent) { setPercent(value); lastPercent = value; }
        if (progress < 1) frame = requestAnimationFrame(move);
        else setPhase('complete');
      }
      frame = requestAnimationFrame(move);
    }
    return () => { cancelAnimationFrame(frame); cab.remove(); };
  }, [phase, route]);

  function resetBooking() {
    locked.current = false;
    setPhase('ready');
    setPercent(0);
    setDrop(null);
    setRoute(null);
    setNotice('Tap the map to select your drop location.');
  }
  const titles = {
    searching: 'Finding your cab…',
    matched: 'Your cab is at pickup',
    riding: 'On the way to your destination',
    complete: 'You’ve arrived'
  };
  return <section className="space-y-4 max-w-3xl mx-auto">
    <h1 className="text-xl font-bold">Book a cab</h1>
    <div ref={container} aria-label="Pickup and destination map" style={{height:'48vh',minHeight:280,zIndex:0,borderRadius:16}} />
    <GlassPanel className="p-4 space-y-3">
      {phase === 'ready' ? <>
        <p role="status">{notice}</p>
        {origin && <button onClick={() => {
          manualPickup.current = true;
          pickup.current = null;
          resetBooking();
          setOrigin(null);
          setNotice('Tap to choose a new pickup.');
        }}>Change pickup</button>}
      </> : <AnimatePresence mode="wait">
        <motion.div key={phase} initial={{opacity: 0, y: reduceMotion ? 0 : 10}} animate={{opacity: 1, y: 0}}
          exit={{opacity: 0}} transition={{duration: reduceMotion ? 0 : 0.22}} className="flex items-center gap-3">
          {phase === 'searching' ? <Radar className="motion-safe:animate-pulse" /> : phase === 'complete' ? <Check /> : <CarFront />}
          <div><small>Demo booking</small><h2 role="status" className="font-bold">{titles[phase]}</h2></div>
        </motion.div>
      </AnimatePresence>}
      {phase === 'riding' && <progress aria-label="Trip progress" className="w-full accent-emerald-500" value={percent} max={100} />}
      {route && <><p>{route.km.toFixed(2)} km · {Math.ceil(route.minutes)} min · Estimated fare ₹{(40+12*route.km+2*Math.ceil(route.minutes)).toFixed(2)}</p>
        <p>Estimated fuel saved vs fastest returned route: {route.saved.toFixed(3)} L (6.5 L/100 km).</p>
        {phase === 'ready' && <>
          <small className="block">Demo ride · simulated driver</small>
          <button className="w-full rounded-xl bg-accent px-4 py-3 font-bold text-black" onClick={() => {
            if (locked.current) return;
            locked.current = true;
            setPhase('searching');
          }}>Book cab</button>
        </>}
        {['searching', 'matched'].includes(phase) && <button onClick={resetBooking}>Cancel booking</button>}
        {phase === 'complete' && <button onClick={resetBooking}>Book another cab</button>}
      </>}
    </GlassPanel>
  </section>;
}
export default Booking;
