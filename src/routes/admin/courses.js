/**
 * Kurslar: ro'yxat, qo'shish/tahrirlash (3 tilda), faol/nofaol, tartib, o'chirish.
 */
'use strict';

const express = require('express');
const config = require('../../config');
const log = require('../../logger');
const courses = require('../../services/courses');
const media = require('../../services/media');
const { courseImageUpload } = require('../../middleware/upload');
const { wantsJson } = require('../../middleware/auth');
const { slugify } = require('../../utils/slug');
const { coursePath, LANGS } = require('../../i18n');
const v = require('../../utils/validate');

const router = express.Router();

function emptyCourse() {
  const tri = () => ({ uz: '', ru: '', en: '' });
  return {
    id: null, slug: '', name: tri(), short: tri(), description: tri(),
    learn: { uz: [], ru: [], en: [] }, duration: tri(), price: null, pricePeriod: 'month',
    image: null, icon: 'code', isActive: true,
  };
}

function renderForm(res, course, errors = {}, status = 200) {
  res.status(status).render('admin/courses/form', {
    title: course.id ? 'Kursni tahrirlash' : 'Yangi kurs',
    active: 'courses',
    course,
    errors,
    icons: courses.ICONS,
    iconLabels: courses.ICON_LABELS,
    imageUrl: media.urls.courseImage(course.image, 600),
    maxImageMb: config.maxImageMb,
    publicUrl: course.id && course.slug ? coursePath('uz', course.slug) : null,
  });
}

/** Formadan kurs ma'lumotlarini yig'ish va tekshirish */
function readForm(body, existing) {
  const data = {
    name: v.i18nFields(body, 'name', { max: 100 }),
    short: v.i18nFields(body, 'short', { max: 300 }),
    description: v.i18nFields(body, 'description', { max: 6000, multi: true }),
    learn: Object.fromEntries(LANGS.map((l) => [l, v.list(body[`learn_${l}`], 20, 200)])),
    duration: v.i18nFields(body, 'duration', { max: 60 }),
    pricePeriod: v.oneOf(body.price_period, courses.PRICE_PERIODS, 'month'),
    icon: v.oneOf(body.icon, courses.ICONS, 'code'),
    isActive: body.is_active === '1',
    image: existing ? existing.image : null,
  };
  const errors = {};
  if (data.name.uz.length < 2) errors.name_uz = "Kurs nomi (o'zbekcha) majburiy.";
  const price = v.intOrNull(body.price, { min: 0, max: 1000000000 });
  if (Number.isNaN(price)) errors.price = "Narxni faqat raqamlarda kiriting (masalan: 450000) yoki bo'sh qoldiring.";
  data.price = Number.isNaN(price) || price === 0 ? null : price;

  const slugInput = slugify(v.line(body.slug, 100));
  const excludeId = existing ? existing.id : 0;
  if (slugInput) {
    if (courses.slugTaken(slugInput, excludeId)) errors.slug = 'Bu manzil (slug) boshqa kursda ishlatilgan.';
    data.slug = slugInput;
  } else {
    data.slug = courses.uniqueSlug(data.name.uz || data.name.en || data.name.ru, excludeId);
  }
  return { data, errors };
}

router.get('/', (req, res) => {
  const list = courses.listAll().map((c) => ({ ...c, thumb: media.urls.courseImage(c.image, 600) }));
  res.render('admin/courses/list', { title: 'Kurslar', active: 'courses', list });
});

router.get('/new', (req, res) => renderForm(res, emptyCourse()));

router.post('/', courseImageUpload, async (req, res, next) => {
  try {
    const { data, errors } = readForm(req.body);
    if (req.uploadError) errors.image = req.uploadError;
    if (Object.keys(errors).length) return renderForm(res, { ...emptyCourse(), ...data }, errors, 422);
    if (req.file) {
      try {
        data.image = await media.saveCourseImage(req.file.buffer);
      } catch (err) {
        if (err instanceof media.MediaError) return renderForm(res, { ...emptyCourse(), ...data }, { image: err.message }, 422);
        throw err;
      }
    }
    const course = courses.create(data);
    log.info(`Kurs qo'shildi: ${course.name.uz} — ${req.admin.username}`);
    req.flash('success', `"${course.name.uz}" kursi qo'shildi.`);
    res.redirect('/admin/courses');
  } catch (err) {
    next(err);
  }
});

// Drag-and-drop tartibi (JSON: { ids: [3,1,2] })
router.post('/reorder', (req, res) => {
  const ids = v.toArray(req.body.ids).map(v.id).filter(Boolean);
  if (!ids.length) return res.status(400).json({ ok: false, message: "Tartib ma'lumoti noto'g'ri." });
  courses.reorder(ids);
  res.json({ ok: true, message: 'Tartib saqlandi.' });
});

router.get('/:id/edit', (req, res, next) => {
  const course = courses.getById(v.id(req.params.id));
  if (!course) return next();
  renderForm(res, course);
});

router.post('/:id', courseImageUpload, async (req, res, next) => {
  try {
    const existing = courses.getById(v.id(req.params.id));
    if (!existing) return next();
    const { data, errors } = readForm(req.body, existing);
    if (req.uploadError) errors.image = req.uploadError;
    const view = { ...existing, ...data, id: existing.id };
    if (Object.keys(errors).length) return renderForm(res, view, errors, 422);

    const oldImage = existing.image;
    if (req.file) {
      try {
        data.image = await media.saveCourseImage(req.file.buffer);
      } catch (err) {
        if (err instanceof media.MediaError) return renderForm(res, view, { image: err.message }, 422);
        throw err;
      }
    } else if (req.body.remove_image === '1') {
      data.image = null;
    }
    courses.update(existing.id, data);
    if (oldImage && oldImage !== data.image) await media.deleteCourseImage(oldImage);
    req.flash('success', `"${data.name.uz}" kursi saqlandi.`);
    res.redirect('/admin/courses');
  } catch (err) {
    next(err);
  }
});

router.post('/:id/toggle', (req, res, next) => {
  const course = courses.getById(v.id(req.params.id));
  if (!course) return next();
  const updated = courses.setActive(course.id, !course.isActive);
  const message = updated.isActive
    ? `"${updated.name.uz}" faollashtirildi — saytda ko'rinadi.`
    : `"${updated.name.uz}" nofaol qilindi — saytda va formada ko'rinmaydi.`;
  if (wantsJson(req)) return res.json({ ok: true, isActive: updated.isActive, message });
  req.flash('success', message);
  res.redirect('/admin/courses');
});

router.post('/:id/move', (req, res, next) => {
  const id = v.id(req.params.id);
  if (!courses.getById(id)) return next();
  courses.move(id, req.body.dir === 'up' ? 'up' : 'down');
  res.redirect('/admin/courses');
});

router.post('/:id/delete', async (req, res, next) => {
  try {
    const removed = courses.remove(v.id(req.params.id));
    if (!removed) return next();
    if (removed.image) await media.deleteCourseImage(removed.image);
    log.info(`Kurs o'chirildi: ${removed.name.uz} — ${req.admin.username}`);
    req.flash('success', `"${removed.name.uz}" kursi o'chirildi. Unga tegishli arizalar saqlanib qoldi.`);
    res.redirect('/admin/courses');
  } catch (err) {
    next(err);
  }
});

module.exports = router;
