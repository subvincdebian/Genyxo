"use client";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { GeoJSONSource, Map as MapLibreMap, Marker as MapLibreMarker, MapMouseEvent } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import "./maps.css";
import { WorkspaceIcon } from "@/shared/ui/workspace";
import { findSavedPlace, removePlace, renamePlace, savePlace, useSavedPlaces } from "@/features/workspace";
import { addPlacesLayer, applyAppleLook, categoryOf, kindLabel, mapStyleUrl, SAVED_ICONS, savedColor, savedIcon } from "../model/map-look";
import { askAboutPlace, startNavigation, distanceBetween, fetchAddress, fetchRoute, formatDistance, formatDuration, type LatLng, type MapPlace, type MapRoute, type TravelMode, type UserLocation } from "../model/maps";
import { TravelModes } from "./TravelModes";

type Padding = { top: number; right: number; bottom: number; left: number };
type Picked = { name: string; kind: string; lat: number; lng: number; address?: string; loading?: boolean };

const ROUTE_BLUE = "#0a84ff";
const reducedMotion = () => typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;
const isDark = () => document.documentElement.getAttribute("data-theme") !== "light";

function circle(center: LatLng, radius: number) {
  const points: [number, number][] = [];
  for (let step = 0; step <= 48; step++) {
    const angle = (step / 48) * Math.PI * 2;
    points.push([center.lng + (radius / (111_320 * Math.cos((center.lat * Math.PI) / 180))) * Math.cos(angle), center.lat + (radius / 111_320) * Math.sin(angle)]);
  }
  return { type: "Feature" as const, properties: {}, geometry: { type: "Polygon" as const, coordinates: [points] } };
}
const line = (geometry: [number, number][]) => ({ type: "Feature" as const, properties: {}, geometry: { type: "LineString" as const, coordinates: geometry } });
const empty = { type: "FeatureCollection" as const, features: [] };

function pinElement(place: MapPlace, onClick: () => void) {
  const { color, icon } = categoryOf(place.kind);
  const element = document.createElement("button");
  element.type = "button";
  element.className = "gx-map-pin";
  element.style.setProperty("--pin", color);
  element.setAttribute("aria-label", place.name);
  element.innerHTML = `<span class="gx-map-pin-head"><svg viewBox="0 0 20 20" width="14" height="14" aria-hidden="true"><path fill="currentColor" d="${icon}"/></svg></span><span class="gx-map-pin-label"></span>`;
  element.querySelector(".gx-map-pin-label")!.textContent = place.name;
  element.addEventListener("click", (event) => { event.stopPropagation(); onClick(); });
  return element;
}

/**
 * An Apple Maps–style map: pan, pinch, scroll and double-click zoom, rotate,
 * glass controls (zoom, compass, my location), category pins, an animated
 * route and, in explore mode, a place card for whatever the user taps with
 * "Ask Genyxo" and directions.
 */
