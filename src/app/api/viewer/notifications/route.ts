import { NextRequest, NextResponse } from "next/server";
import { readSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

// Lets whoever is currently logged in (viewer or admin) manage their own
// Telegram/email notification prefs without needing the admin panel.
// Reuses the same notifyAdmin*/notifyViewer* SiteSetting keys the admin
// settings page already writes to — just scoped to "your own" role.

const EXTRA_KEYS = ["telegramBotUsername"];

function prefixFor(role: "admin" | "viewer") {
  return role === "admin" ? "notifyAdmin" : "notifyViewer";
}

export async function GET() {
  const session = await readSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const prefix = prefixFor(session.role);
  const keys = [`${prefix}Enabled`, `${prefix}TelegramChatId`, `${prefix}Email`, ...EXTRA_KEYS];

  const rows = await prisma.siteSetting.findMany({ where: { key: { in: keys } } });
  const map: Record<string, string> = {};
  rows.forEach((r) => (map[r.key] = r.value));

  return NextResponse.json({
    enabled: map[`${prefix}Enabled`] === "true",
    telegramChatId: map[`${prefix}TelegramChatId`] || "",
    email: map[`${prefix}Email`] || "",
    telegramBotUsername: map.telegramBotUsername || "",
  });
}

export async function POST(request: NextRequest) {
  const session = await readSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const prefix = prefixFor(session.role);
  const body = await request.json().catch(() => ({}));

  const data: Record<string, string> = {};
  if ("enabled" in body) data[`${prefix}Enabled`] = String(Boolean(body.enabled));
  if ("telegramChatId" in body) data[`${prefix}TelegramChatId`] = String(body.telegramChatId ?? "").trim();
  if ("email" in body) data[`${prefix}Email`] = String(body.email ?? "").trim();

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "No changes provided" }, { status: 400 });
  }

  for (const [key, value] of Object.entries(data)) {
    await prisma.siteSetting.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });
  }

  return NextResponse.json({ message: "Notification settings saved" });
}
