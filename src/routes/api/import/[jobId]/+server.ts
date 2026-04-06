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

export const DELETE: RequestHandler = async ({ locals, params }) => {
  if (!locals.user) throw error(401, "Unauthorized");

  const job = await prisma.importJob.findFirst({
    where: { id: params.jobId, userId: locals.user.id },
  });

  if (!job) throw error(404, "Job not found");

  try {
    const bullJob = await importQueue.getJob(params.jobId);
    if (bullJob) await bullJob.remove();
  } catch {}

  await prisma.importJob.updateMany({
    where: { id: params.jobId, userId: locals.user.id },
    data: { status: "cancelled" },
  });

  return json({ ok: true });
};

export const PATCH: RequestHandler = async ({ locals, params }) => {
  if (!locals.user) throw error(401, "Unauthorized");

  const job = await prisma.importJob.findFirst({
    where: { id: params.jobId, userId: locals.user.id },
  });

  if (!job) throw error(404, "Job not found");

  try {
    const bullJob = await importQueue.getJob(params.jobId);
    if (bullJob) await bullJob.remove();
  } catch {}

  await prisma.importJob.updateMany({
    where: { id: params.jobId, userId: locals.user.id },
    data: { status: "cancelled" },
  });

  await prisma.scrobble.deleteMany({
    where: { userId: locals.user.id },
  });

  await prisma.importJob.deleteMany({
    where: { id: params.jobId, userId: locals.user.id },
  });

  return json({ ok: true });
};
