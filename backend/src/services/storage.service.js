const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

let supabase;
if (supabaseUrl && supabaseKey) {
  supabase = createClient(supabaseUrl, supabaseKey);
}

// Supabase 'images' bucketine dosya yükle
const uploadImage = async (fileBuffer, originalName, mimeType) => {
  if (!supabase) {
    console.log('⚠️ [DEV MODE] Supabase SUPABASE_URL veya SUPABASE_KEY eksik, mock URL dönülüyor.');
    return 'https://images.unsplash.com/photo-1584824486509-112e4181ff6b?auto=format&fit=crop&q=80&w=800';
  }

  // Benzersiz dosya adı oluştur
  const fileExt = originalName.split('.').pop() || 'jpg';
  const fileName = `${crypto.randomUUID()}.${fileExt}`;
  const filePath = `thrifty/items/${fileName}`;

  const { data, error } = await supabase
    .storage
    .from('images')
    .upload(filePath, fileBuffer, {
      contentType: mimeType,
      upsert: false
    });

  if (error) {
    console.error('Supabase upload hatası:', error);
    throw error;
  }

  // Public URL'i al
  const { data: publicData } = supabase
    .storage
    .from('images')
    .getPublicUrl(filePath);

  return publicData.publicUrl;
};

// Dosya sil (Supabase Storage üzerinden)
const deleteImage = async (fileUrl) => {
  if (!supabase || !fileUrl) return;

  try {
    // URL'den path'i çıkar
    // Örnek: https://xyz.supabase.co/storage/v1/object/public/images/thrifty/items/abc.jpg
    const parts = fileUrl.split('/images/');
    if (parts.length < 2) return;
    
    const filePath = parts[1]; // thrifty/items/abc.jpg
    await supabase.storage.from('images').remove([filePath]);
  } catch (error) {
    console.error('Supabase dosya silme hatası:', error);
  }
};

module.exports = { uploadImage, deleteImage };
