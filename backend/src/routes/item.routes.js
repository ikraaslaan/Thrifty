const express = require('express');
const router = express.Router();
const { getItems, getItem, createItem, updateItem, deleteItem } = require('../controllers/item.controller');
const { authenticate } = require('../middleware/auth');
const { validate } = require('../middleware/validate');

router.get('/', getItems);
router.get('/:id', getItem);
router.post('/', authenticate, validate(['title', 'description', 'latitude', 'longitude', 'categoryId']), createItem);
router.put('/:id', authenticate, updateItem);
router.delete('/:id', authenticate, deleteItem);

module.exports = router;
