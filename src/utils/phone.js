/**
 * O'zbekiston telefon raqamlari: +998 XX XXX XX XX
 */
'use strict';

/** Har qanday yozuvdan raqamlarni ajratib, +998XXXXXXXXX ko'rinishiga keltiradi. Noto'g'ri bo'lsa null. */
function normalizePhone(input) {
  let digits = String(input || '').replace(/\D/g, '');
  if (digits.length === 9) digits = '998' + digits; // 90 123 45 67
  if (digits.length !== 12 || !digits.startsWith('998')) return null;
  const operator = digits.slice(3, 5);
  // Operator kodi 0 bilan boshlanmaydi
  if (operator[0] === '0') return null;
  return '+' + digits;
}

/** +998901234567 -> +998 90 123 45 67 */
function formatPhone(phone) {
  const d = String(phone || '').replace(/\D/g, '');
  if (d.length !== 12) return String(phone || '');
  return `+${d.slice(0, 3)} ${d.slice(3, 5)} ${d.slice(5, 8)} ${d.slice(8, 10)} ${d.slice(10, 12)}`;
}

/** tel: havolasi uchun */
function telHref(phone) {
  const d = String(phone || '').replace(/[^\d+]/g, '');
  return 'tel:' + d;
}

module.exports = { normalizePhone, formatPhone, telHref };
