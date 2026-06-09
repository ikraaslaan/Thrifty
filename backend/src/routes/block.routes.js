const express = require('express');
const router = express.Router();
const { blockUser, unblockUser, getBlockedUsers } = require('../controllers/block.controller');
const { authenticate } = require('../middleware/auth');

router.get('/blocked', authenticate, getBlockedUsers);
router.post('/:id/block', authenticate, blockUser);
router.delete('/:id/block', authenticate, unblockUser);

module.exports = router;
