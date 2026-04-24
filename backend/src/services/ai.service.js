const { GoogleGenerativeAI } = require('@google/generative-ai');
const prisma = require('../config/database');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

class AiService {
  async getRecommendations(user) {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY tanimli degil.');
    }

    try {
      // 1. Kullanicinin arayislarini (aktif talepleri) getir
      const userRequests = await prisma.request.findMany({
        where: { userId: user.id, status: 'OPEN' },
        include: { category: true }
      });

      // 2. Sistemdeki aktif ilanlari getir (Kullanicinin kendi ilanlari haric)
      // Prompt token sinirini asmamak icin son 50 ilani alalim
      const availableItems = await prisma.item.findMany({
        where: { 
          status: 'ACTIVE',
          userId: { not: user.id }
        },
        include: { category: true },
        take: 50,
        orderBy: { createdAt: 'desc' }
      });

      if (availableItems.length === 0) {
        return [];
      }

      // 3. Prompt hazirligi
      let userProfileDescription = `Kullanıcı ID: ${user.id}, Rolü: ${user.role}. `;
      if (userRequests.length > 0) {
        userProfileDescription += 'Kullanıcının aradığı eşyalar (talepler): ' + 
          userRequests.map(r => `${r.title} (Kategori: ${r.category?.name || 'Bilinmiyor'} - ${r.description})`).join(', ') + '. ';
      } else {
        userProfileDescription += 'Kullanıcının henüz spesifik bir eşya talebi bulunmuyor. Genel ihtiyaçlar için uygun olabilecekleri değerlendir. ';
      }

      const itemsDescription = availableItems.map(item => 
        `[ID: ${item.id}] Başlık: ${item.title} | Kategori: ${item.category?.name} | Durum: ${item.condition} | Açıklama: ${item.description}`
      ).join('\n');

      const prompt = `
        Sen ikinci el eşya paylaşım platformu Thrifty için uzman bir yapay zeka eşleştirme asistanısın.
        Amacın, kullanıcının profiline ve aradığı eşyalara bakarak sistemdeki mevcut aktif ilanlar arasından ona en uygun olanları önermek.
        
        Kullanıcı Profili:
        ${userProfileDescription}
        
        Sistemdeki Mevcut İlanlar:
        ${itemsDescription}
        
        Lütfen bu ilanları incele ve kullanıcıya en uygun olan ilk 5 eşleşmeyi bul. Eğer yeterli uygun ilan yoksa olanları getir.
        Yanıtını YALNIZCA aşağıdaki JSON formatında, geçerli bir JSON dizisi olarak ver. Başka hiçbir açıklama, selamlama metni veya markdown (örneğin \`\`\`json) ekleme:
        [
          {
            "itemId": "eşleşen ilanın ID'si",
            "title": "ilanın başlığı",
            "matchScore": 1-100 arası sayısal eşleşme puanı,
            "reason": "Bu ilanın bu kullanıcı için neden uygun olduğuna dair detaylı ve ikna edici bir açıklama"
          }
        ]
      `;

      // 4. Gemini API cagirisi
      // gemini-1.5-flash modeli hiz ve JSON formati acisindan idealdir
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      const result = await model.generateContent(prompt);
      const responseText = result.response.text();

      // 5. JSON Parse Islemi
      try {
        // Model bazen format disi markdown ekleyebiliyor, bunlari temizleyelim
        let cleanJsonText = responseText.trim();
        if (cleanJsonText.startsWith('```json')) {
            cleanJsonText = cleanJsonText.replace(/```json/gi, '');
            cleanJsonText = cleanJsonText.replace(/```/gi, '');
        } else if (cleanJsonText.startsWith('```')) {
            cleanJsonText = cleanJsonText.replace(/```/gi, '');
        }
        cleanJsonText = cleanJsonText.trim();
        
        const recommendations = JSON.parse(cleanJsonText);
        return recommendations;
      } catch (parseError) {
        console.error("Gemini JSON parse hatası:", responseText);
        throw new Error("Yapay zeka yanıtı JSON formatına dönüştürülemedi.");
      }

    } catch (error) {
      console.error("AiService getRecommendations hatası:", error);
      throw error;
    }
  }
}

module.exports = new AiService();
