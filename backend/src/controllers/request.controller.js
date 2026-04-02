const prisma = require('../config/database');

// POST /api/requests - Talep olustur
const createRequest = async (req, res) => {
  try {
    const { title, description, categoryId } = req.body;

    const request = await prisma.request.create({
      data: {
        title,
        description,
        categoryId: categoryId || null,
        userId: req.user.id,
      },
      include: { category: true },
    });

    res.status(201).json({ status: 'success', message: 'Talep olusturuldu', data: request });
  } catch (error) {
    console.error('createRequest hatasi:', error);
    res.status(500).json({ status: 'error', message: 'Talep olusturulamadi' });
  }
};

// GET /api/requests - Talepleri listele
const getRequests = async (req, res) => {
  try {
    const { status = 'OPEN', page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const requests = await prisma.request.findMany({
      where: { status },
      include: {
        user: { select: { id: true, fullName: true, avatarUrl: true } },
        category: { select: { id: true, name: true, icon: true } },
        matchedItem: { select: { id: true, title: true, images: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: parseInt(limit),
    });

    const total = await prisma.request.count({ where: { status } });

    res.json({ status: 'success', data: requests, pagination: { page: parseInt(page), limit: parseInt(limit), total } });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Talepler alinamadi' });
  }
};

// GET /api/requests/my - Kullanicinin kendi talepleri
const getMyRequests = async (req, res) => {
  try {
    const requests = await prisma.request.findMany({
      where: { userId: req.user.id },
      include: { category: true, matchedItem: { select: { id: true, title: true, images: true } } },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ status: 'success', data: requests });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Talepler alinamadi' });
  }
};

// PUT /api/requests/:id/match - Talebi bir ilanla eslestir
const matchRequest = async (req, res) => {
  try {
    const { itemId } = req.body;

    const request = await prisma.request.findUnique({ where: { id: req.params.id } });
    if (!request) return res.status(404).json({ status: 'error', message: 'Talep bulunamadi' });

    const item = await prisma.item.findUnique({ where: { id: itemId } });
    if (!item) return res.status(404).json({ status: 'error', message: 'Ilan bulunamadi' });

    const updated = await prisma.request.update({
      where: { id: req.params.id },
      data: { matchedItemId: itemId, status: 'MATCHED' },
      include: { matchedItem: true },
    });

    // Eslesen ilani RESERVED olarak isaretle
    await prisma.item.update({
      where: { id: itemId },
      data: { status: 'RESERVED' },
    });

    res.json({ status: 'success', message: 'Eslestirme yapildi', data: updated });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Eslestirme yapilamadi' });
  }
};

// DELETE /api/requests/:id - Talep sil/iptal et
const deleteRequest = async (req, res) => {
  try {
    const request = await prisma.request.findUnique({ where: { id: req.params.id } });
    if (!request) return res.status(404).json({ status: 'error', message: 'Talep bulunamadi' });
    if (request.userId !== req.user.id) return res.status(403).json({ status: 'error', message: 'Yetkiniz yok' });

    await prisma.request.delete({ where: { id: req.params.id } });
    res.json({ status: 'success', message: 'Talep silindi' });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Talep silinemedi' });
  }
};

module.exports = { createRequest, getRequests, getMyRequests, matchRequest, deleteRequest };
