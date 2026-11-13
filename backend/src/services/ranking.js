// Adapted from the reference starter's haversine and weighted dispatch scoring.
export function haversineKm(a, b) {
  const [lon1, lat1] = a.coordinates, [lon2, lat2] = b.coordinates;
  const rad = x => x * Math.PI / 180;
  const h = Math.sin(rad(lat2-lat1)/2)**2 + Math.cos(rad(lat1))*Math.cos(rad(lat2))*Math.sin(rad(lon2-lon1)/2)**2;
  return 6371.0088 * 2 * Math.asin(Math.sqrt(Math.min(1, h)));
}
export function fallbackRanking(ride, drivers, now = new Date()) {
  const clamp = x => Math.max(0, Math.min(1, x));
  return drivers.map(d => {
    const distance = haversineKm(d.location, ride.pickup);
    const idle = d.idleMinutes + Math.max(0, (now-new Date(d.idleSince))/60000);
    return { driverId: d.driverId,
      score: 0.5*(1-clamp(distance/12)) + 0.2*clamp(d.acceptanceRate) + 0.2*clamp(idle/120) + 0.1*(1-clamp(d.activeRideCount/3)),
      pickupEtaMinutes: Math.max(2, distance*1.35/22*60), rankingSource: 'fallback' };
  }).sort((a,b) => b.score-a.score || a.driverId.localeCompare(b.driverId));
}
export async function rankDrivers(ride, drivers, config, fetchImpl = fetch) {
  const fallback = fallbackRanking(ride, drivers);
  if (!config.aiUrl || !drivers.length) return fallback;
  try {
    const response = await fetchImpl(`${config.aiUrl.replace(/\/$/,'')}/rank-drivers`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(config.aiTimeoutMs),
      body: JSON.stringify({ rideId: ride.rideId,
        pickup: { lng: ride.pickup.coordinates[0], lat: ride.pickup.coordinates[1] },
        drivers: drivers.map(d => ({ driverId: d.driverId,
          location: { lng: d.location.coordinates[0], lat: d.location.coordinates[1] },
          acceptanceRate: d.acceptanceRate, idleMinutes: d.idleMinutes, activeRideCount: d.activeRideCount })) }),
    });
    if (!response.ok) throw new Error('AI request failed');
    const { rankedDrivers } = await response.json();
    const eligible = new Set(drivers.map(d=>d.driverId)), seen = new Set();
    if (!Array.isArray(rankedDrivers) || !rankedDrivers.length) throw new Error('Invalid AI ranking');
    for (const row of rankedDrivers) {
      if (!eligible.has(row.driverId) || seen.has(row.driverId) || !Number.isFinite(row.score) ||
          !Number.isFinite(row.pickupEtaMinutes) || row.pickupEtaMinutes < 0) throw new Error('Invalid AI candidate');
      seen.add(row.driverId);
    }
    return [...rankedDrivers.map(d => ({ driverId:d.driverId, score:d.score, pickupEtaMinutes:d.pickupEtaMinutes, rankingSource:'ai' })),
      ...fallback.filter(d=>!seen.has(d.driverId))];
  } catch { return fallback; }
}
