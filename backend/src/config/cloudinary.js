const cloudinary = require('cloudinary').v2;

// Cloudinary configurasyonu
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'demo_cloud',
  api_key: process.env.CLOUDINARY_API_KEY || 'demo_api_key',
  api_secret: process.env.CLOUDINARY_API_SECRET || 'demo_api_secret'
});

module.exports = cloudinary;
