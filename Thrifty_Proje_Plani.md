# Thrifty Proje Planı ve İş Paketleri

**Proje Adı:** Thrifty
**Açıklama:** Thrifty, bireylerin kullanmadıkları veya ihtiyaç fazlası eşyalarını ihtiyaç sahipleriyle ücretsiz olarak paylaşmalarına olanak tanıyan, yapay zekâ destekli, sürdürülebilirlik odaklı ve konum tabanlı bir sosyal paylaşım platformudur. Platform, eşyalarını vermek isteyenler (Bağışçılar) ile bunlara ihtiyaç duyanları (Alıcılar) güvenli ve şeffaf bir ortamda eşleştirir. Yapay zekâ destekli görüntü analizi ile ilan yükleme süreçleri kolaylaştırılırken, akıllı eşleştirme algoritması sayesinde ihtiyaç duyulan eşyalar doğru kişilere hızlıca ulaştırılır. Proje hem web hem de mobil (iOS/Android) platformlarında ortak bir backend altyapısıyla çalışacak şekilde tasarlanmıştır.

---

## Haftalık İş Paketleri

### 1. Backend ve Temel Atma
**1. Hafta (Hazırlık)**
- GitHub'a projeyi açlık, reponun ayarlanması.
- Supabase (PostgreSQL) veritabanı kuruldu ve Prisma modelleri yazıldı.
- Node.js ile temel iskelet ayağa kalktı.

**2. Hafta (Giriş Çıkış ve Dosya Yükleme)**
- Supabase Auth ile Kullanıcı kayıt ve login API'lerinin yazılması.
- Supabase Storage kurup kullanıcıların eşya fotoğraflarını yükleyebileceği yapıyı hazırlamak.

**3. Hafta (Asıl Olaylar - İlan ve Profil)**
- Kullanıcıların profil API'leri.
- Eşya (ilan) ekleme, listeleme ve silme API'leri.
- Talep oluşturma ve eşleştirme logiğinin arka planının (endpointlerinin) yazılması.

**4. Hafta (Arama ve Yapay Zeka)**
- İlan fotoğrafından başlık ve kategoriyi otomatik bulan AI eklentisi.
- Konuma göre (yakındaki eşyalar) filtreleme işlevlerinin koda eklenmesi.

### 2. Frontend (Web Kısmı)
**5. Hafta (Kurulum ve Sayfalar)**
- React (Vite/Next.js) ve Tailwind/Shadcn UI kurulumu.
- Login ve Register ekranlarının tasarlanıp arka uçla (backend) bağlanması.

**6. Hafta (Profil ve Ana Akış)**
- Profil sayfası ve kullanıcı ilanlarının görülmesi.
- Ana sayfadaki ilan akış ekranının (Feed) tasarlanması.

**7. Hafta (İlan Yükleme ve AI Testi)**
- Fotoğraf yükleyip ilan açma sayfasının tasarımı.
- Fotoğrafı yükleyince AI'ın başlık ve kategoriyi otomatik doldurması işinin webte test edilmesi.

**8. Hafta (Talep Arayüzü)**
- İlan detaylarına girip "Talep Et" butonlarının ve onaylama süreçlerinin eklenmesi. Toplu test.

### 3. Mobil Uygulama (React Native)
**9. Hafta (Giriş ve Menüler)**
- Expo ile mobil projenin ayağa kaldırılması.
- Alt bar (Bottom Tab) ve genel ekran geçişlerinin ayarlanması.

**10. Hafta (Tasarım ve Listeler)**
- Web'deki akışın mobile uyumlu listelerde ve kartlarda yapılması.
- Telefondan GPS konumunu alıp yakındaki ilanların filtrelenmesi.

**11. Hafta (Kamera ve Extralar)**
- Telefondaki galeriden veya kameradan çekerek ilan eklemenin entegrasyonu (Yapay zeka ile birlikte).

### 4. Toparlama ve Test
**12. Hafta (Hata Ayıklama / Optimizasyon)**
- Her şeye baştan sona (Kayıt ol -> İlan Ver -> Talep Et -> İşlemi Bitir) test yapmak.
- Veritabanı gecikmeleri varsa sorguların biraz hızlandırılması.

---

### Kullandığımız Teknolojiler Kısaca:
- **Frontend (Web):** React & Tailwind / Shadcn UI
- **Mobil:** React Native (Expo)
- **Backend:** Node.js (Express)
- **Veritabanı:** PostgreSQL (Supabase) + Prisma ORM
- **Ekstralar:** Auth/Storage (Supabase), AI (Görsel okuma için)
