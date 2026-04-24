const aiService = require('../services/ai.service');

class AiController {
  async getRecommendations(req, res) {
    try {
      const user = req.user; // authenticate middleware'inden geliyor
      
      const recommendations = await aiService.getRecommendations(user);
      
      res.status(200).json({
        status: 'success',
        results: recommendations.length,
        data: recommendations
      });
    } catch (error) {
      console.error('AiController getRecommendations Hatası:', error);
      res.status(500).json({
        status: 'error',
        message: error.message || 'Yapay zeka eşleştirme işlemi sırasında bir hata oluştu.'
      });
    }
  }
}

module.exports = new AiController();
