import type { PageServerLoad } from "./$types";
import { prisma } from "$lib/prisma";

export const load: PageServerLoad = async ({ locals }) => {
  if (!locals.user) return { job: null };

  const job = await prisma.importJob.findFirst({
    where: { userId: locals.user.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      username: true,
      range: true,
      status: true,
      progress: true,
      total: true,
      error: true,
      createdAt: true,
    },
  });

  return { job };
};
