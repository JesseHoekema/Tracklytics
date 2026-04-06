import { config } from "dotenv";
config();

import { Worker } from "bullmq";
import { connection } from "./redis";
import { prisma } from "./prisma-worker";

const LAST_FM_API = "https://ws.audioscrobbler.com/2.0";
const API_KEY = process.env.LASTFM_API_KEY!;
const PAGE_SIZE = 200;
const LASTFM_MAX_RETRIES = 4;
const LASTFM_RETRY_BASE_DELAY_MS = 2000;
const AUTO_SYNC_INTERVAL_MS = 3 * 60 * 1000;
const AUTO_SYNC_LOOKBACK_SEC = 60 * 60;

const SPOTIFY_ACCOUNTS_API = "https://accounts.spotify.com/api/token";
const SPOTIFY_SEARCH_API = "https://api.spotify.com/v1/search";
const SPOTIFY_TRACKS_API = "https://api.spotify.com/v1/tracks";
const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
const SPOTIFY_BATCH_SIZE = 50;
const SPOTIFY_BATCH_PARALLELISM = 4;
const SPOTIFY_SEARCH_PARALLELISM = 6;
const SPOTIFY_ID_CACHE_TTL_SEC = 60 * 60 * 24 * 30; // 30 dagen
const SPOTIFY_MISS_CACHE_TTL_SEC = 60 * 60 * 6; // 6 uurtjes
const SPOTIFY_DURATION_CACHE_TTL_SEC = 60 * 60 * 24 * 30; // 30 dagen :)
const SPOTIFY_CACHE_MISS = "__MISS__";

type SpotifyTokenState = {
  accessToken: string;
  expiresAtMs: number;
};

type PendingScrobble = {
  userId: string;
  artist: string;
  track: string;
  album: string | null;
  playedAt: Date;
  durationSec?: number;
  spotifyImageUrl?: string;
};

type SpotifySearchResponse = {
  tracks?: {
    items?: Array<{ id?: string }>;
  };
  error?: {
    status?: number;
    message?: string;
  };
};

type SpotifyTracksResponse = {
  tracks?: Array<{
    id?: string;
    duration_ms?: number;
    album?: {
      images?: Array<{ url?: string; height?: number; width?: number }>;
    };
  } | null>;
  error?: {
    status?: number;
    message?: string;
  };
};

let spotifyTokenState: SpotifyTokenState | null = null;
let spotifyDisabled = false;
let autoSyncRunning = false;

new Worker(
  "lastfm-import",
  async (job) => {
    const { jobId, userId, username, from, to } = job.data;

    await prisma.importJob.updateMany({
      where: { id: jobId },
      data: { status: "running" },
    });

    try {
      const first = await fetchPage(username, 1, PAGE_SIZE, from, to);
      const attr = first.recenttracks["@attr"];
      const totalPagesFromApi = parseInt(attr.totalPages);
      const totalTracks = parseInt(attr.total);
      const total = Number.isFinite(totalPagesFromApi)
        ? totalPagesFromApi
        : Math.ceil(totalTracks / PAGE_SIZE);

      console.log(
        `[${username}] ${totalTracks} scrobbles across ${total} pages`,
      );

      await prisma.importJob.updateMany({
        where: { id: jobId },
        data: { total },
      });

      for (let page = 1; page <= total; page++) {
        const current = await prisma.importJob.findUnique({
          where: { id: jobId },
        });
        if (!current || current.status === "cancelled") {
          console.log(`[${username}] Job cancelled at page ${page}`);
          return;
        }

        const data = await fetchPage(username, page, PAGE_SIZE, from, to);
        const rawTracks = data.recenttracks.track;

        const tracksArray = Array.isArray(rawTracks) ? rawTracks : [rawTracks];

        const scrobbles = tracksArray
          .filter((t: any) => t && !t["@attr"]?.nowplaying && t.date?.uts)
          .map(
            (t: any): PendingScrobble => ({
              userId,
              artist: t.artist["#text"] || t.artist?.name || "",
              track: t.name || "",
              album: t.album?.["#text"] || null,
              playedAt: new Date(parseInt(t.date.uts) * 1000),
            }),
          );

        if (scrobbles.length > 0) {
          await enrichScrobbleDurations(scrobbles, username);

          const chunkSize = 50;
          for (let i = 0; i < scrobbles.length; i += chunkSize) {
            const chunk = scrobbles.slice(i, i + chunkSize);
            await prisma.$transaction(
              chunk.flatMap((s) => [
                prisma.scrobble.deleteMany({
                  where: {
                    userId: s.userId,
                    playedAt: s.playedAt,
                  },
                }),
                prisma.scrobble.create({ data: s }),
              ]),
            );
          }
        }

        await prisma.importJob.updateMany({
          where: { id: jobId },
          data: { progress: page },
        });

        console.log(
          `[${username}] Page ${page}/${total} — ${scrobbles.length} tracks stored`,
        );

        await sleep(200);
      }

      await prisma.importJob.updateMany({
        where: { id: jobId },
        data: { status: "done" },
      });

      console.log(`[${username}] Import complete`);
    } catch (err: any) {
      console.error(`[${username}] Import failed:`, err.message);
      await prisma.importJob.updateMany({
        where: { id: jobId },
        data: { status: "failed", error: err.message },
      });
      throw err;
    }
  },
  { connection, concurrency: 2 },
);

