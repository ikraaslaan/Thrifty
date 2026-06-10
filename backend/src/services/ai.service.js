const { GoogleGenAI } = require('@google/genai');
const prisma = require('../config/database');

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Yapay zeka isteklerini kotayı korumak için 10 dakika bellekte tutuyoruz
const recommendationsCache = new Map();
const CACHE_TTL = 10 * 60 * 1000; // 10 dakika

class AiService {
  async getRecommendations(user, forceRefresh = false) {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY tanimli degil.');
    }

    // Geri çağırma (Refresh) zorlanmadıysa ve önbellekte veri varsa doğrudan önbellekten dön
    if (!forceRefresh) {
      const cached = recommendationsCache.get(user.id);
      if (cached && (Date.now() - cached.timestamp < CACHE_TTL)) {
        console.log(`[Cache Hit] Kullanıcı ${user.id} için önbelleğe alınmış yapay zeka önerileri dönülüyor.`);
        return cached.data;
      }
    }

    try {
      // 1. Kullanicinin arayislarini (aktif talepleri) getir
      const userRequests = await prisma.request.findMany({
        where: { userId: user.id, status: 'OPEN' },
        include: { category: true }
      });

      // 2. Kullanıcının talip olduğu (başvurduğu) aktif ilanları getir
      const userApplications = await prisma.itemApplication.findMany({
        where: { userId: user.id },
        include: { item: { include: { category: true } } }
      });

      if (userRequests.length === 0 && userApplications.length === 0) {
        // Kullanıcının ne aktif talebi ne de başvurusu yoksa, boş liste dönüyoruz
        return [];
      }

      // 3. Sistemdeki aktif ilanlari getir (Kullanicinin kendi ilanlari haric)
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

      // 4. Prompt hazirligi
      let userProfileDescription = `Kullanıcı ID: ${user.id}, Rolü: ${user.role}. `;
      
      if (userRequests.length > 0) {
        userProfileDescription += 'Kullanıcının aradığı/talep ettiği eşyalar: ' + 
          userRequests.map(r => `${r.title} (Kategori: ${r.category?.name || 'Bilinmiyor'} - Açıklama: ${r.description})`).join(', ') + '. ';
      }
      
      if (userApplications.length > 0) {
        userProfileDescription += 'Kullanıcının talip olduğu/başvurduğu eşyalar: ' + 
          userApplications.map(app => `${app.item?.title} (Kategori: ${app.item?.category?.name || 'Bilinmiyor'} - Açıklama: ${app.item?.description || ''})`).join(', ') + '. ';
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
      // gemini-2.5-flash modeli hiz ve JSON formati acisindan idealdir
      const result = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt
      });
      const responseText = result.text;

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
        // Başarılı sonucu 10 dakika önbelleğe al
        recommendationsCache.set(user.id, { data: recommendations, timestamp: Date.now() });
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
