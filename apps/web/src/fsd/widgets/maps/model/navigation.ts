import { distanceBetween, type LatLng } from "./maps";

export interface Maneuver { lat: number; lng: number; type: string; modifier?: string; name?: string; distance: number; instruction: string }

const toPoint = ([lng, lat]: [number, number]): LatLng => ({ lat, lng });

/** Metres along the line at each vertex. */
export function cumulative(line: [number, number][]) {
  const result = [0];
  for (let index = 1; index < line.length; index++) result.push(result[index - 1] + distanceBetween(toPoint(line[index - 1]), toPoint(line[index])));
  return result;
}

/**
 * Where a position sits on the route: metres travelled along it, how far off
 * the line it is, and the line's direction there (for the camera heading).
 */
export function project(line: [number, number][], along: number[], point: LatLng) {
  let best = { along: 0, off: Infinity, bearing: 0 };
  const cos = Math.cos((point.lat * Math.PI) / 180);
  for (let index = 1; index < line.length; index++) {
    const [ax, ay] = [line[index - 1][0] * cos, line[index - 1][1]];
    const [bx, by] = [line[index][0] * cos, line[index][1]];
    const [px, py] = [point.lng * cos, point.lat];
    const dx = bx - ax, dy = by - ay;
    const length = dx * dx + dy * dy;
    const t = length ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / length)) : 0;
    const snapped = { lng: (ax + t * dx) / cos, lat: ay + t * dy };
    const off = distanceBetween(point, snapped);
    if (off < best.off) best = { along: along[index - 1] + t * (along[index] - along[index - 1]), off, bearing: bearingBetween(toPoint(line[index - 1]), toPoint(line[index])) };
  }
  return best;
}

export function bearingBetween(a: LatLng, b: LatLng) {
  const radians = (value: number) => (value * Math.PI) / 180;
  const y = Math.sin(radians(b.lng - a.lng)) * Math.cos(radians(b.lat));
  const x = Math.cos(radians(a.lat)) * Math.sin(radians(b.lat)) - Math.sin(radians(a.lat)) * Math.cos(radians(b.lat)) * Math.cos(radians(b.lng - a.lng));
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

/** Each maneuver's distance along the route, so the next one is easy to find. */
export function placeManeuvers(line: [number, number][], along: number[], maneuvers: Maneuver[]) {
  return maneuvers.map((maneuver) => ({ ...maneuver, along: project(line, along, maneuver).along }));
}

/** The arrow for a maneuver, as a 24×24 SVG path. */
export function maneuverArrow(type: string, modifier?: string) {
  if (type === "arrive") return "M12 2a7 7 0 0 1 7 7c0 5.2-7 13-7 13S5 14.2 5 9a7 7 0 0 1 7-7Zm0 4.2a2.8 2.8 0 1 0 0 5.6 2.8 2.8 0 0 0 0-5.6Z";
  if (type === "roundabout" || type === "rotary") return "M12 5a5 5 0 1 1-4.6 3H4l4.5-4.5L13 8H9.6A3 3 0 1 0 12 7V5Zm-1 11h2v6h-2v-6Z";
  const m = modifier || "straight";
  if (m === "uturn") return "M9 21V9a4 4 0 0 1 8 0v4h3l-4 5-4-5h3V9a2 2 0 0 0-4 0v12H9Z";
  if (m.includes("left")) return m.includes("slight") ? "M13 21v-9.5L8.8 7.3 7 9.1V3h6.1l-1.8 1.8L15 8.6V21h-2Z" : m.includes("sharp") ? "M15 21V12.5L7.4 18.6l1.5 1.6H3v-6l1.6 1.5L15 7v14Z" : "M16 21v-9H8.4l2.3 2.3-1.4 1.4L4.6 11l4.7-4.7 1.4 1.4L8.4 10H18v11h-2Z";
  if (m.includes("right")) return m.includes("slight") ? "M11 21v-9.5l4.2-4.2L17 9.1V3h-6.1l1.8 1.8L9 8.6V21h2Z" : m.includes("sharp") ? "M9 21V12.5l7.6 6.1-1.5 1.6H21v-6l-1.6 1.5L9 7v14Z" : "M8 21v-9h7.6l-2.3 2.3 1.4 1.4 4.7-4.7-4.7-4.7-1.4 1.4 2.3 2.3H6v11h2Z";
  return "M11 21V7.4L7.7 10.7 6.3 9.3 12 3.6l5.7 5.7-1.4 1.4L13 7.4V21h-2Z";
}

export function formatClock(date: Date) {
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}
