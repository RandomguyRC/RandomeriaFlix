import { prisma } from "@/lib/db";
import nodemailer from "nodemailer";

type Role = "admin" | "viewer";

const PREVIEW_LEN = 200;
const CHAT_MODE_KEY = "telegramAdminChatMode";

// ---- settings helpers -------------------------------------------------

async function getSettings(keys: string[]) {
  const rows = await prisma.siteSetting.findMany({ where: { key: { in: keys } } });
  const map: Record<string, string> = {};
  rows.forEach((r) => (map[r.key] = r.value));
  return map;
}

export async function getAdminTelegramChatId(): Promise<string | null> {
  const settings = await getSettings(["notifyAdminTelegramChatId"]);
  return settings.notifyAdminTelegramChatId?.trim() || null;
}

/** Whether the admin has toggled "chat mode" on via /chat in Telegram —
 * while on, their Telegram bot DM is treated as a live two-way chat client
 * instead of a one-way notification feed. */
export async function getTelegramChatMode(): Promise<boolean> {
  const settings = await getSettings([CHAT_MODE_KEY]);
  return settings[CHAT_MODE_KEY] === "on";
}

export async function setTelegramChatMode(on: boolean) {
  await prisma.siteSetting.upsert({
    where: { key: CHAT_MODE_KEY },
    update: { value: on ? "on" : "off" },
    create: { key: CHAT_MODE_KEY, value: on ? "on" : "off" },
  });
}

// ---- telegram -----------------------------------------------------------

export async function sendTelegramMessage(chatId: string, text: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token || !chatId) return;

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error("[notify] Telegram send failed:", res.status, body);
    }
  } catch (err) {
    console.error("[notify] Telegram send error:", err);
  }
}

// ---- email (SMTP via nodemailer) ----------------------------------------

let transporter: ReturnType<typeof nodemailer.createTransport> | null | undefined;

function getTransporter() {
  if (transporter !== undefined) return transporter;

  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    transporter = null;
    return transporter;
  }

  const port = Number(SMTP_PORT) || 587;
  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port,
    secure: port === 465, // true for 465 (implicit TLS), false for 587/25 (STARTTLS)
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
  return transporter;
}

async function sendEmail(to: string, subject: string, text: string) {
  const t = getTransporter();
  if (!t || !to) return;

  try {
    await t.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to,
      subject,
      text,
    });
  } catch (err) {
    console.error("[notify] Email send error:", err);
  }
}

// ---- public entry point --------------------------------------------------

/**
 * Fire-and-forget notification dispatch for a new live chat message.
 * Reads the recipient's (the *other* role's) notification prefs from
 * SiteSetting and pings Telegram/email if configured + enabled.
 * Never throws — a notification failure must never break the chat itself.
 */
export async function notifyNewMessage(senderRole: Role, content: string) {
  try {
    const recipientRole: Role = senderRole === "admin" ? "viewer" : "admin";
    const prefix = recipientRole === "admin" ? "notifyAdmin" : "notifyViewer";

    const keys = [`${prefix}Enabled`, `${prefix}TelegramChatId`, `${prefix}Email`];
    const settings = await getSettings(keys);

    const enabled = settings[`${prefix}Enabled`] === "true";
    if (!enabled) return;

    const chatId = settings[`${prefix}TelegramChatId`]?.trim();
    const email = settings[`${prefix}Email`]?.trim();
    if (!chatId && !email) return;

    const senderLabel = senderRole === "admin" ? "Random" : "Cherry";
    const preview = content.length > PREVIEW_LEN ? content.slice(0, PREVIEW_LEN) + "…" : content;
    const appName = process.env.APP_NAME || "RandomeriaFlix";

    const tasks: Promise<void>[] = [];

    if (chatId) {
      // When the recipient is the admin AND they've flipped on "chat mode"
      // via the bot (/chat), send the message as-is — no wrapper text — so
      // it reads exactly like a normal Telegram DM from the viewer, not a
      // notification. Everyone else (or admin with chat mode off) gets the
      // original labeled notification format.
      const useRawPassthrough = recipientRole === "admin" && (await getTelegramChatMode());
      const telegramText = useRawPassthrough
        ? content
        : `💬 You have notification from "${senderLabel}" on ${appName}\n\n"${preview}"`;
      tasks.push(sendTelegramMessage(chatId, telegramText));
    }

    if (email) {
      tasks.push(
        sendEmail(
          email,
          `New message on ${appName}`,
          `You have notification from "${senderLabel}".\n\n"${preview}"\n\nOpen ${appName} to reply.`
        )
      );
    }

    await Promise.allSettled(tasks);
  } catch (err) {
    // Belt and braces — getSettings() etc. could theoretically throw.
    console.error("[notify] notifyNewMessage error:", err);
  }
}
