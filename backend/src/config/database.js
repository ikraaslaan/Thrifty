const { PrismaClient } = require('@prisma/client');

// Singleton pattern - tek bir Prisma instance
let prisma;

if (process.env.NODE_ENV === 'production') {
    prisma = new PrismaClient();
} else {
    // Development'ta hot-reload sırasında çoklu instance oluşmasını engelle
    if (!global.__prisma) {
        global.__prisma = new PrismaClient({
            log: ['query', 'info', 'warn', 'error'],
        });
    }
    prisma = global.__prisma;
}

module.exports = prisma;
