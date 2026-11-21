"use client";
import { useEffect, useState } from "react";
import { workspaceRequest } from "./types";

/** A place the user starred on the map; stored in the Library as a "place" item. */
export type SavedPlace = { id: number; label: string; lat: number; lng: number; address?: string; kind?: string; createdAt?: string };
type LibraryRow = { id: number; name: string; content?: string | null; createdAt?: string };

let cache: SavedPlace[] | null = null;
let loading: Promise<SavedPlace[]> | null = null;
const listeners = new Set<(places: SavedPlace[]) => void>();
const publish = (places: SavedPlace[]) => { cache = places; listeners.forEach((listener) => listener(places)); };

function parse(row: LibraryRow): SavedPlace | null {
  try {
    const point = JSON.parse(row.content || "");
    if (!Number.isFinite(point.lat) || !Number.isFinite(point.lng)) return null;
    return { id: row.id, label: row.name, lat: point.lat, lng: point.lng, address: point.address, kind: point.kind, createdAt: row.createdAt };
  } catch {
    return null;
  }
}

export function loadSavedPlaces(force = false): Promise<SavedPlace[]> {
  if (cache && !force) return Promise.resolve(cache);
  loading ??= workspaceRequest<{ items: LibraryRow[] }>("library?tab=places&sort=date&limit=100")
    .then((data) => { const places = (data.items || []).map(parse).filter((place): place is SavedPlace => Boolean(place)); publish(places); return places; })
    .finally(() => { loading = null; });
  return loading;
}

/** Saved places, shared by every map, the Library and the "@" menu; loaded only once something needs them. */
export function useSavedPlaces(enabled = true) {
  const [places, setPlaces] = useState<SavedPlace[] | null>(cache);
  useEffect(() => {
    listeners.add(setPlaces);
    if (enabled) loadSavedPlaces().catch(() => setPlaces((current) => current ?? []));
    return () => { listeners.delete(setPlaces); };
  }, [enabled]);
  return places;
}

const near = (a: { lat: number; lng: number }, b: { lat: number; lng: number }) => Math.abs(a.lat - b.lat) < 0.00025 && Math.abs(a.lng - b.lng) < 0.00035;
export const findSavedPlace = (places: SavedPlace[] | null, point: { lat: number; lng: number }) => places?.find((place) => near(place, point)) || null;

export async function savePlace(place: { label: string; lat: number; lng: number; address?: string; kind?: string }) {
  const content = JSON.stringify({ lat: Number(place.lat.toFixed(6)), lng: Number(place.lng.toFixed(6)), address: place.address, kind: place.kind });
  await workspaceRequest("library", { method: "POST", body: JSON.stringify({ name: place.label.slice(0, 120), type: "place", content }) });
  return loadSavedPlaces(true);
}

export async function renamePlace(id: number, label: string) {
  await workspaceRequest(`library/${id}`, { method: "PATCH", body: JSON.stringify({ name: label.slice(0, 120) }) });
  return loadSavedPlaces(true);
}

export async function removePlace(id: number) {
  await workspaceRequest(`library/${id}`, { method: "DELETE" });
  return loadSavedPlaces(true);
}
