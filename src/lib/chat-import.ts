import { createWriteStream } from "fs";
import { mkdir, readFile, rm, unlink } from "fs/promises";
import { basename, extname, join, normalize, sep } from "path";
import { pipeline } from "stream/promises";
import { Readable } from "stream";
import Busboy from "busboy";
import yauzl from "yauzl";
import { nanoid } from "nanoid";
import { prisma } from "./db";
import { parseWhatsAppChat, ParsedMessage } from "./whatsapp-parser";
import { createMediaAssetFromStoredFile, ensureMediaDirectory, resolveMimeType } from "./media";

export const MAX_CHAT_UPLOAD_SIZE = 5 * 1024 * 1024 * 1024;
export const TMP_DIR = join(process.cwd(), "data", "tmp", "chat-imports");

export type ImportFields = {
  profileId: string;
  title: string;
  myNames: string;
  friendNames: string;
};

export type UploadedChatFile = {
  path: string;
  filename: string;
  mimeType: string;
  size: number;
};

export type ChatImportResult = {
  importId: string;
  messageCount: number;
  attachmentCount: number;
  unmatchedAttachments: string[];
};

type ZipEntryInfo = {
  entryName: string;
  basename: string;
  fullPath: string;       // the safe normalized path for matching against _chat.txt refs
};

function safeZipName(name: string): string | null {
  const normalized = normalize(name.replace(/\\/g, "/"));
  if (normalized.startsWith("..") || normalized.includes(`${sep}..${sep}`) || normalized.startsWith(sep)) return null;
  return normalized;
}

function openZip(path: string): Promise<yauzl.ZipFile> {
  return new Promise((resolve, reject) => {
    yauzl.open(path, { lazyEntries: true, autoClose: true }, (err, zipfile) => {
      if (err || !zipfile) reject(err || new Error("Unable to open zip"));
      else resolve(zipfile);
    });
  });
}

function openReadStream(zipfile: yauzl.ZipFile, entry: yauzl.Entry): Promise<Readable> {
  return new Promise((resolve, reject) => {
    zipfile.openReadStream(entry, (err, stream) => {
      if (err || !stream) reject(err || new Error("Unable to read zip entry"));
      else resolve(stream);
    });
  });
}

/**
 * Collect ZIP entries. For .txt detection we look for _chat.txt (standard WhatsApp export).
 * Media entries are keyed both by basename and by full path so we can match
 * attachment references that may or may not include a directory prefix.
 *
 * This is a two-pass process: we first gather every entry, then decide which
 * single .txt entry is the actual chat export. Every other entry — including
 * OTHER .txt files, which are just attached documents (e.g. "ASSIGNMENT2.txt")
 * — goes into mediaEntries. Previously any .txt file was treated purely as a
 * chat-file candidate and silently dropped from mediaEntries even when it
 * wasn't the one actually chosen, which broke matching for .txt attachments.
 */
async function collectZipEntries(zipPath: string): Promise<{ textEntry: ZipEntryInfo; mediaEntries: Map<string, ZipEntryInfo> }> {
  const zipfile = await openZip(zipPath);
  const allEntries: ZipEntryInfo[] = [];

  await new Promise<void>((resolve, reject) => {
    zipfile.readEntry();
    zipfile.on("entry", (entry) => {
      if (/\/$/.test(entry.fileName)) { zipfile.readEntry(); return; }

      const safeName = safeZipName(entry.fileName);
      if (!safeName) { zipfile.readEntry(); return; }

      allEntries.push({
        entryName: entry.fileName,
        basename: basename(safeName),
        fullPath: safeName.replace(/\\/g, "/"),
      });

      zipfile.readEntry();
    });
    zipfile.once("error", reject);
    zipfile.once("end", () => resolve());
  });

  // Pick the real chat export file: prefer an exact "_chat.txt" match or a
  // name containing "whatsapp"; otherwise fall back to the first .txt seen.
  const txtEntries = allEntries.filter((e) => extname(e.basename).toLowerCase() === ".txt");
  const textEntry =
    txtEntries.find((e) => e.basename === "_chat.txt") ||
    txtEntries.find((e) => e.basename.toLowerCase().includes("whatsapp")) ||
    txtEntries[0] ||
    null;

  if (!textEntry) throw new Error("No WhatsApp chat .txt file found in zip");

  const mediaEntries = new Map<string, ZipEntryInfo>();
  for (const info of allEntries) {
    if (info.entryName === textEntry.entryName) continue; // skip the chosen chat file only
    // Key by basename (case-insensitive) for matching references
    mediaEntries.set(info.basename.toLowerCase().normalize("NFC"), info);
    // Also key by the full relative path (without leading folder) in case
    // the _chat.txt references include a path prefix
    mediaEntries.set(info.fullPath.toLowerCase().normalize("NFC"), info);
  }

  return { textEntry, mediaEntries };
}

