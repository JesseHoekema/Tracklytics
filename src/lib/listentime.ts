import { prisma } from "$lib/prisma";
import { Prisma } from "../../generated/prisma/client";

type TimeParts = {
  hours: number;
  minutes: number;
  seconds: number;
};

type TimeSlot =
  | "today"
  | "yesterday"
  | "last 7 days"
  | "last 30 days"
  | "all time";

type DateRange = {
  gte?: Date;
  lt?: Date;
};

export type TotalListeningTime = {
  timeSlot: TimeSlot;
  totalSeconds: number;
  hours: number;
  minutes: number;
  seconds: number;
};

type TopLimit = number | "all";

export type ArtistListenCount = {
  artist: string;
  playCount: number;
};

export type ArtistListenCountsResult = {
  timeSlot: TimeSlot;
  limit: TopLimit;
  artists: ArtistListenCount[];
};

export type SongListenCount = {
  song: string;
  artist: string;
  playCount: number;
};

export type SongListenCountsResult = {
  timeSlot: TimeSlot;
  limit: TopLimit;
  songs: SongListenCount[];
};

export type ListeningTimeBucket = {
  hourStart: number;
  hourEnd: number;
  label: string;
  playCount: number;
};

export type ListeningTimeBucketsResult = {
  timeSlot: TimeSlot;
  limit: TopLimit;
  buckets: ListeningTimeBucket[];
};

export function secondsToHMS(totalSeconds: number): TimeParts {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return { hours, minutes, seconds };
}

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function getDateRangeForTimeSlot(
  timeSlot: TimeSlot,
  now = new Date(),
): DateRange {
  const todayStart = startOfDay(now);

  if (timeSlot === "today") {
    return {
      gte: todayStart,
      lt: addDays(todayStart, 1),
    };
  }

  if (timeSlot === "yesterday") {
    const yesterdayStart = addDays(todayStart, -1);
    return {
      gte: yesterdayStart,
      lt: todayStart,
    };
  }

  if (timeSlot === "last 7 days") {
    return {
      gte: addDays(todayStart, -6),
      lt: addDays(todayStart, 1),
    };
  }

  if (timeSlot === "last 30 days") {
    return {
      gte: addDays(todayStart, -29),
      lt: addDays(todayStart, 1),
    };
  }

  return {};
}

export async function getTotalListeningTimeForUser(
  userId: string,
  timeSlot: TimeSlot,
): Promise<TotalListeningTime> {
  const playedAt = getDateRangeForTimeSlot(timeSlot);

  const result = await prisma.scrobble.aggregate({
    _sum: { durationSec: true },
    where: {
      userId,
      durationSec: {
        not: 21000,
      },
      ...(timeSlot === "all time" ? {} : { playedAt }),
    },
  });

  const totalSeconds = Math.max(0, result._sum.durationSec ?? 0);
  const { hours, minutes, seconds } = secondsToHMS(totalSeconds);

  return {
    timeSlot,
    totalSeconds,
    hours,
    minutes,
    seconds,
  };
}

export async function getArtistListenCountsForUser(
  userId: string,
  timeSlot: TimeSlot,
  limit: TopLimit = 10,
): Promise<ArtistListenCountsResult> {
  const playedAt = getDateRangeForTimeSlot(timeSlot);
  const normalizedLimit =
    limit === "all" ? "all" : Math.max(1, Math.floor(limit));

  const rows = await prisma.scrobble.groupBy({
    by: ["artist"],
    where: {
      userId,
      ...(timeSlot === "all time" ? {} : { playedAt }),
      artist: {
        not: "",
      },
    },
    _count: {
      _all: true,
    },
    orderBy: [{ _count: { artist: "desc" } }, { artist: "asc" }],
    ...(normalizedLimit === "all" ? {} : { take: normalizedLimit }),
  });

  return {
    timeSlot,
    limit: normalizedLimit,
    artists: rows.map((row) => ({
      artist: row.artist,
      playCount: row._count._all,
    })),
  };
}

