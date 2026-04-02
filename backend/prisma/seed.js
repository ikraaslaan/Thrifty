const { PrismaClient } = require('@prisma/client');

const categories = [
  {
    name: 'Gıda',
    slug: 'gida',
    icon: '🍎',
  },
  {
    name: 'Giyim',
    slug: 'giyim',
    icon: '👕',
  },
  {
    name: 'Elektronik',
    slug: 'elektronik',
    icon: '📱',
  },
  {
    name: 'Mobilya',
    slug: 'mobilya',
    icon: '🪑',
  },
  {
    name: 'Kitap',
    slug: 'kitap',
    icon: '📚',
  },
  {
    name: 'Ev Eşyası',
    slug: 'ev-esyasi',
    icon: '🏠',
  },
  {
    name: 'Oyuncak',
    slug: 'oyuncak',
    icon: '🧸',
  },
  {
    name: 'Diğer',
    slug: 'diger',
    icon: '📦',
  },
];

async function main() {
  const prisma = new PrismaClient();

  console.log('🌱 Seed verileri ekleniyor...');

  for (const category of categories) {
    await prisma.category.upsert({
      where: { slug: category.slug },
      update: {},
      create: category,
    });
    console.log(`  ✅ Kategori eklendi: ${category.icon} ${category.name}`);
  }

  console.log('\n🎉 Seed tamamlandı!');
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error('❌ Seed hatası:', e);
  process.exit(1);
});