async function readZipTextEntry(zipPath: string, target: ZipEntryInfo): Promise<string> {
  const zipfile = await openZip(zipPath);

  return new Promise((resolve, reject) => {
    zipfile.readEntry();
    zipfile.on("entry", async (entry) => {
      if (entry.fileName !== target.entryName) { zipfile.readEntry(); return; }

      try {
        const stream = await openReadStream(zipfile, entry);
        const chunks: Buffer[] = [];
        stream.on("data", (chunk: Buffer) => { if (typeof chunk === "string") chunks.push(Buffer.from(chunk)); else chunks.push(chunk); });
        stream.on("error", reject);
        stream.on("end", () => {
          zipfile.close();
          resolve(Buffer.concat(chunks).toString("utf8"));
        });
      } catch (err) { reject(err); }
    });
    zipfile.once("error", reject);
    zipfile.once("end", () => reject(new Error("Chat text entry disappeared while reading zip")));
  });
}

function findEntryForAttachment(ref: string, entries: Map<string, ZipEntryInfo>): ZipEntryInfo | null {
  const refClean = ref.replace(/\\/g, "/").normalize("NFC");
  const refBase = basename(refClean).toLowerCase();
  const refFull = refClean.toLowerCase();

  const exact =
    entries.get(refBase) ||
    entries.get(refFull) ||
    entries.get(refBase.normalize("NFD")) ||
    entries.get(refFull.normalize("NFD"));
  if (exact) return exact;

  // Fallback: WhatsApp truncates long document names in the chat text with an
  // ellipsis (e.g. "00055889-….pdf") but the real zip entry keeps its full
  // original name (e.g. "00055889-Original Long Name.pdf"). The leading
  // numeric ID prefix and file extension are reliably preserved, so match on those.
  const idMatch = refBase.match(/^(\d{5,})-/);
  const ext = extname(refBase);
  if (idMatch && ext) {
    const prefix = idMatch[1] + "-";
    for (const entry of entries.values()) {
      if (entry.basename.toLowerCase().startsWith(prefix) && entry.basename.toLowerCase().endsWith(ext)) {
        return entry;
      }
    }
  }

  return null;
}

async function extractZipEntryToUpload(zipPath: string, target: ZipEntryInfo, storagePath: string): Promise<string> {
  const zipfile = await openZip(zipPath);
  const destination = await ensureMediaDirectory(storagePath);

  return new Promise((resolve, reject) => {
    zipfile.readEntry();
    zipfile.on("entry", async (entry) => {
      if (entry.fileName !== target.entryName) { zipfile.readEntry(); return; }
      try {
        const stream = await openReadStream(zipfile, entry);
        await pipeline(stream, createWriteStream(destination));
        zipfile.close();
        resolve(destination);
      } catch (err) { reject(err); }
    });
    zipfile.once("error", reject);
    zipfile.once("end", () => reject(new Error(`Missing attachment in zip: ${target.basename}`)));
  });
}