export async function getSongListenCountsForUser(
  userId: string,
  timeSlot: TimeSlot,
  limit: TopLimit = 10,
): Promise<SongListenCountsResult> {
  const playedAt = getDateRangeForTimeSlot(timeSlot);
  const normalizedLimit =
    limit === "all" ? "all" : Math.max(1, Math.floor(limit));

  const rows = await prisma.scrobble.groupBy({
    by: ["track", "artist"],
    where: {
      userId,
      ...(timeSlot === "all time" ? {} : { playedAt }),
      track: {
        not: "",
      },
    },
    _count: {
      _all: true,
    },
    orderBy: [
      { _count: { track: "desc" } },
      { track: "asc" },
      { artist: "asc" },
    ],
    ...(normalizedLimit === "all" ? {} : { take: normalizedLimit }),
  });

  return {
    timeSlot,
    limit: normalizedLimit,
    songs: rows.map((row) => ({
      song: row.track,
      artist: row.artist,
      playCount: row._count._all,
    })),
  };
}

function toHourLabel(hourStart: number): string {
  const hourEnd = (hourStart + 1) % 24;
  const start = `${String(hourStart).padStart(2, "0")}:00`;
  const end = `${String(hourEnd).padStart(2, "0")}:00`;
  return `${start}-${end}`;
}

export async function getTopListeningTimesForUser(
  userId: string,
  timeSlot: TimeSlot,
  limit: TopLimit = 10,
): Promise<ListeningTimeBucketsResult> {
  const playedAt = getDateRangeForTimeSlot(timeSlot);
  const normalizedLimit =
    limit === "all" ? "all" : Math.max(1, Math.floor(limit));

  const whereDateSql =
    timeSlot === "all time"
      ? Prisma.empty
      : Prisma.sql`AND playedAt >= ${playedAt.gte!} AND playedAt < ${playedAt.lt!}`;

  const limitSql =
    normalizedLimit === "all"
      ? Prisma.empty
      : Prisma.sql`LIMIT ${normalizedLimit}`;

  const rows = await prisma.$queryRaw<
    Array<{ hourStart: number; playCount: bigint | number }>
  >(Prisma.sql`
    SELECT
      HOUR(playedAt) AS hourStart,
      COUNT(*) AS playCount
    FROM scrobble
    WHERE userId = ${userId}
      ${whereDateSql}
    GROUP BY HOUR(playedAt)
    ORDER BY playCount DESC, hourStart ASC
    ${limitSql}
  `);

  return {
    timeSlot,
    limit: normalizedLimit,
    buckets: rows.map((row) => {
      const hourStart = Number(row.hourStart);
      const hourEnd = (hourStart + 1) % 24;
      return {
        hourStart,
        hourEnd,
        label: toHourLabel(hourStart),
        playCount: Number(row.playCount),
      };
    }),
  };
}

export type { TimeSlot, TimeParts };

export type LeaderboardUser = {
  rank: number;
  userId: string;
  userName: string | null;
  totalSeconds: number;
  totalPlays: number;
  hours: number;
  minutes: number;
  seconds: number;
};

export type LeaderboardResult = {
  timeSlot: TimeSlot;
  users: LeaderboardUser[];
};

export async function getListeningTimeLeaderboard(
  timeSlot: TimeSlot = "last 7 days",
  limit: number = 50
): Promise<LeaderboardResult> {
  const playedAt = getDateRangeForTimeSlot(timeSlot);

  const rows = await prisma.$queryRaw<
    Array<{
      userId: string;
      userName: string | null;
      totalSeconds: bigint | number;
      totalPlays: bigint | number;
    }>
  >(Prisma.sql`
    SELECT
      s.userId,
      u.name as userName,
      SUM(s.durationSec) as totalSeconds,
      COUNT(*) as totalPlays
    FROM scrobble s
    JOIN user u ON s.userId = u.id
    WHERE 1=1
    ${timeSlot === "all time" ? Prisma.empty : Prisma.sql`AND s.playedAt >= ${playedAt.gte!} AND s.playedAt < ${playedAt.lt!}`}
    GROUP BY s.userId, u.name
    ORDER BY totalSeconds DESC
    LIMIT ${limit}
  `);

  const users: LeaderboardUser[] = rows.map((row, index) => {
    const totalSeconds = Number(row.totalSeconds);
    const { hours, minutes, seconds } = secondsToHMS(totalSeconds);

    return {
      rank: index + 1,
      userId: row.userId,
      userName: row.userName,
      totalSeconds,
      totalPlays: Number(row.totalPlays),
      hours,
      minutes,
      seconds,
    };
  });

  return { timeSlot, users };
}
