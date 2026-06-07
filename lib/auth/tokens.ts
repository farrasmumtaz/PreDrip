import crypto from "node:crypto";

export type PlainToken = string;
export type TokenHash = string;

export function createPlainToken(): PlainToken {
  return crypto.randomBytes(32).toString("base64url");
}

export function hashToken(token: PlainToken): TokenHash {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60_000);
}

export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 24 * 60 * 60_000);
}
