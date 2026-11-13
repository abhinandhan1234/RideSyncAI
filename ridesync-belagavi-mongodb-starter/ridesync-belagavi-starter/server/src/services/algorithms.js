// All routing values here are FALLBACK ESTIMATES, not measured traffic or real road ETAs.
export function haversineKm(a, b) {
  const [lon1, lat1] = a.coordinates, [lon2, lat2] = b.coordinates;
  const rad = x => x * Math.PI / 180, R = 6371.0088;
  const dLat = rad(lat2 - lat1), dLon = rad(lon2 - lon1);
  const h = Math.sin(dLat/2)**2 + Math.cos(rad(lat1))*Math.cos(rad(lat2))*Math.sin(dLon/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1-h));
}
export const clamp = (x, low=0, high=1) => Math.max(low, Math.min(high, x));
export function pickupEstimateKm(straightKm) { return straightKm * 1.35; }
export function pickupEstimateMin(straightKm) { return Math.max(2, Math.round(pickupEstimateKm(straightKm)/22*60)); }
export function scoreDriver(driver, ride, now = new Date()) {
  const straightKm = haversineKm(driver.location, ride.pickup);
  const roadKm = pickupEstimateKm(straightKm), eta = pickupEstimateMin(straightKm);
  const distance = 1-clamp(roadKm/12), etaScore = 1-clamp(eta/35);
  const idleMinutes = Math.max(0, (now - new Date(driver.idleSince || now))/60000);
  const idleFairness = clamp(idleMinutes / 120);
  const workloadFairness = 0.6*(1-clamp((driver.currentWorkload || 0) / 3)) + 0.4*(1-clamp((driver.completedRides || 0) / 200));
  const acceptance = clamp(driver.acceptanceRate ?? 0.85);
  const score = +(0.30*distance + 0.25*etaScore + 0.20*idleFairness + 0.15*workloadFairness + 0.10*acceptance).toFixed(4);
  return { score, distanceKm: +roadKm.toFixed(2), etaMin: eta,
    factors: { distance, eta: etaScore, idleFairness, workloadFairness, acceptance },
    note: 'ETA uses simulated 1.35 road factor and 22 km/h until graph routing is integrated' };
}
export function surgeMultiplier(demand, supply) {
  const ratio = Math.max(0, Number(demand)) / Math.max(1, Number(supply));
  return { ratio, multiplier: ratio >= 3 ? 1.6 : ratio >= 2 ? 1.35 : ratio >= 1 ? 1.15 : 1.0 };
}
export function estimateFare(distanceKm, etaMinutes, multiplier = 1) {
  const base=40, distance=+(distanceKm*12).toFixed(2), time=+(etaMinutes*2).toFixed(2);
  return { base, distance, time, surge: multiplier, total: +((base+distance+time)*multiplier).toFixed(2), currency:'INR' };
}
// Hungarian minimum-cost assignment, O(n^3), accepts rectangular matrix (rows=rides, cols=drivers).
// A dummy column at cost=1e6 denotes an unmatched ride when available drivers < rides.
export function hungarian(costs) {
  const rows = costs.length;
  if (!rows) return [];
  const drivers = costs[0].length;
  if (costs.some(r=>r.length !== drivers)) throw new Error('Ragged cost matrix');
  const cols = Math.max(rows, drivers);
  const c = costs.map(r => [...r, ...Array(cols-drivers).fill(1e6)]);
  const u=Array(rows+1).fill(0),v=Array(cols+1).fill(0),p=Array(cols+1).fill(0),way=Array(cols+1).fill(0);
  for(let i=1;i<=rows;i++){
    p[0]=i; let j0=0;
    const minv=Array(cols+1).fill(Infinity), used=Array(cols+1).fill(false);
    do {
      used[j0]=true; const i0=p[j0]; let delta=Infinity,j1=0;
      for(let j=1;j<=cols;j++) if(!used[j]){
        const cur=c[i0-1][j-1]-u[i0]-v[j];
        if(cur<minv[j]){minv[j]=cur;way[j]=j0;}
        if(minv[j]<delta){delta=minv[j];j1=j;}
      }
      for(let j=0;j<=cols;j++) if(used[j]){u[p[j]]+=delta;v[j]-=delta;}
      else if(j)minv[j]-=delta;
      j0=j1;
    }while(p[j0]!==0);
    do{const j1=way[j0];p[j0]=p[j1];j0=j1;}while(j0!==0);
  }
  return p.map((row,j)=>({row:row-1,col:j-1})).filter(x=>x.row>=0&&x.col<drivers&&c[x.row][x.col]<1e6)
    .sort((a,b)=>a.row-b.row);
}
export function directionDegrees(a,b) {
  const [x1,y1]=a.coordinates,[x2,y2]=b.coordinates;
  return Math.atan2(y2-y1,(x2-x1)*Math.cos(((y1+y2)/2)*Math.PI/180))*180/Math.PI;
}
export function poolingCompatible(a,b) {
  const pickupSeparationKm=haversineKm(a.pickup,b.pickup);
  const dropSeparationKm=haversineKm(a.dropoff,b.dropoff);
  const angle=Math.abs((directionDegrees(a.pickup,a.dropoff)-directionDegrees(b.pickup,b.dropoff)+540)%360-180);
  return { compatible: pickupSeparationKm<=2.5 && dropSeparationKm<=3 && angle<=35 && (a.passengerCount+b.passengerCount)<=4,
    pickupSeparationKm:+pickupSeparationKm.toFixed(2), dropSeparationKm:+dropSeparationKm.toFixed(2), directionDifferenceDegrees:+angle.toFixed(1),
    caveat:'Pre-filter only: final pooling requires road-network insertion, capacity and max-detour checks' };
}
