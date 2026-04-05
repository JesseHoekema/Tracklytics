import { json, error } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { prisma } from "$lib/prisma";
import { importQueue } from "$lib/server/queue";

export const GET: RequestHandler = async ({ locals, params }) => {
  if (!locals.user) throw error(401, "Unauthorized");

  const job = await prisma.importJob.findFirst({
    where: { id: params.jobId, userId: locals.user.id },
  });

  if (!job) throw error(404, "Job not found");

  return json(job);
};

// Stop but keep data
export const DELETE: RequestHandler = async ({ locals, params }) => {
  if (!locals.user) throw error(401, "Unauthorized");

  const job = await prisma.importJob.findFirst({
    where: { id: params.jobId, userId: locals.user.id },
  });

  if (!job) throw error(404, "Job not found");

  try {
    const bullJob = await importQueue.getJob(params.jobId);
    if (bullJob) await bullJob.remove();
  } catch {
    // locked by worker, will stop on next iteration via DB status check
  }

  await prisma.importJob.updateMany({
    where: { id: params.jobId, userId: locals.user.id },
    data: { status: "cancelled" },
  });

  return json({ ok: true });
};

// Stop and delete all data
export const PATCH: RequestHandler = async ({ locals, params }) => {
  if (!locals.user) throw error(401, "Unauthorized");

  const job = await prisma.importJob.findFirst({
    where: { id: params.jobId, userId: locals.user.id },
  });

  if (!job) throw error(404, "Job not found");

  try {
    const bullJob = await importQueue.getJob(params.jobId);
    if (bullJob) await bullJob.remove();
  } catch {
    // locked by worker, will stop on next iteration
  }

  // Use updateMany to avoid optimistic concurrency conflicts —
  // it does not read-then-write, just fires a raw UPDATE
  await prisma.importJob.updateMany({
    where: { id: params.jobId, userId: locals.user.id },
    data: { status: "cancelled" },
  });

  // Delete scrobbles separately
  await prisma.scrobble.deleteMany({
    where: { userId: locals.user.id },
  });

  // Delete the job record last
  await prisma.importJob.deleteMany({
    where: { id: params.jobId, userId: locals.user.id },
  });

  return json({ ok: true });
};
