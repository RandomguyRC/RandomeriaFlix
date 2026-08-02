import webpush from "web-push";
import { prisma } from "@/lib/db";

type Role = "admin" | "viewer";

const SETTING_KEY = "pushSubscriptions";

export interface PushSubscriptionJSON {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

type SubscriptionsByRole = Partial<Record<Role, PushSubscriptionJSON[]>>;

let vapidConfigured = false;

function ensureVapid(): boolean {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || "mailto:admin@example.com";

  if (!publicKey || !privateKey) return false;

  if (!vapidConfigured) {
    webpush.setVapidDetails(subject, publicKey, privateKey);
    vapidConfigured = true;
  }
  return true;
}

export function getVapidPublicKey(): string | null {
  return process.env.VAPID_PUBLIC_KEY || null;
}

export function isPushConfigured(): boolean {
  return Boolean(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
}

async function readAll(): Promise<SubscriptionsByRole> {
  const row = await prisma.siteSetting.findUnique({ where: { key: SETTING_KEY } });
  if (!row) return {};
  try {
    return JSON.parse(row.value) as SubscriptionsByRole;
  } catch {
    return {};
  }
}

async function writeAll(data: SubscriptionsByRole) {
  const value = JSON.stringify(data);
  await prisma.siteSetting.upsert({
    where: { key: SETTING_KEY },
    update: { value },
    create: { key: SETTING_KEY, value },
  });
}

export async function saveSubscription(role: Role, subscription: PushSubscriptionJSON) {
  const all = await readAll();
  const existing = all[role] || [];
  const deduped = existing.filter((s) => s.endpoint !== subscription.endpoint);
  all[role] = [...deduped, subscription];
  await writeAll(all);
}

export async function removeSubscription(role: Role, endpoint: string) {
  const all = await readAll();
  all[role] = (all[role] || []).filter((s) => s.endpoint !== endpoint);
  await writeAll(all);
}

export async function hasSubscription(role: Role): Promise<boolean> {
  const all = await readAll();
  return Boolean((all[role] || []).length);
}

/**
 * Fire-and-forget push send to every device subscribed under a role.
 * Never throws — mirrors notifyNewMessage()'s "must not break the chat" rule.
 * Silently no-ops if VAPID keys aren't configured yet.
 */
export async function sendPushToRole(
  role: Role,
  payload: { title: string; body: string; url?: string; tag?: string }
) {
  if (!ensureVapid()) return;

  try {
    const all = await readAll();
    const subs = all[role] || [];
    if (subs.length === 0) return;

    const body = JSON.stringify({
      title: payload.title,
      body: payload.body,
      url: payload.url || "/",
      tag: payload.tag,
      icon: "/icons/icon-192.png",
    });

    const results = await Promise.allSettled(
      subs.map((sub) =>
        webpush.sendNotification(
          { endpoint: sub.endpoint, keys: sub.keys } as webpush.PushSubscription,
          body
        )
      )
    );

    // Prune subscriptions that are no longer valid (expired/unsubscribed on device)
    const stillValid: PushSubscriptionJSON[] = [];
    results.forEach((result, i) => {
      const isGone =
        result.status === "rejected" &&
        ((result.reason as { statusCode?: number })?.statusCode === 404 ||
          (result.reason as { statusCode?: number })?.statusCode === 410);
      if (!isGone) stillValid.push(subs[i]);
    });

    if (stillValid.length !== subs.length) {
      const all2 = await readAll();
      all2[role] = stillValid;
      await writeAll(all2);
    }
  } catch (err) {
    console.error("[push] sendPushToRole error:", err);
  }
}
