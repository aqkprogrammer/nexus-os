import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { APIError } from "better-auth/api";
import { prisma } from "./db";
import { emailConfigured, sendEmail } from "./email";

const allowedEmails = (process.env.ALLOWED_EMAILS ?? "")
  .split(",")
  .map((entry) => entry.trim().toLowerCase())
  .filter(Boolean);

/** Each entry is an address, or "@domain.com" for everyone there. An empty list closes sign-up. */
function canSignUp(email: string) {
  const address = email.toLowerCase();
  return allowedEmails.some((entry) => (entry.startsWith("@") ? address.endsWith(entry) : address === entry));
}

/** Whether a shared space invitation is waiting for this email, which lets it create an account. */
async function hasPendingInvite(email: string) {
  return !!(await prisma.spaceInvite.findFirst({ where: { email: email.toLowerCase(), acceptedAt: null, expiresAt: { gt: new Date() } }, select: { id: true } }));
}

function ipHeaders() {
  if (process.env.AUTH_IP_HEADER) return process.env.AUTH_IP_HEADER.split(",").map((h) => h.trim().toLowerCase());
  return process.env.VERCEL ? ["x-vercel-forwarded-for"] : ["x-forwarded-for"];
}

export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  emailAndPassword: {
    enabled: true,
    revokeSessionsOnPasswordReset: true,
    // Without email set up, Better Auth refuses reset requests and the page explains why.
    sendResetPassword: emailConfigured()
      ? async ({ user, url }) =>
          sendEmail({
            to: user.email,
            subject: "Reset your NEXUS OS password",
            body: `Hi ${user.name},\n\nSomeone asked to reset the password for this account. If it was you, choose a new password below. The link works for one hour.\n\nIf it wasn't you, you can ignore this email.`,
            action: { label: "Choose a new password", url },
          })
      : undefined,
  },
  emailVerification: {
    sendOnSignUp: emailConfigured(),
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url }) =>
      sendEmail({
        to: user.email,
        subject: "Confirm your email for NEXUS OS",
        body: `Hi ${user.name},\n\nConfirm this is your email so you can reset your password and get summaries.`,
        action: { label: "Confirm my email", url },
      }),
  },
  user: {
    // Emails aren't verified until an email service is connected, so a change applies straight away.
    changeEmail: { enabled: true, updateEmailWithoutVerification: true },
    deleteUser: { enabled: true },
  },
  // Google is connected from Automation Hub, which links it to the account already signed in.
  socialProviders:
    process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? { google: { clientId: process.env.GOOGLE_CLIENT_ID, clientSecret: process.env.GOOGLE_CLIENT_SECRET, accessType: "offline", prompt: "consent" } }
      : undefined,
  account: { accountLinking: { enabled: true, trustedProviders: ["google"], allowDifferentEmails: true } },
  // Stored in the database so the limits hold across server instances.
  rateLimit: { enabled: true, storage: "database" },
  // The sign-in limit is per visitor, so it must use an address the visitor can't fake. Vercel sets its own header,
  // and behind another proxy AUTH_IP_HEADER names the one that proxy sets.
  advanced: { ipAddress: { ipAddressHeaders: ipHeaders() } },
  databaseHooks: {
    user: {
      create: {
        before: async (user) => {
          // An invitation to a shared space counts as an invitation to NEXUS OS.
          if (!canSignUp(user.email) && !(await hasPendingInvite(user.email))) throw new APIError("FORBIDDEN", { message: "This email isn't invited to NEXUS OS yet." });
        },
      },
    },
  },
});

export async function currentUser(req: Request) {
  const session = await auth.api.getSession({ headers: req.headers });
  return session?.user ?? null;
}
