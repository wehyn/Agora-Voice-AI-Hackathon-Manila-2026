import type { LatLng, POI, RouteInfo } from '@/types/navigation';

const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org';
const OSRM_BASE = 'https://router.project-osrm.org';

let lastNominatimCall = 0;
const NOMINATIM_THROTTLE_MS = 1100;

async function throttledNominatim(url: string): Promise<Response> {
  const now = Date.now();
  const wait = Math.max(0, NOMINATIM_THROTTLE_MS - (now - lastNominatimCall));
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastNominatimCall = Date.now();
  return fetch(url, {
    headers: { 'User-Agent': 'DriveMateAI/1.0' },
  });
}

export async function searchPOI(
  query: string,
  userLocation: LatLng | null,
  limit = 5
): Promise<POI[]> {
  const params = new URLSearchParams({
    q: query,
    format: 'json',
    limit: String(limit),
    addressdetails: '1',
  });

  if (userLocation) {
    params.set('viewbox', buildViewbox(userLocation, 0.5));
    params.set('bounded', '1');
  }

  let res = await throttledNominatim(
    `${NOMINATIM_BASE}/search?${params.toString()}`
  );
  let data = res.ok ? await res.json() : [];

  if (data.length === 0 && userLocation) {
    params.delete('viewbox');
    params.delete('bounded');
    res = await throttledNominatim(
      `${NOMINATIM_BASE}/search?${params.toString()}`
    );
    data = res.ok ? await res.json() : [];
  }

  return data.map((item: Record<string, string>) => ({
    name: item.display_name?.split(',')[0] || item.display_name,
    lat: parseFloat(item.lat),
    lng: parseFloat(item.lon),
    type: item.type,
    distance: userLocation
      ? haversineKm(userLocation, {
          lat: parseFloat(item.lat),
          lng: parseFloat(item.lon),
        })
      : undefined,
  }));
}

export async function getRoute(
  origin: LatLng,
  destination: LatLng
): Promise<RouteInfo | null> {
  const url = `${OSRM_BASE}/route/v1/driving/${origin.lng},${origin.lat};${destination.lng},${destination.lat}?overview=full&geometries=geojson&steps=true`;

  const res = await fetch(url);
  if (!res.ok) return null;

  const data = await res.json();
  if (!data.routes || data.routes.length === 0) return null;

  const route = data.routes[0];
  const coords: LatLng[] = route.geometry.coordinates.map(
    (c: [number, number]) => ({
      lat: c[1],
      lng: c[0],
    })
  );

  return {
    coordinates: coords,
    distanceMeters: route.distance,
    durationSeconds: route.duration,
    summary: route.legs?.[0]?.summary || '',
  };
}

export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const mins = Math.round(seconds / 60);
  if (mins < 60) return `${mins} min`;
  const hrs = Math.floor(mins / 60);
  const remainMins = mins % 60;
  return `${hrs}h ${remainMins}m`;
}

export function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)}m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

function buildViewbox(center: LatLng, delta: number): string {
  return `${center.lng - delta},${center.lat + delta},${center.lng + delta},${center.lat - delta}`;
}

function haversineKm(a: LatLng, b: LatLng): number {
  const R = 6371;
  const dLat = deg2rad(b.lat - a.lat);
  const dLon = deg2rad(b.lng - a.lng);
  const s =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(a.lat)) *
      Math.cos(deg2rad(b.lat)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
}

function deg2rad(deg: number): number {
  return deg * (Math.PI / 180);
}
