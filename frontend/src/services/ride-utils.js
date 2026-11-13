export const BELAGAVI = { lat: 15.8497, lng: 74.4977 };
export const toPoint = ({lat,lng}) => ({ type:'Point', coordinates:[lng,lat] });
export function validLocation(at) { return at && Number.isFinite(at.lat) && Number.isFinite(at.lng) && Math.abs(at.lat)<=90 && Math.abs(at.lng)<=180; }
export function bookingPayload({pickup,dropoff,passengerCount=1,routeType='shortest'}) {
  if(!validLocation(pickup)||!validLocation(dropoff))throw new Error('Choose valid pickup and drop-off coordinates.');
  if(!Number.isInteger(passengerCount)||passengerCount<1||passengerCount>4)throw new Error('Choose 1–4 passengers.');
  if(!['fastest','shortest','eco'].includes(routeType))throw new Error('Invalid route preference.');
  return {pickup:toPoint(pickup),dropoff:toPoint(dropoff),passengerCount,routeType,vehicleType:'car'};
}
export function routePoint(route,progress) {
  if(!route?.points?.length)return null;
  const total=route.lengths.at(-1), distance=Math.max(0,Math.min(1,progress))*total;
  let i=1;
  while(i<route.points.length-1&&route.lengths[i]<distance)i++;
  const a=route.points[i-1],b=route.points[i]||a;
  const t=(distance-route.lengths[i-1])/(route.lengths[i]-route.lengths[i-1]||1);
  return {lat:a.lat+(b.lat-a.lat)*t,lng:a.lng+(b.lng-a.lng)*t};
}
export function routeFromResponse(data,preference='shortest') {
  if(data.code!=='Ok'||!data.routes?.length)throw new Error('No driving route found.');
  const fastest=data.routes.reduce((a,b)=>a.duration<=b.duration?a:b);
  const best=preference==='fastest'?fastest:data.routes.reduce((a,b)=>a.distance<=b.distance?a:b);
  if(!Number.isFinite(best.distance)||!Number.isFinite(best.duration)||!best.geometry?.coordinates?.length)throw new Error('Routing service returned invalid data.');
  const points=best.geometry.coordinates.map(([lng,lat])=>({lat,lng}));
  if(points.length<2||!points.every(validLocation))throw new Error('Invalid route geometry.');
  const lengths=[0];
  for(let i=1;i<points.length;i++){
    const a=points[i-1],b=points[i],rad=Math.PI/180;
    const h=Math.sin((b.lat-a.lat)*rad/2)**2+Math.cos(a.lat*rad)*Math.cos(b.lat*rad)*Math.sin((b.lng-a.lng)*rad/2)**2;
    lengths.push(lengths.at(-1)+6371008.8*2*Math.asin(Math.min(1,Math.sqrt(h))));
  }
  if(lengths.at(-1)===0)throw new Error('Pickup and destination must differ.');
  return {points,lengths,km:best.distance/1000,minutes:best.duration/60,saved:Math.max(0,fastest.distance-best.distance)/1000*.065};
}
