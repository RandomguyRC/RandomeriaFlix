import { NextRequest, NextResponse } from "next/server";
import { readSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 200;

const MESSAGE_INCLUDE = {
  attachments: {
    include: { asset: true },
    orderBy: { id: "asc" as const },
  },
};

type RawMessage = Awaited<ReturnType<typeof prisma.chatMessage.findMany<{ include: typeof MESSAGE_INCLUDE }>>>[number];

function serializeMessage(msg: RawMessage) {
  return {
    id: msg.id,
    sortOrder: msg.sortOrder,
    dateLabel: msg.dateLabel,
    sender: msg.rawSender || "System",
    senderType: msg.systemEvent ? "system" : msg.isMine ? "random" : "cherry",
    text: msg.body || "",
    attachments: msg.attachments.map((attachment) => ({
      id: attachment.id,
      kind: attachment.asset?.kind || attachment.kind,
      originalRef: attachment.originalRef,
      assetId: attachment.assetId,
      url: attachment.assetId ? `/api/media/${attachment.assetId}` : null,
      downloadUrl: attachment.assetId ? `/api/media/${attachment.assetId}` : null,
      mimeType: attachment.asset?.mimeType || null,
      originalName: attachment.asset?.originalName || attachment.originalRef || "Attachment",
      sizeBytes: attachment.asset?.sizeBytes || null,
    })),
  };
}

export async function GET(request: NextRequest) {
  const session = await readSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const profileSlug = searchParams.get("profileSlug");

  if (!profileSlug) {
    return NextResponse.json({ error: "profileSlug required" }, { status: 400 });
  }

  const profile = await prisma.profile.findUnique({
    where: { slug: profileSlug },
  });

  if (!profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  const chatImport = await prisma.chatImport.findFirst({
    where: { profileId: profile.id },
    orderBy: { createdAt: "desc" },
  });

  if (!chatImport) {
    return NextResponse.json({ error: "No chat import found" }, { status: 404 });
  }

  const limit = Math.min(parseInt(searchParams.get("limit") || String(DEFAULT_LIMIT), 10) || DEFAULT_LIMIT, MAX_LIMIT);
  const beforeSortOrderParam = searchParams.get("beforeSortOrder");
  const afterSortOrderParam = searchParams.get("afterSortOrder");
  const aroundSortOrderParam = searchParams.get("aroundSortOrder");
  // Only the initial page-mount fetch passes this — it opts in to landing on
  // the admin-configured "start date" instead of the most recent messages.
  // loadOlder/loadNewer/scrollToLatest/jump-to-message never send it, so
  // they're unaffected.
  const useConfiguredStart = searchParams.get("useConfiguredStart") === "1";

  const totalCount = await prisma.chatMessage.count({
    where: { importId: chatImport.id },
  });

  let aroundTarget: number | null = aroundSortOrderParam !== null ? parseInt(aroundSortOrderParam, 10) : null;
  let startAligned = false;

  if (
    aroundTarget === null &&
    useConfiguredStart &&
    beforeSortOrderParam === null &&
    afterSortOrderParam === null
  ) {
    const startSetting = await prisma.siteSetting.findUnique({ where: { key: "chatStartDate" } });
    if (startSetting?.value) {
      // Parsed as local midnight to line up with how the WhatsApp parser
      // builds message timestamps (also local `new Date(y, m, d, h, min)`).
      const startDate = new Date(`${startSetting.value}T00:00:00`);
      if (!isNaN(startDate.getTime())) {
        const firstOnOrAfter = await prisma.chatMessage.findFirst({
          where: { importId: chatImport.id, timestamp: { gte: startDate } },
          orderBy: { sortOrder: "asc" },
          select: { sortOrder: true },
        });
        // If every message predates the configured start date, fall back to
        // the normal "show the latest messages" behavior below.
        if (firstOnOrAfter) {
          aroundTarget = firstOnOrAfter.sortOrder;
          startAligned = true;
        }
      }
    }
  }

  let messages: RawMessage[];

  if (aroundTarget !== null) {
    // "Jump to message" path — used by calendar date-jumps, search
    // navigation, and (via useConfiguredStart above) the admin-configured
    // start date, whenever the target message isn't in the currently loaded
    // window. Fetch a window CENTERED on the target sortOrder so the target
    // lands roughly in the middle of the page once rendered; the client
    // decides how to align its initial scroll position from there.
    const target = aroundTarget;
    const half = Math.floor(limit / 2);

    const olderMessages = await prisma.chatMessage.findMany({
      where: { importId: chatImport.id, sortOrder: { lt: target } },
      orderBy: { sortOrder: "desc" },
      take: half,
      include: MESSAGE_INCLUDE,
    });

    // Fill the rest of the page with newer messages (including the target
    // itself), topping up if there weren't enough older messages (e.g. the
    // target is near the very start of the chat).
    const newerTake = limit - olderMessages.length;
    const newerMessages = await prisma.chatMessage.findMany({
      where: { importId: chatImport.id, sortOrder: { gte: target } },
      orderBy: { sortOrder: "asc" },
      take: newerTake,
      include: MESSAGE_INCLUDE,
    });

    messages = [...olderMessages.reverse(), ...newerMessages];
  } else {
    const where = {
      importId: chatImport.id,
      ...(beforeSortOrderParam ? { sortOrder: { lt: parseInt(beforeSortOrderParam, 10) } } : {}),
      ...(afterSortOrderParam ? { sortOrder: { gt: parseInt(afterSortOrderParam, 10) } } : {}),
    };

    const descendingMessages = await prisma.chatMessage.findMany({
      where,
      orderBy: { sortOrder: "desc" },
      take: limit,
      include: MESSAGE_INCLUDE,
    });

    messages = descendingMessages.reverse();
  }

  const oldestSortOrder = messages[0]?.sortOrder ?? null;
  const newestSortOrder = messages[messages.length - 1]?.sortOrder ?? null;

  const [olderCount, newerCount, bgSetting, bgYSetting] = await Promise.all([
    oldestSortOrder === null ? 0 : prisma.chatMessage.count({ where: { importId: chatImport.id, sortOrder: { lt: oldestSortOrder } } }),
    newestSortOrder === null ? 0 : prisma.chatMessage.count({ where: { importId: chatImport.id, sortOrder: { gt: newestSortOrder } } }),
    prisma.siteSetting.findUnique({ where: { key: "chatBackground" } }),
    prisma.siteSetting.findUnique({ where: { key: "chatBackgroundY" } }),
  ]);

  return NextResponse.json({
    messages: messages.map(serializeMessage),
    importTitle: chatImport.title,
    chatBackground: bgSetting?.value || null,
    chatBackgroundY: bgYSetting?.value || "50",
    totalCount,
    startAligned,
    startSortOrder: startAligned ? aroundTarget : null,
    hasOlder: olderCount > 0,
    hasNewer: newerCount > 0,
    olderCount,
    newerCount,
    oldestSortOrder,
    newestSortOrder,
  });
}
