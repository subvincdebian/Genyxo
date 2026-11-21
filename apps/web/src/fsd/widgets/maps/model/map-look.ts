import type { Map as MapLibreMap } from "maplibre-gl";

/** Free vector tiles without an API key, restyled towards Apple Maps' palette. */
export const mapStyleUrl = (dark: boolean) => `https://tiles.openfreemap.org/styles/${dark ? "dark" : "positron"}`;

const PALETTE = {
  light: { background: "#f4f2ed", water: "#a7d3f2", park: "#cfe7c1", building: "#e8e4dd", road: "#ffffff", casing: "#d9d3c8", major: "#fde59b", text: "#3a3a3c", halo: "#ffffff" },
  dark: { background: "#212124", water: "#1e3c58", park: "#1e3a2b", building: "#2c2c2f", road: "#3b3b3f", casing: "#2a2a2d", major: "#6a5528", text: "#d4d4d8", halo: "#1c1c1e" },
};

/** Recolours whatever layers the base style has; unknown layers keep their look. */
export function applyAppleLook(map: MapLibreMap, dark: boolean) {
  const colors = dark ? PALETTE.dark : PALETTE.light;
  type Paint = Parameters<MapLibreMap["setPaintProperty"]>;
  const set = (id: string, property: string, value: string) => { try { map.setPaintProperty(id, property as Paint[1], value as Paint[2]); } catch { /* Not every layer has every property. */ } };
  for (const layer of map.getStyle().layers || []) {
    const id = layer.id.toLowerCase();
    if (layer.type === "background") set(layer.id, "background-color", colors.background);
    else if (layer.type === "fill") {
      if (/water|ocean|lake|river/.test(id)) set(layer.id, "fill-color", colors.water);
      else if (/park|grass|wood|forest|green|garden|landcover|meadow|cemetery|pitch/.test(id)) set(layer.id, "fill-color", colors.park);
      else if (/building/.test(id)) { set(layer.id, "fill-color", colors.building); set(layer.id, "fill-outline-color", colors.casing); }
    } else if (layer.type === "line") {
      if (/water|river|stream|canal/.test(id)) set(layer.id, "line-color", colors.water);
      else if (/road|highway|street|motorway|trunk|primary|secondary|tertiary|minor|service|bridge|tunnel|path|track/.test(id)) {
        if (/casing|outline/.test(id)) set(layer.id, "line-color", colors.casing);
        else if (/motorway|trunk|primary/.test(id)) set(layer.id, "line-color", colors.major);
        else if (!/path|track|rail/.test(id)) set(layer.id, "line-color", colors.road);
      }
    } else if (layer.type === "symbol") {
      set(layer.id, "text-color", colors.text);
      set(layer.id, "text-halo-color", colors.halo);
    }
  }
}

