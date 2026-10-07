/**
 * Yuklangan fayllar: kurs rasmlari, video va poster.
 * Fayl nomlari tasodifiy (UUID) — foydalanuvchi bergan nom hech qayerda ishlatilmaydi.
 * Rasmlar sharp orqali qayta kodlanadi (WebP): hajm kichrayadi va zararli tarkib tozalanadi.
 */
'use strict';

const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');
const crypto = require('crypto');
const sharp = require('sharp');
const config = require('../config');
const log = require('../logger');

sharp.cache(false);

const DIRS = {
  courses: path.join(config.uploadsDir, 'courses'),
  video: path.join(config.uploadsDir, 'video'),
  tmp: path.join(config.uploadsDir, 'tmp'),
};

const IMAGE_FORMATS = ['jpeg', 'png', 'webp', 'avif', 'heif', 'gif'];

function ensureDirs() {
  for (const dir of Object.values(DIRS)) fs.mkdirSync(dir, { recursive: true });
}

class MediaError extends Error {}

async function readImage(buffer) {
  let meta;
  try {
    meta = await sharp(buffer, { failOn: 'error' }).metadata();
  } catch {
    throw new MediaError("Rasm fayli o'qilmadi. JPG, PNG yoki WEBP formatdagi rasm yuklang.");
  }
  if (!IMAGE_FORMATS.includes(meta.format)) {
    throw new MediaError('Bu rasm formati qo\'llab-quvvatlanmaydi. JPG, PNG yoki WEBP yuklang.');
  }
  if ((meta.width || 0) < 200 || (meta.height || 0) < 120) {
    throw new MediaError('Rasm juda kichik. Kamida 800×500 piksel tavsiya etiladi.');
  }
  return meta;
}

/** Kurs rasmi: 1200x750 va 600x375 (16:10) WebP. Qaytaradi: fayl nomi asosi */
async function saveCourseImage(buffer) {
  await readImage(buffer);
  const base = crypto.randomUUID();
  const pipeline = (w, h) =>
    sharp(buffer, { failOn: 'error' })
      .rotate()
      .resize(w, h, { fit: 'cover', position: 'attention' })
      .webp({ quality: 80, effort: 5 })
      .toFile(path.join(DIRS.courses, `${base}-${w}.webp`));
  await Promise.all([pipeline(1200, 750), pipeline(600, 375)]);
  return base;
}

async function deleteCourseImage(base) {
  if (!base || !/^[a-f0-9-]{36}$/.test(base)) return;
  await Promise.all(
    [600, 1200].map((w) => fsp.rm(path.join(DIRS.courses, `${base}-${w}.webp`), { force: true }))
  ).catch((err) => log.warn('Kurs rasmini o\'chirishda xato', err));
}

/** Video posteri: eni 1600px gacha, WebP */
async function savePoster(buffer) {
  await readImage(buffer);
  const name = `poster-${crypto.randomUUID()}.webp`;
  await sharp(buffer, { failOn: 'error' })
    .rotate()
    .resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 80, effort: 5 })
    .toFile(path.join(DIRS.video, name));
  return name;
}

/** Fayl boshidagi "sehrli baytlar" bo'yicha video turini aniqlaydi */
async function detectVideoType(filePath) {
  const fh = await fsp.open(filePath, 'r');
  try {
    const buf = Buffer.alloc(16);
    await fh.read(buf, 0, 16, 0);
    if (buf.readUInt32BE(0) === 0x1a45dfa3) return { ext: 'webm', mime: 'video/webm' };
    if (buf.toString('ascii', 4, 8) === 'ftyp') return { ext: 'mp4', mime: 'video/mp4' };
    return null;
  } finally {
    await fh.close();
  }
}

/** Vaqtinchalik yuklangan videoni tekshirib, doimiy joyga ko'chiradi */
async function storeVideo(tmpPath) {
  const type = await detectVideoType(tmpPath).catch(() => null);
  if (!type) {
    await fsp.rm(tmpPath, { force: true });
    throw new MediaError("Fayl MP4 yoki WEBM video emas. Iltimos, to'g'ri video fayl yuklang.");
  }
  const name = `video-${crypto.randomUUID()}.${type.ext}`;
  await fsp.rename(tmpPath, path.join(DIRS.video, name));
  const { size } = await fsp.stat(path.join(DIRS.video, name));
  return { file: name, mime: type.mime, size };
}

/** video/ papkasidagi faylni xavfsiz o'chirish (faqat bizning nom formatimiz) */
async function deleteVideoAsset(name) {
  if (!name || !/^(video|poster)-[a-f0-9-]{36}\.(mp4|webm|webp)$/.test(name)) return;
  await fsp.rm(path.join(DIRS.video, name), { force: true }).catch((err) => log.warn('Faylni o\'chirishda xato', err));
}

/** Eski vaqtinchalik fayllarni tozalash (uzilgan yuklashlar qoldig'i) */
async function cleanupTmp(maxAgeMs = 6 * 3600 * 1000) {
  try {
    const files = await fsp.readdir(DIRS.tmp);
    const now = Date.now();
    for (const f of files) {
      const p = path.join(DIRS.tmp, f);
      const st = await fsp.stat(p).catch(() => null);
      if (st && now - st.mtimeMs > maxAgeMs) await fsp.rm(p, { force: true });
    }
  } catch (err) {
    log.warn('tmp tozalashda xato', err);
  }
}

const urls = {
  courseImage: (base, w = 1200) => (base ? `/uploads/courses/${base}-${w}.webp` : ''),
  video: (name) => (name ? `/uploads/video/${name}` : ''),
  poster: (name) => (name ? `/uploads/video/${name}` : ''),
};

module.exports = {
  DIRS,
  MediaError,
  ensureDirs,
  saveCourseImage,
  deleteCourseImage,
  savePoster,
  storeVideo,
  deleteVideoAsset,
  cleanupTmp,
  urls,
};
