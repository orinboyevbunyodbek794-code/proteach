/**
 * Matn bilan ishlash: HTML escape, oddiy formatlash (paragraf, ro'yxat, *ajratish*).
 * Diqqat: shu yerdagi funksiyalar har doim avval escape qiladi, shundan keyingina teg qo'shadi.
 */
'use strict';

const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

function escapeHtml(value) {
  return String(value == null ? '' : value).replace(/[&<>"']/g, (c) => ESC[c]);
}

/** "Noldan *IT mutaxassisigacha*" -> yulduzcha ichidagi qism ajratib ko'rsatiladi */
function highlight(value) {
  return escapeHtml(value).replace(/\*([^*]+)\*/g, '<span class="hl">$1</span>');
}

/** Yulduzchalarni olib tashlaydi (title / meta uchun) */
function plain(value) {
  return String(value == null ? '' : value).replace(/\*/g, '');
}

/**
 * Ko'p qatorli matn -> xavfsiz HTML.
 * Bo'sh qator — yangi paragraf, "- " bilan boshlangan qatorlar — ro'yxat.
 */
function richText(value) {
  const blocks = String(value || '').replace(/\r\n?/g, '\n').trim().split(/\n{2,}/);
  return blocks
    .filter((b) => b.trim())
    .map((block) => {
      const lines = block.split('\n').map((l) => l.trim()).filter(Boolean);
      if (lines.every((l) => /^[-•*]\s+/.test(l))) {
        return '<ul>' + lines.map((l) => `<li>${escapeHtml(l.replace(/^[-•*]\s+/, ''))}</li>`).join('') + '</ul>';
      }
      return '<p>' + lines.map(escapeHtml).join('<br>') + '</p>';
    })
    .join('\n');
}

/** Meta description uchun qisqartirish */
function truncate(value, max = 160) {
  const s = plain(value).replace(/\s+/g, ' ').trim();
  if (s.length <= max) return s;
  return s.slice(0, max - 1).replace(/\s+\S*$/, '') + '…';
}

module.exports = { escapeHtml, highlight, plain, richText, truncate };
