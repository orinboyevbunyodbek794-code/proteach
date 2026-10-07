/**
 * Video boshqaruvi: yuklash (progress bilan), poster, ko'rsatish/yashirish, o'chirish.
 */
'use strict';

const express = require('express');
const config = require('../../config');
const runtime = require('../../runtime');
const log = require('../../logger');
const settings = require('../../services/settings');
const media = require('../../services/media');
const { videoUpload, posterUpload } = require('../../middleware/upload');
const { wantsJson } = require('../../middleware/auth');

const router = express.Router();

function reply(req, res, ok, message) {
  if (wantsJson(req)) return res.status(ok ? 200 : 400).json({ ok, message });
  req.flash(ok ? 'success' : 'error', message);
  res.redirect('/admin/video');
}

router.get('/', (req, res) => {
  const video = settings.getVideo();
  res.render('admin/video', {
    title: 'Video',
    active: 'video',
    video,
    videoUrl: media.urls.video(video.file),
    posterUrl: media.urls.poster(video.poster),
    youtubeWatch: media.urls.youtubeWatch(video.youtube),
    youtubePreview: video.youtube ? `https://www.youtube-nocookie.com/embed/${video.youtube}?rel=0` : '',
    uploadEnabled: runtime.videoUploadEnabled,
    maxVideoMb: config.maxVideoMb,
    maxImageMb: config.maxImageMb,
  });
});

// Netlify'da katta fayl yuklab bo'lmaydi — so'rov multer'ga yetib bormasdan to'xtatiladi
function uploadAllowed(req, res, next) {
  if (runtime.videoUploadEnabled) return next();
  return reply(req, res, false, "Bu hostingda video fayl yuklab bo'lmaydi. YouTube havolasidan foydalaning.");
}

router.post('/youtube', (req, res) => {
  const raw = String(req.body.youtube || '').trim();
  if (!raw) {
    settings.saveVideo({ youtube: '' });
    return reply(req, res, true, "YouTube havolasi olib tashlandi.");
  }
  const id = media.youtubeId(raw);
  if (!id) return reply(req, res, false, "YouTube havolasi noto'g'ri. Masalan: https://www.youtube.com/watch?v=XXXXXXXXXXX yoki https://youtu.be/XXXXXXXXXXX");
  settings.saveVideo({ youtube: id, visible: true });
  log.info(`YouTube video o'rnatildi: ${id} — ${req.admin.username}`);
  reply(req, res, true, "YouTube video saqlandi va saytda ko'rsatiladi.");
});

router.post('/upload', uploadAllowed, videoUpload, async (req, res, next) => {
  try {
    if (req.uploadError) return reply(req, res, false, req.uploadError);
    if (!req.file) return reply(req, res, false, 'Video fayl tanlanmadi.');
    const stored = await media.storeVideo(req.file.path);
    const old = settings.getVideo();
    settings.saveVideo({ ...stored, uploadedAt: new Date().toISOString() });
    if (old.file && old.file !== stored.file) await media.deleteVideoAsset(old.file);
    log.info(`Video yuklandi: ${stored.file} (${(stored.size / 1048576).toFixed(1)} MB) — ${req.admin.username}`);
    reply(req, res, true, 'Video muvaffaqiyatli yuklandi.');
  } catch (err) {
    if (err instanceof media.MediaError) return reply(req, res, false, err.message);
    next(err);
  }
});

router.post('/poster', posterUpload, async (req, res, next) => {
  try {
    if (req.uploadError) return reply(req, res, false, req.uploadError);
    if (!req.file) return reply(req, res, false, 'Rasm tanlanmadi.');
    const name = await media.savePoster(req.file.buffer);
    const old = settings.getVideo().poster;
    settings.saveVideo({ poster: name });
    if (old) await media.deleteVideoAsset(old);
    reply(req, res, true, 'Poster rasmi saqlandi.');
  } catch (err) {
    if (err instanceof media.MediaError) return reply(req, res, false, err.message);
    next(err);
  }
});

router.post('/poster/delete', async (req, res) => {
  const old = settings.getVideo().poster;
  settings.saveVideo({ poster: '' });
  if (old) await media.deleteVideoAsset(old);
  reply(req, res, true, "Poster o'chirildi.");
});

router.post('/visibility', (req, res) => {
  const visible = req.body.visible === '1';
  settings.saveVideo({ visible });
  reply(req, res, true, visible ? "Video saytda ko'rsatiladi." : 'Video saytdan yashirildi.');
});

router.post('/delete', async (req, res) => {
  const video = settings.getVideo();
  settings.saveVideo({ youtube: '', file: '', mime: '', size: 0, uploadedAt: '' });
  if (video.file) await media.deleteVideoAsset(video.file);
  reply(req, res, true, "Video o'chirildi. Saytdagi video bo'limi endi ko'rinmaydi.");
});

module.exports = router;
