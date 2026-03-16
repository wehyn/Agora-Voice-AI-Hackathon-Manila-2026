export interface LatLng {
  lat: number;
  lng: number;
}

export interface POI {
  name: string;
  lat: number;
  lng: number;
  type?: string;
  distance?: number;
}

export interface RouteInfo {
  coordinates: LatLng[];
  distanceMeters: number;
  durationSeconds: number;
  summary?: string;
}

export type NavigationActionType =
  | 'navigate'
  | 'search_poi'
  | 'adjust_route'
  | 'trip_status';

export interface NavigationAction {
  type: NavigationActionType;
  params: Record<string, unknown>;
}

export interface NavigationState {
  userLocation: LatLng | null;
  destination: POI | null;
  route: RouteInfo | null;
  pois: POI[];
  isNavigating: boolean;
  eta: string | null;
  distance: string | null;
}
