import { NextRequest, NextResponse } from "next/server";
import { readSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { parseWhatsAppChat } from "@/lib/whatsapp-parser";

export async function POST(request: NextRequest) {
  const session = await readSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const profileId = formData.get("profileId") as string;
    const title = formData.get("title") as string;
    const myNames = (formData.get("myNames") as string) || "";
    const friendNames = (formData.get("friendNames") as string) || "";
    const file = formData.get("file") as File | null;

    if (!profileId || !title || !file) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Read file content
    const text = await file.text();

    // Parse the chat
    const myNamesArray = myNames.split(",").map((n) => n.trim()).filter(Boolean);
    const friendNamesArray = friendNames.split(",").map((n) => n.trim()).filter(Boolean);

    const messages = parseWhatsAppChat(text, myNamesArray, friendNamesArray);

    // Store the import
    const chatImport = await prisma.chatImport.create({
      data: {
        profileId,
        title,
        myNames,
        friendNames,
      },
    });

    // Store messages
    const messageData = messages.map((msg) => ({
      importId: chatImport.id,
      sortOrder: msg.sortOrder,
      timestamp: msg.timestamp,
      dateLabel: msg.dateLabel,
      rawSender: msg.sender,
      isMine: msg.senderType === "random",
      body: msg.text,
      systemEvent: msg.senderType === "system",
    }));

    // Batch insert in chunks of 50
    for (let i = 0; i < messageData.length; i += 50) {
      await prisma.chatMessage.createMany({
        data: messageData.slice(i, i + 50),
      });
    }

    return NextResponse.json({
      success: true,
      importId: chatImport.id,
      messageCount: messages.length,
    });
  } catch (error) {
    console.error("Chat import error:", error);
    return NextResponse.json({ error: "Import failed" }, { status: 500 });
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