async function fetchPage(
  username: string,
  page: number,
  limit: number,
  from?: number,
  to?: number,
) {
  const url = new URL(LAST_FM_API);
  url.searchParams.set("method", "user.getrecenttracks");
  url.searchParams.set("user", username);
  url.searchParams.set("api_key", API_KEY);
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", String(limit));
  url.searchParams.set("page", String(page));
  if (from) url.searchParams.set("from", String(from));
  if (to) url.searchParams.set("to", String(to));

  for (let attempt = 0; attempt <= LASTFM_MAX_RETRIES; attempt++) {
    const res = await fetch(url);

    if (!res.ok) {
      const shouldRetry = res.status >= 500 && attempt < LASTFM_MAX_RETRIES;
      if (shouldRetry) {
        const waitMs = LASTFM_RETRY_BASE_DELAY_MS * (attempt + 1);
        console.warn(
          `[${username}] Last.fm ${res.status} on page ${page}; retry ${attempt + 1}/${LASTFM_MAX_RETRIES} in ${Math.round(waitMs / 1000)}s`,
        );
        await sleep(waitMs);
        continue;
      }

      throw new Error(`Last.fm error: ${res.status}`);
    }

    const json = await res.json();

    console.log(
      `Fetched page ${page} for ${username}: ${json.recenttracks?.track?.length || 0} tracks`,
    );

    if (json.error) {
      throw new Error(`Last.fm API error ${json.error}: ${json.message}`);
    }

    return json;
  }

  throw new Error("Last.fm error: retries exhausted");
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function normalizeSpotifyKey(text: string): string {
  return text
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function toSongKey(artist: string, title: string): string {
  return `${normalizeSpotifyKey(artist)}::${normalizeSpotifyKey(title)}`;
}

function songKeyToRedisKey(songKey: string): string {
  return `spotify:track-id:v1:${songKey}`;
}

function durationRedisKey(trackId: string): string {
  return `spotify:track-duration:v1:${trackId}`;
}

function imageUrlRedisKey(trackId: string): string {
  return `spotify:track-image:v1:${trackId}`;
}

function chunkArray<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    out.push(items.slice(i, i + size));
  }
  return out;
}

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  mapper: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  if (items.length === 0) return [];
  const results = new Array<R>(items.length);
  let cursor = 0;

  const workers = Array.from(
    { length: Math.min(concurrency, items.length) },
    async () => {
      while (true) {
        const index = cursor;
        cursor += 1;
        if (index >= items.length) return;
        results[index] = await mapper(items[index], index);
      }
    },
  );

  await Promise.all(workers);
  return results;
}

