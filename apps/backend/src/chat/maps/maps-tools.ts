import { LatLng, MapsService, TravelMode } from "./maps.service";

/**
 * Built-in map tools a model gets when the user shares their location (the
 * Maps page): real places and routes from OpenStreetMap instead of guesses.
 * Each call also shows the user a map card with the pins or the route.
 */
interface MapsTool {
  name: string;
  label: string;
  description: string;
  parameters: Record<string, any>;
}

const TOOLS: MapsTool[] = [
  {
    name: "genyxo_maps_search",
    label: "Searching the map",
    description:
      "Find places near the user, nearest first: by kind in English ('pharmacy', 'supermarket', 'cafe', 'restaurant', 'bus stop', 'tram stop', 'metro station', 'atm', 'hospital', 'fuel', 'parking', 'park', 'hotel', 'gym') or by name ('Novus', 'McDonald's'). Returns name, distance, address, opening hours and coordinates.",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string", description: "Kind of place or its name" },
        radiusMeters: {
          type: "number",
          description: "Search radius in metres, 200–20000 (default 1500)",
        },
        limit: {
          type: "number",
          description: "How many places, 1–15 (default 8)",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "genyxo_maps_route",
    label: "Planning the route",
    description:
      "Route from the user to a place (use coordinates from genyxo_maps_search). Modes: driving, walking, cycling, transit. Transit has no live timetables: it returns the walking route to the place, so also search for nearby stops.",
    parameters: {
      type: "object",
      properties: {
        toName: { type: "string", description: "Destination name" },
        toLat: { type: "number", description: "Destination latitude" },
        toLng: { type: "number", description: "Destination longitude" },
        mode: {
          type: "string",
          enum: ["driving", "walking", "cycling", "transit"],
        },
      },
      required: ["toLat", "toLng", "mode"],
    },
  },
  {
    name: "genyxo_weather",
    label: "Checking the weather",
    description:
      "Current weather and today's forecast (hourly temperature and rain chance, high/low, sunrise/sunset) at the user's location or at given coordinates. The user sees a weather card.",
    parameters: {
      type: "object",
      properties: {
        lat: {
          type: "number",
          description: "Latitude; omit for the user's location",
        },
        lng: {
          type: "number",
          description: "Longitude; omit for the user's location",
        },
      },
    },
  },
];

export const isMapsTool = (name: string) =>
  TOOLS.some((tool) => tool.name === name);
export const mapsActivity = (name: string) =>
  TOOLS.find((tool) => tool.name === name)?.label || "Using the map";
export const mapsGeminiDeclarations = () =>
  TOOLS.map(({ name, description, parameters }) => ({
    name,
    description,
    parameters,
  }));
export const mapsOpenAiTools = () =>
  TOOLS.map(({ name, description, parameters }) => ({
    type: "function" as const,
    function: { name, description, parameters },
  }));

export type MapsContext = {
  origin: LatLng & { accuracy?: number };
  language?: string;
};

export function mapsPrompt(context: MapsContext) {
  const { lat, lng, accuracy } = context.origin;
  return [
    `The user shared their current location: ${lat.toFixed(5)}, ${lng.toFixed(5)}${accuracy ? ` (±${Math.round(accuracy)} m)` : ""}.`,
    "For anything about nearby places, distances, opening hours or how to get somewhere, call genyxo_maps_search and genyxo_maps_route instead of guessing, and never invent places or addresses. For the weather call genyxo_weather.",
    "Routes have no live traffic data: give the usual travel time and say it is without live traffic.",
    "The map with the pins or the route appears to the user automatically: do not paste coordinates, map links or markdown for it.",
    "Answer briefly in the user's language: the best few options with distance and time, and whether they are open if hours are known. For public transport, name the nearby stops you found and the walk to them; you have no live timetables.",
  ].join(" ");
}

/** Places the user picked on the map and mentioned as "@Name" in the message. */
export function pinnedPlacesPrompt(
  places: { name: string; lat: number; lng: number; address?: string }[],
) {
  const lines = places.map(
    (place) =>
      `- @${place.name}: ${place.address ? `${place.address}, ` : ""}${place.lat.toFixed(6)}, ${place.lng.toFixed(6)}`,
  );
  return [
    'The user picked these places on the map; "@Name" in the message refers to them:',
    ...lines,
    "Use their coordinates with the map tools when a route or nearby search helps.",
  ].join("\n");
}

const fence = (card: unknown) =>
  `\n\n\`\`\`genyxo-map\n${JSON.stringify(card)}\n\`\`\`\n\n`;
const minutes = (seconds: number) => Math.max(1, Math.round(seconds / 60));
const number = (value: unknown) =>
  typeof value === "number" && Number.isFinite(value) ? value : Number(value);

/** Runs a map tool: `output` is what the model reads, `markdown` the card the user sees. */
export async function runMapsTool(
  service: MapsService,
  name: string,
  args: Record<string, any>,
  context: MapsContext,
) {
  const origin = { lat: context.origin.lat, lng: context.origin.lng };
  try {
    if (name === "genyxo_maps_search") {
      const query = String(args.query || "").trim();
      if (!query)
        return { output: { error: "Invalid arguments: query is required" } };
      const radius = Number.isFinite(number(args.radiusMeters))
        ? number(args.radiusMeters)
        : 1500;
      const places = await service.search(origin, query, {
        radius,
        limit: number(args.limit) || 8,
        language: context.language,
      });
      return {
        markdown: places.length
          ? fence({ type: "places", query, origin, radius, places })
          : undefined,
        output: places.length
          ? {
              places: places.map((place) => ({
                name: place.name,
                kind: place.kind,
                distanceMeters: place.distance,
                walkMinutes: minutes(place.distance / 1.3),
                address: place.address,
                openingHours: place.openingHours,
                lat: place.lat,
                lng: place.lng,
              })),
            }
          : {
              places: [],
              note: "Nothing found in this radius. Try a larger radius or another word for the kind of place.",
            },
      };
    }
    if (name === "genyxo_maps_route") {
      const to = { lat: number(args.toLat), lng: number(args.toLng) };
      if (
        !Number.isFinite(to.lat) ||
        !Number.isFinite(to.lng) ||
        Math.abs(to.lat) > 90 ||
        Math.abs(to.lng) > 180
      )
        return {
          output: { error: "Invalid arguments: toLat and toLng are required" },
        };
      const requested = String(args.mode || "walking");
      const mode: TravelMode =
        requested === "driving" || requested === "cycling"
          ? requested
          : "walking";
      const route = await service.route(origin, to, mode);
      const destination = {
        name: String(args.toName || "Destination").slice(0, 120),
        ...to,
      };
      return {
        markdown: fence({
          type: "route",
          origin,
          destination,
          requestedMode: requested,
          route,
        }),
        output: {
          mode: requested,
          distanceMeters: route.distance,
          durationMinutes: minutes(route.duration),
          steps: route.steps.slice(0, 12),
          ...(requested === "transit"
            ? {
                note: "No live public-transport data: this is the walking route. Mention nearby stops instead of exact times.",
              }
            : {}),
        },
      };
    }
    if (name === "genyxo_weather") {
      const point =
        Number.isFinite(number(args.lat)) && Number.isFinite(number(args.lng))
          ? { lat: number(args.lat), lng: number(args.lng) }
          : origin;
      const weather = await service.weather(point, context.language);
      return {
        markdown: `\n\n\`\`\`genyxo-weather\n${JSON.stringify(weather)}\n\`\`\`\n\n`,
        output: { ...weather, hours: weather.hours.slice(0, 8) },
      };
    }
    return { output: { error: "Unknown map tool" } };
  } catch (error: any) {
    return {
      output: {
        error: String(error?.message || "Map service unavailable").slice(
          0,
          200,
        ),
      },
    };
  }
}

const MAP_FENCE = /```genyxo-map\n(\{.*\})\n```/g;
const WEATHER_FENCE = /```genyxo-weather\n(\{.*\})\n```/g;
/** Later turns see a short summary instead of the map card's data. */
export function describeMapFences(content: string) {
  if (content.includes("genyxo-weather"))
    content = content.replace(WEATHER_FENCE, (_match, json: string) => {
      try {
        const card = JSON.parse(json);
        return `[Weather${card.place ? ` in ${card.place}` : ""}: ${card.temperature}°, ${card.condition}, ${card.low}–${card.high}°]`;
      } catch {
        return "[Weather]";
      }
    });
  if (!content.includes("genyxo-map")) return content;
  return content.replace(MAP_FENCE, (_match, json: string) => {
    try {
      const card = JSON.parse(json);
      return card.type === "route"
        ? `[Map: ${card.requestedMode} route to ${card.destination?.name}, ${Math.round(card.route.distance)} m]`
        : `[Map: ${card.places?.length || 0} places for "${card.query}": ${(
            card.places || []
          )
            .slice(0, 5)
            .map((place: any) => place.name)
            .join(", ")}]`;
    } catch {
      return "[Map]";
    }
  });
}