export async function saveMultipartUpload(request: Request): Promise<{ fields: ImportFields; file: UploadedChatFile }> {
  const contentType = request.headers.get("content-type");
  if (!contentType) throw new Error("Missing content type");
  if (!request.body) throw new Error("Missing request body");

  await mkdir(TMP_DIR, { recursive: true });

  const fields: Partial<ImportFields> = {};
  let upload: UploadedChatFile | null = null;
  let totalBytes = 0;
  let fileWriteDone: Promise<void> | null = null;

  return new Promise((resolve, reject) => {
    const busboy = Busboy({ headers: { "content-type": contentType }, limits: { fileSize: MAX_CHAT_UPLOAD_SIZE, files: 1 } });
    const cleanup = async () => { if (upload?.path) await unlink(upload.path).catch(() => undefined); };

    busboy.on("field", (name, value) => {
      if (["profileId", "title", "myNames", "friendNames"].includes(name)) fields[name as keyof ImportFields] = value;
    });

    busboy.on("file", (_name, file, info) => {
      const filename = info.filename || "chat-export";
      const ext = extname(filename).toLowerCase() || ".bin";
      const tmpPath = join(TMP_DIR, `${nanoid()}${ext}`);
      upload = { path: tmpPath, filename, mimeType: info.mimeType || "application/octet-stream", size: 0 };
      const out = createWriteStream(tmpPath);
      fileWriteDone = new Promise<void>((fileResolve, fileReject) => {
        out.on("finish", fileResolve); out.on("error", fileReject); file.on("error", fileReject);
      });
      file.on("data", (chunk: Buffer) => {
        totalBytes += chunk.length; upload!.size += chunk.length;
        if (totalBytes > MAX_CHAT_UPLOAD_SIZE) file.destroy(new Error("Chat export is too large. Max size is 5GB."));
      });
      file.on("limit", () => file.destroy(new Error("Chat export is too large. Max size is 5GB.")));
      file.pipe(out);
    });

    busboy.on("error", async (err) => { await cleanup(); reject(err); });
    busboy.on("finish", async () => {
      try {
        if (!fields.profileId || !fields.title || !upload || !fileWriteDone) { await cleanup(); reject(new Error("Missing required fields")); return; }
        await fileWriteDone;
        resolve({
          fields: { profileId: fields.profileId, title: fields.title, myNames: fields.myNames || "", friendNames: fields.friendNames || "" },
          file: upload,
        });
      } catch (err) { await cleanup(); reject(err); }
    });

    Readable.fromWeb(request.body as unknown as Parameters<typeof Readable.fromWeb>[0]).pipe(busboy);
  });
}

// ── BATCH MESSAGE INSERT ─────────────────────────────────────────
// For 300k+ messages, doing one prisma.chatMessage.create per message
// is impossibly slow (275k SQLite transactions).  Using createMany in
// batches of 500 keeps each transaction small and fast.
const BATCH_SIZE = 500;

async function storeMessages(importId: string, messages: ParsedMessage[]): Promise<Map<number, string>> {
  const orderToId = new Map<number, string>();

  for (let i = 0; i < messages.length; i += BATCH_SIZE) {
    const batch = messages.slice(i, i + BATCH_SIZE);
    await prisma.chatMessage.createMany({
      data: batch.map((msg) => ({
        importId,
        sortOrder: msg.sortOrder,
        timestamp: msg.timestamp,
        dateLabel: msg.dateLabel,
        rawSender: msg.sender,
        isMine: msg.senderType === "random",
        body: msg.text,
        systemEvent: msg.senderType === "system",
      })),
    });

    // Fetch back IDs for this batch's sortOrders
    const ids = await prisma.chatMessage.findMany({
      where: { importId, sortOrder: { gte: messages[i].sortOrder, lte: batch[batch.length - 1].sortOrder } },
      select: { id: true, sortOrder: true },
      orderBy: { sortOrder: "asc" },
    });
    for (const entry of ids) orderToId.set(entry.sortOrder, entry.id);
  }

  return orderToId;
}

async function persistParsedImport(fields: ImportFields, text: string): Promise<{ importId: string; messages: ParsedMessage[]; orderToId: Map<number, string> }> {
  const myNamesArray = fields.myNames.split(",").map((n) => n.trim()).filter(Boolean);
  const friendNamesArray = fields.friendNames.split(",").map((n) => n.trim()).filter(Boolean);
  const messages = parseWhatsAppChat(text, myNamesArray, friendNamesArray);

  if (messages.length === 0) throw new Error("No messages found in chat export");

  const chatImport = await prisma.chatImport.create({
    data: { profileId: fields.profileId, title: fields.title, myNames: fields.myNames, friendNames: fields.friendNames },
  });

  const orderToId = await storeMessages(chatImport.id, messages);
  return { importId: chatImport.id, messages, orderToId };
}