async function enrichScrobbleDurations(
  scrobbles: PendingScrobble[],
  username: string,
) {
  if (spotifyDisabled) return;
  if (!SPOTIFY_CLIENT_ID || !SPOTIFY_CLIENT_SECRET) {
    spotifyDisabled = true;
    console.warn(
      "Spotify duration enrichment disabled: missing SPOTIFY_CLIENT_ID or SPOTIFY_CLIENT_SECRET",
    );
    return;
  }

  try {
    const unique = new Map<string, { artist: string; track: string }>();
    for (const scrobble of scrobbles) {
      const songKey = toSongKey(scrobble.artist, scrobble.track);
      if (!unique.has(songKey)) {
        unique.set(songKey, { artist: scrobble.artist, track: scrobble.track });
      }
    }

    const songKeys = Array.from(unique.keys());
    const resolvedTrackIds = await resolveSpotifyTrackIds(songKeys, unique);
    const ids = Array.from(new Set(Array.from(resolvedTrackIds.values())));
    const trackDataById = await getSpotifyTrackData(ids);

    let enrichedCount = 0;
    for (const scrobble of scrobbles) {
      const songKey = toSongKey(scrobble.artist, scrobble.track);
      const trackId = resolvedTrackIds.get(songKey);
      if (!trackId) continue;
      const trackData = trackDataById.get(trackId);
      if (trackData) {
        scrobble.durationSec = trackData.durationSec;
        scrobble.spotifyImageUrl = trackData.spotifyImageUrl;
        enrichedCount += 1;
      }
    }

    console.log(
      `[${username}] Spotify duration enrichment: ${enrichedCount}/${scrobbles.length} tracks`,
    );
  } catch (error: any) {
    const message = error?.message ?? String(error);
    console.warn(
      `[${username}] Spotify duration enrichment skipped: ${message}`,
    );
  }
}

async function resolveSpotifyTrackIds(
  songKeys: string[],
  songDetails: Map<string, { artist: string; track: string }>,
) {
  const resolved = new Map<string, string>();
  if (songKeys.length === 0) return resolved;

  const redisKeys = songKeys.map(songKeyToRedisKey);
  const cachedValues = await connection.mget(...redisKeys);

  const misses: string[] = [];
  for (let i = 0; i < songKeys.length; i++) {
    const songKey = songKeys[i];
    const cached = cachedValues[i];
    if (!cached) {
      misses.push(songKey);
      continue;
    }
    if (cached !== SPOTIFY_CACHE_MISS) {
      resolved.set(songKey, cached);
    }
  }

  if (misses.length === 0) return resolved;

  await mapWithConcurrency(
    misses,
    SPOTIFY_SEARCH_PARALLELISM,
    async (songKey) => {
      const details = songDetails.get(songKey);
      if (!details) return;

      const trackId = await searchSpotifyTrackId(details.artist, details.track);
      const redisKey = songKeyToRedisKey(songKey);

      if (trackId) {
        resolved.set(songKey, trackId);
        await connection.set(redisKey, trackId, "EX", SPOTIFY_ID_CACHE_TTL_SEC);
        return;
      }

      await connection.set(
        redisKey,
        SPOTIFY_CACHE_MISS,
        "EX",
        SPOTIFY_MISS_CACHE_TTL_SEC,
      );
    },
  );

  return resolved;
}

