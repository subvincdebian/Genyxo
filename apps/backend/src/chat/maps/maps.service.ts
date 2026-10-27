import { Injectable, Logger } from "@nestjs/common";

export type LatLng = { lat: number; lng: number };
export type TravelMode = "driving" | "walking" | "cycling";
export interface MapPlace {
  id: string;
  name: string;
  lat: number;
  lng: number;
  /** OSM type such as "cafe" or "supermarket". */
  kind: string;
  /** Metres from the user. */
  distance: number;
  address?: string;
  openingHours?: string;
  website?: string;
  phone?: string;
}
export interface MapRoute {
  mode: TravelMode;
  /** Metres. */
  distance: number;
  /** Seconds. */
  duration: number;
  /** [lng, lat] pairs, thinned for the client. */
  geometry: [number, number][];
  steps: string[];
  /** Turn-by-turn: where each maneuver is and what to say there. */
  maneuvers: MapManeuver[];
}
export interface MapManeuver {
  lat: number;
  lng: number;
  /** OSRM maneuver type, e.g. "turn", "roundabout", "arrive". */
  type: string;
  /** "left", "slight right", "uturn"… */
  modifier?: string;
  /** Street the maneuver leads onto. */
  name?: string;
  /** Metres from this maneuver to the next one. */
  distance: number;
  instruction: string;
}

const ORDINALS = ["first", "second", "third", "fourth", "fifth", "sixth"];
/** "Turn left onto Khreshchatyk", in the words Apple Maps uses. */
export function maneuverInstruction(
  type: string,
  modifier?: string,
  name?: string,
  exit?: number,
) {
  const onto = name ? ` onto ${name}` : "";
  const side = modifier ? modifier.replace("uturn", "U-turn") : "";
  switch (type) {
    case "depart":
      return `Head ${modifier && /left|right/.test(modifier) ? `${modifier} ` : ""}${name ? `on ${name}` : "out"}`.trim();
    case "arrive":
      return "Arrive at your destination";
    case "roundabout":
    case "rotary":
      return `At the roundabout, take the ${ORDINALS[(exit || 1) - 1] || `${exit}th`} exit${onto}`;
    case "merge":
      return `Merge${side ? ` ${side}` : ""}${onto}`;
    case "fork":
      return `Keep ${side || "straight"} at the fork${onto}`;
    case "end of road":
      return `At the end of the road, turn ${side || "right"}${onto}`;
    case "continue":
    case "new name":
      return `Continue${side && side !== "straight" ? ` ${side}` : ""}${onto || " straight"}`;
    default:
      if (side === "straight") return `Continue straight${onto}`;
      if (side === "U-turn") return `Make a U-turn${onto}`;
      return `Turn ${side || "ahead"}${onto}`;
  }
}

/**
 * Places, routes and addresses from free OpenStreetMap services, so maps need
 * no API key: Nominatim (search), Photon (fallback search) and OSRM (routing).
 * Nominatim allows one request per second, so its calls queue and every result
 * is cached for ten minutes.
 */
const USER_AGENT = "Genyxo/1.0 (+https://genyxo.com; info@genyxo.com)";
const NOMINATIM = "https://nominatim.openstreetmap.org";
const PHOTON = "https://photon.komoot.io/api/";
const OSRM: Record<TravelMode, string> = {
  driving: "https://routing.openstreetmap.de/routed-car/route/v1/driving",
  walking: "https://routing.openstreetmap.de/routed-foot/route/v1/foot",
  cycling: "https://routing.openstreetmap.de/routed-bike/route/v1/bike",
};
const CACHE_TTL = 10 * 60 * 1000;

export type Weather = {
  place: string;
  temperature: number;
  feelsLike: number;
  code: number;
  condition: string;
  isDay: boolean;
  wind: number;
  humidity: number;
  high: number;
  low: number;
  rainChance: number;
  sunrise: string;
  sunset: string;
  hours: {
    time: string;
    temperature: number;
    code: number;
    rainChance: number;
  }[];
};

