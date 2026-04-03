const express = require('express');
const router = express.Router();
const multer = require('multer');
const { authenticate } = require('../middleware/auth');
const { uploadImage } = require('../services/storage.service');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Sadece .jpeg, .jpg, .png ve .webp formats kabul edilmektedir.'), false);
    }
  },
});

// POST /api/upload - Tek resim yukle
router.post('/', authenticate, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ status: 'error', message: 'Dosya bulunamadi' });
    }

    const url = await uploadImage(req.file.buffer, req.file.originalname, req.file.mimetype);
    res.json({ status: 'success', data: { url } });
  } catch (error) {
    console.error('Upload hatasi:', error);
    res.status(500).json({ status: 'error', message: 'Dosya yuklenemedi' });
  }
});

// POST /api/upload/multiple - Coklu resim yukle (max 5)
router.post('/multiple', authenticate, upload.array('images', 5), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ status: 'error', message: 'Dosya bulunamadi' });
    }

    const urls = await Promise.all(
      req.files.map(file => uploadImage(file.buffer, file.originalname, file.mimetype))
    );

    res.json({ status: 'success', data: { urls } });
  } catch (error) {
    console.error('Upload hatasi:', error);
    res.status(500).json({ status: 'error', message: 'Dosyalar yuklenemedi' });
  }
});

module.exports = router;
