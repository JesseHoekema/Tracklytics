import { redirect } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import {
  getArtistListenCountsForUser,
  getSongListenCountsForUser,
  getTotalListeningTimeForUser,
  type TimeSlot,
} from "$lib/listentime";

type RangeParam = "today" | "yesterday" | "7days" | "30days" | "all";

function toTimeSlot(range: string | null): {
  range: RangeParam;
  slot: TimeSlot;
} {
  if (range === "today") return { range: "today", slot: "today" };
  if (range === "yesterday") return { range: "yesterday", slot: "yesterday" };
  if (range === "30days") return { range: "30days", slot: "last 30 days" };
  if (range === "all") return { range: "all", slot: "all time" };
  return { range: "7days", slot: "last 7 days" };
}

export const load: PageServerLoad = async ({ locals, url }) => {
  if (!locals.user) {
    throw redirect(302, "/sign-in");
  }

  const { range, slot } = toTimeSlot(url.searchParams.get("range"));
  const [totalListeningTime, topArtists, topSongs] = await Promise.all([
    getTotalListeningTimeForUser(locals.user.id, slot),
    getArtistListenCountsForUser(locals.user.id, slot, 10),
    getSongListenCountsForUser(locals.user.id, slot, 10),
  ]);

  return {
    selectedRange: range,
    totalListeningTime,
    topArtists: topArtists.artists,
    topSongs: topSongs.songs,
  };
};
