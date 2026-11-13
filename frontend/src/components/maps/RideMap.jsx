import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { BELAGAVI, routePoint } from '../../services/ride-utils';

export default function RideMap({pickup,dropoff,route,onChoose,selection='pickup',locked=false,simulation,driverLocation}){
  const element=useRef(),map=useRef(),choose=useRef({onChoose,selection,locked});
  useEffect(()=>{choose.current={onChoose,selection,locked};},[onChoose,selection,locked]);
  const [tileError,setTileError]=useState(false),[driverRoute,setDriverRoute]=useState([]);
  useEffect(()=>{
    const instance=L.map(element.current,{scrollWheelZoom:false}).setView([BELAGAVI.lat,BELAGAVI.lng],13);map.current=instance;
    const tiles=L.tileLayer(import.meta.env.VITE_TILE_URL||'https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'}).addTo(instance);
    tiles.on('tileerror',()=>setTileError(true));tiles.on('tileload',()=>setTileError(false));
    instance.on('click',({latlng})=>{const current=choose.current;if(!current.locked)current.onChoose?.({lat:latlng.lat,lng:latlng.lng},current.selection);});
    const observer=new ResizeObserver(()=>instance.invalidateSize());observer.observe(element.current);
    return()=>{observer.disconnect();instance.remove();map.current=null;};
  },[]);
  useEffect(()=>{
    if(!map.current)return;
    const layer=L.layerGroup().addTo(map.current);
    const marker=(at,color,label)=>{if(at)L.circleMarker([at.lat,at.lng],{radius:9,weight:3,color:'#F2F3EF',fillColor:color,fillOpacity:1}).bindTooltip(label).addTo(layer);};
    marker(pickup,'#477781',pickup?.name||'Pickup');marker(dropoff,'#111C21',dropoff?.name||'Drop-off');marker(driverLocation,'#D59A54','Driver location');
    if(route){const line=L.polyline(route.points.map(p=>[p.lat,p.lng]),{color:'#477781',weight:5}).addTo(layer);map.current.fitBounds(line.getBounds(),{padding:[35,35],animate:false});}
    else if(pickup)map.current.panTo([pickup.lat,pickup.lng],{animate:false});
    return()=>layer.remove();
  },[pickup,dropoff,route,driverLocation]);
  useEffect(()=>{
    if(!driverLocation||!pickup)return;
    const controller=new AbortController();
    const base=import.meta.env.VITE_ROUTING_URL||'https://router.project-osrm.org';
    fetch(`${base}/route/v1/driving/${driverLocation.lng},${driverLocation.lat};${pickup.lng},${pickup.lat}?overview=full&geometries=geojson`,{signal:controller.signal})
      .then(response=>response.ok?response.json():Promise.reject(new Error('route unavailable')))
      .then(data=>{const points=data.routes?.[0]?.geometry?.coordinates;if(points?.length>=2&&!controller.signal.aborted)setDriverRoute(points.map(([lng,lat])=>[lat,lng]));})
      .catch(()=>{if(!controller.signal.aborted)setDriverRoute([]);});
    return()=>controller.abort();
  },[driverLocation?.lat,driverLocation?.lng,pickup?.lat,pickup?.lng]);
  useEffect(()=>{
    if(!map.current||driverRoute.length<2)return;
    const line=L.polyline(driverRoute,{color:'#D59A54',weight:4,dashArray:'7 8',opacity:.9}).bindTooltip('Driver to pickup route').addTo(map.current);
    return()=>line.remove();
  },[driverRoute]);
  useEffect(()=>{
    if(!route||!['matched','riding','complete'].includes(simulation?.phase))return;
    const at=routePoint(route,(simulation.percent||0)/100);
    const cab=L.marker([at.lat,at.lng],{icon:L.divIcon({className:'ride-cab-marker',html:'<span aria-hidden="true">CAB</span>',iconSize:[36,26],iconAnchor:[18,13]})}).bindTooltip('Simulated cab — not live GPS').addTo(map.current);
    return()=>cab.remove();
  },[route,simulation?.phase,simulation?.percent]);
  return <div className="ride-map-shell"><div ref={element} className="ride-map" role="region" aria-label="Pickup and drop-off map. Use coordinate fields as a keyboard alternative."/>{tileError&&<p className="map-notice" role="status">Map tiles unavailable. Coordinate fields still work; check your connection.</p>}</div>;
}
