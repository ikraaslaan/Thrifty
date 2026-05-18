const express = require('express');
const router = express.Router();
const {
  createApplication,
  getMyApplications,
  getItemApplications,
  checkApplication,
  withdrawApplication,
} = require('../controllers/application.controller');
const { authenticate } = require('../middleware/auth');

// Talip olduğum ilanlar
router.get('/mine', authenticate, getMyApplications);

// Belirli bir ilana talip olunup olunmadığını kontrol et
router.get('/check/:itemId', authenticate, checkApplication);

// Bir ilana başvuranları listele (ilan sahibi için)
router.get('/item/:itemId', authenticate, getItemApplications);

// Bir ilana talip ol
router.post('/', authenticate, createApplication);

// Talebi geri çek
router.delete('/:id', authenticate, withdrawApplication);

module.exports = router;
