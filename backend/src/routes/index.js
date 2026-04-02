const express = require('express');
const router = express.Router();

// API bilgi endpoint'i
router.get('/', (req, res) => {
  res.json({
    name: 'Thrifty API',
    version: '1.0.0',
    description: 'AI destekli paylasim platformu',
    endpoints: {
      health: 'GET /api/health',
      auth: '/api/auth (register, login, logout, me)',
      items: '/api/items (CRUD)',
      categories: '/api/categories (list, detail)',
      requests: '/api/requests (create, list, match)',
      users: '/api/users (profile, items)',
      upload: '/api/upload (single, multiple)',
    },
  });
});

// Route modulleri
router.use('/auth', require('./auth.routes'));
router.use('/items', require('./item.routes'));
router.use('/categories', require('./category.routes'));
router.use('/requests', require('./request.routes'));
router.use('/users', require('./user.routes'));
router.use('/upload', require('./upload.routes'));

module.exports = router;
