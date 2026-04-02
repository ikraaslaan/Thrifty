const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl || '', supabaseKey || '');

// Supabase Auth token dogrulama middleware
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ status: 'error', message: 'Token bulunamadi' });
    }

    const token = authHeader.split(' ')[1];
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({ status: 'error', message: 'Gecersiz token' });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Auth hatasi:', error);
    res.status(500).json({ status: 'error', message: 'Kimlik dogrulama hatasi' });
  }
};

// Admin yetki kontrolu
const requireAdmin = (req, res, next) => {
  if (req.user?.role !== 'ADMIN') {
    return res.status(403).json({ status: 'error', message: 'Yetkiniz yok' });
  }
  next();
};

module.exports = { authenticate, requireAdmin, supabase };
