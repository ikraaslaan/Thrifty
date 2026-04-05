const categoryService = require('../services/category.service');

// GET /api/categories - Tum kategorileri listele
const getCategories = async (req, res) => {
  try {
    const categories = await categoryService.getAllCategories();
    res.json({ status: 'success', data: categories });
  } catch (error) {
    console.error('getCategories hatasi:', error);
    res.status(500).json({ status: 'error', message: 'Kategoriler alinamadi' });
  }
};

// GET /api/categories/:id - Kategori detayi ve ilanlari
const getCategory = async (req, res) => {
  try {
    const category = await categoryService.getCategoryById(req.params.id);

    if (!category) {
      return res.status(404).json({ status: 'error', message: 'Kategori bulunamadi' });
    }

    res.json({ status: 'success', data: category });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Kategori alinamadi' });
  }
};

module.exports = { getCategories, getCategory };
