/**
 * South African mobile number handling for sign-in.
 *
 * Members type their number in whatever shape they know it: 082 123 4567,
 * +27 82 123 4567, 0027821234567. All of those are the same person, so every
 * comparison happens on a single canonical form: 0XXXXXXXXX (10 digits).
 *
 * NOTE: functions/index.js carries a copy of normalizePhone — the Cloud
 * Function deploys as its own package and cannot import from here. Any change
 * to the rules below must be mirrored there or phone sign-in silently breaks.
 */

/**
 * Reduce any SA mobile number spelling to canonical 0XXXXXXXXX form.
 * Returns null when the input cannot be a valid SA mobile number.
 */
export const normalizePhone = (input) => {
  const digits = String(input ?? '').replace(/\D/g, '');
  if (!digits) return null;

  let local = digits;

  if (local.startsWith('0027')) {
    local = `0${local.slice(4)}`;          // 0027821234567
  } else if (local.startsWith('27') && local.length === 11) {
    local = `0${local.slice(2)}`;          // +27821234567 / 27821234567
  } else if (local.length === 9) {
    local = `0${local}`;                   // 821234567 (leading zero dropped)
  }

  return /^0\d{9}$/.test(local) ? local : null;
};

/**
 * Decide how the member intends the sign-in field to be read.
 * An "@" is the only reliable signal of an email address; anything else that
 * normalizes to a valid SA mobile number is treated as a phone.
 */
export const identifierKind = (input) => {
  const value = String(input ?? '').trim();
  if (!value) return 'empty';
  if (value.includes('@')) return 'email';
  return normalizePhone(value) ? 'phone' : 'unknown';
};
