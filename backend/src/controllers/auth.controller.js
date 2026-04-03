const { registerUser, loginUser } = require('../services/auth.service');
const prisma = require('../config/database');

// POST /api/auth/register
const register = async (req, res) => {
  try {
    const { email, password, fullName, phone } = req.body;

    const { user, token } = await registerUser({ email, password, fullName, phone });

    res.status(201).json({
      status: 'success',
      message: 'Kayit basarili',
      data: {
        user,
        token,
      },
    });
  } catch (error) {
    if (error.message.includes('zaten kayitli')) {
      return res.status(400).json({ status: 'error', message: error.message });
    }
    console.error('Register hatasi:', error);
    res.status(500).json({ status: 'error', message: 'Kayit sirasinda hata olustu' });
  }
};

// POST /api/auth/login
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const { user, token } = await loginUser(email, password);

    res.json({
      status: 'success',
      data: {
        user,
        token,
      },
    });
  } catch (error) {
    if (error.message.includes('Gecersiz email veya sifre')) {
      return res.status(401).json({ status: 'error', message: error.message });
    }
    console.error('Login hatasi:', error);
    res.status(500).json({ status: 'error', message: 'Giris sirasinda hata olustu' });
  }
};

// POST /api/auth/logout
const logout = async (req, res) => {
  try {
    // Client tarafinda token silinecegi icin burada islem yapilmayabilir.
    // Ancak ileride token kara liste (blacklist) islemleri yapilmak istenirse buraya eklenebilir.
    res.json({ status: 'success', message: 'Cikis yapildi' });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Cikis hatasi' });
  }
};

// GET /api/auth/me
const getMe = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, email: true, fullName: true, phone: true, avatarUrl: true, role: true, latitude: true, longitude: true, createdAt: true },
    });

    if (!user) {
      return res.status(404).json({ status: 'error', message: 'Kullanici bulunamadi' });
    }

    res.json({ status: 'success', data: user });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Profil bilgisi alinamadi' });
  }
};

module.exports = { register, login, logout, getMe };
