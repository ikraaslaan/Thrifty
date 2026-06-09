const prisma = require('../config/database');

// GET /api/notifications - Kullanıcının bildirimlerini getir
const getNotifications = async (req, res) => {
  try {
    const notifications = await prisma.notification.findMany({
      where: {
        userId: req.user.id,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    res.json({ status: 'success', data: notifications });
  } catch (error) {
    console.error('getNotifications hatası:', error);
    res.status(500).json({ status: 'error', message: 'Bildirimler alınamadı' });
  }
};

// PATCH /api/notifications/read - Bildirimleri okundu olarak işaretle (belirli veya tümü)
const readAllNotifications = async (req, res) => {
  try {
    const { ids } = req.body || {};
    const whereClause = {
      userId: req.user.id,
      isRead: false,
    };
    if (Array.isArray(ids) && ids.length > 0) {
      whereClause.id = { in: ids };
    }

    await prisma.notification.updateMany({
      where: whereClause,
      data: {
        isRead: true,
      },
    });

    res.json({ status: 'success', message: 'Bildirimler okundu olarak işaretlendi' });
  } catch (error) {
    console.error('readAllNotifications hatası:', error);
    res.status(500).json({ status: 'error', message: 'Bildirimler okundu olarak işaretlenirken hata oluştu' });
  }
};

module.exports = {
  getNotifications,
  readAllNotifications,
};
