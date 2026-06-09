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
      if (existing.status === 'WITHDRAWN' || existing.status === 'REJECTED') {
        // Geri çekilmiş veya reddedilmiş talebi tekrar aktif et
        const updated = await prisma.itemApplication.update({
          where: { id: existing.id },
          data: { status: 'PENDING', note: note ?? existing.note, isRated: false },
          include: {
            user: { select: { id: true, fullName: true, avatarUrl: true } },
            item: { select: { id: true, title: true, images: true } },
          },
        });

        // İlan sahibine bildirim oluştur
        await prisma.notification.create({
          data: {
            userId: item.userId,
            title: 'Yeni Talep (Tekrar)',
            message: `${req.user.fullName || 'Bir kullanıcı'} "${item.title}" ilanınıza tekrar talip oldu.`,
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

    // İlan sahibine bildirim oluştur
    await prisma.notification.create({
      data: {
        userId: item.userId,
        title: 'Yeni Talep',
        message: `${req.user.fullName || 'Bir kullanıcı'} "${item.title}" ilanınıza talip oldu.`,
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
        status: { in: ['PENDING', 'APPROVED'] },
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
      where: { itemId, status: { in: ['PENDING', 'APPROVED', 'REJECTED'] } },
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

    const applied = existing && (existing.status === 'PENDING' || existing.status === 'APPROVED');
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

// PATCH /api/applications/:id/approve - Talebi onaylama (sadece ilan sahibi)
const approveApplication = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Talebi bul, ilanı (item) içeren bilgilerle birlikte
    const application = await prisma.itemApplication.findUnique({
      where: { id },
      include: {
        item: true,
      },
    });

    if (!application) {
      return res.status(404).json({ status: 'error', message: 'Talep bulunamadı' });
    }

    // Yetki kontrolü: Sadece ilan sahibi onaylayabilir
    if (application.item.userId !== userId) {
      return res.status(403).json({ status: 'error', message: 'Bu talebi onaylama yetkiniz yok' });
    }

    // Durum kontrolü: Sadece PENDING durumundaki talepler onaylanabilir
    if (application.status !== 'PENDING') {
      return res.status(400).json({ status: 'error', message: 'Sadece bekleyen talepler onaylanabilir' });
    }

    // İlanın aktifliğini kontrol et
    if (application.item.status !== 'ACTIVE') {
      return res.status(400).json({ status: 'error', message: 'Bu ilan artık aktif değil' });
    }

    // Diğer başvuruları bul
    const otherPendingApps = await prisma.itemApplication.findMany({
      where: {
        itemId: application.itemId,
        id: { not: id },
        status: 'PENDING',
      },
    });

    // Prisma transaction kullanarak verileri güncelle
    const [updatedApplication, updatedItem] = await prisma.$transaction([
      // 1. Talebin kendisini APPROVED yap
      prisma.itemApplication.update({
        where: { id },
        data: { status: 'APPROVED' },
      }),
      // 2. İlanı RESERVED durumuna getir
      prisma.item.update({
        where: { id: application.itemId },
        data: { status: 'RESERVED' },
      }),
      // 3. Aynı ilana ait diğer tüm PENDING talepleri REJECTED yap
      prisma.itemApplication.updateMany({
        where: {
          itemId: application.itemId,
          id: { not: id },
          status: 'PENDING',
        },
        data: { status: 'REJECTED' },
      }),
    ]);

    // 1. Onaylanan alıcıya bildirim oluştur
    await prisma.notification.create({
      data: {
        userId: application.userId,
        title: 'Talebiniz Onaylandı 🎉',
        message: `"${application.item.title}" ilanına yaptığınız talep onaylandı! Teslimat sürecini profilinizden takip edebilirsiniz.`,
      },
    });

    // 2. Reddedilen diğer alıcılara bildirim oluştur
    for (const app of otherPendingApps) {
      await prisma.notification.create({
        data: {
          userId: app.userId,
          title: 'Talep Sonucu ℹ️',
          message: `"${application.item.title}" ilanı başka bir talebe onaylandı.`,
        },
      });
    }

    res.json({
      status: 'success',
      message: 'Talep onaylandı ve ilan rezerve edildi',
      data: {
        application: updatedApplication,
        item: updatedItem,
      },
    });
  } catch (error) {
    console.error('approveApplication hatası:', error);
    res.status(500).json({ status: 'error', message: 'Talep onaylanırken sunucu hatası oluştu' });
  }
};

// PATCH /api/applications/:id/reject - Talebi reddetme (sadece ilan sahibi)
const rejectApplication = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Talebi bul, ilanı (item) içeren bilgilerle birlikte
    const application = await prisma.itemApplication.findUnique({
      where: { id },
      include: {
        item: true,
      },
    });

    if (!application) {
      return res.status(404).json({ status: 'error', message: 'Talep bulunamadı' });
    }

    // Yetki kontrolü: Sadece ilan sahibi reddedebilir
    if (application.item.userId !== userId) {
      return res.status(403).json({ status: 'error', message: 'Bu talebi reddetme yetkiniz yok' });
    }

    // Durum kontrolü: Sadece PENDING durumundaki talepler reddedilebilir
    if (application.status !== 'PENDING') {
      return res.status(400).json({ status: 'error', message: 'Sadece bekleyen talepler reddedilebilir' });
    }

    // Talebi REJECTED yap
    const updatedApplication = await prisma.itemApplication.update({
      where: { id },
      data: { status: 'REJECTED' },
    });

    // Alıcıya bildirim oluştur
    await prisma.notification.create({
      data: {
        userId: application.userId,
        title: 'Talep Sonucu ❌',
        message: `"${application.item.title}" ilanı için yaptığınız talep ilan sahibi tarafından reddedildi.`,
      },
    });

    res.json({
      status: 'success',
      message: 'Talep reddedildi',
      data: updatedApplication,
    });
  } catch (error) {
    console.error('rejectApplication hatası:', error);
    res.status(500).json({ status: 'error', message: 'Talep reddedilirken sunucu hatası oluştu' });
  }
};

// PATCH /api/applications/:id/complete - Teslim alma işlemi (sadece alıcı)
const completeApplication = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const application = await prisma.itemApplication.findUnique({
      where: { id },
      include: {
        item: true,
      },
    });

    if (!application) {
      return res.status(404).json({ status: 'error', message: 'Talep bulunamadı' });
    }

    // Yetki kontrolü: Sadece talebi onaylanan alıcı teslim alabilir
    if (application.userId !== userId) {
      return res.status(403).json({ status: 'error', message: 'Bu teslimat işlemini onaylama yetkiniz yok' });
    }

    // Durum kontrolleri: Talep APPROVED ve ilan RESERVED olmalı
    if (application.status !== 'APPROVED') {
      return res.status(400).json({ status: 'error', message: 'Bu talep henüz onaylanmamış' });
    }

    if (application.item.status !== 'RESERVED') {
      return res.status(400).json({ status: 'error', message: 'Bu ilan rezerve durumunda değil' });
    }

    // İlan durumunu COMPLETED yap
    const updatedItem = await prisma.item.update({
      where: { id: application.itemId },
      data: { status: 'COMPLETED' },
    });

    // İlan sahibine bildirim oluştur
    await prisma.notification.create({
      data: {
        userId: application.item.userId,
        title: 'Teslimat Tamamlandı 🎉',
        message: `${req.user.fullName || 'Alıcı'} "${application.item.title}" isimli eşyayı teslim aldığını bildirdi.`,
      },
    });

    res.json({
      status: 'success',
      message: 'Ürün teslim alındı, ilan tamamlandı olarak işaretlendi',
      data: {
        item: updatedItem,
      },
    });
  } catch (error) {
    console.error('completeApplication hatası:', error);
    res.status(500).json({ status: 'error', message: 'Teslim alma işlemi tamamlanırken hata oluştu' });
  }
};

// PATCH /api/applications/:id/rate - Puanlama işlemi (sadece alıcı)
const rateApplication = async (req, res) => {
  try {
    const { id } = req.params;
    const { rating, comment } = req.body;
    const userId = req.user.id;

    const ratingValue = parseInt(rating);
    if (isNaN(ratingValue) || ratingValue < 1 || ratingValue > 5) {
      return res.status(400).json({ status: 'error', message: 'Puan 1 ile 5 arasında olmalıdır' });
    }

    const application = await prisma.itemApplication.findUnique({
      where: { id },
      include: {
        item: true,
      },
    });

    if (!application) {
      return res.status(404).json({ status: 'error', message: 'Talep bulunamadı' });
    }

    // Yetki kontrolü: Sadece talebi onaylanan alıcı puan verebilir
    if (application.userId !== userId) {
      return res.status(403).json({ status: 'error', message: 'Bu puanlama işlemini yapma yetkiniz yok' });
    }

    // Durum kontrolleri: Talep APPROVED ve ilan COMPLETED olmalı
    if (application.status !== 'APPROVED') {
      return res.status(400).json({ status: 'error', message: 'Onaylanmamış talep için puan verilemez' });
    }

    if (application.item.status !== 'COMPLETED') {
      return res.status(400).json({ status: 'error', message: 'Yalnızca tamamlanmış ilanlar puanlanabilir' });
    }

    // Mükerrer puanlama kontrolü
    if (application.isRated) {
      return res.status(400).json({ status: 'error', message: 'Bu işlem için zaten puan verdiniz' });
    }

    const itemOwnerId = application.item.userId;

    // Prisma Transaction kullanarak sahibi ve talebi güncelle
    const [updatedUser, updatedApp] = await prisma.$transaction(async (tx) => {
      // Sahibini kilitleyip oku (veya basit findUnique)
      const owner = await tx.user.findUnique({
        where: { id: itemOwnerId },
        select: { rating: true, ratingCount: true },
      });

      if (!owner) {
        throw new Error('İlan sahibi bulunamadı');
      }

      // Ortalama hesapla: yeniOrtalama = ((eskiOrtalama * eskiRatingCount) + yeniPuan) / (eskiRatingCount + 1)
      const newCount = owner.ratingCount + 1;
      const newRating = ((owner.rating * owner.ratingCount) + ratingValue) / newCount;

      // İlan sahibini güncelle
      const updatedUser = await tx.user.update({
        where: { id: itemOwnerId },
        data: {
          rating: newRating,
          ratingCount: newCount,
        },
      });

      // Talebi isRated = true yap ve puanı kaydet
      const updatedApp = await tx.itemApplication.update({
        where: { id },
        data: { 
          isRated: true, 
          rating: ratingValue,
          reviewComment: comment ? String(comment).trim() : null
        },
      });

      // İlan sahibine bildirim oluştur
      await tx.notification.create({
        data: {
          userId: itemOwnerId,
          title: 'Yeni Değerlendirme 🌟',
          message: `Bir kullanıcı sizi ${ratingValue} yıldız ile değerlendirdi. Yeni ortalamanız: ${newRating.toFixed(1)} 🌟`,
        },
      });

      return [updatedUser, updatedApp];
    });

    res.json({
      status: 'success',
      message: 'Puanlama başarıyla kaydedildi',
      data: {
        user: {
          id: updatedUser.id,
          fullName: updatedUser.fullName,
          rating: updatedUser.rating,
          ratingCount: updatedUser.ratingCount,
        },
        application: updatedApp,
      },
    });
  } catch (error) {
    console.error('rateApplication hatası:', error);
    res.status(500).json({ status: 'error', message: error.message || 'Puanlama sırasında hata oluştu' });
  }
};

// PATCH /api/applications/:id/cancel-delivery - Teslimatı iptal etme (sadece ilan sahibi)
const cancelDelivery = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const application = await prisma.itemApplication.findUnique({
      where: { id },
      include: {
        item: true,
      },
    });

    if (!application) {
      return res.status(404).json({ status: 'error', message: 'Talep bulunamadı' });
    }

    // Yetki kontrolü: Sadece ilan sahibi iptal edebilir
    if (application.item.userId !== userId) {
      return res.status(403).json({ status: 'error', message: 'Bu teslimatı iptal etme yetkiniz yok' });
    }

    // Durum kontrolleri: Talep APPROVED ve ilan RESERVED olmalı
    if (application.status !== 'APPROVED') {
      return res.status(400).json({ status: 'error', message: 'Bu talep onaylanmış bir talep değil' });
    }

    if (application.item.status !== 'RESERVED') {
      return res.status(400).json({ status: 'error', message: 'İlan rezerve durumunda değil' });
    }

    // Transaction ile ilanı ACTIVE, talebi REJECTED yap
    const [updatedApplication, updatedItem] = await prisma.$transaction([
      prisma.itemApplication.update({
        where: { id },
        data: { status: 'REJECTED' },
      }),
      prisma.item.update({
        where: { id: application.itemId },
        data: { status: 'ACTIVE' },
      }),
    ]);

    // Alıcıya bildirim oluştur
    await prisma.notification.create({
      data: {
        userId: application.userId,
        title: 'Teslimat İptal Edildi ⚠️',
        message: `"${application.item.title}" ilanı için oluşturulan rezervasyon iptal edildi ve ilan tekrar aktif hale getirildi.`,
      },
    });

    res.json({
      status: 'success',
      message: 'Teslimat iptal edildi, ilan tekrar aktif hale getirildi',
      data: {
        application: updatedApplication,
        item: updatedItem,
      },
    });
  } catch (error) {
    console.error('cancelDelivery hatası:', error);
    res.status(500).json({ status: 'error', message: 'Teslimat iptal edilirken hata oluştu' });
  }
};

