const prisma = require('../config/database');

// POST /api/users/:id/block - Kullanıcıyı engelle
const blockUser = async (req, res) => {
  try {
    const blockerId = req.user.id;
    const blockedId = req.params.id;

    if (blockerId === blockedId) {
      return res.status(400).json({ status: 'error', message: 'Kendinizi engelleyemezsiniz' });
    }

    // Hedef kullanıcı var mı kontrol et
    const target = await prisma.user.findUnique({ where: { id: blockedId } });
    if (!target) {
      return res.status(404).json({ status: 'error', message: 'Kullanıcı bulunamadı' });
    }

    await prisma.userBlock.upsert({
      where: { blockerId_blockedId: { blockerId, blockedId } },
      create: { blockerId, blockedId },
      update: {}
    });

    res.json({ status: 'success', message: 'Kullanıcı engellendi' });
  } catch (error) {
    console.error('blockUser hatası:', error);
    res.status(500).json({ status: 'error', message: 'Engelleme işlemi başarısız' });
  }
};

// DELETE /api/users/:id/block - Engeli kaldır
const unblockUser = async (req, res) => {
  try {
    const blockerId = req.user.id;
    const blockedId = req.params.id;

    await prisma.userBlock.deleteMany({
      where: { blockerId, blockedId }
    });

    res.json({ status: 'success', message: 'Engel kaldırıldı' });
  } catch (error) {
    console.error('unblockUser hatası:', error);
    res.status(500).json({ status: 'error', message: 'Engel kaldırma işlemi başarısız' });
  }
};

// GET /api/users/blocked - Engellenen kullanıcıları listele
const getBlockedUsers = async (req, res) => {
  try {
    const userId = req.user.id;

    const blocks = await prisma.userBlock.findMany({
      where: { blockerId: userId },
      include: {
        blocked: {
          select: { id: true, fullName: true, avatarUrl: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ status: 'success', data: blocks.map(b => b.blocked) });
  } catch (error) {
    console.error('getBlockedUsers hatası:', error);
    res.status(500).json({ status: 'error', message: 'Engellenenler listesi alınamadı' });
  }
};

module.exports = { blockUser, unblockUser, getBlockedUsers };
