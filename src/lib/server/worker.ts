import { config } from "dotenv";
config();

import { Worker } from "bullmq";
import { connection } from "./redis";
import { prisma } from "./prisma-worker";

const LAST_FM_API = "https://ws.audioscrobbler.com/2.0";
const API_KEY = process.env.LASTFM_API_KEY!;
const PAGE_SIZE = 200;

new Worker(
  "lastfm-import",
  async (job) => {
    const { jobId, userId, username, from, to } = job.data;

    await prisma.importJob.updateMany({
      where: { id: jobId },
      data: { status: "running" },
    });

    try {
      // Use the real page size here; limit=1 would inflate totalPages.
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
        // Check for cancellation
        const current = await prisma.importJob.findUnique({
          where: { id: jobId },
        });
        if (!current || current.status === "cancelled") {
          console.log(`[${username}] Job cancelled at page ${page}`);
          return;
        }

        const data = await fetchPage(username, page, PAGE_SIZE, from, to);
        const rawTracks = data.recenttracks.track;

        // Last.fm returns an object instead of array when there's only 1 track
        const tracksArray = Array.isArray(rawTracks) ? rawTracks : [rawTracks];

        const scrobbles = tracksArray
          .filter((t: any) => t && !t["@attr"]?.nowplaying && t.date?.uts)
          .map((t: any) => ({
            userId,
            artist: t.artist["#text"] || t.artist?.name || "",
            track: t.name || "",
            album: t.album?.["#text"] || null,
            playedAt: new Date(parseInt(t.date.uts) * 1000),
          }));

        if (scrobbles.length > 0) {
          // Insert in chunks to avoid hitting MariaDB's max packet size
          const chunkSize = 50;
          for (let i = 0; i < scrobbles.length; i += chunkSize) {
            const chunk = scrobbles.slice(i, i + chunkSize);
            await prisma.$transaction(
              chunk.flatMap((s: any) => [
                // Re-import behavior: replace an existing scrobble at the same timestamp.
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

        // Be nice to Last.fm (200ms between pages)
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
  url.searchParams.set("page", String(page)); // was hardcoded to "200" before
  if (from) url.searchParams.set("from", String(from));
  if (to) url.searchParams.set("to", String(to));

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Last.fm error: ${res.status}`);

  const json = await res.json();

  console.log(
    `Fetched page ${page} for ${username}: ${json.recenttracks?.track?.length || 0} tracks`,
  );

  if (json.error) {
    throw new Error(`Last.fm API error ${json.error}: ${json.message}`);
  }

  return json;
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

console.log("Worker started");
