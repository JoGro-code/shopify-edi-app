import crypto from "node:crypto";

const IV_LENGTH = 12; // GCM recommended
const AUTH_TAG_LENGTH = 16;

export function requireKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY;
  if (!key || Buffer.from(key).length < 32) {
    throw new Error("ENCRYPTION_KEY must be >= 32 bytes");
  }
  return Buffer.from(key).slice(0, 32);
}

export function encrypt(value: string): string {
  const key = requireKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const enc = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString("base64");
}

export function decrypt(valueEnc: string): string {
  const raw = Buffer.from(valueEnc, "base64");
  const iv = raw.subarray(0, IV_LENGTH);
  const tag = raw.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const data = raw.subarray(IV_LENGTH + AUTH_TAG_LENGTH);
  const key = requireKey();
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  const dec = Buffer.concat([decipher.update(data), decipher.final()]);
  return dec.toString("utf8");
}
