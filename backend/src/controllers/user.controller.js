const prisma = require('../config/database');

// GET /api/users/profile - Kullanici profili
const getProfile = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true, email: true, fullName: true, phone: true,
        avatarUrl: true, latitude: true, longitude: true,
        role: true, createdAt: true,
        _count: { select: { items: true, requests: true } },
      },
    });

    if (!user) return res.status(404).json({ status: 'error', message: 'Kullanici bulunamadi' });
    res.json({ status: 'success', data: user });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Profil alinamadi' });
  }
};

// PUT /api/users/profile - Profil guncelle
const updateProfile = async (req, res) => {
  try {
    const { fullName, phone, avatarUrl, latitude, longitude } = req.body;

    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        ...(fullName && { fullName }),
        ...(phone !== undefined && { phone }),
        ...(avatarUrl !== undefined && { avatarUrl }),
        ...(latitude !== undefined && { latitude: parseFloat(latitude) }),
        ...(longitude !== undefined && { longitude: parseFloat(longitude) }),
      },
      select: { id: true, email: true, fullName: true, phone: true, avatarUrl: true, latitude: true, longitude: true },
    });

    res.json({ status: 'success', message: 'Profil guncellendi', data: user });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Profil guncellenemedi' });
  }
};

// GET /api/users/:id/items - Kullanicinin ilanlari
const getUserItems = async (req, res) => {
  try {
    const items = await prisma.item.findMany({
      where: { userId: req.params.id },
      include: { category: { select: { id: true, name: true, icon: true } } },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ status: 'success', data: items });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Ilanlar alinamadi' });
  }
};

module.exports = { getProfile, updateProfile, getUserItems };
