'use client';

import { useState, useCallback } from 'react';
import type {
  LatLng,
  POI,
  RouteInfo,
  NavigationAction,
  NavigationState,
} from '@/types/navigation';
import { searchPOI, getRoute, formatDuration, formatDistance } from '@/lib/mapCommands';

const INITIAL_STATE: NavigationState = {
  userLocation: null,
  destination: null,
  route: null,
  pois: [],
  isNavigating: false,
  eta: null,
  distance: null,
};

export function useNavigationState() {
  const [state, setState] = useState<NavigationState>(INITIAL_STATE);
  const [flyTo, setFlyTo] = useState<LatLng | null>(null);

  const setUserLocation = useCallback((location: LatLng | null) => {
    setState((prev) => ({ ...prev, userLocation: location }));
  }, []);

  const handleAction = useCallback(
    async (action: NavigationAction, userLocation: LatLng | null) => {
      switch (action.type) {
        case 'search_poi': {
          const query = (action.params.query as string) || '';
          const limit = (action.params.limit as number) || 5;
          const results = await searchPOI(query, userLocation, limit);
          setState((prev) => ({ ...prev, pois: results }));
          if (results.length > 0) {
            setFlyTo({ lat: results[0].lat, lng: results[0].lng });
          }
          break;
        }

        case 'navigate': {
          const query = (action.params.query as string) || '';
          if (!userLocation) break;

          setState((prev) => ({
            ...prev,
            userLocation: prev.userLocation ?? userLocation,
          }));

          const results = await searchPOI(query, userLocation, 1);
          if (results.length === 0) break;

          const dest = results[0];
          const route = await getRoute(userLocation, {
            lat: dest.lat,
            lng: dest.lng,
          });

          setState((prev) => ({
            ...prev,
            destination: dest,
            route,
            pois: [dest],
            isNavigating: true,
            eta: route ? formatDuration(route.durationSeconds) : null,
            distance: route ? formatDistance(route.distanceMeters) : null,
          }));

          setFlyTo({ lat: dest.lat, lng: dest.lng });
          break;
        }

        case 'adjust_route': {
          if (!userLocation || !state.destination) break;
          const route = await getRoute(userLocation, {
            lat: state.destination.lat,
            lng: state.destination.lng,
          });

          setState((prev) => ({
            ...prev,
            route,
            eta: route ? formatDuration(route.durationSeconds) : prev.eta,
            distance: route
              ? formatDistance(route.distanceMeters)
              : prev.distance,
          }));
          break;
        }

        case 'trip_status': {
          // No-op: state already has eta and distance
          break;
        }
      }
    },
    [state.destination]
  );

  const navigateToPOI = useCallback(
    async (poi: POI, userLocation: LatLng | null) => {
      if (!userLocation) return;
      const route = await getRoute(userLocation, {
        lat: poi.lat,
        lng: poi.lng,
      });

      setState((prev) => ({
        ...prev,
        destination: poi,
        route,
        pois: [poi],
        isNavigating: true,
        eta: route ? formatDuration(route.durationSeconds) : null,
        distance: route ? formatDistance(route.distanceMeters) : null,
      }));

      setFlyTo({ lat: poi.lat, lng: poi.lng });
    },
    []
  );

  const clearNavigation = useCallback(() => {
    setState(INITIAL_STATE);
    setFlyTo(null);
  }, []);

  const clearPOIs = useCallback(() => {
    setState((prev) => ({ ...prev, pois: [] }));
  }, []);

  return {
    ...state,
    flyTo,
    setUserLocation,
    handleAction,
    navigateToPOI,
    clearNavigation,
    clearPOIs,
  };
}
