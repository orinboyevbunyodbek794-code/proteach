/**
 * Brend fayllarini yaratadi: logo (shaffof fon), favicon, og:image, shriftlar.
 * Bir marta ishga tushiriladi: `npm run assets`. Natijalar public/ ga yoziladi
 * va repozitoriyga qo'shiladi, shuning uchun serverda qayta ishlatish shart emas.
 *
 * Manba: loyiha ildizidagi proteach_logo.jpg (640x640, sariq fon, qora logo).
 */
'use strict';

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const ROOT = path.join(__dirname, '..');
const SRC = path.join(ROOT, 'proteach_logo.jpg');
const IMG = path.join(ROOT, 'public', 'img');
const FONTS = path.join(ROOT, 'public', 'fonts');

const AMBER = { r: 254, g: 180, b: 7 }; // logodagi fon rangi (#FEB407)
const INK = { r: 13, g: 13, b: 15 };

// Logodagi kontent chegarasi (piksel tahlilidan): kub 120..254, matn 274..515
const BOX = { left: 116, top: 249, width: 404, height: 141 };
const CUBE_RIGHT = 262; // shu x dan chapdagi qism — kub

// Kub belgisining vektor ko'rinishi (asl logodan chizib olingan)
const CUBE_PATHS = `
  <path d="M286 22 494 112 286 202 78 112Z"/>
  <path d="M48 124 266 222Q272 226 272 234V540L48 440Z"/>
  <path d="M524 124 306 222Q300 226 300 234V540L524 440Z"/>
  <path d="M14 126h16v318l240 104v14L14 452Z"/>
  <path d="M558 126h-16v318L302 548v14l256-110Z"/>`;

function cubeSvg(fill) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 572 572" fill="${fill}">${CUBE_PATHS}</svg>`;
}

function iconSvg(size, radius) {
  // Sariq yumaloq kvadrat ichida qora kub
  const pad = size * 0.2;
  const inner = size - pad * 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <rect width="${size}" height="${size}" rx="${radius}" fill="#FEB407"/>
    <svg x="${pad}" y="${pad}" width="${inner}" height="${inner}" viewBox="0 0 572 572" fill="#0D0D0F">${CUBE_PATHS}</svg>
  </svg>`;
}

/** Sariq fondagi qora logodan alfa-niqob yasaydi va kerakli ranglarga bo'yaydi. */
async function makeWordmark(colorFor, scale = 2) {
  const { data, info } = await sharp(SRC)
    .extract(BOX)
    .resize(BOX.width * scale, BOX.height * scale, { kernel: 'lanczos3' })
    .raw()
    .toBuffer({ resolveWithObject: true });
  const out = Buffer.alloc(info.width * info.height * 4);
  const bgSum = AMBER.r + AMBER.g + AMBER.b;
  for (let i = 0, p = 0; i < data.length; i += info.channels, p += 4) {
    const sum = data[i] + data[i + 1] + data[i + 2];
    let a = 1 - sum / bgSum;
    a = a < 0.12 ? 0 : a > 0.88 ? 1 : (a - 0.12) / 0.76;
    const x = (i / info.channels) % info.width;
    const c = colorFor(BOX.left + x / scale);
    out[p] = c.r; out[p + 1] = c.g; out[p + 2] = c.b; out[p + 3] = Math.round(a * 255);
  }
  return sharp(out, { raw: { width: info.width, height: info.height, channels: 4 } }).png({ compressionLevel: 9 });
}

/** PNG ma'lumotini ICO konteyneriga o'raydi (zamonaviy brauzerlar PNG-ICO ni qo'llaydi). */
function pngToIco(png, size) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); header.writeUInt16LE(1, 2); header.writeUInt16LE(1, 4);
  const entry = Buffer.alloc(16);
  entry.writeUInt8(size >= 256 ? 0 : size, 0);
  entry.writeUInt8(size >= 256 ? 0 : size, 1);
  entry.writeUInt8(0, 2); entry.writeUInt8(0, 3);
  entry.writeUInt16LE(1, 4); entry.writeUInt16LE(32, 6);
  entry.writeUInt32LE(png.length, 8); entry.writeUInt32LE(22, 12);
  return Buffer.concat([header, entry, png]);
}

async function main() {
  if (!fs.existsSync(SRC)) throw new Error('proteach_logo.jpg topilmadi: ' + SRC);
  fs.mkdirSync(IMG, { recursive: true });
  fs.mkdirSync(FONTS, { recursive: true });

  fs.copyFileSync(SRC, path.join(IMG, 'proteach_logo.jpg'));

  // 1) Logolar: yorug' fon uchun (qora) va qorong'i fon uchun (sariq kub + oq matn)
  await (await makeWordmark(() => INK)).toFile(path.join(IMG, 'logo-dark.png'));
  await (await makeWordmark((x) => (x < CUBE_RIGHT ? AMBER : { r: 255, g: 255, b: 255 }))).toFile(path.join(IMG, 'logo-light.png'));

  // 2) Vektor belgilar
  fs.writeFileSync(path.join(IMG, 'logo-mark.svg'), cubeSvg('#0D0D0F'));
  fs.writeFileSync(path.join(IMG, 'favicon.svg'), iconSvg(64, 14));

  // 3) Favicon va ilova ikonkalari
  const icon = (size, radius) => sharp(Buffer.from(iconSvg(size, radius))).png();
  await icon(180, 0).toFile(path.join(IMG, 'apple-touch-icon.png'));
  await icon(192, 40).toFile(path.join(IMG, 'icon-192.png'));
  await icon(512, 108).toFile(path.join(IMG, 'icon-512.png'));
  const ico = await icon(32, 7).toBuffer();
  fs.writeFileSync(path.join(ROOT, 'public', 'favicon.ico'), pngToIco(ico, 32));

  // 4) Open Graph rasmi 1200x630: asl logo sariq fonda
  const wordmark = await sharp(SRC).extract(BOX).resize({ height: 300, kernel: 'lanczos3' }).toBuffer();
  const meta = await sharp(wordmark).metadata();
  await sharp({ create: { width: 1200, height: 630, channels: 3, background: AMBER } })
    .composite([{ input: wordmark, left: Math.round((1200 - meta.width) / 2), top: Math.round((630 - meta.height) / 2) }])
    .jpeg({ quality: 88, mozjpeg: true })
    .toFile(path.join(IMG, 'og-image.jpg'));

  // 5) Shriftlar (Manrope Variable: lotin, lotin-kengaytirilgan, kirill)
  const fontDir = path.join(ROOT, 'node_modules', '@fontsource-variable', 'manrope', 'files');
  for (const sub of ['latin', 'latin-ext', 'cyrillic']) {
    const file = `manrope-${sub}-wght-normal.woff2`;
    fs.copyFileSync(path.join(fontDir, file), path.join(FONTS, file));
  }
  console.log('Brend fayllari tayyor: public/img, public/fonts');
}

main().catch((err) => { console.error(err); process.exit(1); });
