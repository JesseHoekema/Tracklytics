import { Queue } from "bullmq";
import { connection } from "./redis";

export const importQueue = new Queue("lastfm-import", { connection });