type Category = { color: string; icon: string };
const ICONS = {
  food: "M7 2v8a2 2 0 0 0 2 2v6h1.5v-6A2 2 0 0 0 12.5 10V2H11v6h-1V2H8.5v6h-1V2H7Zm8.5 0C14 2 13 4 13 7v4h2v7h1.5V2h-1Z",
  cafe: "M4 6h11v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5V6Zm11 1h1.5a2.5 2.5 0 0 1 0 5H15v-1.5h1.5a1 1 0 0 0 0-2H15V7ZM4 18h12v1.5H4V18Z",
  shop: "M6 7V6a4 4 0 0 1 8 0v1h3l-1 12H4L3 7h3Zm1.5 0h5V6a2.5 2.5 0 0 0-5 0v1Z",
  health: "M8 3h4v5h5v4h-5v5H8v-5H3V8h5V3Z",
  transit: "M5 3h10a2 2 0 0 1 2 2v9a2 2 0 0 1-1 1.7V18h-2v-2H6v2H4v-2.3A2 2 0 0 1 3 14V5a2 2 0 0 1 2-2Zm0 2v5h10V5H5Zm1 7.5a1 1 0 1 0 0 2 1 1 0 0 0 0-2Zm8 0a1 1 0 1 0 0 2 1 1 0 0 0 0-2Z",
  money: "M3 5h14v10H3V5Zm7 2.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5Z",
  car: "M5 9l1.5-4h7L15 9h1v6h-2v1.5h-2V15H8v1.5H6V15H4V9h1Zm1.6 0h6.8l-.9-2.5H7.5L6.6 9ZM6.5 11a1 1 0 1 0 0 2 1 1 0 0 0 0-2Zm7 0a1 1 0 1 0 0 2 1 1 0 0 0 0-2Z",
  park: "M10 2 15 9h-2.5l3.5 5H11v4H9v-4H4l3.5-5H5l5-7Z",
  bed: "M3 5h2v6h4V8h6a2 2 0 0 1 2 2v6h-2v-2H5v2H3V5Zm4 2a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3Z",
  culture: "M10 2l2.4 5 5.6.6-4.2 3.7 1.2 5.5L10 14l-5 2.8 1.2-5.5L2 7.6 7.6 7 10 2Z",
  pin: "M10 2a6 6 0 0 1 6 6c0 4.5-6 10-6 10S4 12.5 4 8a6 6 0 0 1 6-6Zm0 3.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5Z",
};
const KINDS: [RegExp, Category][] = [
  [/restaurant|fast_food|food_court|bar|pub|biergarten|ice_cream/, { color: "#ff9f0a", icon: ICONS.food }],
  [/cafe|coffee|tea/, { color: "#a2845e", icon: ICONS.cafe }],
  [/pharmacy|hospital|clinic|doctor|dentist|veterinary/, { color: "#ff375f", icon: ICONS.health }],
  [/bus|tram|station|subway|platform|halt|stop|ferry|taxi/, { color: "#0a84ff", icon: ICONS.transit }],
  [/atm|bank|bureau/, { color: "#30b158", icon: ICONS.money }],
  [/fuel|charging|parking|car/, { color: "#5e5ce6", icon: ICONS.car }],
  [/park|garden|playground|forest|nature|wood/, { color: "#34c759", icon: ICONS.park }],
  [/hotel|hostel|guest|motel|apartment/, { color: "#bf5af2", icon: ICONS.bed }],
  [/museum|attraction|theatre|cinema|arts|gallery|monument|viewpoint|castle|memorial/, { color: "#ff2d55", icon: ICONS.culture }],
  [/supermarket|convenience|mall|bakery|shop|market|clothes|department|kiosk|butcher|greengrocer|electronics/, { color: "#f2b300", icon: ICONS.shop }],
];
/**
 * Places from the base tiles (OpenMapTiles "poi" layer), shown from street
 * level like Google and Apple Maps: one round glyph per category plus the name.
 */
const POI_CLASSES: Record<string, string[]> = {
  food: ["restaurant", "fast_food", "food_court", "bar", "beer", "ice_cream"],
  cafe: ["cafe"],
  shop: ["shop", "grocery", "clothing_store", "alcohol_shop", "bakery", "florist", "furniture", "gift", "hardware", "jewelry", "mall", "convenience", "supermarket"],
  health: ["pharmacy", "hospital", "doctors", "dentist", "veterinary"],
  transit: ["bus", "railway", "ferry_terminal", "aerialway"],
  money: ["bank", "atm"],
  car: ["fuel", "parking", "car", "charging_station"],
  park: ["park", "playground", "garden", "zoo"],
  bed: ["lodging"],
  culture: ["museum", "attraction", "art_gallery", "theatre", "cinema", "castle", "monument"],
};
const POI_COLORS: Record<string, string> = { food: "#ff9f0a", cafe: "#a2845e", shop: "#f2b300", health: "#ff375f", transit: "#0a84ff", money: "#30b158", car: "#5e5ce6", park: "#34c759", bed: "#bf5af2", culture: "#ff2d55", pin: "#8e8e93" };

function poiImage(color: string, path: string) {
  const size = 44;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const context = canvas.getContext("2d")!;
  context.beginPath();
  context.arc(size / 2, size / 2, size / 2 - 3, 0, Math.PI * 2);
  context.fillStyle = color;
  context.shadowColor = "rgba(0, 0, 0, .35)";
  context.shadowBlur = 3;
  context.fill();
  context.shadowBlur = 0;
  context.lineWidth = 3;
  context.strokeStyle = "#ffffff";
  context.stroke();
  context.translate(size / 2 - 12, size / 2 - 12);
  context.scale(1.2, 1.2);
  context.fillStyle = "#ffffff";
  context.fill(new Path2D(path));
  return context.getImageData(0, 0, size, size);
}

