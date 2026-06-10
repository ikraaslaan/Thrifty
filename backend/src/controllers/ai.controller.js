const aiService = require('../services/ai.service');
const prisma = require('../config/database');

class AiController {
  async getRecommendations(req, res) {
    try {
      const user = req.user; // authenticate middleware'inden geliyor
      const forceRefresh = req.query.refresh === 'true';
      const recommendations = await aiService.getRecommendations(user, forceRefresh);

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
      
      let clientMessage = 'Yapay zeka öneri servisine şu anda erişilemiyor. Lütfen daha sonra tekrar deneyiniz.';
      const errMsg = error.message || '';
      
      if (errMsg.includes('quota') || errMsg.includes('Quota') || errMsg.includes('429') || errMsg.includes('RESOURCE_EXHAUSTED')) {
        const retryMatch = errMsg.match(/Please retry in ([\d\.]+)\s*s/i) || errMsg.match(/retry in ([\d\.]+)/i);
        if (retryMatch && retryMatch[1]) {
          const seconds = Math.ceil(parseFloat(retryMatch[1]));
          clientMessage = `Yapay zeka servisinin günlük kullanım limiti (kotası) dolmuştur. Lütfen ${seconds} saniye sonra tekrar deneyiniz.`;
        } else {
          clientMessage = 'Yapay zeka servisinin günlük kullanım limiti (kotası) dolmuştur. Lütfen daha sonra tekrar deneyiniz.';
        }
      } else if (errMsg.includes('demand') || errMsg.includes('503') || errMsg.includes('temporary') || errMsg.includes('spikes')) {
        clientMessage = 'Yapay zeka servisi şu an yoğun talep görüyor. Lütfen birkaç dakika sonra tekrar deneyiniz.';
      } else if (errMsg.includes('API key') || errMsg.includes('key')) {
        clientMessage = 'Yapay zeka API anahtarı geçersiz veya yapılandırılmamış.';
      }

      res.status(503).json({
        status: 'error',
        message: clientMessage
      });
    }
  }
}

module.exports = new AiController();
