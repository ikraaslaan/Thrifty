const express = require('express');
const router = express.Router();
const {
  getNotifications,
  readAllNotifications,
} = require('../controllers/notification.controller');
const { authenticate } = require('../middleware/auth');

// Kullanıcının kendi bildirimlerini listele
router.get('/', authenticate, getNotifications);

// Tüm bildirimleri okundu olarak işaretle
router.patch('/read', authenticate, readAllNotifications);

module.exports = router;
