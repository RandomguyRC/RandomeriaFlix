import { prisma } from "@/lib/db";
import nodemailer from "nodemailer";

type Role = "admin" | "viewer";

const PREVIEW_LEN = 200;

// ---- settings helpers -------------------------------------------------

async function getSettings(keys: string[]) {
  const rows = await prisma.siteSetting.findMany({ where: { key: { in: keys } } });
  const map: Record<string, string> = {};
  rows.forEach((r) => (map[r.key] = r.value));
  return map;
}

// ---- telegram -----------------------------------------------------------

async function sendTelegramMessage(chatId: string, text: string) {
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

    const senderLabel = senderRole === "admin" ? "Admin" : "Your viewer";
    const preview = content.length > PREVIEW_LEN ? content.slice(0, PREVIEW_LEN) + "…" : content;
    const appName = process.env.APP_NAME || "RandomeriaFlix";

    const tasks: Promise<void>[] = [];
    if (chatId) {
      tasks.push(
        sendTelegramMessage(
          chatId,
          `💬 New message on ${appName}\nFrom: ${senderLabel}\n\n"${preview}"`
        )
      );
    }
    if (email) {
      tasks.push(
        sendEmail(
          email,
          `New message on ${appName}`,
          `${senderLabel} sent you a new message:\n\n"${preview}"\n\nOpen ${appName} to reply.`
        )
      );
    }

    await Promise.allSettled(tasks);
  } catch (err) {
    // Belt and braces — getSettings() etc. could theoretically throw.
    console.error("[notify] notifyNewMessage error:", err);
  }
}
