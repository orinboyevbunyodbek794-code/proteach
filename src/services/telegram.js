/**
 * Telegram bildirishnomalari: yangi ariza kelganda egasiga xabar.
 * TELEGRAM_BOT_TOKEN yoki TELEGRAM_CHAT_ID bo'sh bo'lsa — jimgina o'chiq.
 * Xatolar faqat logga yoziladi va ariza saqlanishiga hech qachon ta'sir qilmaydi.
 */
'use strict';

const config = require('../config');
const log = require('../logger');
const { formatPhone } = require('../utils/phone');
const { formatDateTime } = require('../utils/format');
const { CATEGORY_LABELS, DUPLICATE_WINDOW_HOURS } = require('./applications');

function isConfigured() {
  return Boolean(config.telegram.token && config.telegram.chatId);
}

function esc(s) {
  return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

async function send(text) {
  if (!isConfigured()) return { ok: false, skipped: true };
  const res = await fetch(`https://api.telegram.org/bot${config.telegram.token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: config.telegram.chatId,
      text,
      parse_mode: 'HTML',
      disable_web_page_preview: true,
    }),
    signal: AbortSignal.timeout(10000),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.ok) {
    throw new Error(`Telegram API xatosi: ${res.status} ${data.description || ''}`.trim());
  }
  return { ok: true };
}

function applicationMessage(app) {
  const lines = [
    '🆕 <b>Yangi ariza</b>',
    '',
    `👤 <b>Ism:</b> ${esc(app.name)}`,
    `📞 <b>Telefon:</b> ${esc(formatPhone(app.phone))}`,
    `📚 <b>Kurs:</b> ${esc(app.course_name_snapshot || '—')}`,
  ];
  if (app.category) lines.push(`🏷 <b>Toifa:</b> ${esc(CATEGORY_LABELS[app.category] || app.category)}`);
  if (app.comment) lines.push(`💬 <b>Izoh:</b> ${esc(app.comment)}`);
  lines.push(`🌐 <b>Til:</b> ${esc(String(app.lang).toUpperCase())}`);
  lines.push(`🕒 <b>Vaqt:</b> ${esc(formatDateTime(app.created_at))}`);
  if (app.is_duplicate) {
    lines.push('', `⚠️ Takroriy: bu raqamdan so'nggi ${DUPLICATE_WINDOW_HOURS} soatda ham ariza kelgan.`);
  }
  if (config.siteUrl) lines.push('', `🔗 ${esc(config.siteUrl)}/admin/applications/${app.id}`);
  return lines.join('\n');
}

/**
 * Yangi ariza haqida xabar. Hech qachon xato tashlamaydi (Promise doim muvaffaqiyatli tugaydi).
 * Serverless muhitda javob yuborilgach jarayon to'xtatiladi, shuning uchun chaqiruvchi uni kutadi
 * (lekin maksimal waitMs — Telegram sekin bo'lsa ham foydalanuvchi uzoq kutmaydi).
 */
function notifyNewApplication(app, waitMs = 3500) {
  if (!isConfigured()) return Promise.resolve();
  const sending = send(applicationMessage(app)).catch((err) => log.warn('Telegram xabari yuborilmadi:', err.message));
  return Promise.race([sending, new Promise((r) => setTimeout(r, waitMs))]);
}

async function sendTest() {
  return send('✅ <b>Pro Teach</b>: Telegram bildirishnomalari ishlayapti.');
}

module.exports = { isConfigured, notifyNewApplication, sendTest };
