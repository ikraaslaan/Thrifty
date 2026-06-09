const prisma = require('../config/database');
const { getIo } = require('../config/socket');

// POST /api/chat/rooms - Sohbet odası oluştur veya var olanı getir
const createOrGetRoom = async (req, res) => {
  try {
    const { itemId, applicantId } = req.body;
    const userId = req.user.id;

    if (!itemId) {
      return res.status(400).json({ status: 'error', message: 'İlan ID (itemId) gereklidir' });
    }

    const item = await prisma.item.findUnique({
      where: { id: itemId }
    });

    if (!item) {
      return res.status(404).json({ status: 'error', message: 'İlan bulunamadı' });
    }

    // Odadaki iki kişinin ID'sini belirle
    let finalOwnerId = item.userId;
    let finalApplicantId;

    if (userId === item.userId) {
      // İstek atan kişi ilan sahibi, bu durumda alıcı ID'sini (applicantId) göndermiş olmalı
      if (!applicantId) {
        return res.status(400).json({ status: 'error', message: 'İlan sahibi olarak alıcı ID (applicantId) belirtmelisiniz' });
      }
      finalApplicantId = applicantId;
    } else {
      // İstek atan kişi alıcı (talip olan)
      finalApplicantId = userId;
    }

    // İş kuralı: Bu iki üye arasında bu ilan için aktif bir talep (PENDING veya APPROVED) var mı kontrol et
    const application = await prisma.itemApplication.findUnique({
      where: {
        userId_itemId: {
          userId: finalApplicantId,
          itemId: itemId
        }
      }
    });

    if (!application || (application.status !== 'PENDING' && application.status !== 'APPROVED')) {
      return res.status(403).json({ 
        status: 'error', 
        message: 'Yalnızca ilana aktif bir talebi (Bekliyor veya Onaylandı) bulunan kullanıcılar mesajlaşabilir' 
      });
    }

    // Engelleme kontrolü
    const isBlocked = await prisma.userBlock.findFirst({
      where: {
        OR: [
          { blockerId: finalOwnerId, blockedId: finalApplicantId },
          { blockerId: finalApplicantId, blockedId: finalOwnerId }
        ]
      }
    });
    if (isBlocked) {
      return res.status(403).json({ status: 'error', message: 'Bu kullanıcıyla mesajlaşamazsınız' });
    }

    // Odanın daha önce oluşturulup oluşturulmadığına bak
    let room = await prisma.chatRoom.findUnique({
      where: {
        itemId_applicantId: {
          itemId,
          applicantId: finalApplicantId
        }
      },
      include: {
        item: { select: { id: true, title: true, images: true, status: true } },
        owner: { select: { id: true, fullName: true, avatarUrl: true } },
        applicant: { select: { id: true, fullName: true, avatarUrl: true } }
      }
    });

    if (!room) {
      room = await prisma.chatRoom.create({
        data: {
          itemId,
          ownerId: finalOwnerId,
          applicantId: finalApplicantId
        },
        include: {
          item: { select: { id: true, title: true, images: true, status: true } },
          owner: { select: { id: true, fullName: true, avatarUrl: true } },
          applicant: { select: { id: true, fullName: true, avatarUrl: true } }
        }
      });
    }

    res.status(200).json({ status: 'success', data: { ...room, isBlocked: false, blockedByMe: false } });
  } catch (error) {
    console.error('createOrGetRoom hatası:', error);
    res.status(500).json({ status: 'error', message: 'Sohbet odası oluşturulurken hata oluştu' });
  }
};

// GET /api/chat/rooms - Giriş yapmış kullanıcının sohbet odalarını listele
const getMyRooms = async (req, res) => {
  try {
    const userId = req.user.id;

    const rooms = await prisma.chatRoom.findMany({
      where: {
        OR: [
          { ownerId: userId },
          { applicantId: userId }
        ]
      },
      include: {
        item: { select: { id: true, title: true, images: true, status: true } },
        owner: { select: { id: true, fullName: true, avatarUrl: true } },
        applicant: { select: { id: true, fullName: true, avatarUrl: true } },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      },
      orderBy: { updatedAt: 'desc' }
    });

    // Her oda için okunmamış mesaj sayısını ve engelleme durumunu hesapla
    const roomsWithUnread = await Promise.all(rooms.map(async (room) => {
      const unreadCount = await prisma.chatMessage.count({
        where: {
          roomId: room.id,
          senderId: { not: userId },
          isRead: false
        }
      });

      const otherUserId = room.ownerId === userId ? room.applicantId : room.ownerId;
      const block = await prisma.userBlock.findFirst({
        where: {
          OR: [
            { blockerId: userId, blockedId: otherUserId },
            { blockerId: otherUserId, blockedId: userId }
          ]
        }
      });

      return {
        ...room,
        unreadCount,
        isBlocked: !!block,
        blockedByMe: block ? block.blockerId === userId : false
      };
    }));

    res.json({ status: 'success', data: roomsWithUnread });
  } catch (error) {
    console.error('getMyRooms hatası:', error);
    res.status(500).json({ status: 'error', message: 'Sohbet odaları alınamadı' });
  }
};

