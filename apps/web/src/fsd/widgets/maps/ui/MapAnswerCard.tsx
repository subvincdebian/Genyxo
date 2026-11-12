"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { findSavedPlace, removePlace, savePlace, useSavedPlaces } from "@/features/workspace";
import { WorkspaceIcon } from "@/shared/ui/workspace";
import { categoryOf, kindLabel } from "../model/map-look";
import { appleMapsUrl, askAboutPlace, fetchRoute, startNavigation, formatDistance, formatDuration, googleMapsUrl, walkMinutes, type MapCardData, type MapPlace, type MapRoute, type TravelMode } from "../model/maps";
import { MapView } from "./MapView";
import { TravelModes } from "./TravelModes";

type Directions = { to: { name: string; lat: number; lng: number }; mode: TravelMode; route: MapRoute | null; error?: string };

/**
 * A map answer: the places or route the model looked up, on a map with an
 * Apple-style glass panel. The panel sits beside the map on wide cards and
 * becomes a sheet under it on narrow ones.
 */
export function MapAnswerCard({ data }: { data: MapCardData }) {
  const card = useRef<HTMLDivElement>(null);
  const [wide, setWide] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);
  const savedPlaces = useSavedPlaces();
  const toggleSaved = (place: MapPlace) => {
    const saved = findSavedPlace(savedPlaces, place);
    void (saved ? removePlace(saved.id) : savePlace({ label: place.name, lat: place.lat, lng: place.lng, address: place.address, kind: place.kind })).catch(() => undefined);
  };
  const [directions, setDirections] = useState<Directions | null>(data.type === "route" ? { to: data.destination, mode: data.requestedMode, route: data.route } : null);

  useEffect(() => {
    const element = card.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => setWide(entry.contentRect.width >= 620));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const go = async (to: Directions["to"], mode: TravelMode) => {
    setDirections({ to, mode, route: null });
    try { setDirections({ to, mode, route: await fetchRoute(data.origin, to, mode) }); }
    catch (error) { setDirections({ to, mode, route: null, error: error instanceof Error ? error.message : "No route" }); }
  };
  const places: MapPlace[] = useMemo(() => (data.type === "places" ? data.places : []), [data]);
  const target = directions?.to;
  const pins = useMemo(() => (target ? [{ id: "destination", name: target.name, lat: target.lat, lng: target.lng, kind: places.find((place) => place.lat === target.lat)?.kind || "pin" }] : places), [target, places]);

  return <div ref={card} className={`gx-mapcard${wide ? " is-wide" : ""}`}>
    <MapView user={data.origin} pins={pins} route={directions?.route || null} selectedId={directions ? null : selected} onSelectPin={(id) => setSelected(id)}
      padding={wide ? { left: 340, top: 48, bottom: 48, right: 72 } : { top: 40, bottom: 40, left: 40, right: 64 }} label={data.type === "places" ? `Map of ${data.query}` : `Route to ${data.destination.name}`} />
    <aside className="gx-map-glass gx-mapcard-panel">
      {directions ? <div className="gx-mapcard-route">
        <div className="gx-mapcard-head">
          {data.type === "places" && <button type="button" className="gx-mapcard-back" aria-label="Back to the places" onClick={() => setDirections(null)}><WorkspaceIcon name="arrow-left" size={15} /></button>}
          <span><small>Directions to</small><strong>{directions.to.name}</strong></span>
        </div>
        <TravelModes value={directions.mode} onChange={(mode) => void go(directions.to, mode)} />
        <div className="gx-mapcard-summary" aria-live="polite">
          {directions.error ? <p className="gx-mapcard-error">{directions.error}</p> : directions.route ? <>
            <strong>{formatDuration(directions.route.duration)}</strong>
            <span>{formatDistance(directions.route.distance)}{directions.mode === "transit" ? " · walk to the stop, no live timetables" : ""}</span>
          </> : <span className="gx-mapcard-wait">Planning the route…</span>}
        </div>
        {directions.route && <button type="button" className="gx-map-go" onClick={() => startNavigation(directions.to, directions.mode, directions.route)}>Go</button>}
        <div className="gx-mapcard-links">
          <a href={appleMapsUrl(data.origin, directions.to, directions.mode)} target="_blank" rel="noopener noreferrer">Apple Maps</a>
          <a href={googleMapsUrl(data.origin, directions.to, directions.mode)} target="_blank" rel="noopener noreferrer">Google Maps</a>
          <button type="button" onClick={() => askAboutPlace(directions.to)}>Ask Genyxo</button>
        </div>
      </div> : <>
        <div className="gx-mapcard-head"><span><small>{places.length} {places.length === 1 ? "place" : "places"} nearby</small><strong>{kindLabel(data.type === "places" ? data.query : "")}</strong></span></div>
        <ul className="gx-mapcard-list">
          {places.map((place) => {
            const { color, icon } = categoryOf(place.kind);
            const open = selected === place.id;
            return <li key={place.id} className={open ? "is-open" : ""}>
              <button type="button" className="gx-mapcard-row" aria-expanded={open} onClick={() => setSelected(open ? null : place.id)}>
                <span className="gx-mapcard-icon" style={{ background: color }}><svg viewBox="0 0 20 20" width="14" height="14" aria-hidden="true"><path fill="#fff" d={icon} /></svg></span>
                <span className="gx-mapcard-copy">
                  <strong>{place.name}</strong>
                  <small>{[kindLabel(place.kind), place.distance !== undefined ? `${formatDistance(place.distance)} · ${walkMinutes(place.distance)} min walk` : null].filter(Boolean).join(" · ")}</small>
                </span>
              </button>
              {open && <div className="gx-mapcard-more">
                {place.address && <p>{place.address}</p>}
                {place.openingHours && <p className="gx-mapcard-hours">{place.openingHours}</p>}
                <div className="gx-mapcard-actions">
                  <button type="button" className="is-primary" onClick={() => void go(place, "walking")}>Directions</button>
                  <button type="button" onClick={() => askAboutPlace(place)}>Ask Genyxo</button>
                  <button type="button" className={findSavedPlace(savedPlaces, place) ? "is-saved" : ""} aria-pressed={Boolean(findSavedPlace(savedPlaces, place))} onClick={() => toggleSaved(place)}>{findSavedPlace(savedPlaces, place) ? "★ Saved" : "☆ Save"}</button>
                  {place.website && <a href={place.website} target="_blank" rel="noopener noreferrer">Website</a>}
                </div>
              </div>}
            </li>;
          })}
        </ul>
      </>}
    </aside>
  </div>;
}