/** WMO weather codes as Open-Meteo reports them. */
export function weatherCondition(code: number) {
  if (code === 0) return "Clear";
  if (code <= 2) return "Partly cloudy";
  if (code === 3) return "Cloudy";
  if (code === 45 || code === 48) return "Fog";
  if (code >= 51 && code <= 57) return "Drizzle";
  if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) return "Rain";
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return "Snow";
  if (code >= 95) return "Thunderstorm";
  return "Cloudy";
}
const CACHE_LIMIT = 400;

export const distanceBetween = (a: LatLng, b: LatLng) => {
  const radians = (value: number) => (value * Math.PI) / 180;
  const dLat = radians(b.lat - a.lat);
  const dLng = radians(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(radians(a.lat)) *
      Math.cos(radians(b.lat)) *
      Math.sin(dLng / 2) ** 2;
  return Math.round(6_371_000 * 2 * Math.asin(Math.sqrt(h)));
};

/** A square around the point, as Nominatim's viewbox "left,top,right,bottom". */
function viewbox(center: LatLng, radius: number) {
  const dLat = radius / 111_320;
  const dLng = radius / (111_320 * Math.cos((center.lat * Math.PI) / 180));
  return [
    center.lng - dLng,
    center.lat + dLat,
    center.lng + dLng,
    center.lat - dLat,
  ]
    .map((value) => value.toFixed(5))
    .join(",");
}

/** Keeps at most `limit` points of a line, always the first and the last. */
function thin(points: [number, number][], limit = 400) {
  if (points.length <= limit) return points;
  const step = (points.length - 1) / (limit - 1);
  return Array.from(
    { length: limit },
    (_, index) => points[Math.round(index * step)],
  );
}

function shortAddress(address: Record<string, string> | undefined) {
  if (!address) return undefined;
  const street = [
    address.road || address.pedestrian || address.square,
    address.house_number,
  ]
    .filter(Boolean)
    .join(" ");
  return (
    [
      street,
      address.suburb ||
        address.city_district ||
        address.city ||
        address.town ||
        address.village,
    ]
      .filter(Boolean)
      .join(", ") || undefined
  );
}

@Injectable()
export class MapsService {
  private readonly logger = new Logger(MapsService.name);
  private readonly cache = new Map<string, { at: number; value: unknown }>();
  private nominatimQueue: Promise<unknown> = Promise.resolve();
  private lastNominatim = 0;

  private async cached<T>(key: string, load: () => Promise<T>): Promise<T> {
    const hit = this.cache.get(key);
    if (hit && Date.now() - hit.at < CACHE_TTL) return hit.value as T;
    const value = await load();
    if (this.cache.size >= CACHE_LIMIT)
      this.cache.delete(this.cache.keys().next().value);
    this.cache.set(key, { at: Date.now(), value });
    return value;
  }

  private async getJson<T>(url: string, timeout = 9000): Promise<T> {
    const response = await fetch(url, {
      headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
      signal: AbortSignal.timeout(timeout),
    });
    if (!response.ok)
      throw new Error(`Map service answered ${response.status}`);
    return (await response.json()) as T;
  }

  /** Nominatim's usage policy: at most one request per second from this server. */
  private nominatim<T>(path: string): Promise<T> {
    const run = async () => {
      const wait = this.lastNominatim + 1100 - Date.now();
      if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
      this.lastNominatim = Date.now();
      return this.getJson<T>(`${NOMINATIM}${path}`);
    };
    const next = this.nominatimQueue.then(run, run);
    this.nominatimQueue = next.catch(() => undefined);
    return next;
  }

  /** Places of a kind ("pharmacy", "supermarket") or by name around the user, nearest first. */
  async search(
    origin: LatLng,
    query: string,
    options: { radius?: number; limit?: number; language?: string } = {},
  ) {
    const radius = Math.min(Math.max(options.radius ?? 1500, 200), 20_000);
    const limit = Math.min(Math.max(options.limit ?? 8, 1), 15);
    const text = query.trim().slice(0, 120);
    if (!text) return [];
    const key = `search:${origin.lat.toFixed(3)},${origin.lng.toFixed(3)}:${radius}:${text.toLowerCase()}:${options.language || ""}`;
    return this.cached(key, async () => {
      const params = new URLSearchParams({
        q: text,
        format: "jsonv2",
        limit: "30",
        viewbox: viewbox(origin, radius),
        bounded: "1",
        addressdetails: "1",
        extratags: "1",
        "accept-language": options.language || "en",
      });
      let places: MapPlace[] = [];
      try {
        const rows = await this.nominatim<any[]>(`/search?${params}`);
        places = rows.map((row) => ({
          id: `${row.osm_type}${row.osm_id}`,
          name: row.name || row.display_name?.split(",")[0] || text,
          lat: Number(row.lat),
          lng: Number(row.lon),
          kind: row.type || row.category || "place",
          distance: 0,
          address: shortAddress(row.address),
          openingHours: row.extratags?.opening_hours,
          website: row.extratags?.website || row.extratags?.["contact:website"],
          phone: row.extratags?.phone || row.extratags?.["contact:phone"],
        }));
      } catch (error: any) {
        this.logger.warn(`Nominatim search failed: ${error.message}`);
      }
      if (!places.length)
        places = await this.photon(origin, text, radius, options.language);
      return places
        .map((place) => ({
          ...place,
          distance: distanceBetween(origin, place),
        }))
        .filter((place) => place.distance <= radius * 1.45)
        .sort((a, b) => a.distance - b.distance)
        .filter(
          (place, index, list) =>
            list.findIndex(
              (other) =>
                other.name === place.name &&
                Math.abs(other.distance - place.distance) < 25,
            ) === index,
        )
        .slice(0, limit);
    });
  }

  private async photon(
    origin: LatLng,
    query: string,
    radius: number,
    language?: string,
  ): Promise<MapPlace[]> {
    const [left, top, right, bottom] = viewbox(origin, radius).split(",");
    const params = new URLSearchParams({
      q: query,
      lat: String(origin.lat),
      lon: String(origin.lng),
      limit: "20",
      bbox: [left, bottom, right, top].join(","),
      lang: language && ["en", "de", "fr"].includes(language) ? language : "en",
    });
    try {
      const data = await this.getJson<{ features: any[] }>(
        `${PHOTON}?${params}`,
      );
      return data.features.map((feature) => ({
        id: `${feature.properties.osm_type}${feature.properties.osm_id}`,
        name: feature.properties.name || query,
        lat: feature.geometry.coordinates[1],
        lng: feature.geometry.coordinates[0],
        kind: feature.properties.osm_value || "place",
        distance: 0,
        address:
          [feature.properties.street, feature.properties.housenumber]
            .filter(Boolean)
            .join(" ") || undefined,
      }));
    } catch (error: any) {
      this.logger.warn(`Photon search failed: ${error.message}`);
      return [];
    }
  }

  async route(from: LatLng, to: LatLng, mode: TravelMode): Promise<MapRoute> {
    const key = `route:${mode}:${from.lat.toFixed(4)},${from.lng.toFixed(4)}:${to.lat.toFixed(4)},${to.lng.toFixed(4)}`;
    return this.cached(key, async () => {
      const url = `${OSRM[mode]}/${from.lng},${from.lat};${to.lng},${to.lat}?overview=full&geometries=geojson&steps=true`;
      const data = await this.getJson<any>(url, 12_000);
      const route = data.routes?.[0];
      if (!route) throw new Error("No route found");
      const steps: string[] = (route.legs?.[0]?.steps || [])
        .map((step: any) =>
          [step.maneuver?.type, step.maneuver?.modifier, step.name]
            .filter(Boolean)
            .join(" "),
        )
        .filter(Boolean)
        .slice(0, 25);
      const maneuvers: MapManeuver[] = (route.legs?.[0]?.steps || []).map(
        (step: any) => ({
          lng: step.maneuver?.location?.[0],
          lat: step.maneuver?.location?.[1],
          type: step.maneuver?.type || "turn",
          modifier: step.maneuver?.modifier,
          name: step.name || undefined,
          distance: Math.round(step.distance || 0),
          instruction: maneuverInstruction(
            step.maneuver?.type || "turn",
            step.maneuver?.modifier,
            step.name || undefined,
            step.maneuver?.exit,
          ),
        }),
      );
      return {
        mode,
        distance: Math.round(route.distance),
        duration: Math.round(route.duration),
        geometry: thin(route.geometry.coordinates),
        steps,
        maneuvers: maneuvers
          .filter(
            (step) => Number.isFinite(step.lat) && Number.isFinite(step.lng),
          )
          .slice(0, 80),
      };
    });
  }

  /** Current weather and today's hours from Open-Meteo (free, no key), in the place's time zone. */
  async weather(point: LatLng, language?: string): Promise<Weather> {
    const key = `weather:${point.lat.toFixed(2)},${point.lng.toFixed(2)}`;
    const forecast = await this.cached(key, async () => {
      const params = new URLSearchParams({
        latitude: point.lat.toFixed(4),
        longitude: point.lng.toFixed(4),
        current:
          "temperature_2m,apparent_temperature,weather_code,wind_speed_10m,relative_humidity_2m,is_day",
        hourly: "temperature_2m,weather_code,precipitation_probability",
        daily:
          "temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunrise,sunset",
        timezone: "auto",
        forecast_days: "2",
      });
      return this.getJson<any>(
        `https://api.open-meteo.com/v1/forecast?${params}`,
      );
    });
    const place = await this.reverse(point, language).catch(() => ({
      label: "",
      city: "",
    }));
    const now = String(forecast.current?.time || "");
    const hourly = forecast.hourly || {};
    const start = Math.max(
      0,
      (hourly.time || []).findIndex((time: string) => time >= now.slice(0, 13)),
    );
    return {
      place: place.city || place.label || "",
      temperature: Math.round(forecast.current?.temperature_2m),
      feelsLike: Math.round(forecast.current?.apparent_temperature),
      code: Number(forecast.current?.weather_code),
      condition: weatherCondition(Number(forecast.current?.weather_code)),
      isDay: forecast.current?.is_day !== 0,
      wind: Math.round(forecast.current?.wind_speed_10m),
      humidity: Math.round(forecast.current?.relative_humidity_2m),
      high: Math.round(forecast.daily?.temperature_2m_max?.[0]),
      low: Math.round(forecast.daily?.temperature_2m_min?.[0]),
      rainChance: Number(
        forecast.daily?.precipitation_probability_max?.[0] ?? 0,
      ),
      sunrise: String(forecast.daily?.sunrise?.[0] || "").slice(11, 16),
      sunset: String(forecast.daily?.sunset?.[0] || "").slice(11, 16),
      hours: (hourly.time || [])
        .slice(start, start + 12)
        .map((time: string, index: number) => ({
          time: time.slice(11, 16),
          temperature: Math.round(hourly.temperature_2m[start + index]),
          code: Number(hourly.weather_code[start + index]),
          rainChance: Number(
            hourly.precipitation_probability?.[start + index] ?? 0,
          ),
        })),
    };
  }

  /** "Street 5, District" for a point, to show where the user is. */
  async reverse(point: LatLng, language?: string) {
    const key = `reverse:${point.lat.toFixed(4)},${point.lng.toFixed(4)}:${language || ""}`;
    return this.cached(key, async () => {
      const params = new URLSearchParams({
        lat: String(point.lat),
        lon: String(point.lng),
        format: "jsonv2",
        zoom: "18",
        addressdetails: "1",
        "accept-language": language || "en",
      });
      const row = await this.nominatim<any>(`/reverse?${params}`);
      return {
        label: shortAddress(row.address) || row.display_name || "",
        city:
          row.address?.city || row.address?.town || row.address?.village || "",
      };
    });
  }
}
