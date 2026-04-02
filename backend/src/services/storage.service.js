const { supabase } = require('../middleware/auth');
const path = require('path');
const crypto = require('crypto');

const BUCKET_NAME = 'item-images';

// Supabase Storage'a dosya yukle
const uploadImage = async (fileBuffer, originalName, mimeType) => {
  const ext = path.extname(originalName);
  const fileName = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`;
  const filePath = `items/${fileName}`;

  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(filePath, fileBuffer, {
      contentType: mimeType,
      upsert: false,
    });

  if (error) throw new Error(`Upload hatasi: ${error.message}`);

  const { data: { publicUrl } } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(filePath);

  return publicUrl;
};

// Dosya sil
const deleteImage = async (fileUrl) => {
  try {
    const urlParts = fileUrl.split(`${BUCKET_NAME}/`);
    if (urlParts.length < 2) return;
    const filePath = urlParts[1];

    await supabase.storage.from(BUCKET_NAME).remove([filePath]);
  } catch (error) {
    console.error('Dosya silme hatasi:', error);
  }
};

module.exports = { uploadImage, deleteImage };