export function MapView({ user, pins = [], route, destination, selectedId, onSelectPin, padding, explore = true, className = "", label = "Map", follow = null }: {
  user?: UserLocation | null;
  pins?: MapPlace[];
  route?: Pick<MapRoute, "geometry"> | null;
  destination?: (LatLng & { name?: string }) | null;
  selectedId?: string | null;
  onSelectPin?: (id: string) => void;
  padding?: Partial<Padding>;
  explore?: boolean;
  className?: string;
  label?: string;
  /** Navigation: the camera follows you, tilted and turned to your heading. */
  follow?: { bearing: number } | null;
}) {
  const host = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const glRef = useRef<typeof import("maplibre-gl") | null>(null);
  const markers = useRef(new Map<string, MapLibreMarker>());
  const userMarker = useRef<MapLibreMarker | null>(null);
  const pickMarker = useRef<MapLibreMarker | null>(null);
  const routeFrame = useRef(0);
  const [ready, setReady] = useState(false);
  const [bearing, setBearing] = useState(0);
  const [picked, setPicked] = useState<Picked | null>(null);
  const [ownRoute, setOwnRoute] = useState<{ mode: TravelMode; route: MapRoute | null; error?: string } | null>(null);
  const savedPlaces = useSavedPlaces();
  const savedMarkers = useRef(new Map<number, MapLibreMarker>());
  const [saving, setSaving] = useState(false);
  const latest = useRef({ user, explore, onSelectPin });
  useEffect(() => { latest.current = { user, explore, onSelectPin }; });
  const pad: Padding = { top: 56, right: 64, bottom: 56, left: 56, ...padding };
  const padKey = JSON.stringify(pad);

  // Create the map once; the style follows the light/dark theme.
  useEffect(() => {
    let disposed = false;
    let themeObserver: MutationObserver | null = null;
    void import("maplibre-gl").then((gl) => {
      if (disposed || !host.current) return;
      glRef.current = gl;
      // The worker is served from public/ (scripts/copy-map-worker.mjs).
      gl.setWorkerUrl(`/vendor/maplibre/worker-${gl.getVersion()}.mjs`);
      const start = latest.current.user || pins[0] || { lat: 50.4501, lng: 30.5234 };
      let dark = isDark();
      const map = new gl.Map({
        container: host.current,
        style: mapStyleUrl(dark),
        center: [start.lng, start.lat],
        zoom: 14.5,
        attributionControl: { compact: true },
        cooperativeGestures: false,
        fadeDuration: reducedMotion() ? 0 : 300,
      });
      mapRef.current = map;
      const decorate = () => {
        applyAppleLook(map, dark);
        // Cafes, shops, stops and more appear once you zoom in to street level.
        addPlacesLayer(map, dark);
        if (!map.getSource("gx-accuracy")) {
          map.addSource("gx-accuracy", { type: "geojson", data: empty });
          map.addLayer({ id: "gx-accuracy-fill", type: "fill", source: "gx-accuracy", paint: { "fill-color": ROUTE_BLUE, "fill-opacity": 0.1 } });
          map.addLayer({ id: "gx-accuracy-line", type: "line", source: "gx-accuracy", paint: { "line-color": ROUTE_BLUE, "line-opacity": 0.35, "line-width": 1 } });
        }
        if (!map.getSource("gx-route")) {
          map.addSource("gx-route", { type: "geojson", data: empty, lineMetrics: true });
          map.addLayer({ id: "gx-route-casing", type: "line", source: "gx-route", layout: { "line-cap": "round", "line-join": "round" }, paint: { "line-color": "#ffffff", "line-width": ["interpolate", ["linear"], ["zoom"], 10, 6, 17, 13], "line-opacity": 0.95 } });
          map.addLayer({ id: "gx-route-line", type: "line", source: "gx-route", layout: { "line-cap": "round", "line-join": "round" }, paint: { "line-color": ROUTE_BLUE, "line-width": ["interpolate", ["linear"], ["zoom"], 10, 3.5, 17, 8], "line-gradient": ["step", ["line-progress"], ROUTE_BLUE, 1, ROUTE_BLUE] } });
        }
        setReady(true);
      };
      map.on("style.load", decorate);
      map.on("mouseenter", "gx-poi", () => { map.getCanvas().style.cursor = "pointer"; });
      map.on("mouseleave", "gx-poi", () => { map.getCanvas().style.cursor = ""; });
      map.on("rotate", () => setBearing(map.getBearing()));
      // Exposed for tests and debugging: where the camera settled.
      map.on("moveend", () => host.current?.setAttribute("data-zoom", map.getZoom().toFixed(2)));
      map.on("click", (event: MapMouseEvent) => {
        if (!latest.current.explore) return;
        // A labelled place on the base map, else a dropped pin with its address.
        const feature = map.queryRenderedFeatures(event.point).find((item) => item.layer.type === "symbol" && (item.properties?.name || item.properties?.["name:latin"]));
        const point = { lat: event.lngLat.lat, lng: event.lngLat.lng };
        if (feature) {
          const geometry = feature.geometry.type === "Point" ? (feature.geometry.coordinates as [number, number]) : [point.lng, point.lat];
          setPicked({ name: String(feature.properties.name || feature.properties["name:latin"]), kind: String(feature.properties.subclass || feature.properties.class || "place"), lat: geometry[1], lng: geometry[0], loading: true });
          void fetchAddress({ lat: geometry[1], lng: geometry[0] }).then((address) => setPicked((current) => current && current.lat === geometry[1] ? { ...current, address, loading: false } : current));
        } else {
          setPicked({ name: "Dropped Pin", kind: "pin", ...point, loading: true });
          void fetchAddress(point).then((address) => setPicked((current) => current && current.lat === point.lat ? { ...current, name: address || "Dropped Pin", address, loading: false } : current));
        }
        setOwnRoute(null);
      });
      themeObserver = new MutationObserver(() => {
        if (isDark() === dark) return;
        dark = isDark();
        setReady(false);
        map.setStyle(mapStyleUrl(dark));
      });
      themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    });
    const markerSet = markers.current;
    const savedSet = savedMarkers.current;
    return () => {
      disposed = true;
      themeObserver?.disconnect();
      cancelAnimationFrame(routeFrame.current);
      markerSet.clear();
      savedSet.clear();
      mapRef.current?.remove();
      mapRef.current = null;
    };
    // Created once; later props flow through the effects below.
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // You: Apple's blue dot with a soft halo and the accuracy circle.
  useEffect(() => {
    const map = mapRef.current, gl = glRef.current;
    if (!ready || !map || !gl) return;
    (map.getSource("gx-accuracy") as GeoJSONSource | undefined)?.setData(user?.accuracy && user.accuracy < 2000 ? circle(user, user.accuracy) : empty);
    if (!user) { userMarker.current?.remove(); userMarker.current = null; return; }
    if (!userMarker.current) {
      const element = document.createElement("div");
      element.className = "gx-map-me";
      element.innerHTML = '<span class="gx-map-me-halo"></span><span class="gx-map-me-dot"></span>';
      userMarker.current = new gl.Marker({ element }).setLngLat([user.lng, user.lat]).addTo(map);
    } else userMarker.current.setLngLat([user.lng, user.lat]);
  }, [ready, user]);

  // Pins: added and removed by id so the selected one keeps its animation.
  useEffect(() => {
    const map = mapRef.current, gl = glRef.current;
    if (!ready || !map || !gl) return;
    const wanted = new Set(pins.map((place) => place.id));
    markers.current.forEach((marker, id) => { if (!wanted.has(id)) { marker.remove(); markers.current.delete(id); } });
    pins.forEach((place, index) => {
      if (markers.current.has(place.id)) return;
      const element = pinElement(place, () => latest.current.onSelectPin?.(place.id));
      element.style.animationDelay = `${Math.min(index, 10) * 45}ms`;
      markers.current.set(place.id, new gl.Marker({ element, anchor: "bottom" }).setLngLat([place.lng, place.lat]).addTo(map));
    });
  }, [ready, pins]);

  // Saved places show everywhere as Apple-style favourites (Home, Work, stars).
  useEffect(() => {
    const map = mapRef.current, gl = glRef.current;
    if (!ready || !map || !gl || !explore) return;
    const list = savedPlaces || [];
    const wanted = new Set(list.map((place) => place.id));
    savedMarkers.current.forEach((marker, id) => { if (!wanted.has(id)) { marker.remove(); savedMarkers.current.delete(id); } });
    for (const place of list) {
      savedMarkers.current.get(place.id)?.remove();
      const icon = savedIcon(place.label);
      const element = document.createElement("button");
      element.type = "button";
      element.className = "gx-map-fav";
      element.style.setProperty("--fav", savedColor(icon));
      element.setAttribute("aria-label", place.label);
      element.innerHTML = `<span class="gx-map-fav-head"><svg viewBox="0 0 20 20" width="13" height="13" aria-hidden="true"><path fill="currentColor" d="${SAVED_ICONS[icon]}"/></svg></span><span class="gx-map-pin-label"></span>`;
      element.querySelector(".gx-map-pin-label")!.textContent = place.label;
      element.addEventListener("click", (event) => { event.stopPropagation(); setOwnRoute(null); setPicked({ name: place.label, kind: icon === "star" ? place.kind || "saved" : icon, lat: place.lat, lng: place.lng, address: place.address }); });
      savedMarkers.current.set(place.id, new gl.Marker({ element, anchor: "bottom" }).setLngLat([place.lng, place.lat]).addTo(map));
    }
  }, [ready, savedPlaces, explore]);

  // Frame what matters: you plus the pins, the route or the destination.
  useEffect(() => {
    const map = mapRef.current, gl = glRef.current;
    if (!ready || !map || !gl || follow) return;
    const points: [number, number][] = [
      ...(user ? [[user.lng, user.lat] as [number, number]] : []),
      ...pins.map((place) => [place.lng, place.lat] as [number, number]),
      ...(route?.geometry || []),
      ...(destination ? [[destination.lng, destination.lat] as [number, number]] : []),
    ];
    if (points.length < 2) { if (points[0]) map.jumpTo({ center: points[0], zoom: 15 }); return; }
    const bounds = points.reduce((box, point) => box.extend(point), new gl.LngLatBounds(points[0], points[0]));
    // A straight ease: fitBounds' default flight zooms out mid-way. The panel's
    // room comes from the map's own padding (set below), so none is passed here.
    map.stop();
    map.fitBounds(bounds, { maxZoom: 16.5, linear: true, duration: reducedMotion() ? 0 : 800 });
  }, [ready, pins, route, destination, user, padKey, follow]);

  // Navigation camera: you near the bottom, the road ahead tilted in 3D.
  const followBearing = follow ? Math.round(follow.bearing) : null;
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map || followBearing === null || !user) return;
    map.easeTo({ center: [user.lng, user.lat], bearing: followBearing, pitch: 58, zoom: 17.4, duration: reducedMotion() ? 0 : 1000, easing: (t) => t });
  }, [ready, user, followBearing]);

  // The glass panel covers part of the map; padding keeps the camera's centre in
  // the visible part. Set once, because camera calls with padding keep it and add up.
  useLayoutEffect(() => { if (ready) mapRef.current?.setPadding(JSON.parse(padKey)); }, [ready, padKey]);

  useEffect(() => {
    markers.current.forEach((marker, id) => marker.getElement().classList.toggle("is-selected", id === selectedId));
    const place = pins.find((item) => item.id === selectedId);
    if (place && mapRef.current) mapRef.current.easeTo({ center: [place.lng, place.lat], zoom: Math.max(mapRef.current.getZoom(), 15.5), duration: reducedMotion() ? 0 : 600 });
  }, [selectedId, pins]);

  // The route draws itself from you to the destination.
  const shownRoute = ownRoute?.route || route || null;
  useEffect(() => {
    const map = mapRef.current;
    const source = map?.getSource("gx-route") as GeoJSONSource | undefined;
    if (!ready || !map || !source) return;
    cancelAnimationFrame(routeFrame.current);
    if (!shownRoute?.geometry?.length) { source.setData(empty); return; }
    source.setData(line(shownRoute.geometry));
    const paint = (progress: number) => map.setPaintProperty("gx-route-line", "line-gradient", ["step", ["line-progress"], ROUTE_BLUE, Math.min(1, Math.max(0.001, progress)), "rgba(10,132,255,0)"]);
    const casing = (progress: number) => map.setPaintProperty("gx-route-casing", "line-opacity", progress >= 1 ? 0.95 : 0.95 * progress);
    if (reducedMotion()) { paint(1); casing(1); return; }
    const begin = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, Math.max(0, (now - begin) / 1100));
      const eased = 1 - Math.pow(1 - t, 3);
      paint(eased); casing(eased);
      if (t < 1) routeFrame.current = requestAnimationFrame(tick);
    };
    routeFrame.current = requestAnimationFrame(tick);
  }, [ready, shownRoute]);

  // The dropped or tapped place gets Apple's red pin.
  useEffect(() => {
    const map = mapRef.current, gl = glRef.current;
    pickMarker.current?.remove();
    pickMarker.current = null;
    if (!map || !gl || !picked) return;
    const element = document.createElement("div");
    element.className = "gx-map-drop";
    element.innerHTML = '<span class="gx-map-drop-head"></span><span class="gx-map-drop-stem"></span>';
    pickMarker.current = new gl.Marker({ element, anchor: "bottom" }).setLngLat([picked.lng, picked.lat]).addTo(map);
  }, [picked]);

  const zoom = (delta: number) => mapRef.current?.easeTo({ zoom: mapRef.current.getZoom() + delta, duration: reducedMotion() ? 0 : 280 });
  const locate = () => { if (user && mapRef.current) mapRef.current.easeTo({ center: [user.lng, user.lat], zoom: Math.max(mapRef.current.getZoom(), 15.5), bearing: 0, duration: reducedMotion() ? 0 : 700 }); };
  const directions = async (mode: TravelMode) => {
    if (!picked || !user) return;
    setOwnRoute({ mode, route: null });
    try { setOwnRoute({ mode, route: await fetchRoute(user, picked, mode) }); }
    catch (error) { setOwnRoute({ mode, route: null, error: error instanceof Error ? error.message : "No route" }); }
  };
  const distance = picked && user ? distanceBetween(user, picked) : null;
  const saved = picked ? findSavedPlace(savedPlaces, picked) : null;
  const toggleSaved = async () => {
    if (!picked || saving) return;
    setSaving(true);
    try {
      if (saved) await removePlace(saved.id);
      else await savePlace({ label: picked.name === "Dropped Pin" && picked.address ? picked.address : picked.name, lat: picked.lat, lng: picked.lng, address: picked.address, kind: picked.kind });
    } catch { /* The star simply stays as it was. */ } finally { setSaving(false); }
  };
  const relabel = async (name: string) => { if (saved) { await renamePlace(saved.id, name).catch(() => undefined); setPicked((current) => current && { ...current, name }); } };

  return <div className={`gx-map ${className}${follow ? " is-following" : ""}`} aria-label={label} role="region">
    <div ref={host} className="gx-map-canvas" />
    {!ready && <div className="gx-map-loading" aria-hidden="true" />}
    <div className="gx-map-controls">
      <div className="gx-map-glass gx-map-zoom">
        <button type="button" aria-label="Zoom in" onClick={() => zoom(1)}><WorkspaceIcon name="plus" size={16} /></button>
        <span aria-hidden="true" />
        <button type="button" aria-label="Zoom out" onClick={() => zoom(-1)}><svg width="16" height="16" viewBox="0 0 20 20" aria-hidden="true"><path d="M4 10h12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg></button>
      </div>
      {Math.abs(bearing) > 0.5 && <button type="button" className="gx-map-glass gx-map-compass" aria-label="Point north" onClick={() => mapRef.current?.easeTo({ bearing: 0, pitch: 0, duration: reducedMotion() ? 0 : 500 })}>
        <svg width="22" height="22" viewBox="0 0 22 22" style={{ transform: `rotate(${-bearing}deg)` }} aria-hidden="true"><path d="M11 2.5 14 11h-6l3-8.5Z" fill="#ff3b30" /><path d="M11 19.5 8 11h6l-3 8.5Z" fill="currentColor" opacity=".55" /></svg>
      </button>}
      {user && <button type="button" className="gx-map-glass gx-map-locate" aria-label="Show my location" onClick={locate}>
        <svg width="16" height="16" viewBox="0 0 20 20" aria-hidden="true"><path d="M17.5 2.5 2.5 9l6.2 2.3L11 17.5l6.5-15Z" fill="currentColor" /></svg>
      </button>}
    </div>
    {picked && <div className="gx-map-glass gx-map-place" role="dialog" aria-label={picked.name}>
      <div className="gx-map-place-head">
        <span className="gx-map-place-icon" style={{ background: categoryOf(picked.kind).color }}><svg viewBox="0 0 20 20" width="15" height="15" aria-hidden="true"><path fill="#fff" d={categoryOf(picked.kind).icon} /></svg></span>
        <span className="gx-map-place-copy">
          <strong>{picked.name}</strong>
          <small>{[picked.kind === "pin" ? "Dropped Pin" : kindLabel(picked.kind), distance !== null ? formatDistance(distance) : null].filter(Boolean).join(" · ")}</small>
          {picked.address !== picked.name && <small className="gx-map-place-address">{picked.loading ? "Finding the address…" : picked.address || `${picked.lat.toFixed(5)}, ${picked.lng.toFixed(5)}`}</small>}
        </span>
        <button type="button" className={`gx-map-place-star${saved ? " is-on" : ""}`} aria-pressed={Boolean(saved)} aria-label={saved ? "Remove from My Places" : "Add to My Places"} disabled={saving} onClick={() => void toggleSaved()}>
          <svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true"><path d={SAVED_ICONS.star} fill={saved ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" /></svg>
        </button>
        <button type="button" className="gx-map-place-close" aria-label="Close" onClick={() => { setPicked(null); setOwnRoute(null); }}><WorkspaceIcon name="close" size={14} /></button>
      </div>
      {saved && savedIcon(saved.label) === "star" && <div className="gx-map-place-labels" role="group" aria-label="Save as">
        <span>Saved · set as</span>
        <button type="button" onClick={() => void relabel("Home")}><svg viewBox="0 0 20 20" width="13" height="13" aria-hidden="true"><path fill="currentColor" d={SAVED_ICONS.home} /></svg>Home</button>
        <button type="button" onClick={() => void relabel("Work")}><svg viewBox="0 0 20 20" width="13" height="13" aria-hidden="true"><path fill="currentColor" d={SAVED_ICONS.work} /></svg>Work</button>
      </div>}
      {ownRoute && <div className="gx-map-place-route">
        <TravelModes value={ownRoute.mode} onChange={(mode) => void directions(mode)} />
        <div className="gx-map-place-trip">
          <p>{ownRoute.error ? ownRoute.error : ownRoute.route ? <><strong>{formatDuration(ownRoute.route.duration)}</strong> · {formatDistance(ownRoute.route.distance)}{ownRoute.mode === "transit" ? " · walking route, no live timetables" : ""}</> : "Planning the route…"}</p>
          {ownRoute.route && <button type="button" className="gx-map-go" onClick={() => startNavigation({ name: picked.name, lat: picked.lat, lng: picked.lng }, ownRoute.mode, ownRoute.route)}>Go</button>}
        </div>
      </div>}
      <div className="gx-map-place-actions">
        <button type="button" className="is-primary" onClick={() => { askAboutPlace({ name: picked.name, lat: picked.lat, lng: picked.lng, address: picked.address }); }}><WorkspaceIcon name="sparkles" size={15} />Ask Genyxo</button>
        {user && !ownRoute && <button type="button" onClick={() => void directions("walking")}><svg width="15" height="15" viewBox="0 0 20 20" aria-hidden="true"><path d="M10 2.5 17.5 10 10 17.5 2.5 10 10 2.5Zm-2 9.5v-2.5h3.5V8l2.5 2.5-2.5 2.5v-1.5H9.5V12H8Z" fill="currentColor" /></svg>Directions</button>}
      </div>
    </div>}
  </div>;
}