/** Adds the POI glyphs and layer to a freshly loaded style; returns its layer id. */
export function addPlacesLayer(map: MapLibreMap, dark: boolean) {
  const icons: Record<string, string> = { food: ICONS.food, cafe: ICONS.cafe, shop: ICONS.shop, health: ICONS.health, transit: ICONS.transit, money: ICONS.money, car: ICONS.car, park: ICONS.park, bed: ICONS.bed, culture: ICONS.culture, pin: ICONS.pin };
  for (const [key, path] of Object.entries(icons)) if (!map.hasImage(`gx-poi-${key}`)) map.addImage(`gx-poi-${key}`, poiImage(POI_COLORS[key], path), { pixelRatio: 2 });
  if (map.getLayer("gx-poi") || !map.getSource("openmaptiles")) return "gx-poi";
  const match: unknown[] = ["match", ["get", "class"]];
  for (const [key, classes] of Object.entries(POI_CLASSES)) match.push(classes, `gx-poi-${key}`);
  match.push("gx-poi-pin");
  map.addLayer({
    id: "gx-poi",
    type: "symbol",
    source: "openmaptiles",
    "source-layer": "poi",
    minzoom: 15,
    filter: ["all", ["has", "name"], ["<=", ["get", "rank"], ["step", ["zoom"], 12, 16, 22, 17, 40]]],
    layout: {
      "icon-image": match as never,
      "icon-size": ["interpolate", ["linear"], ["zoom"], 15, 0.8, 18, 1.05],
      "symbol-sort-key": ["get", "rank"],
      "text-field": ["coalesce", ["get", "name:latin"], ["get", "name"]],
      "text-font": ["Noto Sans Regular"],
      "text-size": 11.5,
      "text-offset": [0, 1.15],
      "text-anchor": "top",
      "text-max-width": 8,
      "text-optional": true,
    },
    paint: {
      "text-color": dark ? "#e5e5ea" : "#3a3a3c",
      "text-halo-color": dark ? "rgba(28, 28, 30, .9)" : "rgba(255, 255, 255, .95)",
      "text-halo-width": 1.4,
      "icon-opacity": ["interpolate", ["linear"], ["zoom"], 15, 0, 15.4, 1],
      "text-opacity": ["interpolate", ["linear"], ["zoom"], 15.2, 0, 15.8, 1],
    },
  });
  return "gx-poi";
}

export function categoryOf(kind: string): Category {
  return KINDS.find(([pattern]) => pattern.test(kind.toLowerCase()))?.[1] || { color: "#8e8e93", icon: ICONS.pin };
}
/** Saved places: Home and Work get their own glyphs, everything else a star. */
export const SAVED_ICONS = {
  home: "M10 3 2.5 9.5 4 11l1-.9V17h4v-4h2v4h4v-6.9l1 .9 1.5-1.5L10 3Z",
  work: "M7 5V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v1h3a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h3Zm1.5 0h3V4a.5.5 0 0 0-.5-.5H9a.5.5 0 0 0-.5.5v1Z",
  star: "M10 2l2.4 5 5.6.6-4.2 3.7 1.2 5.5L10 14l-5 2.8 1.2-5.5L2 7.6 7.6 7 10 2Z",
};
export const savedIcon = (label: string) => (/^(home|дім|дом|domov|zuhause)$/i.test(label.trim()) ? "home" : /^(work|робота|работа|arbeit|office)$/i.test(label.trim()) ? "work" : "star");
export const savedColor = (icon: keyof typeof SAVED_ICONS) => (icon === "home" ? "#0a84ff" : icon === "work" ? "#8e5cf7" : "#ffb340");

export const kindLabel = (kind: string) => kind.replace(/_/g, " ").replace(/^./, (letter) => letter.toUpperCase());
