const express = require('express');
const router = express.Router();
const aiController = require('../controllers/ai.controller');
const { authenticate } = require('../middleware/auth');

// /api/ai/recommendations - Sadece giris yapmis kullanicilar
router.get('/recommendations', authenticate, aiController.getRecommendations);

module.exports = router;
