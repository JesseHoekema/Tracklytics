import { json, error } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { prisma } from "$lib/prisma";
import { importQueue } from "$lib/server/queue";

export const POST: RequestHandler = async ({ locals, request }) => {
  if (!locals.user) throw error(401, "Unauthorized");

  const { username, range, from, to } = await request.json();
  if (!username) throw error(400, "Last.fm username required");

  const existing = await prisma.importJob.findFirst({
    where: {
      userId: locals.user.id,
      status: { in: ["queued", "running"] },
    },
  });

  if (existing) {
    const bullJob = await importQueue.getJob(existing.id);
    if (bullJob) await bullJob.remove();
    await prisma.importJob.update({
      where: { id: existing.id },
      data: { status: "cancelled" },
    });
  }

  const job = await prisma.importJob.create({
    data: {
      userId: locals.user.id,
      username,
      range: range ?? "all",
      status: "queued",
    },
  });

  await importQueue.add(
    "import",
    { jobId: job.id, userId: locals.user.id, username, from, to },
    { jobId: job.id },
  );

  return json({ jobId: job.id });
};
