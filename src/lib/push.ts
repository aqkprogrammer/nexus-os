import webpush from "web-push";
import { prisma } from "./db";

export interface PushMessage {
  title: string;
  body: string;
  url: string;
}

export const pushConfigured = () => Boolean(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);

/** Sends to every device the user turned push on for, except `skip`, and forgets devices that have gone away. */
export async function sendPush(userId: string, message: PushMessage, skip?: string) {
  if (!pushConfigured()) return 0;
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || "mailto:admin@example.com", process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!, process.env.VAPID_PRIVATE_KEY!);

  const devices = await prisma.pushDevice.findMany({ where: { userId, endpoint: skip ? { not: skip } : undefined } });
  const payload = JSON.stringify(message);
  // web-push encrypts and signs the message. Sending it with fetch keeps one code path for every push service.
  const statuses = await Promise.all(
    devices.map(async (d) => {
      const request = webpush.generateRequestDetails({ endpoint: d.endpoint, keys: { p256dh: d.p256dh, auth: d.auth } }, payload, { TTL: 3600 });
      try {
        const res = await fetch(request.endpoint, { method: request.method, headers: request.headers, body: request.body ? new Uint8Array(request.body) : undefined });
        return res.status;
      } catch {
        return 0;
      }
    }),
  );

  const gone = devices.filter((_, i) => statuses[i] === 404 || statuses[i] === 410);
  if (gone.length) await prisma.pushDevice.deleteMany({ where: { id: { in: gone.map((d) => d.id) } } });
  return statuses.filter((status) => status >= 200 && status < 300).length;
}