export async function importChatFromStoredFile(fields: ImportFields, file: UploadedChatFile): Promise<ChatImportResult> {
  const isZip = file.filename.toLowerCase().endsWith(".zip");
  const extractedFiles: string[] = [];
  let importId: string | null = null;

  try {
    if (!isZip) {
      const text = await readFile(file.path, "utf8");
      const result = await persistParsedImport(fields, text);
      importId = result.importId;

      // No zip means no actual media files were provided — but the chat text
      // still references them (e.g. "<attached: IMG-....jpg>"). Create a
      // placeholder ChatAttachment (no assetId) for each one so the message
      // renders as "(not available)" in the UI instead of a silently blank
      // bubble, and so re-importing later with the zip has something to
      // reconcile against.
      const unmatchedAttachments: string[] = [];
      for (const msg of result.messages) {
        const messageId = result.orderToId.get(msg.sortOrder);
        if (!messageId) continue;
        for (const attachment of msg.attachments) {
          unmatchedAttachments.push(attachment.originalRef);
          await prisma.chatAttachment.create({
            data: { messageId, originalRef: attachment.originalRef, kind: attachment.kind },
          });
        }
      }

      if (unmatchedAttachments.length > 0) {
        console.warn(
          `[chat-import] Imported a plain .txt file — ${unmatchedAttachments.length} attachment reference(s) ` +
          `were found in the chat text but no media files were provided. Re-import using the WhatsApp .zip ` +
          `export ("Export chat" → "Include Media") to attach the actual files.`
        );
      }

      return {
        importId,
        messageCount: result.messages.length,
        attachmentCount: 0,
        unmatchedAttachments,
      };
    }

    const { textEntry, mediaEntries } = await collectZipEntries(file.path);
    const text = await readZipTextEntry(file.path, textEntry);
    const result = await persistParsedImport(fields, text);
    importId = result.importId;

    let attachmentCount = 0;
    const unmatchedAttachments: string[] = [];
    const mediaKeysSample = [...mediaEntries.keys()].slice(0, 8);

    // Walk through messages in sortOrder
    for (const msg of result.messages) {
      const messageId = result.orderToId.get(msg.sortOrder);
      if (!messageId) continue;

      for (const attachment of msg.attachments) {
        const entry = findEntryForAttachment(attachment.originalRef, mediaEntries);
        if (!entry) {
          if (unmatchedAttachments.length < 20) {
            console.warn(
              `[chat-import] Could not find zip entry for attachment ref "${attachment.originalRef}". ` +
              `Sample of available media filenames in zip: ${JSON.stringify(mediaKeysSample)}`
            );
          }
          unmatchedAttachments.push(attachment.originalRef);
          // Reference exists but file is not in zip — create attachment without asset
          await prisma.chatAttachment.create({
            data: { messageId, originalRef: attachment.originalRef, kind: attachment.kind },
          });
          continue;
        }

        const ext = extname(entry.basename) || ".bin";
        const storagePath = `chat/${importId}/${nanoid()}${ext}`;
        await extractZipEntryToUpload(file.path, entry, storagePath);
        extractedFiles.push(storagePath);

        const mimeType = resolveMimeType("application/octet-stream", entry.basename);
        const asset = await createMediaAssetFromStoredFile({ storagePath, originalName: entry.basename, mimeType });
        await prisma.chatAttachment.create({
          data: { messageId, assetId: asset.id, originalRef: attachment.originalRef, kind: asset.kind },
        });
        attachmentCount++;
      }
    }

    if (unmatchedAttachments.length > 0) {
      console.warn(
        `[chat-import] ${unmatchedAttachments.length} of ${unmatchedAttachments.length + attachmentCount} ` +
        `attachment(s) could not be matched to a file in the zip.`
      );
    }

    return { importId, messageCount: result.messages.length, attachmentCount, unmatchedAttachments };
  } catch (err) {
    if (importId) await prisma.chatImport.delete({ where: { id: importId } }).catch(() => undefined);
    await Promise.all(extractedFiles.map((p) => rm(join(process.cwd(), "data", "uploads", p), { force: true }).catch(() => undefined)));
    throw err;
  } finally {
    await unlink(file.path).catch(() => undefined);
  }
}

export async function importChatFromRequest(request: Request): Promise<ChatImportResult> {
  const { fields, file } = await saveMultipartUpload(request);
  return importChatFromStoredFile(fields, file);
}
