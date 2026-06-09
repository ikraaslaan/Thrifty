const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');

let io;

const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST', 'PATCH', 'DELETE']
    }
  });

  // JWT ile yetkilendirme middleware'i
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;
    if (!token) {
      return next(new Error('Authentication error: Token missing'));
    }
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.user = decoded;
      next();
    } catch (err) {
      return next(new Error('Authentication error: Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`🔌 Socket baglandi: ${socket.user.fullName} (${socket.user.id})`);

    // Kullanıcıyı kendi odasına al (bireysel uyarı/rozet güncellemeleri için)
    socket.join(`user:${socket.user.id}`);

    // Sohbet odasına katılma
    socket.on('join_room', (roomId) => {
      socket.join(`room:${roomId}`);
      console.log(`💬 Kullanici room:${roomId} odasina katildi`);
    });

    // Sohbet odasından ayrılma
    socket.on('leave_room', (roomId) => {
      socket.leave(`room:${roomId}`);
      console.log(`💬 Kullanici room:${roomId} odasindan ayrildi`);
    });

    // Yazıyor... durumunu diğer üyeye iletme
    socket.on('typing', ({ roomId, isTyping }) => {
      socket.to(`room:${roomId}`).emit('user_typing', { userId: socket.user.id, isTyping });
    });

    socket.on('disconnect', () => {
      console.log(`🔌 Socket ayrildi: ${socket.user.fullName}`);
    });
  });

  return io;
};

const getIo = () => {
  if (!io) {
    throw new Error('Socket.io is not initialized!');
  }
  return io;
};

module.exports = {
  initSocket,
  getIo
};