async function getSpotifyTrackData(trackIds: string[]) {
  const trackDataById = new Map<
    string,
    { durationSec: number; spotifyImageUrl?: string }
  >();
  if (trackIds.length === 0) return trackDataById;

  const redisKeys = trackIds.map(durationRedisKey);
  const imageKeys = trackIds.map(imageUrlRedisKey);
  const allKeys = [...redisKeys, ...imageKeys];
  const cachedValues = await connection.mget(...allKeys);

  const missingIds: string[] = [];
  const missingImageIds: string[] = [];

  for (let i = 0; i < trackIds.length; i++) {
    const trackId = trackIds[i];
    const cachedDuration = cachedValues[i];
    const cachedImage = cachedValues[trackIds.length + i];

    if (!cachedDuration) {
      missingIds.push(trackId);
      continue;
    }

    const parsed = parseInt(cachedDuration, 10);
    if (Number.isFinite(parsed) && parsed > 0) {
      trackDataById.set(trackId, {
        durationSec: parsed,
        spotifyImageUrl: cachedImage || undefined,
      });

      if (!cachedImage) {
        missingImageIds.push(trackId);
      }
    } else {
      missingIds.push(trackId);
    }
  }

  if (missingIds.length > 0) {
    const batches = chunkArray(missingIds, SPOTIFY_BATCH_SIZE);
    const batchResults = await mapWithConcurrency(
      batches,
      SPOTIFY_BATCH_PARALLELISM,
      async (batch) => fetchSpotifyTrackData(batch),
    );

    for (const resultMap of batchResults) {
      for (const [trackId, data] of resultMap) {
        trackDataById.set(trackId, data);
      }
    }
  }

  if (missingImageIds.length > 0) {
    const batches = chunkArray(missingImageIds, SPOTIFY_BATCH_SIZE);
    const batchResults = await mapWithConcurrency(
      batches,
      SPOTIFY_BATCH_PARALLELISM,
      async (batch) => fetchSpotifyTrackData(batch),
    );

    for (const resultMap of batchResults) {
      for (const [trackId, data] of resultMap) {
        const existing = trackDataById.get(trackId);
        if (existing) {
          existing.spotifyImageUrl = data.spotifyImageUrl;
        } else {
          trackDataById.set(trackId, data);
        }
      }
    }
  }

  return trackDataById;
}

async function searchSpotifyTrackId(artist: string, title: string) {
  const query = `artist:${artist} track:${title}`;
  const params = new URLSearchParams({ q: query, type: "track", limit: "1" });
  const response = await spotifyRequest(
    `${SPOTIFY_SEARCH_API}?${params.toString()}`,
  );
  const data = (await response.json()) as SpotifySearchResponse;

  const item = data.tracks?.items?.[0];
  return item?.id;
}

async function fetchSpotifyTrackData(trackIds: string[]) {
  const out = new Map<
    string,
    { durationSec: number; spotifyImageUrl?: string }
  >();
  if (trackIds.length === 0) return out;

  const params = new URLSearchParams({ ids: trackIds.join(",") });
  const response = await spotifyRequest(
    `${SPOTIFY_TRACKS_API}?${params.toString()}`,
  );
  const data = (await response.json()) as SpotifyTracksResponse;
  const tracks = data.tracks ?? [];

  for (const track of tracks) {
    if (!track?.id || !track.duration_ms) continue;
    const durationSec = Math.max(1, Math.round(track.duration_ms / 1000));

    const imageUrl = track.album?.images?.[0]?.url;

    out.set(track.id, { durationSec, spotifyImageUrl: imageUrl });

    await connection.set(
      durationRedisKey(track.id),
      String(durationSec),
      "EX",
      SPOTIFY_DURATION_CACHE_TTL_SEC,
    );

    if (imageUrl) {
      await connection.set(
        imageUrlRedisKey(track.id),
        imageUrl,
        "EX",
        SPOTIFY_DURATION_CACHE_TTL_SEC,
      );
    }
  }

  return out;
}

async function spotifyRequest(
  url: string,
  retryOnAuthFailure = true,
): Promise<Response> {
  while (true) {
    const token = await getSpotifyAccessToken();
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (response.status === 429) {
      const retryAfterHeader = response.headers.get("retry-after");
      const retryAfterSeconds = retryAfterHeader
        ? Number.parseInt(retryAfterHeader, 10)
        : Number.NaN;
      const waitMs =
        Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0
          ? retryAfterSeconds * 1000
          : 30_000;

      console.warn(
        `Spotify rate limited for ${url}; retrying in ${Math.round(waitMs / 1000)}s`,
      );
      await sleep(waitMs);
      continue;
    }

    if (response.status === 401 && retryOnAuthFailure) {
      spotifyTokenState = null;
      continue;
    }

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Spotify API error: ${response.status} ${body}`);
    }

    return response;
  }
}

async function getSpotifyAccessToken() {
  if (!SPOTIFY_CLIENT_ID || !SPOTIFY_CLIENT_SECRET) {
    throw new Error("SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET are required");
  }

  const now = Date.now();
  if (spotifyTokenState && now < spotifyTokenState.expiresAtMs - 60_000) {
    return spotifyTokenState.accessToken;
  }

  const basic = Buffer.from(
    `${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`,
  ).toString("base64");
  const response = await fetch(SPOTIFY_ACCOUNTS_API, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ grant_type: "client_credentials" }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Spotify token error: ${response.status} ${body}`);
  }

  const tokenData = (await response.json()) as {
    access_token?: string;
    token_type?: string;
    expires_in?: number;
  };

  const accessToken = tokenData.access_token;
  const expiresIn = tokenData.expires_in;
  if (!accessToken || !expiresIn) {
    throw new Error(
      "Spotify token response missing access_token or expires_in",
    );
  }

  spotifyTokenState = {
    accessToken,
    expiresAtMs: now + expiresIn * 1000,
  };

  console.log(`Spotify token refreshed (expires_in=${expiresIn}s)`);

  return accessToken;
}

