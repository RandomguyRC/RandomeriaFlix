import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const KEY = process.env.SPOTIFY_ENCRYPTION_KEY || "";

function getKey(): Buffer {
  // Derive a 32-byte key from the env variable
  return crypto.scryptSync(KEY, "randomeriaflix-salt", 32);
}

export function encryptToken(plaintext: string): string {
  const key = getKey();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(plaintext, "utf8", "hex");
  encrypted += cipher.final("hex");
  const tag = cipher.getAuthTag();
  // Format: iv:tag:ciphertext
  return `${iv.toString("hex")}:${tag.toString("hex")}:${encrypted}`;
}

export function decryptToken(encrypted: string): string {
  const [ivHex, tagHex, ciphertext] = encrypted.split(":");
  const key = getKey();
  const iv = Buffer.from(ivHex, "hex");
  const tag = Buffer.from(tagHex, "hex");
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  let decrypted = decipher.update(ciphertext, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}
