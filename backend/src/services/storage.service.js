const cloudinary = require('../config/cloudinary');
const streamifier = require('streamifier');

const UPLOAD_FOLDER = 'thrifty/items';

// Cloudinary'ye Stream (Buffer) uzerinden dosya yukle
const uploadImage = (fileBuffer, originalName, mimeType) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: UPLOAD_FOLDER,
        format: mimeType.split('/')[1] === 'jpeg' ? 'jpg' : mimeType.split('/')[1]
      },
      (error, result) => {
        if (result) {
          resolve(result.secure_url);
        } else {
          reject(error);
        }
      }
    );

    // Buffer'i stream'e cevirip cloudinary yukleme stream'ine boruluyoruz (pipe)
    streamifier.createReadStream(fileBuffer).pipe(uploadStream);
  });
};

// Dosya sil (Cloudinary API uzerinden Public ID kullanarak)
const deleteImage = async (fileUrl) => {
  try {
    // Ornek url: https://res.cloudinary.com/demo/image/upload/v12345/thrifty/items/abcdefg.jpg
    // Public ID cikarimi icin basit bir split mantigi
    const parts = fileUrl.split('/upload/');
    if (parts.length < 2) return;
    
    // v12345/kismi ve uzanti (.jpg) temizlenmeli
    // Basitce /upload/ sonrasini / ile kirip versiyon kismini atip . ile uzantiyi cikaralim
    let pathPart = parts[1];
    const slashIndex = pathPart.indexOf('/');
    // v12345 seklindeki versiyondan kurtulma
    if (pathPart.substring(0, slashIndex).match(/^v\d+/)) {
      pathPart = pathPart.substring(slashIndex + 1);
    }
    // Uzantidan kurtulma
    const publicId = pathPart.substring(0, pathPart.lastIndexOf('.'));
    
    if (publicId) {
      await cloudinary.uploader.destroy(publicId);
    }
  } catch (error) {
    console.error('Dosya silme hatasi:', error);
  }
};

module.exports = { uploadImage, deleteImage };
