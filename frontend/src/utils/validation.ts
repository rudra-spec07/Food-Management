/**
 * Validation and normalization utilities for Food-Management application.
 */

/**
 * Validates Indian 10-digit mobile number format (numeric only, starts with 6, 7, 8, or 9).
 * Returns true if empty (for optional fields) or valid 10-digit format.
 */
export function validateIndianMobile(phone: string | null | undefined): boolean {
  if (!phone || phone.trim() === '') return true;
  return /^[6-9][0-9]{9}$/.test(phone.trim());
}

/**
 * Sanitizes phone input in real time to permit only numeric digits up to 10 characters.
 */
export function sanitizePhoneInput(val: string): string {
  return val.replace(/\D/g, '').slice(0, 10);
}

/**
 * Normalizes quantity input for donation forms.
 * Preserves temporary editing states like "0", "0.", and empty string "".
 * Preserves decimal values (e.g. "0.5", "1.5", "10.25").
 * Removes meaningless leading zeros (e.g. "012" -> "12", "00100" -> "100", "012.5" -> "12.5", "00.5" -> "0.5").
 */
export function normalizeQuantityInput(raw: string): string {
  if (raw === '' || raw === undefined || raw === null) return '';
  if (raw === '0' || raw === '0.') return raw;
  if (/^0+$/.test(raw)) return '0';

  let normalized = raw.replace(/^0+(?=\d)/, '');
  normalized = normalized.replace(/^0+(?=\.)/, '0');
  return normalized;
}
