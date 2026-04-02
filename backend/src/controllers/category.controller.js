const prisma = require('../config/database');

// GET /api/categories - Tum kategorileri listele
const getCategories = async (req, res) => {
  try {
    const categories = await prisma.category.findMany({
      include: {
        children: true,
        _count: { select: { items: true } },
      },
      where: { parentId: null }, // Sadece ust kategoriler
      orderBy: { name: 'asc' },
    });

    res.json({ status: 'success', data: categories });
  } catch (error) {
    console.error('getCategories hatasi:', error);
    res.status(500).json({ status: 'error', message: 'Kategoriler alinamadi' });
  }
};

// GET /api/categories/:id - Kategori detayi ve ilanlari
const getCategory = async (req, res) => {
  try {
    const category = await prisma.category.findUnique({
      where: { id: req.params.id },
      include: {
        children: true,
        items: {
          where: { status: 'ACTIVE' },
          take: 20,
          orderBy: { createdAt: 'desc' },
          include: { user: { select: { id: true, fullName: true } } },
        },
      },
    });

    if (!category) {
      return res.status(404).json({ status: 'error', message: 'Kategori bulunamadi' });
    }

    res.json({ status: 'success', data: category });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Kategori alinamadi' });
  }
};

module.exports = { getCategories, getCategory };
