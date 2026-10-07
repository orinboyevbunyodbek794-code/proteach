/**
 * Fayl yuklash (multer): tur va hajm tekshiruvi, xavfsiz fayl nomlari.
 * Xatolar req.uploadError ga yoziladi — marshrut o'zi foydalanuvchiga tushunarli javob beradi.
 */
'use strict';

const path = require('path');
const crypto = require('crypto');
const multer = require('multer');
const config = require('../config');
const { DIRS } = require('../services/media');

const VIDEO_EXT = ['.mp4', '.m4v', '.webm'];
const VIDEO_MIME = ['video/mp4', 'video/webm', 'video/x-m4v', 'application/octet-stream'];
const IMAGE_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/heic', 'image/heif', 'image/gif'];

const videoMulter = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, DIRS.tmp),
    filename: (req, file, cb) => cb(null, `${crypto.randomUUID()}.upload`),
  }),
  limits: { fileSize: config.maxVideoMb * 1024 * 1024, files: 1, fields: 10 },
  fileFilter(req, file, cb) {
    const ext = path.extname(file.originalname || '').toLowerCase();
    if (VIDEO_EXT.includes(ext) && VIDEO_MIME.includes(file.mimetype)) return cb(null, true);
    const err = new Error('Faqat MP4 yoki WEBM formatdagi video yuklash mumkin.');
    err.code = 'BAD_TYPE';
    cb(err);
  },
});

const imageMulter = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: config.maxImageMb * 1024 * 1024, files: 1, fields: 120, fieldSize: 64 * 1024 },
  fileFilter(req, file, cb) {
    if (IMAGE_MIME.includes(file.mimetype)) return cb(null, true);
    const err = new Error('Faqat rasm (JPG, PNG, WEBP) yuklash mumkin.');
    err.code = 'BAD_TYPE';
    cb(err);
  },
});

function friendly(err, maxMb) {
  if (err.code === 'LIMIT_FILE_SIZE') return `Fayl hajmi juda katta. Ruxsat etilgan maksimal hajm: ${maxMb} MB.`;
  if (err.code === 'BAD_TYPE') return err.message;
  if (err.code === 'LIMIT_UNEXPECTED_FILE' || err.code === 'LIMIT_FILE_COUNT') return 'Faqat bitta fayl yuklang.';
  return 'Faylni yuklashda xatolik yuz berdi. Qaytadan urinib ko\'ring.';
}

function wrap(mw, maxMb) {
  return (req, res, next) =>
    mw(req, res, (err) => {
      if (err) {
        req.uploadError = friendly(err, maxMb);
        if (req.file && req.file.path) require('fs').rm(req.file.path, { force: true }, () => {});
      }
      next();
    });
}

module.exports = {
  videoUpload: wrap(videoMulter.single('video'), config.maxVideoMb),
  posterUpload: wrap(imageMulter.single('poster'), config.maxImageMb),
  courseImageUpload: wrap(imageMulter.single('image'), config.maxImageMb),
};