async function syncRecentScrobblesForUser(userId: string, username: string) {
  const to = Math.floor(Date.now() / 1000);
  const from = to - AUTO_SYNC_LOOKBACK_SEC;

  const first = await fetchPage(username, 1, PAGE_SIZE, from, to);
  const attr = first.recenttracks?.["@attr"];
  const totalTracks = parseInt(attr?.total ?? "0", 10);
  const totalPagesFromApi = parseInt(attr?.totalPages ?? "1", 10);
  const total = Number.isFinite(totalPagesFromApi)
    ? totalPagesFromApi
    : Math.max(1, Math.ceil(totalTracks / PAGE_SIZE));

  let imported = 0;
  for (let page = 1; page <= total; page++) {
    const data =
      page === 1 ? first : await fetchPage(username, page, PAGE_SIZE, from, to);
    const rawTracks = data.recenttracks.track;
    const tracksArray = Array.isArray(rawTracks) ? rawTracks : [rawTracks];

    const scrobbles = tracksArray
      .filter((t: any) => t && !t["@attr"]?.nowplaying && t.date?.uts)
      .map(
        (t: any): PendingScrobble => ({
          userId,
          artist: t.artist["#text"] || t.artist?.name || "",
          track: t.name || "",
          album: t.album?.["#text"] || null,
          playedAt: new Date(parseInt(t.date.uts, 10) * 1000),
        }),
      );

    if (scrobbles.length > 0) {
      await enrichScrobbleDurations(scrobbles, username);

      const chunkSize = 50;
      for (let i = 0; i < scrobbles.length; i += chunkSize) {
        const chunk = scrobbles.slice(i, i + chunkSize);
        await prisma.$transaction(
          chunk.flatMap((s) => [
            prisma.scrobble.deleteMany({
              where: {
                userId: s.userId,
                playedAt: s.playedAt,
              },
            }),
            prisma.scrobble.create({ data: s }),
          ]),
        );
      }
    }

    imported += scrobbles.length;
  }

  console.log(
    `[${username}] Auto-sync imported ${imported} scrobbles from the last hour`,
  );
}

async function runAutoSyncCycle() {
  if (autoSyncRunning) {
    return;
  }

  autoSyncRunning = true;
  try {
    const jobs = await prisma.importJob.findMany({
      where: {
        username: {
          not: "",
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      select: {
        userId: true,
        username: true,
      },
    });

    const targets: Array<{ userId: string; username: string }> = [];
    const seenUserIds = new Set<string>();
    for (const job of jobs) {
      if (seenUserIds.has(job.userId)) continue;
      seenUserIds.add(job.userId);
      targets.push({ userId: job.userId, username: job.username });
    }

    if (targets.length === 0) {
      return;
    }

    console.log(`[auto-sync] Starting cycle for ${targets.length} users`);

    for (const target of targets) {
      try {
        await syncRecentScrobblesForUser(target.userId, target.username);
      } catch (error: any) {
        console.warn(
          `[${target.username}] Auto-sync failed: ${error?.message ?? String(error)}`,
        );
      }
    }

    console.log("[auto-sync] Cycle complete");
  } finally {
    autoSyncRunning = false;
  }
}

setInterval(() => {
  void runAutoSyncCycle();
}, AUTO_SYNC_INTERVAL_MS);

void runAutoSyncCycle();

console.log("Worker started");
