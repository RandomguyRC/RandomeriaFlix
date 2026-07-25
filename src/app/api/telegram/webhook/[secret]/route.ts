import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  getAdminTelegramChatId,
  getTelegramChatMode,
  setTelegramChatMode,
  sendTelegramMessage,
  notifyNewMessage,
} from "@/lib/notify";

// POST /api/telegram/webhook/<TELEGRAM_WEBHOOK_SECRET>
// Telegram calls this for every update sent to the bot. Secured by the
// secret path segment (set via setWebhook) plus a check that the message
// is coming from the exact chat ID configured as the admin's — anyone else
// messaging the bot is silently ignored.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ secret: string }> }
) {
  const { secret } = await params;

  // Always respond 200 to Telegram even on rejection, so it doesn't retry —
  // but do nothing if the secret is wrong.
  if (!process.env.TELEGRAM_WEBHOOK_SECRET || secret !== process.env.TELEGRAM_WEBHOOK_SECRET) {
    return NextResponse.json({ ok: true });
  }

  const update = await request.json().catch(() => null);
  const message = update?.message;
  const text: string | undefined = message?.text;
  const chatId = message?.chat?.id != null ? String(message.chat.id) : null;

  if (!message || !text || !chatId) {
    // Non-text update (sticker, photo, edited_message, etc.) — ignore.
    return NextResponse.json({ ok: true });
  }

  const adminChatId = await getAdminTelegramChatId();
  if (!adminChatId || chatId !== adminChatId) {
    // Not the configured admin — never let a stranger post as admin.
    return NextResponse.json({ ok: true });
  }

  const trimmed = text.trim();

  if (trimmed === "/start") {
    await sendTelegramMessage(
      chatId,
      "Hey! I'll ping you here when Cherry messages you.\n\nSend /chat to switch into live chat mode — anything you type after that gets sent straight to them, just like texting. Send /stop to go back to normal notifications."
    );
    return NextResponse.json({ ok: true });
  }

  if (trimmed === "/chat") {
    await setTelegramChatMode(true);
    await sendTelegramMessage(
      chatId,
      "Chat mode ON. Type anything and it'll be sent to Cherry right away. Send /stop to exit."
    );
    return NextResponse.json({ ok: true });
  }

  if (trimmed === "/stop") {
    await setTelegramChatMode(false);
    await sendTelegramMessage(chatId, "Chat mode OFF. Back to normal notifications.");
    return NextResponse.json({ ok: true });
  }

  if (trimmed === "/status") {
    const on = await getTelegramChatMode();
    await sendTelegramMessage(chatId, `Chat mode is currently ${on ? "ON" : "OFF"}.`);
    return NextResponse.json({ ok: true });
  }

  // Not a recognized command — treat as a message only if chat mode is on.
  const chatModeOn = await getTelegramChatMode();
  if (!chatModeOn) {
    await sendTelegramMessage(chatId, "Send /chat first to reply from here.");
    return NextResponse.json({ ok: true });
  }

  if (trimmed.length === 0 || trimmed.length > 4000) {
    return NextResponse.json({ ok: true });
  }

  await prisma.liveChatMessage.create({
    data: { sender: "admin", content: trimmed },
  });

  // Let the viewer's own notification prefs (Telegram/email) fire as usual.
  notifyNewMessage("admin", trimmed).catch(() => {});

  return NextResponse.json({ ok: true });
}
