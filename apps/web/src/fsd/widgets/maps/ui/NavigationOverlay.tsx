"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { distanceBetween, fetchRoute, formatDistance, formatDuration, type LatLng, type MapRoute, type TravelMode, type UserLocation } from "../model/maps";
import { bearingBetween, cumulative, formatClock, maneuverArrow, placeManeuvers, project, type Maneuver } from "../model/navigation";
import { MapView } from "./MapView";

type Trip = { destination: { name: string; lat: number; lng: number }; mode: TravelMode };
const OFF_ROUTE_METRES = 45;
const ARRIVED_METRES = 22;
const PROMPTS = [400, 150, 35];

function say(text: string, muted: boolean) {
  if (muted || typeof speechSynthesis === "undefined") return;
  speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 1.02;
  speechSynthesis.speak(utterance);
}

/**
 * Turn-by-turn navigation in the spirit of Apple Maps: the camera follows you
 * tilted towards the road ahead, a glass card shows the next maneuver and its
 * distance, the bottom bar shows arrival time, and a calm voice reads the
 * turns. Leaving the route plans a new one; arriving ends the trip.
 */
export function NavigationOverlay() {
  const [trip, setTrip] = useState<Trip | null>(null);
  const [route, setRoute] = useState<MapRoute | null>(null);
  const [user, setUser] = useState<UserLocation | null>(null);
  const [heading, setHeading] = useState(0);
  const [muted, setMuted] = useState(false);
  const [status, setStatus] = useState<"routing" | "rerouting" | "driving" | "arrived" | "error">("routing");
  const [error, setError] = useState("");
  const last = useRef<UserLocation | null>(null);
  const spoken = useRef(new Set<string>());
  const offCount = useRef(0);
  const routing = useRef(false);
  // Arrival time ticks with the clock, not only with movement.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 15_000); return () => clearInterval(timer); }, []);

  const end = useCallback(() => {
    if (typeof speechSynthesis !== "undefined") speechSynthesis.cancel();
    setTrip(null); setRoute(null); setUser(null); setError(""); spoken.current.clear(); offCount.current = 0;
  }, []);

  useEffect(() => {
    const open = (event: Event) => {
      const detail = (event as CustomEvent<{ destination: Trip["destination"]; mode: TravelMode; route: MapRoute | null }>).detail;
      spoken.current.clear(); offCount.current = 0; last.current = null;
      setNow(Date.now());
      setTrip({ destination: detail.destination, mode: detail.mode });
      setRoute(detail.route?.maneuvers?.length ? detail.route : null);
      setStatus(detail.route?.maneuvers?.length ? "driving" : "routing");
    };
    document.addEventListener("genyxo:navigate", open);
    return () => document.removeEventListener("genyxo:navigate", open);
  }, []);

  // Follow the user's position for the whole trip.
  useEffect(() => {
    if (!trip || !("geolocation" in navigator)) return;
    const accept = (next: UserLocation) => {
      if (last.current && distanceBetween(last.current, next) > 3) setHeading(bearingBetween(last.current, next));
      if (!last.current || distanceBetween(last.current, next) > 1) { last.current = next; setUser(next); }
    };
    // Start from the position the Maps page already knows, then ask for a fresh fix.
    const known = window.genyxoMaps?.location?.();
    if (known) queueMicrotask(() => accept(known));
    navigator.geolocation.getCurrentPosition((position) => accept({ lat: position.coords.latitude, lng: position.coords.longitude, accuracy: position.coords.accuracy }), () => undefined, { enableHighAccuracy: true, maximumAge: 10_000, timeout: 15_000 });
    const watch = navigator.geolocation.watchPosition(
      (position) => accept({ lat: position.coords.latitude, lng: position.coords.longitude, accuracy: position.coords.accuracy }),
      // Only a refusal stops the trip; a weak or briefly lost signal just waits for the next fix.
      (failure) => { if (failure.code === failure.PERMISSION_DENIED) { setStatus("error"); setError("Allow location access so navigation can follow you."); } },
      { enableHighAccuracy: true, maximumAge: 2000, timeout: 20000 },
    );
    return () => navigator.geolocation.clearWatch(watch);
  }, [trip]);

  const plan = useCallback(async (from: LatLng, rerouting: boolean) => {
    if (!trip || routing.current) return;
    routing.current = true;
    setStatus(rerouting ? "rerouting" : "routing");
    try {
      const next = await fetchRoute(from, trip.destination, trip.mode);
      setRoute(next); setStatus("driving"); spoken.current.clear(); offCount.current = 0;
      if (rerouting) say("Rerouting.", muted);
    } catch (caught) {
      setStatus("error"); setError(caught instanceof Error ? caught.message : "No route");
    } finally { routing.current = false; }
  }, [trip, muted]);

  // The first route, once we know where the user is.
  useEffect(() => { if (trip && user && !route && status === "routing") queueMicrotask(() => void plan(user, false)); }, [trip, user, route, status, plan]);

  const geometry = route?.geometry;
  const along = useMemo(() => (geometry ? cumulative(geometry) : []), [geometry]);
  const maneuvers = useMemo(() => (geometry && route?.maneuvers ? placeManeuvers(geometry, along, route.maneuvers as Maneuver[]) : []), [geometry, along, route]);
  const total = along.at(-1) || 0;
  const place = geometry && user ? project(geometry, along, user) : null;
  const travelled = place?.along || 0;
  const next = maneuvers.find((maneuver) => maneuver.along > travelled + 8) || maneuvers.at(-1);
  const after = next ? maneuvers[maneuvers.indexOf(next) + 1] : undefined;
  const toNext = next ? Math.max(0, next.along - travelled) : 0;
  const remaining = Math.max(0, total - travelled);
  const remainingSeconds = route && total ? (route.duration * remaining) / total : 0;
  const arriving = Boolean(trip && user && distanceBetween(user, trip.destination) < ARRIVED_METRES);

  // Off the line for a while: plan again from here.
  useEffect(() => {
    if (!place || !user || status !== "driving") return;
    offCount.current = place.off > OFF_ROUTE_METRES ? offCount.current + 1 : 0;
    if (offCount.current >= 2) queueMicrotask(() => void plan(user, true));
  }, [place, user, status, plan]);

  // Spoken prompts at 400 m, 150 m and just before each turn; the first on start.
  useEffect(() => {
    if (status !== "driving" || !next) return;
    const key = `${next.lat},${next.lng}`;
    if (!spoken.current.has("start")) { spoken.current.add("start"); say(`${next.instruction}${toNext > 60 ? ` in ${formatDistance(toNext)}` : ""}.`, muted); return; }
    for (const threshold of PROMPTS) {
      const id = `${key}:${threshold}`;
      if (toNext <= threshold && !spoken.current.has(id)) {
        PROMPTS.filter((value) => value >= threshold).forEach((value) => spoken.current.add(`${key}:${value}`));
        say(threshold <= 35 ? `${next.instruction}.` : `In ${formatDistance(toNext)}, ${next.instruction.charAt(0).toLowerCase()}${next.instruction.slice(1)}.`, muted);
        break;
      }
    }
  }, [status, next, toNext, muted]);

  useEffect(() => {
    if (!arriving || status === "arrived") return;
    queueMicrotask(() => setStatus("arrived"));
    say("You have arrived.", muted);
    const timer = setTimeout(end, 6000);
    return () => clearTimeout(timer);
  }, [arriving, status, muted, end]);

  useEffect(() => {
    if (!trip) return;
    const key = (event: KeyboardEvent) => { if (event.key === "Escape") end(); };
    document.addEventListener("keydown", key);
    return () => document.removeEventListener("keydown", key);
  }, [trip, end]);

  if (!trip) return null;
  const pins = [{ id: "destination", name: trip.destination.name, lat: trip.destination.lat, lng: trip.destination.lng, kind: "pin" }];
  const bearing = place && place.off < OFF_ROUTE_METRES ? place.bearing : heading;
  return createPortal(<div className="gx-nav" role="dialog" aria-modal="true" aria-label={`Directions to ${trip.destination.name}`}>
    <MapView user={user} pins={pins} route={route} follow={user ? { bearing } : null} explore={false} label="Navigation map" padding={{ top: 220, bottom: 140, left: 40, right: 40 }} />
    <div className="gx-nav-top">
      {status === "arrived" ? <div className="gx-map-glass gx-nav-card is-arrived">
        <span className="gx-nav-arrow" aria-hidden="true"><svg viewBox="0 0 24 24" width="40" height="40"><path fill="currentColor" d={maneuverArrow("arrive")} /></svg></span>
        <span className="gx-nav-copy"><strong>Arrived</strong><span>{trip.destination.name}</span></span>
      </div> : status === "error" ? <div className="gx-map-glass gx-nav-card"><span className="gx-nav-copy"><strong>Navigation paused</strong><span>{error}</span></span></div>
        : !route || status === "routing" ? <div className="gx-map-glass gx-nav-card"><span className="gx-nav-copy"><strong>Finding the best route…</strong><span>to {trip.destination.name}</span></span></div>
          : next && <div className="gx-map-glass gx-nav-card" key={`${next.lat},${next.lng}`} aria-live="polite">
            <span className="gx-nav-arrow" aria-hidden="true"><svg viewBox="0 0 24 24" width="44" height="44"><path fill="currentColor" d={maneuverArrow(next.type, next.modifier)} /></svg></span>
            <span className="gx-nav-copy"><strong>{formatDistance(toNext)}</strong><span>{next.instruction}</span></span>
          </div>}
      {status === "driving" && after && after.type !== "arrive" && <div className="gx-map-glass gx-nav-then"><span>Then</span><svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="currentColor" d={maneuverArrow(after.type, after.modifier)} /></svg></div>}
      {status === "rerouting" && <div className="gx-map-glass gx-nav-then is-rerouting">Rerouting…</div>}
    </div>
    <div className="gx-map-glass gx-nav-bottom">
      <div className="gx-nav-eta">
        <span><strong>{route ? formatClock(new Date(now + remainingSeconds * 1000)) : "--:--"}</strong><small>arrival</small></span>
        <span><strong>{route ? formatDuration(remainingSeconds).replace(" min", "") : "–"}</strong><small>{route && remainingSeconds >= 3600 ? "" : "min"}</small></span>
        <span><strong>{route ? formatDistance(remaining).split(" ")[0] : "–"}</strong><small>{route ? formatDistance(remaining).split(" ")[1] : "km"}</small></span>
      </div>
      <button type="button" className="gx-nav-icon" aria-pressed={muted} aria-label={muted ? "Turn voice guidance on" : "Mute voice guidance"} onClick={() => { setMuted(!muted); if (!muted && typeof speechSynthesis !== "undefined") speechSynthesis.cancel(); }}>
        {muted ? <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="currentColor" d="M4 9h4l5-4v14l-5-4H4V9Zm12.3.3 1.4-1.4L20 10.2l2.3-2.3 1.4 1.4-2.3 2.3 2.3 2.3-1.4 1.4-2.3-2.3-2.3 2.3-1.4-1.4 2.3-2.3-2.3-2.3Z" /></svg>
          : <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="currentColor" d="M4 9h4l5-4v14l-5-4H4V9Zm12 .3a4 4 0 0 1 0 5.4l-1.4-1.4a2 2 0 0 0 0-2.6L16 9.3Zm2.8-2.8a8 8 0 0 1 0 11l-1.4-1.4a6 6 0 0 0 0-8.2l1.4-1.4Z" /></svg>}
      </button>
      <button type="button" className="gx-nav-end" onClick={end}>End</button>
    </div>
  </div>, document.body);
}
