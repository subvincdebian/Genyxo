import { createPrivateKey, sign } from "crypto";
import {
  int,
  IntegrationTool,
  list,
  n,
  need,
  object,
  s,
  str,
  ToolContext,
  ToolInputError,
} from "./types";

const SPOTIFY = "https://api.spotify.com/v1";
const track = (item: any) => ({
  uri: item.uri,
  name: item.name,
  artists: item.artists?.map((artist: any) => artist.name).join(", "),
  album: item.album?.name,
  url: item.external_urls?.spotify,
});

export const spotifyTools: IntegrationTool[] = [
  {
    name: "spotify_search",
    pluginId: "spotify",
    label: "Searching Spotify",
    description:
      "Search Spotify for tracks, albums, artists, playlists, shows or episodes.",
    parameters: object(
      {
        query: s(
          "Search text, supports field filters like artist:Daft Punk year:2013",
        ),
        types: s(
          "Comma-separated: track, album, artist, playlist, show, episode (default track)",
        ),
        limit: n("Results per type, up to 50"),
      },
      ["query"],
    ),
    run: async (ctx, args) => {
      const result = await ctx.fetch(`${SPOTIFY}/search`, {
        query: {
          q: need(args, "query", 500),
          type: str(args, "types") || "track",
          limit: int(args, "limit", 10, 50),
        },
      });
      return Object.fromEntries(
        Object.entries(result).map(([key, value]: [string, any]) => [
          key,
          (value.items || []).filter(Boolean).map((item: any) =>
            key === "tracks"
              ? track(item)
              : {
                  uri: item.uri,
                  name: item.name,
                  owner: item.owner?.display_name || item.publisher,
                  url: item.external_urls?.spotify,
                },
          ),
        ]),
      );
    },
  },
  {
    name: "spotify_now_playing",
    pluginId: "spotify",
    label: "Checking what's playing",
    description: "What the user is listening to right now and on which device.",
    run: async (ctx) => {
      const state = await ctx.fetch(`${SPOTIFY}/me/player`);
      return state?.item
        ? {
            playing: state.is_playing,
            device: state.device?.name,
            progressMs: state.progress_ms,
            item: track(state.item),
          }
        : { playing: false };
    },
  },
  {
    name: "spotify_my_playlists",
    pluginId: "spotify",
    label: "Listing playlists",
    description: "List the user's playlists.",
    parameters: object({ limit: n("Up to 50") }),
    run: async (ctx, args) =>
      (
        await ctx.fetch(`${SPOTIFY}/me/playlists`, {
          query: { limit: int(args, "limit", 20, 50) },
        })
      ).items.map((item: any) => ({
        id: item.id,
        name: item.name,
        tracks: item.tracks?.total,
        url: item.external_urls?.spotify,
      })),
  },
  {
    name: "spotify_create_playlist",
    pluginId: "spotify",
    label: "Creating playlist",
    write: true,
    risk: "low",
    description:
      "Create a playlist in the user's library and add tracks (Spotify URIs from spotify_search). Needs the user's confirmation.",
    parameters: object(
      {
        name: s("Playlist name"),
        description: s("Description"),
        trackUris: s("Comma-separated spotify:track: URIs, up to 100"),
        public: {
          type: "boolean",
          description: "Public playlist (default private)",
        },
      },
      ["name", "trackUris"],
    ),
    preview: (args) => ({
      title: "Create Spotify playlist",
      fields: [
        { label: "Name", value: need(args, "name", 100) },
        { label: "Tracks", value: `${list(args.trackUris).length}` },
      ],
      body: list(args.trackUris).join("\n"),
    }),
    run: async (ctx, args) => {
      const uris = list(args.trackUris)
        .filter((uri) => /^spotify:(track|episode):[A-Za-z0-9]+$/.test(uri))
        .slice(0, 100);
      if (!uris.length)
        throw new ToolInputError("trackUris must contain spotify:track: URIs");
      const me = await ctx.fetch(`${SPOTIFY}/me`);
      const playlist = await ctx.fetch(
        `${SPOTIFY}/users/${encodeURIComponent(me.id)}/playlists`,
        {
          json: {
            name: need(args, "name", 100),
            description: str(args, "description", { max: 300 }),
            public: args.public === true,
          },
        },
      );
      await ctx.fetch(`${SPOTIFY}/playlists/${playlist.id}/tracks`, {
        json: { uris },
      });
      return {
        id: playlist.id,
        tracks: uris.length,
        url: playlist.external_urls?.spotify,
      };
    },
  },
  {
    name: "spotify_playback",
    pluginId: "spotify",
    label: "Controlling playback",
    write: true,
    risk: "low",
    description:
      "Play, pause, skip, or start specific tracks/playlists on the user's active device (Spotify Premium). Needs the user's confirmation.",
    parameters: object(
      {
        action: { type: "string", enum: ["play", "pause", "next", "previous"] },
        uris: s("Optional track URIs to play, comma-separated"),
        contextUri: s("Optional album or playlist URI to play"),
      },
      ["action"],
    ),
    preview: (args) => ({
      title: "Spotify playback",
      fields: [
        { label: "Action", value: need(args, "action") },
        ...(args.contextUri
          ? [{ label: "Play", value: String(args.contextUri) }]
          : []),
        ...(args.uris
          ? [{ label: "Tracks", value: `${list(args.uris).length}` }]
          : []),
      ],
    }),
    run: async (ctx, args) => {
      const action = need(args, "action");
      if (action === "next" || action === "previous")
        await ctx.fetch(`${SPOTIFY}/me/player/${action}`, { method: "POST" });
      else if (action === "pause")
        await ctx.fetch(`${SPOTIFY}/me/player/pause`, { method: "PUT" });
      else
        await ctx.fetch(`${SPOTIFY}/me/player/play`, {
          method: "PUT",
          json: args.contextUri
            ? { context_uri: String(args.contextUri) }
            : args.uris
              ? { uris: list(args.uris).slice(0, 100) }
              : {},
        });
      return { done: action };
    },
  },
];

