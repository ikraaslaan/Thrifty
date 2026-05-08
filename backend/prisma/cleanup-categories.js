require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function cleanAndRebuild() {
  console.log('🧹 Kategori temizliği başlıyor...');

  // 1. Tüm kategorileri çek
  const all = await prisma.category.findMany();
  console.log(`Toplam ${all.length} kategori bulundu.`);

  // 2. Tutmak istediğimiz yeni ana kategori slug'ları
  const newMainSlugs = [
    'elektronik',
    'ev-yasam',
    'gida',
    'kirtasiye',
    'giyim-aksesuar',
    'anne-bebek-oyuncak',
    'pet-shop',
  ];

  // 3. Tutmak istediğimiz alt kategori slug'ları
  const newSubSlugs = [
    // Elektronik
    'beyaz-esya', 'ev-aletleri', 'tv-goruntu-ses', 'kamera', 'telefon', 'tablet', 'bilgisayar',
    // Ev & Yaşam
    'mobilya', 'mutfak-gerecleri', 'dekorasyon', 'aydinlatma', 'ev-gerecleri',
    // Gıda
    'unlu-mamuller', 'et-urunleri', 'vegan', 'bakliyat', 'sut-urunleri',
    // Kırtasiye
    'kitap', 'test-kitabi', 'kirtasiye-araclari',
    // Giyim
    'kadin', 'erkek', 'cocuk',
    // Anne & Bebek
    'bebek-arabasi', 'oyuncak', 'bebek-arac-gerecleri', 'bebek-mobilyasi', 'anne-bebek-bakim',
    // Pet Shop
    'balik-urunleri', 'kedi-urunleri', 'kus-urunleri', 'kopek-urunleri', 'diger-evcil-hayvan',
  ];

  const keepSlugs = [...newMainSlugs, ...newSubSlugs];

  // 4. Silinecekleri belirle
  const toDelete = all.filter(c => !keepSlugs.includes(c.slug));
  console.log(`🗑️  Silinecek ${toDelete.length} gereksiz kategori:`);
  toDelete.forEach(c => console.log(`   - ${c.name} (${c.slug})`));

  // 5. Silinecek kategorilere bağlı ilanların categoryId'sini güvenli bir kategoriye taşı
  //    "Elektronik" ana kategorisini fallback olarak kullan
  const fallback = all.find(c => c.slug === 'elektronik');
  if (!fallback) {
    throw new Error('Fallback kategori (elektronik) bulunamadı!');
  }

  for (const cat of toDelete) {
    const itemCount = await prisma.item.count({ where: { categoryId: cat.id } });
    if (itemCount > 0) {
      console.log(`   ↳ ${cat.name} altındaki ${itemCount} ilan fallback'e taşınıyor...`);
      await prisma.item.updateMany({
        where: { categoryId: cat.id },
        data: { categoryId: fallback.id },
      });
    }
    await prisma.category.delete({ where: { id: cat.id } });
  }

  // 6. Eksik "Mobilya" alt kategorisini Ev & Yaşam altına taşı (şu an ana kategori)
  //    Şu an Mobilya parentId: null ise düzelt
  const evYasam = await prisma.category.findUnique({ where: { slug: 'ev-yasam' } });
  const mobilya = await prisma.category.findUnique({ where: { slug: 'mobilya' } });
  if (mobilya && mobilya.parentId === null && evYasam) {
    await prisma.category.update({
      where: { id: mobilya.id },
      data: { parentId: evYasam.id },
    });
    console.log('✅ Mobilya → Ev & Yaşam altına taşındı.');
  }

  // Aynı şekilde Oyuncak ve Kitap'ı da kontrol et
  const kirtasiye = await prisma.category.findUnique({ where: { slug: 'kirtasiye' } });
  const kitap = await prisma.category.findUnique({ where: { slug: 'kitap' } });
  if (kitap && kitap.parentId === null && kirtasiye) {
    await prisma.category.update({
      where: { id: kitap.id },
      data: { parentId: kirtasiye.id },
    });
    console.log('✅ Kitap → Kırtasiye altına taşındı.');
  }

  const anneBebek = await prisma.category.findUnique({ where: { slug: 'anne-bebek-oyuncak' } });
  const oyuncak = await prisma.category.findUnique({ where: { slug: 'oyuncak' } });
  if (oyuncak && oyuncak.parentId === null && anneBebek) {
    await prisma.category.update({
      where: { id: oyuncak.id },
      data: { parentId: anneBebek.id },
    });
    console.log('✅ Oyuncak → Anne & Bebek & Oyuncak altına taşındı.');
  }

  // 7. Bebek Arabası'nın parent_id'si eksikse ekle
  const bebekArabasi = await prisma.category.findUnique({ where: { slug: 'bebek-arabasi' } });
  if (bebekArabasi && bebekArabasi.parentId === null && anneBebek) {
    await prisma.category.update({
      where: { id: bebekArabasi.id },
      data: { parentId: anneBebek.id },
    });
    console.log('✅ Bebek Arabası → Anne & Bebek & Oyuncak altına taşındı.');
  }

  // 8. Son durumu raporla
  const remaining = await prisma.category.findMany({
    where: { parentId: null },
    include: { children: true },
    orderBy: { name: 'asc' },
  });

  console.log('\n📊 Temizlik sonrası ana kategoriler:');
  for (const c of remaining) {
    console.log(`  ✅ ${c.icon} ${c.name} — ${c.children.length} alt kategori`);
  }

  console.log('\n✅ Temizlik tamamlandı!');
}

cleanAndRebuild()
  .catch((e) => {
    console.error('Hata:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
