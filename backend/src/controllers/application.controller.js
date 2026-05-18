const prisma = require('../config/database');

// POST /api/applications - Bir ilana talip ol
const createApplication = async (req, res) => {
  try {
    const { itemId, note } = req.body;
    const userId = req.user.id;

    if (!itemId) {
      return res.status(400).json({ status: 'error', message: 'itemId zorunludur' });
    }

    // İlan mevcut mu ve aktif mi?
    const item = await prisma.item.findUnique({ where: { id: itemId } });
    if (!item) {
      return res.status(404).json({ status: 'error', message: 'İlan bulunamadı' });
    }
    if (item.status !== 'ACTIVE') {
      return res.status(400).json({ status: 'error', message: 'Bu ilan artık aktif değil' });
    }

    // Kendi ilanına talip olamaz
    if (item.userId === userId) {
      return res.status(400).json({ status: 'error', message: 'Kendi ilanınıza talip olamazsınız' });
    }

    // Daha önce talip olunmuş mu? (unique constraint'e güvenmek yerine açık kontrol)
    const existing = await prisma.itemApplication.findUnique({
      where: { userId_itemId: { userId, itemId } },
    });
    if (existing) {
      if (existing.status === 'WITHDRAWN') {
        // Geri çekilmiş talebi tekrar aktif et
        const updated = await prisma.itemApplication.update({
          where: { id: existing.id },
          data: { status: 'PENDING', note: note ?? existing.note },
          include: {
            user: { select: { id: true, fullName: true, avatarUrl: true } },
            item: { select: { id: true, title: true, images: true } },
          },
        });
        return res.status(200).json({ status: 'success', message: 'Talebiniz yeniden aktif edildi', data: updated });
      }
      return res.status(409).json({ status: 'error', message: 'Bu ilana zaten talip oldunuz' });
    }

    const application = await prisma.itemApplication.create({
      data: { userId, itemId, note: note ?? null },
      include: {
        user: { select: { id: true, fullName: true, avatarUrl: true } },
        item: { select: { id: true, title: true, images: true } },
      },
    });

    res.status(201).json({ status: 'success', message: 'Talebiniz alındı', data: application });
  } catch (error) {
    console.error('createApplication hatası:', error);
    res.status(500).json({ status: 'error', message: 'Talep oluşturulamadı' });
  }
};

// GET /api/applications/mine - Talip olduğum ilanlar
const getMyApplications = async (req, res) => {
  try {
    const applications = await prisma.itemApplication.findMany({
      where: {
        userId: req.user.id,
        status: 'PENDING', // Sadece aktif talepler
      },
      include: {
        item: {
          include: {
            user: { select: { id: true, fullName: true, avatarUrl: true } },
            category: { select: { id: true, name: true, icon: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ status: 'success', data: applications });
  } catch (error) {
    console.error('getMyApplications hatası:', error);
    res.status(500).json({ status: 'error', message: 'Talepler alınamadı' });
  }
};

// GET /api/applications/item/:itemId - Bir ilana başvuranlar (sadece ilan sahibi görebilir)
const getItemApplications = async (req, res) => {
  try {
    const { itemId } = req.params;

    // İlan sahipliği kontrolü
    const item = await prisma.item.findUnique({ where: { id: itemId } });
    if (!item) {
      return res.status(404).json({ status: 'error', message: 'İlan bulunamadı' });
    }
    if (item.userId !== req.user.id) {
      return res.status(403).json({ status: 'error', message: 'Bu ilanın başvurularını görme yetkiniz yok' });
    }

    const applications = await prisma.itemApplication.findMany({
      where: { itemId, status: 'PENDING' },
      include: {
        user: { select: { id: true, fullName: true, avatarUrl: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ status: 'success', data: applications });
  } catch (error) {
    console.error('getItemApplications hatası:', error);
    res.status(500).json({ status: 'error', message: 'Başvurular alınamadı' });
  }
};

// GET /api/applications/check/:itemId - Mevcut kullanıcının bu ilana talip olup olmadığını kontrol et
const checkApplication = async (req, res) => {
  try {
    const { itemId } = req.params;
    const existing = await prisma.itemApplication.findUnique({
      where: { userId_itemId: { userId: req.user.id, itemId } },
    });

    const applied = existing && existing.status === 'PENDING';
    res.json({ status: 'success', data: { applied, applicationId: applied ? existing.id : null } });
  } catch (error) {
    console.error('checkApplication hatası:', error);
    res.status(500).json({ status: 'error', message: 'Kontrol yapılamadı' });
  }
};

// DELETE /api/applications/:id - Talebi geri çek
const withdrawApplication = async (req, res) => {
  try {
    const application = await prisma.itemApplication.findUnique({
      where: { id: req.params.id },
    });

    if (!application) {
      return res.status(404).json({ status: 'error', message: 'Talep bulunamadı' });
    }
    if (application.userId !== req.user.id) {
      return res.status(403).json({ status: 'error', message: 'Bu talebi iptal etme yetkiniz yok' });
    }

    // Silmek yerine WITHDRAWN olarak işaretle (veri geçmişi korunur)
    await prisma.itemApplication.update({
      where: { id: req.params.id },
      data: { status: 'WITHDRAWN' },
    });

    res.json({ status: 'success', message: 'Talebiniz geri çekildi' });
  } catch (error) {
    console.error('withdrawApplication hatası:', error);
    res.status(500).json({ status: 'error', message: 'Talep geri çekilemedi' });
  }
};

module.exports = {
  createApplication,
  getMyApplications,
  getItemApplications,
  checkApplication,
  withdrawApplication,
};
