const express = require('express');
const router = express.Router();
const {
  createOrGetRoom,
  getMyRooms,
  getRoomMessages,
  sendMessage,
  markRoomMessagesAsRead
} = require('../controllers/chat.controller');
const { authenticate } = require('../middleware/auth');

router.post('/rooms', authenticate, createOrGetRoom);
router.get('/rooms', authenticate, getMyRooms);
router.get('/rooms/:roomId/messages', authenticate, getRoomMessages);
router.post('/rooms/:roomId/messages', authenticate, sendMessage);
router.patch('/rooms/:roomId/read', authenticate, markRoomMessagesAsRead);

module.exports = router;
