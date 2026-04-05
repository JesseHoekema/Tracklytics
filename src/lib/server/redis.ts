import Redis from "ioredis";

export const connection = new Redis(
  process.env.REDIS_URL ?? "redis://10.0.1.165:6379",
  {
    maxRetriesPerRequest: null,
    db: 1,
  },
);
