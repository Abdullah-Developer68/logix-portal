import { sanitizeText } from "@/lib/db";

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function reqString(
  val: unknown,
  label: string,
  opts: { min?: number; max?: number; sanitize?: boolean } = {},
): string {
  const { min = 1, max = 500, sanitize = true } = opts;
  if (typeof val !== "string") {
    throw new ValidationError(`${label} is required.`);
  }
  const cleaned = sanitize ? sanitizeText(val) : val.trim();
  if (cleaned.length < min) {
    throw new ValidationError(
      min === 1
        ? `${label} is required.`
        : `${label} must be at least ${min} characters.`,
    );
  }
  if (cleaned.length > max) {
    throw new ValidationError(
      `${label} must be at most ${max} characters.`,
    );
  }
  return cleaned;
}

export function optString(
  val: unknown,
  label: string,
  opts: { max?: number; sanitize?: boolean } = {},
): string {
  const { max = 2000, sanitize = true } = opts;
  if (val === undefined || val === null || val === "") return "";
  if (typeof val !== "string") {
    throw new ValidationError(`${label} must be text.`);
  }
  const cleaned = sanitize ? sanitizeText(val) : val.trim();
  if (cleaned.length > max) {
    throw new ValidationError(
      `${label} must be at most ${max} characters.`,
    );
  }
  return cleaned;
}

export function reqEmail(val: unknown, label = "Email"): string {
  const cleaned = reqString(val, label, { min: 3, max: 254 }).toLowerCase();
  if (!EMAIL_RE.test(cleaned)) {
    throw new ValidationError(`Please provide a valid ${label.toLowerCase()}.`);
  }
  return cleaned;
}

export function reqDate(val: unknown, label = "Date"): string {
  const cleaned = reqString(val, label, { min: 10, max: 10 });
  if (!DATE_RE.test(cleaned)) {
    throw new ValidationError(`${label} must be in YYYY-MM-DD format.`);
  }
  const parsed = new Date(`${cleaned}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== cleaned) {
    throw new ValidationError(`${label} is not a valid calendar date.`);
  }
  return cleaned;
}

export function optDate(val: unknown, label = "Date"): string {
  if (val === undefined || val === null || val === "") return "";
  return reqDate(val, label);
}

export function reqEnum<T extends string>(
  val: unknown,
  label: string,
  allowed: readonly T[],
): T {
  if (typeof val !== "string" || !allowed.includes(val as T)) {
    throw new ValidationError(
      `${label} must be one of: ${allowed.join(", ")}.`,
    );
  }
  return val as T;
}

export function reqInt(
  val: unknown,
  label: string,
  opts: { min: number; max: number },
): number {
  const num = typeof val === "number" ? val : Number(val);
  if (!Number.isFinite(num) || !Number.isInteger(num)) {
    throw new ValidationError(`${label} must be a whole number.`);
  }
  if (num < opts.min || num > opts.max) {
    throw new ValidationError(
      `${label} must be between ${opts.min} and ${opts.max}.`,
    );
  }
  return num;
}

export function reqUuid(val: unknown, label = "ID"): string {
  if (typeof val !== "string" || !UUID_RE.test(val.trim())) {
    throw new ValidationError(`${label} must be a valid UUID.`);
  }
  return val.trim().toLowerCase();
}

export function optUrl(val: unknown, label: string, max = 500): string {
  const cleaned = optString(val, label, { max });
  if (!cleaned) return "";
  try {
    const parsed = new URL(cleaned);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      throw new ValidationError(`${label} must use http:// or https://.`);
    }
    return cleaned;
  } catch (err) {
    if (err instanceof ValidationError) throw err;
    throw new ValidationError(`${label} must be a valid URL.`);
  }
}

export function reqPassword(val: unknown, label = "Password"): string {
  if (typeof val !== "string") {
    throw new ValidationError(`${label} is required.`);
  }
  if (val.length < 8) {
    throw new ValidationError(`${label} must be at least 8 characters.`);
  }
  if (val.length > 128) {
    throw new ValidationError(`${label} must be at most 128 characters.`);
  }
  return val;
}