// GET /api/applications/history/bought - Teslim aldığım tamamlanmış ilanlar (alıcı geçmişi)
const getHistoryBought = async (req, res) => {
  try {
    const userId = req.user.id;

    const history = await prisma.itemApplication.findMany({
      where: {
        userId,
        status: 'APPROVED',
        item: {
          status: 'COMPLETED',
        },
      },
      include: {
        item: {
          include: {
            user: { select: { id: true, fullName: true, avatarUrl: true } },
            category: { select: { id: true, name: true, icon: true } },
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    res.json({ status: 'success', data: history });
  } catch (error) {
    console.error('getHistoryBought hatası:', error);
    res.status(500).json({ status: 'error', message: 'Geçmiş alım kayıtları alınamadı' });
  }
};

// GET /api/applications/history/shared - Paylaştığım tamamlanmış ilanlar (bağışçı geçmişi)
const getHistoryShared = async (req, res) => {
  try {
    const userId = req.user.id;

    const history = await prisma.item.findMany({
      where: {
        userId,
        status: 'COMPLETED',
      },
      include: {
        category: { select: { id: true, name: true, icon: true } },
        applications: {
          where: { status: 'APPROVED' },
          include: {
            user: { select: { id: true, fullName: true, avatarUrl: true } },
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    res.json({ status: 'success', data: history });
  } catch (error) {
    console.error('getHistoryShared hatası:', error);
    res.status(500).json({ status: 'error', message: 'Geçmiş paylaşım kayıtları alınamadı' });
  }
};

// GET /api/applications/reviews/me - Bana gelen puanlamaları/değerlendirmeleri listele
const getMyReviews = async (req, res) => {
  try {
    const userId = req.user.id;

    const reviews = await prisma.itemApplication.findMany({
      where: {
        item: {
          userId,
        },
        isRated: true,
      },
      include: {
        user: { select: { id: true, fullName: true, avatarUrl: true } },
        item: { select: { id: true, title: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });

    res.json({ status: 'success', data: reviews });
  } catch (error) {
    console.error('getMyReviews hatası:', error);
    res.status(500).json({ status: 'error', message: 'Değerlendirmeler alınamadı' });
  }
};

// GET /api/applications/reviews/user/:userId - Belirli bir kullanıcının aldığı değerlendirmeleri listele
const getUserReviews = async (req, res) => {
  try {
    const { userId } = req.params;

    const reviews = await prisma.itemApplication.findMany({
      where: {
        item: {
          userId,
        },
        isRated: true,
      },
      include: {
        user: { select: { id: true, fullName: true, avatarUrl: true } },
        item: { select: { id: true, title: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });

    res.json({ status: 'success', data: reviews });
  } catch (error) {
    console.error('getUserReviews hatası:', error);
    res.status(500).json({ status: 'error', message: 'Kullanıcının değerlendirmeleri alınamadı' });
  }
};

module.exports = {
  createApplication,
  getMyApplications,
  getItemApplications,
  checkApplication,
  withdrawApplication,
  approveApplication,
  rejectApplication,
  completeApplication,
  rateApplication,
  cancelDelivery,
  getHistoryBought,
  getHistoryShared,
  getMyReviews,
  getUserReviews,
};
