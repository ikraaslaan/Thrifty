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

  // 2. Örnek Kategoriler Oluştur
  const categoriesData = [
    { name: 'Elektronik', slug: 'elektronik', icon: '💻' },
    { name: 'Ev Eşyaları', slug: 'ev-esyalari', icon: '🛋️' },
    { name: 'Giyim', slug: 'giyim', icon: '👕' },
    { name: 'Kitap & Eğlence', slug: 'kitap-eglence', icon: '📚' },
    { name: 'Spor & Outdoor', slug: 'spor-outdoor', icon: '⛺' }
  ];

  const createdCategories = [];
  for (const cat of categoriesData) {
    const category = await prisma.category.upsert({
      where: { slug: cat.slug },
      update: {},
      create: cat,
    });
    createdCategories.push(category);
  }
  
  console.log(`📁 ${createdCategories.length} kategori hazır.`);

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
      categoryId: createdCategories.find(c => c.slug === 'ev-esyalari').id,
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
      categoryId: createdCategories.find(c => c.slug === 'elektronik').id,
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
      categoryId: createdCategories.find(c => c.slug === 'kitap-eglence').id,
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
      categoryId: createdCategories.find(c => c.slug === 'giyim').id,
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
      categoryId: createdCategories.find(c => c.slug === 'spor-outdoor').id,
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
      categoryId: createdCategories.find(c => c.slug === 'elektronik').id,
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
