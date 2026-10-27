"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { removePlace, renamePlace, useSavedPlaces, type SavedPlace } from "@/features/workspace";
import { WorkspaceIcon } from "@/shared/ui/workspace";
import { SAVED_ICONS, savedColor, savedIcon } from "../model/map-look";
import { askAboutPlace, startNavigation } from "../model/maps";
import { MapView } from "./MapView";
import "./maps.css";

/**
 * "My Places" in the Library, like Apple Maps' Library: Home and Work on top,
 * every starred place in a glass list beside a map of all of them.
 */
export function SavedPlacesBoard() {
  const router = useRouter();
  const places = useSavedPlaces();
  const [selected, setSelected] = useState<number | null>(null);
  const [editing, setEditing] = useState<{ id: number; value: string } | null>(null);
  const pins = useMemo(() => (places || []).map((place) => ({ id: String(place.id), name: place.label, lat: place.lat, lng: place.lng, kind: place.kind || "pin", address: place.address })), [places]);
  const home = places?.find((place) => savedIcon(place.label) === "home");
  const work = places?.find((place) => savedIcon(place.label) === "work");

  const ask = (place: SavedPlace) => {
    askAboutPlace({ name: place.label, lat: place.lat, lng: place.lng, address: place.address });
    router.push("/chat");
  };
  const shortcut = (kind: "home" | "work", place: SavedPlace | undefined) => place
    ? <button type="button" className="gx-places-shortcut" onClick={() => setSelected(place.id)}>
        <span style={{ background: savedColor(kind) }}><svg viewBox="0 0 20 20" width="22" height="22" aria-hidden="true"><path fill="#fff" d={SAVED_ICONS[kind]} /></svg></span>
        <strong>{kind === "home" ? "Home" : "Work"}</strong><small>{place.address || "Saved"}</small>
      </button>
    : <Link className="gx-places-shortcut is-empty" href="/maps">
        <span><svg viewBox="0 0 20 20" width="22" height="22" aria-hidden="true"><path fill="currentColor" d={SAVED_ICONS[kind]} /></svg></span>
        <strong>{kind === "home" ? "Home" : "Work"}</strong><small>Add in Maps</small>
      </Link>;

  if (places && !places.length) return <section className="gx-places is-empty" aria-label="My Places">
    <div className="gx-places-shortcuts">{shortcut("home", undefined)}{shortcut("work", undefined)}</div>
    <div className="gx-places-empty"><span aria-hidden="true">☆</span><h2>No saved places yet</h2><p>Open Maps, tap any place and press the star. Saved places show on every map and you can mention them in any chat with “@”.</p><Link href="/maps">Open Maps</Link></div>
  </section>;

  return <section className="gx-places" aria-label="My Places" aria-busy={!places}>
    <div className="gx-places-shortcuts">{shortcut("home", home)}{shortcut("work", work)}</div>
    <div className="gx-places-body">
      <ul className="gx-map-glass gx-places-list">
        {(places || []).map((place) => {
          const icon = savedIcon(place.label);
          const open = selected === place.id;
          return <li key={place.id} className={open ? "is-open" : ""}>
            {editing?.id === place.id
              ? <form className="gx-places-rename" onSubmit={(event) => { event.preventDefault(); if (editing.value.trim()) void renamePlace(place.id, editing.value.trim()); setEditing(null); }}>
                  <input autoFocus value={editing.value} maxLength={120} aria-label="Place name" onChange={(event) => setEditing({ id: place.id, value: event.target.value })} onKeyDown={(event) => { if (event.key === "Escape") setEditing(null); }} />
                  <button type="submit">Save</button>
                </form>
              : <button type="button" className="gx-places-row" aria-expanded={open} onClick={() => setSelected(open ? null : place.id)}>
                  <span className="gx-places-icon" style={{ background: savedColor(icon) }}><svg viewBox="0 0 20 20" width="15" height="15" aria-hidden="true"><path fill="#fff" d={SAVED_ICONS[icon]} /></svg></span>
                  <span className="gx-places-copy"><strong>{place.label}</strong><small>{place.address || `${place.lat.toFixed(5)}, ${place.lng.toFixed(5)}`}</small></span>
                </button>}
            {open && editing?.id !== place.id && <div className="gx-mapcard-actions gx-places-actions">
              <button type="button" className="is-primary" onClick={() => startNavigation({ name: place.label, lat: place.lat, lng: place.lng }, "walking")}>Directions</button>
              <button type="button" onClick={() => ask(place)}>Ask Genyxo</button>
              <button type="button" onClick={() => setEditing({ id: place.id, value: place.label })}>Rename</button>
              <button type="button" className="is-danger" aria-label={`Remove ${place.label}`} onClick={() => { void removePlace(place.id); setSelected(null); }}><WorkspaceIcon name="trash" size={14} /></button>
            </div>}
          </li>;
        })}
        {!places && <li className="gx-places-loading" aria-hidden="true"><span /><span /><span /></li>}
      </ul>
      <div className="gx-places-map">
        <MapView pins={pins} selectedId={selected === null ? null : String(selected)} onSelectPin={(id) => setSelected(Number(id))} explore={false} label="Map of my places" />
      </div>
    </div>
  </section>;
}
