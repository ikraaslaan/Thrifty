const userService = require('../services/user.service');

// GET /api/users/profile - Kullanici profili
const getProfile = async (req, res) => {
  try {
    const user = await userService.getProfile(req.user.id);
    if (!user) return res.status(404).json({ status: 'error', message: 'Kullanici bulunamadi' });
    res.json({ status: 'success', data: user });
  } catch (error) {
    console.error('getProfile hatasi:', error);
    res.status(500).json({ status: 'error', message: 'Profil alinamadi' });
  }
};

// PUT /api/users/profile - Profil guncelle
const updateProfile = async (req, res) => {
  try {
    const user = await userService.updateProfile(req.user.id, req.body);
    res.json({ status: 'success', message: 'Profil guncellendi', data: user });
  } catch (error) {
    console.error('updateProfile hatasi:', error);
    res.status(500).json({ status: 'error', message: 'Profil guncellenemedi' });
  }
};

// GET /api/users/:id/items - Kullanicinin ilanlari
const getUserItems = async (req, res) => {
  try {
    const items = await userService.getUserItems(req.params.id);
    res.json({ status: 'success', data: items });
  } catch (error) {
    console.error('getUserItems hatasi:', error);
    res.status(500).json({ status: 'error', message: 'Ilanlar alinamadi' });
  }
};

// POST /api/users/:id/rate - Kullaniciya puan verme
const rateUser = async (req, res) => {
  try {
    const { score } = req.body;
    const result = await userService.rateUser(req.params.id, req.user.id, score);
    res.json({ status: 'success', message: 'Kullanici degerlendirildi', data: result });
  } catch (error) {
    console.error('rateUser hatasi:', error);
    if (error.statusCode) {
      return res.status(error.statusCode).json({ status: 'error', message: error.message });
    }
    res.status(500).json({ status: 'error', message: 'Degerlendirme yapilamadi' });
  }
};

module.exports = { getProfile, updateProfile, getUserItems, rateUser };
