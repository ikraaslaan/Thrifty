require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  console.log('Seed işlemi başlıyor... 🌱');

  // 1. Örnek Kullanıcı Oluştur (Eğer yoksa)
  const hashedPassword = await bcrypt.hash('123456', 10);
  
  const seedUser = await prisma.user.upsert({
    where: { email: 'seeduser@thrifty.com' },
    update: {},
    create: {
      email: 'seeduser@thrifty.com',
      passwordHash: hashedPassword,
      fullName: 'Ahmet Yılmaz (Seed)',
      role: 'USER',
      latitude: 41.0082,
      longitude: 28.9784, // İstanbul
    },
  });

  console.log(`👤 Kullanıcı hazır: ${seedUser.email}`);

  // 2. Ana Kategoriler ve Alt Kategoriler Oluştur
  const mainCategoriesData = [
    { name: 'Elektronik',               slug: 'elektronik',               icon: '💻' },
    { name: 'Ev & Yaşam',               slug: 'ev-yasam',                 icon: '🛋️' },
    { name: 'Gıda',                     slug: 'gida',                     icon: '🥗' },
    { name: 'Kırtasiye',                slug: 'kirtasiye',                icon: '📚' },
    { name: 'Giyim & Aksesuar',         slug: 'giyim-aksesuar',           icon: '👕' },
    { name: 'Anne & Bebek & Oyuncak',   slug: 'anne-bebek-oyuncak',       icon: '🍼' },
    { name: 'Pet Shop',                 slug: 'pet-shop',                 icon: '🐾' },
  ];

  const subCategoriesData = [
    // Elektronik
    { name: 'Beyaz Eşya',         slug: 'beyaz-esya',          icon: '🫧',  parentSlug: 'elektronik' },
    { name: 'Ev Aletleri',        slug: 'ev-aletleri',         icon: '🔌',  parentSlug: 'elektronik' },
    { name: 'TV, Görüntü & Ses',  slug: 'tv-goruntu-ses',      icon: '📺',  parentSlug: 'elektronik' },
    { name: 'Kamera',             slug: 'kamera',              icon: '📷',  parentSlug: 'elektronik' },
    { name: 'Telefon',            slug: 'telefon',             icon: '📱',  parentSlug: 'elektronik' },
    { name: 'Tablet',             slug: 'tablet',              icon: '📲',  parentSlug: 'elektronik' },
    { name: 'Bilgisayar',         slug: 'bilgisayar',          icon: '🖥️',  parentSlug: 'elektronik' },
    // Ev & Yaşam
    { name: 'Mobilya',            slug: 'mobilya',             icon: '🪑',  parentSlug: 'ev-yasam' },
    { name: 'Mutfak Gereçleri',   slug: 'mutfak-gerecleri',    icon: '🍳',  parentSlug: 'ev-yasam' },
    { name: 'Dekorasyon',         slug: 'dekorasyon',          icon: '🖼️',  parentSlug: 'ev-yasam' },
    { name: 'Aydınlatma',         slug: 'aydinlatma',          icon: '💡',  parentSlug: 'ev-yasam' },
    { name: 'Ev Gereçleri',       slug: 'ev-gerecleri',        icon: '🧹',  parentSlug: 'ev-yasam' },
    // Gıda
    { name: 'Unlu Mamüller',      slug: 'unlu-mamuller',       icon: '🍞',  parentSlug: 'gida' },
    { name: 'Beyaz Et & Kırmızı Et', slug: 'et-urunleri',     icon: '🥩',  parentSlug: 'gida' },
    { name: 'Vegan',              slug: 'vegan',               icon: '🥦',  parentSlug: 'gida' },
    { name: 'Bakliyat',           slug: 'bakliyat',            icon: '🫘',  parentSlug: 'gida' },
    { name: 'Süt Ürünleri',       slug: 'sut-urunleri',        icon: '🥛',  parentSlug: 'gida' },
    // Kırtasiye
    { name: 'Kitap',              slug: 'kitap',               icon: '📖',  parentSlug: 'kirtasiye' },
    { name: 'Test Kitabı',        slug: 'test-kitabi',         icon: '📝',  parentSlug: 'kirtasiye' },
    { name: 'Kırtasiye Araçları', slug: 'kirtasiye-araclari',  icon: '✏️',  parentSlug: 'kirtasiye' },
    // Giyim & Aksesuar
    { name: 'Kadın',              slug: 'kadin',               icon: '👗',  parentSlug: 'giyim-aksesuar' },
    { name: 'Erkek',              slug: 'erkek',               icon: '👔',  parentSlug: 'giyim-aksesuar' },
    { name: 'Çocuk',              slug: 'cocuk',               icon: '🧒',  parentSlug: 'giyim-aksesuar' },
    // Anne & Bebek & Oyuncak
    { name: 'Bebek Arabası',      slug: 'bebek-arabasi',       icon: '🛒',  parentSlug: 'anne-bebek-oyuncak' },
    { name: 'Oyuncak',            slug: 'oyuncak',             icon: '🪀',  parentSlug: 'anne-bebek-oyuncak' },
    { name: 'Bebek Araç Gereçleri', slug: 'bebek-arac-gerecleri', icon: '🍼', parentSlug: 'anne-bebek-oyuncak' },
    { name: 'Bebek Mobilyası',    slug: 'bebek-mobilyasi',     icon: '🛏️',  parentSlug: 'anne-bebek-oyuncak' },
    { name: 'Anne Bebek Bakım',   slug: 'anne-bebek-bakim',    icon: '🧴',  parentSlug: 'anne-bebek-oyuncak' },
    // Pet Shop
    { name: 'Balık Ürünleri',     slug: 'balik-urunleri',      icon: '🐟',  parentSlug: 'pet-shop' },
    { name: 'Kedi Ürünleri',      slug: 'kedi-urunleri',       icon: '🐱',  parentSlug: 'pet-shop' },
    { name: 'Kuş Ürünleri',       slug: 'kus-urunleri',        icon: '🐦',  parentSlug: 'pet-shop' },
    { name: 'Köpek Ürünleri',     slug: 'kopek-urunleri',      icon: '🐶',  parentSlug: 'pet-shop' },
    { name: 'Diğer Evcil Hayvan', slug: 'diger-evcil-hayvan',  icon: '🐾',  parentSlug: 'pet-shop' },
  ];

  // Ana kategorileri oluştur
  const createdCategories = {};
  for (const cat of mainCategoriesData) {
    const category = await prisma.category.upsert({
      where: { slug: cat.slug },
      update: {},
      create: { name: cat.name, slug: cat.slug, icon: cat.icon },
    });
    createdCategories[cat.slug] = category;
  }
  console.log(`📁 ${mainCategoriesData.length} ana kategori hazır.`);

  // Alt kategorileri oluştur
  let subCount = 0;
  for (const sub of subCategoriesData) {
    const parent = createdCategories[sub.parentSlug];
    if (!parent) continue;
    await prisma.category.upsert({
      where: { slug: sub.slug },
      update: {},
      create: { name: sub.name, slug: sub.slug, icon: sub.icon, parentId: parent.id },
    });
    subCount++;
  }
  console.log(`📂 ${subCount} alt kategori hazır.`);

  // seed itemleri için eski kategori referansını uyumlu hale getir (ev-esyalari -> ev-yasam)
  const createdCategoriesCompat = {
    ...createdCategories,
    'ev-esyalari': createdCategories['ev-yasam'],
    'kitap-eglence': createdCategories['kirtasiye'],
    'giyim': createdCategories['giyim-aksesuar'],
    'spor-outdoor': createdCategories['elektronik'],
  };

  // 3. Örnek İlanlar (Items) Oluştur
  const itemsData = [
    {
      title: 'Çalışır Durumda Mikrodalga Fırın',
      description: 'Taşındığım için satıyorum. İçi temiz, sorunsuz çalışıyor. Sadece dış camında ufak bir çizik var. İhtiyacı olan bir öğrenciye gidebilir.',
      condition: 'GOOD',
      deliveryType: 'PICKUP',
      status: 'ACTIVE',
      latitude: 41.01,
      longitude: 28.98,
      address: 'Beşiktaş, İstanbul',
      categoryId: createdCategoriesCompat['ev-esyalari'].id,
    },
    {
      title: 'Logitech Kablosuz Mouse',
      description: 'Fazlalık olduğu için veriyorum. Pili yeni değiştirildi. USB alıcısıyla birlikte verilecektir.',
      condition: 'LIKE_NEW',
      deliveryType: 'BOTH',
      status: 'ACTIVE',
      latitude: 41.02,
      longitude: 29.00,
      address: 'Üsküdar, İstanbul',
      categoryId: createdCategoriesCompat['elektronik'].id,
    },
    {
      title: 'İngilizce Fantastik Roman Seti (5 Kitap)',
      description: 'Okunmuş ama yıpranmamış İngilizce fantastik roman seti (Yüzüklerin Efendisi vs.). Tek seferde hepsini vermek istiyorum. Kitap okumayı sevenler kaçırmasın.',
      condition: 'GOOD',
      deliveryType: 'DELIVERY',
      status: 'ACTIVE',
      latitude: 41.03,
      longitude: 28.98,
      address: 'Şişli, İstanbul',
      categoryId: createdCategoriesCompat['kitap-eglence'].id,
    },
    {
      title: 'Kışlık Kalın Mont (Erkek L Beden)',
      description: 'Geçen kış alındı, çok az giyildi. Sıcak tutar, herhangi bir yırtığı söküğü yoktur. Rengi koyu lacivert.',
      condition: 'LIKE_NEW',
      deliveryType: 'PICKUP',
      status: 'ACTIVE',
      latitude: 40.98,
      longitude: 29.02,
      address: 'Kadıköy, İstanbul',
      categoryId: createdCategoriesCompat['giyim'].id,
    },
    {
      title: '4 Kişilik Kamp Çadırı',
      description: 'Sadece 2 kez kampa gidildi. Hiçbir eksiği yok, polleri sağlam, su geçirmez. Artık kamp yapmadığım için veriyorum.',
      condition: 'GOOD',
      deliveryType: 'BOTH',
      status: 'ACTIVE',
      latitude: 41.05,
      longitude: 29.01,
      address: 'Levent, İstanbul',
      categoryId: createdCategoriesCompat['spor-outdoor'].id,
    },
    {
      title: '24 inç Oyuncu Monitörü (Arızalı)',
      description: 'Ekranda dikey bir çizgi çıkıyor. Tamir edebilecek veya yedek parça olarak kullanacak birisi alsın. Kutusuzdur.',
      condition: 'FAIR',
      deliveryType: 'PICKUP',
      status: 'ACTIVE',
      latitude: 41.00,
      longitude: 28.95,
      address: 'Fatih, İstanbul',
      categoryId: createdCategoriesCompat['elektronik'].id,
    }
  ];

  let addedItemsCount = 0;
  for (const item of itemsData) {
    // İlanın aynı başlıkla mükerrer eklenmesini önlemek için kontrol
    const existingItem = await prisma.item.findFirst({
      where: { title: item.title, userId: seedUser.id }
    });

    if (!existingItem) {
      await prisma.item.create({
        data: {
          ...item,
          userId: seedUser.id,
          images: [], 
        }
      });
      addedItemsCount++;
    }
  }

  console.log(`📦 ${addedItemsCount} yeni ilan eklendi.`);
  console.log('✅ Seed işlemi başarıyla tamamlandı!');
}

main()
  .catch((e) => {
    console.error('Seed sırasında hata oluştu:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
