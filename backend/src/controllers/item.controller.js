const itemService = require('../services/item.service');

// GET /api/items - Tum ilanlari listele
const getItems = async (req, res) => {
  try {
    const result = await itemService.getItems(req.query);
    res.json({
      status: 'success',
      data: result.data,
      pagination: result.pagination,
    });
  } catch (error) {
    console.error('getItems hatasi:', error);
    res.status(500).json({ status: 'error', message: 'Ilanlar alinamadi' });
  }
};

// GET /api/items/:id - Ilan detayi
const getItem = async (req, res) => {
  try {
    const item = await itemService.getItemById(req.params.id);

    if (!item) {
      return res.status(404).json({ status: 'error', message: 'Ilan bulunamadi' });
    }

    res.json({ status: 'success', data: item });
  } catch (error) {
    console.error('getItem hatasi:', error);
    res.status(500).json({ status: 'error', message: 'Ilan detayi alinamadi' });
  }
};

// POST /api/items - Yeni ilan olustur
const createItem = async (req, res) => {
  try {
    const item = await itemService.createItem(req.user.id, req.body);
    res.status(201).json({ status: 'success', message: 'Ilan olusturuldu', data: item });
  } catch (error) {
    console.error('createItem hatasi:', error);
    res.status(500).json({ status: 'error', message: 'Ilan olusturulamadi' });
  }
};

// PUT /api/items/:id - Ilan guncelle
const updateItem = async (req, res) => {
  try {
    const item = await itemService.updateItem({
      id: req.params.id,
      userId: req.user.id,
      data: req.body
    });
    res.json({ status: 'success', data: item });
  } catch (error) {
    console.error('updateItem hatasi:', error);
    if (error.statusCode) {
      return res.status(error.statusCode).json({ status: 'error', message: error.message });
    }
    res.status(500).json({ status: 'error', message: 'Ilan guncellenemedi' });
  }
};

// DELETE /api/items/:id - Ilan sil
const deleteItem = async (req, res) => {
  try {
    await itemService.deleteItem({ id: req.params.id, userId: req.user.id });
    res.json({ status: 'success', message: 'Ilan silindi' });
  } catch (error) {
    console.error('deleteItem hatasi:', error);
    if (error.statusCode) {
      return res.status(error.statusCode).json({ status: 'error', message: error.message });
    }
    res.status(500).json({ status: 'error', message: 'Ilan silinemedi' });
  }
};

module.exports = { getItems, getItem, createItem, updateItem, deleteItem };
