const { supabase } = require('../middleware/auth');
const prisma = require('../config/database');

// POST /api/auth/register
const register = async (req, res) => {
  try {
    const { email, password, fullName, phone } = req.body;

    // Supabase Auth ile kullanici olustur
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });

    if (error) {
      return res.status(400).json({ status: 'error', message: error.message });
    }

    // Prisma'da kullanici kaydini olustur
    const user = await prisma.user.create({
      data: {
        id: data.user.id,
        email,
        passwordHash: 'supabase-managed',
        fullName,
        phone: phone || null,
      },
    });

    res.status(201).json({
      status: 'success',
      message: 'Kayit basarili',
      data: {
        user: { id: user.id, email: user.email, fullName: user.fullName },
        session: data.session,
      },
    });
  } catch (error) {
    console.error('Register hatasi:', error);
    res.status(500).json({ status: 'error', message: 'Kayit sirasinda hata olustu' });
  }
};

// POST /api/auth/login
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      return res.status(401).json({ status: 'error', message: 'Email veya sifre hatali' });
    }

    // Prisma'dan kullanici bilgilerini al
    const user = await prisma.user.findUnique({ where: { email } });

    res.json({
      status: 'success',
      data: {
        user: user ? { id: user.id, email: user.email, fullName: user.fullName, role: user.role } : null,
        session: data.session,
      },
    });
  } catch (error) {
    console.error('Login hatasi:', error);
    res.status(500).json({ status: 'error', message: 'Giris sirasinda hata olustu' });
  }
};

// POST /api/auth/logout
const logout = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (token) {
      await supabase.auth.signOut(token);
    }
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
