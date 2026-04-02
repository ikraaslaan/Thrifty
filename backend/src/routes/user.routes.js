const express = require('express');
const router = express.Router();
const { getProfile, updateProfile, getUserItems } = require('../controllers/user.controller');
const { authenticate } = require('../middleware/auth');

router.get('/profile', authenticate, getProfile);
router.put('/profile', authenticate, updateProfile);
router.get('/:id/items', getUserItems);

module.exports = router;
