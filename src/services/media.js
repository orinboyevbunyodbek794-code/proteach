/**
 * Yuklangan fayllar: kurs rasmlari, video va poster.
 * Fayl nomlari tasodifiy (UUID) — foydalanuvchi bergan nom hech qayerda ishlatilmaydi.
 * Rasmlar sharp orqali qayta kodlanadi (WebP): hajm kichrayadi va zararli tarkib tozalanadi.
 *
 * Saqlash joyi:
 *   server  rejimi — uploads/ papkasi (diskda)
 *   netlify rejimi — Netlify Blobs ("proteach-media" ombori), /uploads/... orqali beriladi
 */
'use strict';

const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');
const crypto = require('crypto');
const config = require('../config');
const log = require('../logger');
const runtime = require('../runtime');

// sharp og'ir modul — faqat rasm qayta ishlanganda yuklanadi (serverless'da tezroq ishga tushish uchun)
let sharpLib = null;
function sharp(...args) {
  if (!sharpLib) {
    sharpLib = require('sharp');
    sharpLib.cache(false);
  }
  return sharpLib(...args);
}

const DIRS = {
  courses: path.join(config.uploadsDir, 'courses'),
  video: path.join(config.uploadsDir, 'video'),
  tmp: path.join(config.uploadsDir, 'tmp'),
};

const IMAGE_FORMATS = ['jpeg', 'png', 'webp', 'avif', 'heif', 'gif'];
const SAFE_NAME = /^(courses\/[a-f0-9-]{36}-(600|1200)\.webp|video\/(video|poster)-[a-f0-9-]{36}\.(mp4|webm|webp))$/;
const TYPES = { webp: 'image/webp', mp4: 'video/mp4', webm: 'video/webm' };

function ensureDirs() {
  if (runtime.isNetlify) return;
  for (const dir of Object.values(DIRS)) fs.mkdirSync(dir, { recursive: true });
}

class MediaError extends Error {}

// --- Saqlash qatlami ---
function blobStore() {
  const { getStore } = require('@netlify/blobs');
  return getStore({ name: 'proteach-media', consistency: 'strong' });
}

/** rel: "courses/<uuid>-600.webp" yoki "video/poster-<uuid>.webp" */
async function putFile(rel, buffer) {
  if (!SAFE_NAME.test(rel)) throw new Error("Noto'g'ri fayl nomi: " + rel);
  if (runtime.isNetlify) {
    await blobStore().set(rel, new Blob([buffer]), { metadata: { type: TYPES[rel.split('.').pop()] } });
    return;
  }
  await fsp.writeFile(path.join(config.uploadsDir, rel), buffer);
}

async function deleteFile(rel) {
  if (!SAFE_NAME.test(rel)) return;
  try {
    if (runtime.isNetlify) await blobStore().delete(rel);
    else await fsp.rm(path.join(config.uploadsDir, rel), { force: true });
  } catch (err) {
    log.warn("Faylni o'chirishda xato", rel, err.message);
  }
}

/** Netlify rejimida faylni o'qish (yo'q bo'lsa null) */
async function readFile(rel) {
  if (!SAFE_NAME.test(rel)) return null;
  const res = await blobStore().getWithMetadata(rel, { type: 'arrayBuffer' });
  if (!res) return null;
  return { buffer: Buffer.from(res.data), type: TYPES[rel.split('.').pop()] || 'application/octet-stream' };
}

// --- Rasmlar ---
async function readImage(buffer) {
  let meta;
  try {
    meta = await sharp(buffer, { failOn: 'error' }).metadata();
  } catch {
    throw new MediaError("Rasm fayli o'qilmadi. JPG, PNG yoki WEBP formatdagi rasm yuklang.");
  }
  if (!IMAGE_FORMATS.includes(meta.format)) {
    throw new MediaError("Bu rasm formati qo'llab-quvvatlanmaydi. JPG, PNG yoki WEBP yuklang.");
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
  const render = (w, h) =>
    sharp(buffer, { failOn: 'error' })
      .rotate()
      .resize(w, h, { fit: 'cover', position: 'attention' })
      .webp({ quality: 80, effort: 5 })
      .toBuffer();
  const [big, small] = await Promise.all([render(1200, 750), render(600, 375)]);
  await Promise.all([putFile(`courses/${base}-1200.webp`, big), putFile(`courses/${base}-600.webp`, small)]);
  return base;
}

async function deleteCourseImage(base) {
  if (!base || !/^[a-f0-9-]{36}$/.test(base)) return;
  await Promise.all([600, 1200].map((w) => deleteFile(`courses/${base}-${w}.webp`)));
}

/** Video posteri: eni 1600px gacha, WebP */
async function savePoster(buffer) {
  await readImage(buffer);
  const name = `poster-${crypto.randomUUID()}.webp`;
  const out = await sharp(buffer, { failOn: 'error' })
    .rotate()
    .resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 80, effort: 5 })
    .toBuffer();
  await putFile(`video/${name}`, out);
  return name;
}

// --- Video (faqat server rejimida) ---

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

/** video/ dagi faylni (video yoki poster) xavfsiz o'chirish */
async function deleteVideoAsset(name) {
  if (!name) return;
  await deleteFile(`video/${name}`);
}

/** Eski vaqtinchalik fayllarni tozalash (uzilgan yuklashlar qoldig'i) */
async function cleanupTmp(maxAgeMs = 6 * 3600 * 1000) {
  if (runtime.isNetlify) return;
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

// --- YouTube ---

/** Har xil YouTube havolalaridan 11 belgili video ID ni ajratadi; topilmasa null */
function youtubeId(input) {
  const s = String(input || '').trim();
  if (/^[\w-]{11}$/.test(s)) return s;
  let u;
  try {
    u = new URL(/^https?:\/\//i.test(s) ? s : 'https://' + s);
  } catch {
    return null;
  }
  const host = u.hostname.replace(/^(www\.|m\.|music\.)/, '');
  let id = null;
  if (host === 'youtu.be') id = u.pathname.split('/')[1];
  else if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
    if (u.pathname === '/watch') id = u.searchParams.get('v');
    else {
      const m = u.pathname.match(/^\/(embed|shorts|live|v)\/([\w-]{11})/);
      if (m) id = m[2];
    }
  }
  return id && /^[\w-]{11}$/.test(id) ? id : null;
}

const urls = {
  courseImage: (base, w = 1200) => (base ? `/uploads/courses/${base}-${w}.webp` : ''),
  video: (name) => (name ? `/uploads/video/${name}` : ''),
  poster: (name) => (name ? `/uploads/video/${name}` : ''),
  youtubeThumb: (id) => (id ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : ''),
  youtubeEmbed: (id) => (id ? `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0` : ''),
  youtubeWatch: (id) => (id ? `https://www.youtube.com/watch?v=${id}` : ''),
};

module.exports = {
  DIRS,
  MediaError,
  ensureDirs,
  readFile,
  saveCourseImage,
  deleteCourseImage,
  savePoster,
  storeVideo,
  deleteVideoAsset,
  cleanupTmp,
  youtubeId,
  urls,
};
