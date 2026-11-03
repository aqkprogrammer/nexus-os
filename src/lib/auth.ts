import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { APIError } from "better-auth/api";
import { prisma } from "./db";

const allowedEmails = (process.env.ALLOWED_EMAILS ?? "")
  .split(",")
  .map((entry) => entry.trim().toLowerCase())
  .filter(Boolean);

/** Each entry is an address, or "@domain.com" for everyone there. An empty list closes sign-up. */
function canSignUp(email: string) {
  const address = email.toLowerCase();
  return allowedEmails.some((entry) => (entry.startsWith("@") ? address.endsWith(entry) : address === entry));
}

export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  emailAndPassword: { enabled: true },
  // Stored in the database so the limits hold across server instances.
  rateLimit: { enabled: true, storage: "database" },
  databaseHooks: {
    user: {
      create: {
        before: async (user) => {
          if (!canSignUp(user.email)) throw new APIError("FORBIDDEN", { message: "This email isn't invited to NEXUS OS yet." });
        },
      },
    },
  },
});

export async function currentUser(req: Request) {
  const session = await auth.api.getSession({ headers: req.headers });
  return session?.user ?? null;
}
