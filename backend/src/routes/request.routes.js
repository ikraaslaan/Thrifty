const express = require('express');
const router = express.Router();
const { createRequest, getRequests, getMyRequests, matchRequest, deleteRequest } = require('../controllers/request.controller');
const { authenticate } = require('../middleware/auth');
const { validate } = require('../middleware/validate');

router.get('/', getRequests);
router.get('/my', authenticate, getMyRequests);
router.post('/', authenticate, validate(['title', 'description']), createRequest);
router.put('/:id/match', authenticate, validate(['itemId']), matchRequest);
router.delete('/:id', authenticate, deleteRequest);

module.exports = router;
