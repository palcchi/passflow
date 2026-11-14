import { parsePhoneNumberFromString } from "libphonenumber-js";

export function isValidE164Phone(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const parsed = parsePhoneNumberFromString(value.trim());
  return Boolean(parsed && parsed.isValid() && parsed.number === value.trim());
}

/** Accepts a full international phone number and returns canonical E.164. */
export function normalizeInternationalPhone(rawPhone: unknown): string | null {
  const raw = String(rawPhone ?? "").trim();
  if (!raw) return null;
  const parsed = parsePhoneNumberFromString(raw);
  if (!parsed || !parsed.isValid()) return null;
  return parsed.number;
}

/** Backward-compatible normalizer for legacy country-code + national-number forms. */
export function normalizePhone(countryCode: unknown, rawPhone: unknown): string | null {
  const code = String(countryCode ?? "").trim();
  const raw = String(rawPhone ?? "").trim();
  if (raw.startsWith("+")) return normalizeInternationalPhone(raw);
  const digits = raw.replace(/\D/g, "").replace(/^0+/, "");
  if (!/^\+[1-9][0-9]{0,3}$/.test(code) || digits.length < 4 || digits.length > 14) return null;
  return normalizeInternationalPhone(code + digits);
}