// GET /api/chat/rooms/:roomId/messages - Sohbet odasının mesaj geçmişini getir
const getRoomMessages = async (req, res) => {
  try {
    const { roomId } = req.params;
    const userId = req.user.id;

    const room = await prisma.chatRoom.findUnique({
      where: { id: roomId }
    });

    if (!room || (room.ownerId !== userId && room.applicantId !== userId)) {
      return res.status(403).json({ status: 'error', message: 'Bu sohbet odasına erişim yetkiniz yok' });
    }

    // Karşı taraftan gelen okunmamış mesajları okundu (görüldü) olarak işaretle
    await prisma.chatMessage.updateMany({
      where: {
        roomId,
        senderId: { not: userId },
        isRead: false
      },
      data: { isRead: true }
    });

    // Mesaj geçmişini kronolojik olarak getir
    const messages = await prisma.chatMessage.findMany({
      where: { roomId },
      orderBy: { createdAt: 'asc' }
    });

    // Karşı tarafa Socket üzerinden mesajların okunduğu (görüldü) bilgisini ilet
    const otherUserId = room.ownerId === userId ? room.applicantId : room.ownerId;
    try {
      const io = getIo();
      io.to(`user:${otherUserId}`).emit('messages_read', { roomId, readerId: userId });
    } catch (err) {
      // Socket başlatılmadıysa veya bağlantı yoksa yoksay
    }

    res.json({ status: 'success', data: messages });
  } catch (error) {
    console.error('getRoomMessages hatası:', error);
    res.status(500).json({ status: 'error', message: 'Mesaj geçmişi alınamadı' });
  }
};

// POST /api/chat/rooms/:roomId/messages - Sohbet odasına yeni mesaj gönder
const sendMessage = async (req, res) => {
  try {
    const { roomId } = req.params;
    const { content } = req.body;
    const userId = req.user.id;

    if (!content || !content.trim()) {
      return res.status(400).json({ status: 'error', message: 'Mesaj içeriği boş olamaz' });
    }

    const room = await prisma.chatRoom.findUnique({
      where: { id: roomId },
      include: { item: true }
    });

    if (!room || (room.ownerId !== userId && room.applicantId !== userId)) {
      return res.status(403).json({ status: 'error', message: 'Bu sohbet odasına erişim yetkiniz yok' });
    }

    // Kural Kontrolü: Bu odanın ilanı için başvuru durumu hala PENDING veya APPROVED mi?
    const application = await prisma.itemApplication.findUnique({
      where: {
        userId_itemId: {
          userId: room.applicantId,
          itemId: room.itemId
        }
      }
    });
    const otherUserIdForBlock = room.ownerId === userId ? room.applicantId : room.ownerId;

    if (!application || (application.status !== 'PENDING' && application.status !== 'APPROVED')) {
      return res.status(403).json({ 
        status: 'error', 
        message: 'Yalnızca ilana aktif bir talebi (Bekliyor veya Onaylandı) bulunan kullanıcılar mesajlaşabilir' 
      });
    }

    // Engelleme kontrolü
    const isBlocked = await prisma.userBlock.findFirst({
      where: {
        OR: [
          { blockerId: userId, blockedId: otherUserIdForBlock },
          { blockerId: otherUserIdForBlock, blockedId: userId }
        ]
      }
    });
    if (isBlocked) {
      return res.status(403).json({ status: 'error', message: 'Bu kullanıcıyla mesajlaşamazsınız' });
    }

    // Mesajı oluştur ve kaydet
    const message = await prisma.chatMessage.create({
      data: {
        roomId,
        senderId: userId,
        content: content.trim()
      }
    });

    // Odanın son güncellenme tarihini (updatedAt) güncelle
    await prisma.chatRoom.update({
      where: { id: roomId },
      data: { updatedAt: new Date() }
    });

    // Socket.IO üzerinden mesajı ve bildirim güncellemelerini dağıt
    const otherUserId = room.ownerId === userId ? room.applicantId : room.ownerId;
    try {
      const io = getIo();
      // Sadece ALICIYA new_message gönder (gönderenin kendisi API cevabından mesajı alır)
      io.to(`user:${otherUserId}`).emit('new_message', message);
      
      // Alıcıya okunmamış mesaj rozeti ve bildirim güncellemesi yolla
      io.to(`user:${otherUserId}`).emit('message_badge_update', { roomId, message });
    } catch (err) {
      // Socket.IO hatasını yoksay
    }

    res.status(201).json({ status: 'success', data: message });
  } catch (error) {
    console.error('sendMessage hatası:', error);
    res.status(500).json({ status: 'error', message: 'Mesaj gönderilirken hata oluştu' });
  }
};

// PATCH /api/chat/rooms/:roomId/read - Mesajları okundu olarak işaretle (sessiz)
const markRoomMessagesAsRead = async (req, res) => {
  try {
    const { roomId } = req.params;
    const userId = req.user.id;

    const room = await prisma.chatRoom.findUnique({ where: { id: roomId } });
    if (!room || (room.ownerId !== userId && room.applicantId !== userId)) {
      return res.status(403).json({ status: 'error', message: 'Erişim yetkiniz yok' });
    }

    await prisma.chatMessage.updateMany({
      where: { roomId, senderId: { not: userId }, isRead: false },
      data: { isRead: true }
    });

    const otherUserId = room.ownerId === userId ? room.applicantId : room.ownerId;
    try {
      const io = getIo();
      io.to(`user:${otherUserId}`).emit('messages_read', { roomId, readerId: userId });
    } catch (_) {}

    res.json({ status: 'success' });
  } catch (error) {
    console.error('markRoomMessagesAsRead hatası:', error);
    res.status(500).json({ status: 'error', message: 'Mesajlar okundu işaretlenemedi' });
  }
};

module.exports = {
  createOrGetRoom,
  getMyRooms,
  getRoomMessages,
  sendMessage,
  markRoomMessagesAsRead
};
