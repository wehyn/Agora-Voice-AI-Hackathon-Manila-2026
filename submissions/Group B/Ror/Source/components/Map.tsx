'use client';

import { useEffect, useRef } from 'react';
import {
  MapContainer,
  TileLayer,
  Marker,
  Polyline,
  useMap,
} from 'react-leaflet';
import L from 'leaflet';
import type { LatLng, POI, RouteInfo } from '@/types/navigation';
import type { AvatarState } from '@/types/conversation';

const DARK_TILES =
  'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
const DARK_TILES_ATTR =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>';
const DEFAULT_CENTER: [number, number] = [14.5995, 120.9842];
const DEFAULT_ZOOM = 14;

function createPulsingIcon() {
  return L.divIcon({
    className: '',
    html: `<div class="user-location-dot"><div class="user-location-pulse"></div><div class="user-location-core"></div></div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
}

function createAvatarIcon(state: AvatarState) {
  const stateClass = `avatar-marker--${state}`;
  const labelMap: Record<AvatarState, string> = {
    idle: '',
    connecting: '...',
    listening: '',
    thinking: '...',
    speaking: '',
    disconnected: '',
  };
  const label = labelMap[state];

  return L.divIcon({
    className: '',
    html: `
      <div class="avatar-marker ${stateClass}">
        <div class="avatar-marker__ring"></div>
        <div class="avatar-marker__ring avatar-marker__ring--outer"></div>
        <div class="avatar-marker__face">
          <svg viewBox="0 0 32 32" width="28" height="28" fill="none">
            <circle cx="16" cy="12" r="5" fill="rgba(255,255,255,0.9)"/>
            <path d="M8 26c0-4.4 3.6-8 8-8s8 3.6 8 8" fill="rgba(255,255,255,0.7)"/>
          </svg>
        </div>
        ${label ? `<span class="avatar-marker__label">${label}</span>` : ''}
      </div>
    `,
    iconSize: [48, 48],
    iconAnchor: [24, 24],
  });
}

function createPOIIcon(label?: string) {
  return L.divIcon({
    className: '',
    html: `<div class="poi-marker"><div class="poi-marker-dot"></div>${label ? `<span class="poi-marker-label">${label}</span>` : ''}</div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
  });
}

function MapController({
  userLocation,
  flyTo,
  route,
}: {
  userLocation: LatLng | null;
  flyTo: LatLng | null;
  route: RouteInfo | null;
}) {
  const map = useMap();
  const hasCentered = useRef(false);

  useEffect(() => {
    if (route && route.coordinates.length > 1) {
      const bounds = L.latLngBounds(
        route.coordinates.map((c) => [c.lat, c.lng] as [number, number])
      );
      map.flyToBounds(bounds, { padding: [60, 60], duration: 1.5, maxZoom: 15 });
    } else if (flyTo) {
      map.flyTo([flyTo.lat, flyTo.lng], 15, { duration: 1.5 });
    }
  }, [flyTo, route, map]);

  useEffect(() => {
    if (userLocation && !hasCentered.current) {
      map.flyTo([userLocation.lat, userLocation.lng], DEFAULT_ZOOM, {
        duration: 1.5,
      });
      hasCentered.current = true;
    }
  }, [userLocation, map]);

  return null;
}

interface MapProps {
  userLocation: LatLng | null;
  route: RouteInfo | null;
  pois: POI[];
  flyTo?: LatLng | null;
  avatarState?: AvatarState;
}

export default function Map({
  userLocation,
  route,
  pois,
  flyTo = null,
  avatarState = 'idle',
}: MapProps) {
  const defaultIcon = useRef(createPulsingIcon());
  const avatarIconRef = useRef(createAvatarIcon(avatarState));
  const prevAvatarState = useRef(avatarState);

  if (avatarState !== prevAvatarState.current) {
    avatarIconRef.current = createAvatarIcon(avatarState);
    prevAvatarState.current = avatarState;
  }

  const isAvatarActive = avatarState !== 'idle';

  return (
    <MapContainer
      center={
        userLocation
          ? [userLocation.lat, userLocation.lng]
          : DEFAULT_CENTER
      }
      zoom={DEFAULT_ZOOM}
      className="map-container"
      zoomControl={false}
      attributionControl={false}
    >
      <TileLayer url={DARK_TILES} attribution={DARK_TILES_ATTR} />
      <MapController userLocation={userLocation} flyTo={flyTo ?? null} route={route} />

      {userLocation && (
        <Marker
          position={[userLocation.lat, userLocation.lng]}
          icon={isAvatarActive ? avatarIconRef.current : defaultIcon.current}
        />
      )}

      {route && route.coordinates.length > 0 && (
        <Polyline
          positions={route.coordinates.map((c) => [c.lat, c.lng])}
          pathOptions={{
            color: '#60a5fa',
            weight: 5,
            opacity: 0.85,
            lineCap: 'round',
            lineJoin: 'round',
          }}
        />
      )}

      {pois.map((poi, i) => (
        <Marker
          key={`${poi.name}-${i}`}
          position={[poi.lat, poi.lng]}
          icon={createPOIIcon(poi.name)}
        />
      ))}
    </MapContainer>
  );
}
