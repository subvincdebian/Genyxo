import {
  describeMapFences,
  isMapsTool,
  mapsPrompt,
  pinnedPlacesPrompt,
  runMapsTool,
} from "./maps-tools";
import {
  distanceBetween,
  maneuverInstruction,
  MapsService,
} from "./maps.service";

const origin = { lat: 50.4501, lng: 30.5234, accuracy: 20 };
const place = {
  id: "N1",
  name: "Novus",
  lat: 50.4497,
  lng: 30.5256,
  kind: "supermarket",
  distance: 160,
  address: "Khreshchatyk 1",
  openingHours: "08:00-23:00",
};

function fakeService() {
  return {
    search: jest.fn().mockResolvedValue([place]),
    route: jest.fn().mockResolvedValue({
      mode: "walking",
      distance: 420,
      duration: 330,
      geometry: [
        [30.5234, 50.4501],
        [30.5256, 50.4497],
      ],
      steps: ["depart Khreshchatyk"],
    }),
  } as unknown as MapsService & { search: jest.Mock; route: jest.Mock };
}

describe("maps tools", () => {
  it("searches around the user and shows the places as a map card", async () => {
    const service = fakeService();
    const result = await runMapsTool(
      service,
      "genyxo_maps_search",
      { query: "supermarket", radiusMeters: 900 },
      { origin, language: "uk" },
    );
    expect(service.search).toHaveBeenCalledWith(
      { lat: origin.lat, lng: origin.lng },
      "supermarket",
      { radius: 900, limit: 8, language: "uk" },
    );
    expect(result.markdown).toContain("```genyxo-map");
    expect(result.output).toEqual({
      places: [
        expect.objectContaining({
          name: "Novus",
          distanceMeters: 160,
          openingHours: "08:00-23:00",
          lat: 50.4497,
        }),
      ],
    });
  });

  it("tells the model when nothing is near instead of showing an empty map", async () => {
    const service = fakeService();
    service.search.mockResolvedValue([]);
    const result = await runMapsTool(
      service,
      "genyxo_maps_search",
      { query: "aquarium" },
      { origin },
    );
    expect(result.markdown).toBeUndefined();
    expect(result.output).toEqual(
      expect.objectContaining({ places: [], note: expect.any(String) }),
    );
  });

  it("plans transit as the walk to the place and says there are no timetables", async () => {
    const service = fakeService();
    const result = await runMapsTool(
      service,
      "genyxo_maps_route",
      { toLat: 50.4497, toLng: 30.5256, toName: "Novus", mode: "transit" },
      { origin },
    );
    expect(service.route).toHaveBeenCalledWith(
      { lat: origin.lat, lng: origin.lng },
      { lat: 50.4497, lng: 30.5256 },
      "walking",
    );
    expect(result.output).toEqual(
      expect.objectContaining({
        mode: "transit",
        durationMinutes: 6,
        note: expect.stringContaining("No live"),
      }),
    );
    expect(JSON.parse(result.markdown!.split("\n")[3])).toEqual(
      expect.objectContaining({
        type: "route",
        requestedMode: "transit",
        destination: { name: "Novus", lat: 50.4497, lng: 30.5256 },
      }),
    );
  });

  it("rejects routes without valid coordinates", async () => {
    const result = await runMapsTool(
      fakeService(),
      "genyxo_maps_route",
      { toLat: 200, toLng: "x", mode: "driving" },
      { origin },
    );
    expect(result.output).toEqual({ error: expect.stringContaining("toLat") });
  });

  it("returns map service failures to the model as an error", async () => {
    const service = fakeService();
    service.route.mockRejectedValue(new Error("No route found"));
    const result = await runMapsTool(
      service,
      "genyxo_maps_route",
      { toLat: 50.4, toLng: 30.5, mode: "driving" },
      { origin },
    );
    expect(result.output).toEqual({ error: "No route found" });
  });

  it("summarises map cards for later turns", async () => {
    const { markdown } = await runMapsTool(
      fakeService(),
      "genyxo_maps_search",
      { query: "supermarket" },
      { origin },
    );
    expect(describeMapFences(`Here you go.${markdown}`)).toBe(
      'Here you go.\n\n[Map: 1 places for "supermarket": Novus]\n\n',
    );
  });

  it("puts the location into the prompt and knows its tool names", () => {
    expect(mapsPrompt({ origin })).toContain("50.45010, 30.52340 (±20 m)");
    expect(isMapsTool("genyxo_maps_route")).toBe(true);
    expect(isMapsTool("genyxo_generate_image")).toBe(false);
  });

  it("measures distances in metres", () => {
    expect(
      distanceBetween(
        { lat: 50.4501, lng: 30.5234 },
        { lat: 50.4501, lng: 30.5234 },
      ),
    ).toBe(0);
    expect(
      distanceBetween({ lat: 50.45, lng: 30.52 }, { lat: 50.46, lng: 30.52 }),
    ).toBeGreaterThan(1100);
  });
});

describe("pinned places", () => {
  it("lists the places the user mentioned with their coordinates", () => {
    expect(
      pinnedPlacesPrompt([
        {
          name: "Golden Gate",
          lat: 50.448,
          lng: 30.513,
          address: "Volodymyrska 40",
        },
      ]),
    ).toContain("- @Golden Gate: Volodymyrska 40, 50.448000, 30.513000");
  });
});

describe("turn-by-turn instructions", () => {
  it("words maneuvers the way navigation apps say them", () => {
    expect(maneuverInstruction("turn", "left", "Khreshchatyk")).toBe(
      "Turn left onto Khreshchatyk",
    );
    expect(
      maneuverInstruction("roundabout", undefined, "Velyka Vasylkivska", 2),
    ).toBe("At the roundabout, take the second exit onto Velyka Vasylkivska");
    expect(maneuverInstruction("arrive")).toBe("Arrive at your destination");
    expect(maneuverInstruction("turn", "uturn")).toBe("Make a U-turn");
    expect(maneuverInstruction("depart", undefined, "Volodymyrska")).toBe(
      "Head on Volodymyrska",
    );
  });
});
