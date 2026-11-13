const CACHE_TTL_MS = 10 * 60 * 1000;
const MIN_INTERVAL_MS = 1100;
const MAX_CACHE_ENTRIES = 250;
const cache = new Map();
const inFlight = new Map();
let requestQueue = Promise.resolve();
let lastRequestAt = 0;

function remember(key, value) {
  cache.delete(key);
  cache.set(key, { value, expiresAt: Date.now() + CACHE_TTL_MS });
  while (cache.size > MAX_CACHE_ENTRIES) cache.delete(cache.keys().next().value);
}

async function throttledFetch(url, fetcher) {
  const task = requestQueue.then(async () => {
    const delay = Math.max(0, lastRequestAt + MIN_INTERVAL_MS - Date.now());
    if (delay) await new Promise(resolve => setTimeout(resolve, delay));
    lastRequestAt = Date.now();
    const response = await fetcher(url, {
      headers: { Accept: 'application/json', 'User-Agent': 'RideSyncAI/1.0 (Belagavi ride booking)' },
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) throw new Error(`Geocoder returned ${response.status}`);
    return response.json();
  });
  requestQueue = task.catch(() => {});
  return task;
}

function compactPlace(item) {
  const address = item.address || {};
  const name = item.name || address.amenity || address.building || address.road || item.display_name?.split(',')[0] || 'Unnamed place';
  return {
    name: String(name).slice(0, 120),
    address: String(item.display_name || name).slice(0, 300),
    latitude: Number(item.lat),
    longitude: Number(item.lon),
    placeType: String(item.type || item.class || 'place').slice(0, 60),
  };
}

async function cachedRequest(key, url, fetcher) {
  const entry = cache.get(key);
  if (entry && entry.expiresAt > Date.now()) return entry.value;
  if (inFlight.has(key)) return inFlight.get(key);
  const pending = throttledFetch(url, fetcher).then(value => {
    remember(key, value);
    return value;
  }).finally(() => inFlight.delete(key));
  inFlight.set(key, pending);
  return pending;
}

export async function searchPlaces(query, fetcher = fetch) {
  const q = String(query || '').trim().replace(/\s+/g, ' ');
  if (q.length < 3 || q.length > 120) return [];
  const key = `search:${q.toLocaleLowerCase()}`;
  const url = new URL('https://nominatim.openstreetmap.org/search');
  url.search = new URLSearchParams({ q, format: 'jsonv2', addressdetails: '1', limit: '6', countrycodes: 'in', viewbox: '74.35,15.95,74.65,15.75', bounded: '0' });
  const data = await cachedRequest(key, url, fetcher);
  return Array.isArray(data) ? data.map(compactPlace).filter(place => Number.isFinite(place.latitude) && Number.isFinite(place.longitude)) : [];
}

export async function reversePlace(latitude, longitude, fetcher = fetch) {
  const lat = Number(latitude), lon = Number(longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) throw new TypeError('Invalid latitude or longitude');
  const key = `reverse:${lat.toFixed(5)},${lon.toFixed(5)}`;
  const url = new URL('https://nominatim.openstreetmap.org/reverse');
  url.search = new URLSearchParams({ lat: String(lat), lon: String(lon), format: 'jsonv2', addressdetails: '1' });
  const data = await cachedRequest(key, url, fetcher);
  return compactPlace(data);
}

export function clearGeocodingCache() {
  cache.clear();
  inFlight.clear();
}