export async function spotifyAccount(ctx: ToolContext) {
  const me = await ctx.fetch(`${SPOTIFY}/me`);
  return {
    label: (me.email || me.display_name) as string,
    metadata: { product: me.product },
  };
}

// ---------- Apple Music (catalog, developer token) ----------

const APPLE = "https://api.music.apple.com/v1";
let developerToken: { value: string; expires: number } | null = null;

/** ES256 developer token from the MusicKit key in the server .env. */
export function appleMusicToken(env: (name: string) => string | undefined) {
  if (developerToken && developerToken.expires > Date.now() + 60_000)
    return developerToken.value;
  const teamId = env("APPLE_MUSIC_TEAM_ID");
  const keyId = env("APPLE_MUSIC_KEY_ID");
  const privateKey = env("APPLE_MUSIC_PRIVATE_KEY")?.replace(/\\n/g, "\n");
  if (!teamId || !keyId || !privateKey)
    throw new ToolInputError("Apple Music is not configured on this server");
  const now = Math.floor(Date.now() / 1000);
  const encode = (value: unknown) =>
    Buffer.from(JSON.stringify(value)).toString("base64url");
  const unsigned = `${encode({ alg: "ES256", kid: keyId })}.${encode({ iss: teamId, iat: now, exp: now + 12 * 3600 })}`;
  const signature = sign("sha256", Buffer.from(unsigned), {
    key: createPrivateKey(privateKey),
    dsaEncoding: "ieee-p1363",
  }).toString("base64url");
  developerToken = {
    value: `${unsigned}.${signature}`,
    expires: (now + 12 * 3600) * 1000,
  };
  return developerToken.value;
}

const appleItem = (item: any) => ({
  id: item.id,
  type: item.type,
  name: item.attributes?.name,
  artist: item.attributes?.artistName,
  album: item.attributes?.albumName,
  url: item.attributes?.url,
  released: item.attributes?.releaseDate,
});
const storefront = (args: Record<string, any>) =>
  (str(args, "storefront", { max: 2 }) || "us").toLowerCase();

export const appleMusicTools: IntegrationTool[] = [
  {
    name: "apple_music_search",
    pluginId: "apple-music",
    label: "Searching Apple Music",
    description:
      "Search the Apple Music catalog. Returns items with links that open in Apple Music.",
    parameters: object(
      {
        query: s("Search text"),
        types: s(
          "Comma-separated: songs, albums, artists, playlists (default songs)",
        ),
        storefront: s("Two-letter country code, default us"),
        limit: n("Up to 25"),
      },
      ["query"],
    ),
    run: async (ctx, args) => {
      const result = await ctx.fetch(
        `${APPLE}/catalog/${storefront(args)}/search`,
        {
          query: {
            term: need(args, "query", 200),
            types: str(args, "types") || "songs",
            limit: int(args, "limit", 10, 25),
          },
        },
      );
      return Object.fromEntries(
        Object.entries(result.results || {}).map(
          ([key, value]: [string, any]) => [
            key,
            (value.data || []).map(appleItem),
          ],
        ),
      );
    },
  },
  {
    name: "apple_music_charts",
    pluginId: "apple-music",
    label: "Reading charts",
    description: "Top songs, albums or playlists in a country.",
    parameters: object({
      types: s("Comma-separated: songs, albums, playlists (default songs)"),
      storefront: s("Two-letter country code, default us"),
      limit: n("Up to 50"),
    }),
    run: async (ctx, args) => {
      const result = await ctx.fetch(
        `${APPLE}/catalog/${storefront(args)}/charts`,
        {
          query: {
            types: str(args, "types") || "songs",
            limit: int(args, "limit", 20, 50),
          },
        },
      );
      return Object.fromEntries(
        Object.entries(result.results || {}).map(
          ([key, value]: [string, any]) => [
            key,
            (value[0]?.data || []).map(appleItem),
          ],
        ),
      );
    },
  },
];
