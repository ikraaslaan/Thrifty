const express = require('express');
const router = express.Router();
const {
  createApplication,
  getMyApplications,
  getItemApplications,
  checkApplication,
  withdrawApplication,
  approveApplication,
  rejectApplication,
  completeApplication,
  rateApplication,
  cancelDelivery,
  getHistoryBought,
  getHistoryShared,
  getMyReviews,
  getUserReviews,
} = require('../controllers/application.controller');
const { authenticate } = require('../middleware/auth');

// Geçmiş işlemler
router.get('/history/bought', authenticate, getHistoryBought);
router.get('/history/shared', authenticate, getHistoryShared);
router.get('/reviews/me', authenticate, getMyReviews);
router.get('/reviews/user/:userId', authenticate, getUserReviews);

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

// Talebi onaylama
router.patch('/:id/approve', authenticate, approveApplication);

// Talebi reddetme
router.patch('/:id/reject', authenticate, rejectApplication);

// Teslimatı tamamlama
router.patch('/:id/complete', authenticate, completeApplication);

// Puanlama
router.patch('/:id/rate', authenticate, rateApplication);

// Teslimat iptali
router.patch('/:id/cancel-delivery', authenticate, cancelDelivery);

module.exports = router;
