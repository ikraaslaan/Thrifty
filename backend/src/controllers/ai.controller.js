const aiService = require('../services/ai.service');
const prisma = require('../config/database');

class AiController {
  async getRecommendations(req, res) {
    try {
      const user = req.user; // authenticate middleware'inden geliyor

      const recommendations = await aiService.getRecommendations(user);

      // Her tavsiye için tam ilan nesnesini veritabanından çekip ekleyelim
      const populatedRecommendations = await Promise.all(
        recommendations.map(async (rec) => {
          try {
            const item = await prisma.item.findUnique({
              where: { id: rec.itemId },
              include: {
                user: { select: { id: true, fullName: true, avatarUrl: true } },
                category: { select: { id: true, name: true, slug: true, icon: true } },
              },
            });
            return {
              ...rec,
              item
            };
          } catch (err) {
            console.error(`Item ${rec.itemId} yüklenirken hata:`, err);
            return { ...rec, item: null };
          }
        })
      );

      // Sadece ilanı başarıyla bulunan ve hala aktif olan tavsiyeleri filtrele
      const validRecommendations = populatedRecommendations.filter(
        (rec) => rec.item && rec.item.status === 'ACTIVE'
      );

      res.status(200).json({
        status: 'success',
        results: validRecommendations.length,
        data: validRecommendations
      });
    } catch (error) {
      console.error('AiController getRecommendations Hatası:', error);
      // Hata dönmek yerine, kullanıcıya boş liste dönerek arayüzün "Öneri bulunamadı" empty state'ini göstermesini sağlıyoruz
      res.status(200).json({
        status: 'success',
        results: 0,
        data: []
      });
    }
  }
}

module.exports = new AiController();
