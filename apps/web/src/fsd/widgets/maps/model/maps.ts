"use client";
import { useCallback, useEffect, useRef, useState } from "react";

export type LatLng = { lat: number; lng: number };
export type UserLocation = LatLng & { accuracy?: number };
export type TravelMode = "driving" | "walking" | "cycling" | "transit";
export interface MapPlace {
  id: string;
  name: string;
  lat: number;
  lng: number;
  kind: string;
  distance?: number;
  address?: string;
  openingHours?: string;
  website?: string;
  phone?: string;
}
export interface MapRoute {
  mode: Exclude<TravelMode, "transit">;
  distance: number;
  duration: number;
  geometry: [number, number][];
  steps: string[];
  /** Turn-by-turn maneuvers (routes from older answers may not have them). */
  maneuvers?: { lat: number; lng: number; type: string; modifier?: string; name?: string; distance: number; instruction: string }[];
}
/** What a ```genyxo-map fence in an answer carries. */
export type MapCardData =
  | { type: "places"; query: string; origin: LatLng; radius: number; places: MapPlace[] }
  | { type: "route"; origin: LatLng; destination: { name: string; lat: number; lng: number }; requestedMode: TravelMode; route: MapRoute };

export type LocationStatus = "idle" | "locating" | "granted" | "denied" | "unavailable";

const CONSENT_KEY = "genyxo:maps-location";

/**
 * The browser location for the Maps page. Asking happens only after the user
 * presses "Turn on"; after that a returning visit resumes without asking again
 * as long as the browser still allows it.
 */
export function useUserLocation() {
  const [status, setStatus] = useState<LocationStatus>("idle");
  const [location, setLocation] = useState<UserLocation | null>(null);
  const watch = useRef<number | null>(null);

  const start = useCallback(() => {
    if (!("geolocation" in navigator)) { setStatus("unavailable"); return; }
    setStatus((current) => (current === "granted" ? current : "locating"));
    if (watch.current !== null) navigator.geolocation.clearWatch(watch.current);
    watch.current = navigator.geolocation.watchPosition(
      (position) => {
        try { localStorage.setItem(CONSENT_KEY, "on"); } catch { /* Storage is optional. */ }
        setLocation({ lat: position.coords.latitude, lng: position.coords.longitude, accuracy: position.coords.accuracy });
        setStatus("granted");
      },
      (error) => {
        setStatus(error.code === error.PERMISSION_DENIED ? "denied" : "unavailable");
        if (error.code === error.PERMISSION_DENIED) { try { localStorage.removeItem(CONSENT_KEY); } catch { /* Storage is optional. */ } }
      },
      { enableHighAccuracy: true, maximumAge: 30_000, timeout: 15_000 },
    );
  }, []);

  useEffect(() => {
    let consent = false;
    try { consent = localStorage.getItem(CONSENT_KEY) === "on"; } catch { /* Storage is optional. */ }
    let cancelled = false;
    // Resume only when the user turned it on before and the browser still allows it.
    navigator.permissions?.query({ name: "geolocation" as PermissionName }).then((permission) => {
      if (cancelled) return;
      if (permission.state === "denied") setStatus("denied");
      else if (consent && permission.state === "granted") start();
    }).catch(() => undefined);
    return () => { cancelled = true; if (watch.current !== null) navigator.geolocation.clearWatch(watch.current); };
  }, [start]);

  return { status, location, request: start };
}

function authHeaders(): HeadersInit {
  const token = typeof window !== "undefined" ? localStorage.getItem("authToken") : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function fetchRoute(from: LatLng, to: LatLng, mode: TravelMode): Promise<MapRoute> {
  const travel = mode === "transit" ? "walking" : mode;
  const params = new URLSearchParams({ fromLat: String(from.lat), fromLng: String(from.lng), toLat: String(to.lat), toLng: String(to.lng), mode: travel });
  const response = await fetch(`/api/chat/maps/route?${params}`, { headers: authHeaders() });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || "Routing is unavailable right now");
  return data as MapRoute;
}

export async function fetchAddress(point: LatLng, language?: string): Promise<string> {
  const params = new URLSearchParams({ lat: point.lat.toFixed(6), lng: point.lng.toFixed(6), ...(language ? { lang: language } : {}) });
  const response = await fetch(`/api/chat/maps/where?${params}`, { headers: authHeaders() });
  if (!response.ok) return "";
  const data = (await response.json().catch(() => ({}))) as { label?: string };
  return data.label || "";
}

export const formatDistance = (metres: number) => (metres < 950 ? `${Math.max(10, Math.round(metres / 10) * 10)} m` : `${(metres / 1000).toFixed(metres < 9500 ? 1 : 0)} km`);
export const formatDuration = (seconds: number) => {
  const minutes = Math.max(1, Math.round(seconds / 60));
  return minutes < 60 ? `${minutes} min` : `${Math.floor(minutes / 60)} h ${minutes % 60 ? `${minutes % 60} min` : ""}`.trim();
};
export const walkMinutes = (metres: number) => Math.max(1, Math.round(metres / 80));

export function distanceBetween(a: LatLng, b: LatLng) {
  const radians = (value: number) => (value * Math.PI) / 180;
  const h = Math.sin(radians(b.lat - a.lat) / 2) ** 2 + Math.cos(radians(a.lat)) * Math.cos(radians(b.lat)) * Math.sin(radians(b.lng - a.lng) / 2) ** 2;
  return Math.round(6_371_000 * 2 * Math.asin(Math.sqrt(h)));
}

const APPLE_FLAGS: Record<TravelMode, string> = { driving: "d", walking: "w", cycling: "c", transit: "r" };
const GOOGLE_MODES: Record<TravelMode, string> = { driving: "driving", walking: "walking", cycling: "bicycling", transit: "transit" };
export const appleMapsUrl = (from: LatLng, to: LatLng, mode: TravelMode) => `https://maps.apple.com/?saddr=${from.lat},${from.lng}&daddr=${to.lat},${to.lng}&dirflg=${APPLE_FLAGS[mode]}`;
export const googleMapsUrl = (from: LatLng, to: LatLng, mode: TravelMode) => `https://www.google.com/maps/dir/?api=1&origin=${from.lat},${from.lng}&destination=${to.lat},${to.lng}&travelmode=${GOOGLE_MODES[mode]}`;

/** Opens turn-by-turn navigation (the overlay mounted with the map cards). */
export function startNavigation(destination: { name: string; lat: number; lng: number }, mode: TravelMode, route?: MapRoute | null) {
  document.dispatchEvent(new CustomEvent("genyxo:navigate", { detail: { destination, mode, route: route || null } }));
}

/** Puts a place into the composer as an "@Name" mention the model gets the address and coordinates of. */
export function askAboutPlace(place: { name: string; lat: number; lng: number; address?: string }) {
  document.dispatchEvent(new CustomEvent("genyxo:composer-mention", {
    detail: { kind: "place", id: `${place.lat.toFixed(6)},${place.lng.toFixed(6)}`, name: place.name.slice(0, 80), lat: place.lat, lng: place.lng, address: place.address },
  }));
}
