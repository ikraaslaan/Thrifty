const jwt = require('jsonwebtoken');
const prisma = require('../config/database');

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret';

// JWT token dogrulama middleware
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ status: 'error', message: 'Token bulunamadi' });
    }

    const token = authHeader.split(' ')[1];
    
    // Verifying JWT
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // DB'den user bilgisini dogrulayip role vs ekleyebiliriz
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: { id: true, email: true, role: true }
    });

    if (!user) {
        return res.status(401).json({ status: 'error', message: 'Kullanici bulunamadi' });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ status: 'error', message: 'Token suresi dolmus' });
    }
    res.status(401).json({ status: 'error', message: 'Gecersiz veya hatali token' });
  }
};

// Role kontrolu (esnek kullanim icin)
const checkRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!allowedRoles.includes(req.user?.role)) {
      return res.status(403).json({ status: 'error', message: 'Yetkiniz yok' });
    }
    next();
  };
};

// Default admin check (Eski controller ile geriye donuk uyumluluk)
const requireAdmin = (req, res, next) => {
  if (req.user?.role !== 'ADMIN') {
    return res.status(403).json({ status: 'error', message: 'Yetkiniz yok' });
  }
  next();
};

module.exports = { authenticate, checkRole, requireAdmin };
