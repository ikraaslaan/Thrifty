const express = require('express');
const router = express.Router();
const { register, login, logout, getMe } = require('../controllers/auth.controller');
const { authenticate } = require('../middleware/auth');
const { validate } = require('../middleware/validate');

router.post('/register', validate(['email', 'password', 'fullName']), register);
router.post('/login', validate(['email', 'password']), login);
router.post('/logout', logout);
router.get('/me', authenticate, getMe);

module.exports = router;
