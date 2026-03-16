'use client';

import dynamic from 'next/dynamic';
import type { LatLng, POI, RouteInfo } from '@/types/navigation';
import type { AvatarState } from '@/types/conversation';

const Map = dynamic(() => import('./Map'), { ssr: false });

interface MapWrapperProps {
  userLocation: LatLng | null;
  route: RouteInfo | null;
  pois: POI[];
  flyTo?: LatLng | null;
  avatarState?: AvatarState;
}

export default function MapWrapper(props: MapWrapperProps) {
  return <Map {...props} />;
}
