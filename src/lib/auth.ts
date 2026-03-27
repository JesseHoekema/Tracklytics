import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "./prisma";
import { env } from "$env/dynamic/private";

export const auth = betterAuth({
  secret: env.BETTER_AUTH_SECRET!,
  baseURL: env.BETTER_AUTH_URL!,

  database: prismaAdapter(prisma, {
    provider: "mysql",
  }),

  emailAndPassword: {
    enabled: true,
  },

  session: {
    expiresIn: 60 * 60 * 24 * 7,
  },
});
