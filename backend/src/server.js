require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const prisma = require('./config/database');
const routes = require('./routes');

const app = express();
const PORT = process.env.PORT || 5000;

// ==================== MIDDLEWARE ====================
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ==================== ROUTES ====================
app.use('/api', routes);

// ==================== HEALTH CHECK ====================
app.get('/api/health', async (req, res) => {
    try {
        // Veritabanı bağlantısını kontrol et
        await prisma.$queryRaw`SELECT 1`;
        res.json({
            status: 'ok',
            timestamp: new Date().toISOString(),
            database: 'connected',
            uptime: process.uptime(),
        });
    } catch (error) {
        res.status(503).json({
            status: 'error',
            timestamp: new Date().toISOString(),
            database: 'disconnected',
            error: error.message,
        });
    }
});

// ==================== 404 HANDLER ====================
app.use((req, res) => {
    res.status(404).json({
        status: 'error',
        message: `Route ${req.method} ${req.url} bulunamadı`,
    });
});

// ==================== ERROR HANDLER ====================
app.use((err, req, res, next) => {
    console.error('❌ Sunucu hatası:', err.stack);
    res.status(500).json({
        status: 'error',
        message: process.env.NODE_ENV === 'production'
            ? 'Sunucu hatası'
            : err.message,
    });
});

// ==================== START SERVER ====================
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
      console.log(`\n🚀 Thrifty Backend calisiyor: http://localhost:${PORT}`);
      console.log(`📊 Health Check: http://localhost:${PORT}/api/health`);
      console.log(`🌍 Ortam: ${process.env.NODE_ENV || 'development'}\n`);
  });
}

module.exports = app;
