const prisma = require('../config/database');

// GET /api/items - Tum ilanlari listele
const getItems = async (req, res) => {
  try {
    const { page = 1, limit = 20, category, status = 'ACTIVE', lat, lng, radius } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = { status };
    if (category) where.categoryId = category;

    const items = await prisma.item.findMany({
      where,
      include: {
        user: { select: { id: true, fullName: true, avatarUrl: true } },
        category: { select: { id: true, name: true, slug: true, icon: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: parseInt(limit),
    });

    const total = await prisma.item.count({ where });

    // Konum bazli filtreleme (basit Haversine)
    let filtered = items;
    if (lat && lng && radius) {
      const userLat = parseFloat(lat);
      const userLng = parseFloat(lng);
      const maxDist = parseFloat(radius); // km
      filtered = items.filter(item => {
        const dist = haversine(userLat, userLng, item.latitude, item.longitude);
        item.distance = Math.round(dist * 10) / 10;
        return dist <= maxDist;
      });
    }

    res.json({
      status: 'success',
      data: filtered,
      pagination: { page: parseInt(page), limit: parseInt(limit), total },
    });
  } catch (error) {
    console.error('getItems hatasi:', error);
    res.status(500).json({ status: 'error', message: 'Ilanlar alinamadi' });
  }
};

// GET /api/items/:id - Ilan detayi
const getItem = async (req, res) => {
  try {
    const item = await prisma.item.findUnique({
      where: { id: req.params.id },
      include: {
        user: { select: { id: true, fullName: true, avatarUrl: true, latitude: true, longitude: true } },
        category: true,
      },
    });

    if (!item) {
      return res.status(404).json({ status: 'error', message: 'Ilan bulunamadi' });
    }

    res.json({ status: 'success', data: item });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Ilan detayi alinamadi' });
  }
};

// POST /api/items - Yeni ilan olustur
const createItem = async (req, res) => {
  try {
    const { title, description, images, condition, deliveryType, latitude, longitude, address, categoryId, expiresAt } = req.body;

    const item = await prisma.item.create({
      data: {
        title,
        description,
        images: images || [],
        condition: condition || 'GOOD',
        deliveryType: deliveryType || 'PICKUP',
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        address,
        categoryId,
        userId: req.user.id,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
      },
      include: { category: true },
    });

    res.status(201).json({ status: 'success', message: 'Ilan olusturuldu', data: item });
  } catch (error) {
    console.error('createItem hatasi:', error);
    res.status(500).json({ status: 'error', message: 'Ilan olusturulamadi' });
  }
};

// PUT /api/items/:id - Ilan guncelle
const updateItem = async (req, res) => {
  try {
    const existing = await prisma.item.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ status: 'error', message: 'Ilan bulunamadi' });
    if (existing.userId !== req.user.id) return res.status(403).json({ status: 'error', message: 'Yetkiniz yok' });

    const item = await prisma.item.update({
      where: { id: req.params.id },
      data: req.body,
      include: { category: true },
    });

    res.json({ status: 'success', data: item });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Ilan guncellenemedi' });
  }
};

// DELETE /api/items/:id - Ilan sil
const deleteItem = async (req, res) => {
  try {
    const existing = await prisma.item.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ status: 'error', message: 'Ilan bulunamadi' });
    if (existing.userId !== req.user.id) return res.status(403).json({ status: 'error', message: 'Yetkiniz yok' });

    await prisma.item.delete({ where: { id: req.params.id } });
    res.json({ status: 'success', message: 'Ilan silindi' });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Ilan silinemedi' });
  }
};

// Haversine formulu (km cinsinden mesafe)
function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

module.exports = { getItems, getItem, createItem, updateItem, deleteItem };
