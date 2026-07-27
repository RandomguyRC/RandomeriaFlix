import { NextRequest, NextResponse } from "next/server";
import { readSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { importChatFromRequest } from "@/lib/chat-import";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(request: NextRequest) {
  const session = await readSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await importChatFromRequest(request);

    return NextResponse.json({
      success: true,
      importId: result.importId,
      messageCount: result.messageCount,
      attachmentCount: result.attachmentCount,
      unmatchedAttachments: result.unmatchedAttachments,
    });
  } catch (error) {
    console.error("Chat import error:", error);
    const message = error instanceof Error ? error.message : "Import failed";
    return NextResponse.json({ error: message || "Import failed" }, { status: 500 });
  }
}

export async function GET() {
  const session = await readSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const imports = await prisma.chatImport.findMany({
    include: {
      profile: { select: { id: true, name: true } },
      _count: { select: { messages: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(imports);
}
