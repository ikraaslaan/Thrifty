# Thrifty 🌍♻️

Thrifty, bireylerin kullanmadıkları veya ihtiyaç fazlası eşyalarını ihtiyaç sahipleriyle ücretsiz olarak paylaşmalarına olanak tanıyan, yapay zekâ destekli, sürdürülebilirlik odaklı ve konum tabanlı bir sosyal paylaşım platformudur.

## 🚀 Proje Hakkında

Platform, eşyalarını vermek isteyenler (Bağışçılar) ile bunlara ihtiyaç duyanları (Alıcılar) güvenli ve şeffaf bir ortamda eşleştirir. Yapay zekâ destekli analiz ile ilan yükleme süreçleri kolaylaştırılırken, akıllı eşleştirme algoritması sayesinde ihtiyaç duyulan eşyalar doğru kişilere hızlıca ulaştırılır.

## 🛠️ Teknolojiler

- **Backend:** Node.js, Express.js
- **Veritabanı:** PostgreSQL (Supabase) + Prisma ORM
- **Kimlik Doğrulama:** Supabase Auth
- **Dosya Depolama:** Supabase Storage
- **Yapay Zeka (Planlanan):** Görüntü analizi ve akıllı eşleştirme

## 📂 Proje Yapısı

\`\`\`
backend/
├── prisma/             # Veritabanı şemaları ve seed verileri
├── src/
│   ├── config/         # Veritabanı ve genel ayarlar
│   ├── controllers/    # API iş mantığı (Auth, Items, Requests vb.)
│   ├── middleware/     # Kimlik doğrulama ve validasyon
│   ├── routes/         # API uç noktaları (Endpoints)
│   ├── services/       # Supabase Storage gibi dış servis entegrasyonları
│   └── server.js       # Ana uygulama dosyası
└── .env.example        # Örnek çevre değişkenleri dosyası
\`\`\`

## ⚙️ Kurulum (Backend)

1. Depoyu klonlayın:
   \`\`\`bash
   git clone https://github.com/ikraaslaan/Thrifty.git
   cd Thrifty/backend
   \`\`\`

2. Bağımlılıkları yükleyin:
   \`\`\`bash
   npm install
   \`\`\`

3. \`.env\` dosyasını oluşturun:
   \`.env.example\` dosyasını kopyalayarak \`.env\` adında bir dosya oluşturun ve Supabase bilgilerinizi girin.

4. Prisma ile veritabanını güncelleyin ve örnek verileri yükleyin:
   \`\`\`bash
   npx prisma generate
   npx prisma db push
   npx prisma db seed
   \`\`\`

5. Sunucuyu başlatın:
   \`\`\`bash
   npm run dev
   \`\`\`

Şimdi \`http://localhost:5000/api/health\` adresinden API'nin çalıştığını görebilirsiniz!
