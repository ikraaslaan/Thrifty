import { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Upload,
  X,
  Image as ImageIcon,
  ChevronDown,
  AlertCircle,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import axiosClient from '../api/axiosClient';
import { TURKEY_CITIES, TURKEY_CITY_LIST } from '../data/turkeyCities';

// ─── Tip Tanımları ───────────────────────────────────────────────────────────

interface Category {
  id: string;
  name: string;
  slug: string;
  icon?: string;
  parentId: string | null;
  children?: Category[];
}

interface FormData {
  title: string;
  description: string;
  condition: string;
  deliveryType: string;
  address: string;
  categoryId: string;
  subCategoryId: string;
  expiresAt: string;
}

// ─── Sabit Veriler ────────────────────────────────────────────────────────────

const CONDITIONS = [
  { value: 'NEW',      label: 'Sıfır — Hiç Kullanılmamış' },
  { value: 'LIKE_NEW', label: 'Az Kullanılmış' },
  { value: 'GOOD',     label: 'Orta Durumda' },
  { value: 'FAIR',     label: 'Kötü Durumda' },
];

const DELIVERY_TYPES = [
  { value: 'PICKUP',   label: 'Elden Teslim' },
  { value: 'DELIVERY', label: 'Kargo / Teslimat' },
  { value: 'BOTH',     label: 'Her İkisi de Olur' },
];

// ─── Yardımcı Bileşenler ──────────────────────────────────────────────────────

const FormLabel = ({ children, required }: { children: React.ReactNode; required?: boolean }) => (
  <label
    className="block text-xs font-semibold uppercase tracking-widest mb-2"
    style={{ color: 'var(--color-ink-light)' }}
  >
    {children}
    {required && <span style={{ color: 'var(--color-artisan-orange)' }}> *</span>}
  </label>
);

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 14px',
  borderRadius: '12px',
  border: '1px solid rgba(74,59,50,0.15)',
  background: 'rgba(255,255,255,0.7)',
  color: 'var(--color-ink-dark)',
  fontFamily: 'var(--font-sans)',
  fontSize: '14px',
  outline: 'none',
  transition: 'border-color 0.2s',
};

const SearchableSelect = ({
  label,
  placeholder,
  value,
  options,
  onChange,
  disabled,
}: {
  label: string;
  placeholder: string;
  value: string;
  options: string[];
  onChange: (val: string) => void;
  disabled?: boolean;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSearch(value);
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setSearch(value);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [value]);

  const filteredOptions = options.filter(opt =>
    opt.toLocaleLowerCase('tr-TR').includes(search.toLocaleLowerCase('tr-TR'))
  );

  return (
    <div ref={containerRef} className="relative w-full">
      <FormLabel required>{label}</FormLabel>
      <div className="relative">
        <input
          type="text"
          value={search}
          disabled={disabled}
          onChange={(e) => {
            setSearch(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => !disabled && setIsOpen(true)}
          placeholder={placeholder}
          style={{
            ...inputStyle,
            opacity: disabled ? 0.5 : 1,
            paddingRight: '36px',
          }}
        />
        <ChevronDown
          size={16}
          className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-ink-light"
          style={{ color: 'var(--color-ink-light)' }}
        />
      </div>

      {isOpen && !disabled && (
        <ul
          className="absolute left-0 right-0 mt-1 max-h-60 overflow-y-auto bg-white border border-gray-200 rounded-xl shadow-lg z-50 py-1"
          style={{ fontFamily: 'var(--font-sans)', border: '1px solid rgba(74,59,50,0.08)' }}
        >
          {filteredOptions.length === 0 ? (
            <li className="px-4 py-2 text-xs text-gray-500">Sonuç bulunamadı</li>
          ) : (
            filteredOptions.map((opt) => (
              <li
                key={opt}
                onClick={() => {
                  onChange(opt);
                  setSearch(opt);
                  setIsOpen(false);
                }}
                className={`px-4 py-2 text-sm cursor-pointer transition-colors ${
                  opt === value
                    ? 'bg-orange-50 text-artisan-orange font-semibold'
                    : 'hover:bg-gray-50 text-ink-dark'
                }`}
              >
                {opt}
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
};

// ─── Ana Bileşen ──────────────────────────────────────────────────────────────

const SharePage = () => {
  const navigate = useNavigate();
  const { id } = useParams(); // Edit modundaysak id gelir

  // ── State ──
  const [images, setImages] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [categories, setCategories] = useState<Category[]>([]);
  const [subCategories, setSubCategories] = useState<Category[]>([]);
  const [loadingCats, setLoadingCats] = useState(true);

  const [form, setForm] = useState<FormData>({
    title: '',
    description: '',
    condition: 'GOOD',
    deliveryType: 'PICKUP',
    address: '',
    categoryId: '',
    subCategoryId: '',
    expiresAt: '',
  });

  const [selectedCity, setSelectedCity] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // ── Kategorileri çek — API zaten children ile birlikte döndürüyor ──
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await axiosClient.get('/categories');
        // API: { status: 'success', data: [ { ...category, children: [...] } ] }
        const data: Category[] = res.data?.data ?? res.data ?? [];
        setCategories(data); // Zaten sadece ana kategoriler + children içinde
      } catch {
        // Hata durumunda boş bırak
      } finally {
        setLoadingCats(false);
      }
    };
    fetchCategories();
  }, []);

  // ── Ana kategori değişince children'dan alt kategorileri al ──
  useEffect(() => {
    if (!form.categoryId) {
      setSubCategories([]);
      // Sadece kullanıcı manuel değiştirdiğinde alt kategoriyi sıfırla
      return;
    }
    const selected = categories.find((c) => c.id === form.categoryId);
    setSubCategories(selected?.children ?? []);
    // Edit modunda ilk yüklemede subCategoryId zaten doludur, sıfırlamamak için dikkat etmeli.
  }, [form.categoryId, categories]);

  // ── Eğer Edit Modundaysak İlanı Çek ──
  useEffect(() => {
    if (!id || categories.length === 0) return; // Kategoriler gelmeden formu doldurma ki eşleşmeler düzgün olsun

    const fetchItem = async () => {
      try {
        const res = await axiosClient.get(`/items/${id}`);
        const item = res.data?.data;
        if (item) {
          // Kategori ID'si bir alt kategori mi ana kategori mi bulmamız lazım
          let mainCatId = item.categoryId;
          let subCatId = '';

          // Gelen kategori id'si bir ana kategori mi?
          const isMainCat = categories.some(c => c.id === item.categoryId);
          if (!isMainCat) {
            // Eğer ana kategori değilse, alt kategoridir. Parent'ını bulalım.
            for (const mainCat of categories) {
              const foundSub = mainCat.children?.find(sub => sub.id === item.categoryId);
              if (foundSub) {
                mainCatId = mainCat.id;
                subCatId = foundSub.id;
                break;
              }
            }
          }

          setForm({
            title: item.title,
            description: item.description,
            condition: item.condition,
            deliveryType: item.deliveryType,
            address: item.address || '',
            categoryId: mainCatId,
            subCategoryId: subCatId,
            expiresAt: item.expiresAt ? new Date(item.expiresAt).toISOString().split('T')[0] : '',
          });

          if (item.address) {
            const parts = item.address.split(',').map((p: string) => p.trim());
            if (parts.length >= 2) {
              setSelectedDistrict(parts[0]);
              setSelectedCity(parts[1]);
            } else if (parts.length === 1) {
              setSelectedCity(parts[0]);
            }
          }

          // Mevcut resimleri previews olarak ekle (eski resimler URL olarak kalacak)
          if (item.images && item.images.length > 0) {
            setPreviews(item.images);
          }
        }
      } catch (err) {
        setError('İlan bilgileri alınamadı.');
      }
    };
    fetchItem();
  }, [id, categories]);

  // ── Gıda kategorisi kontrolü ──
  const selectedCatSlug = categories.find((c) => c.id === form.categoryId)?.slug ?? '';
  const isGida = selectedCatSlug === 'gida';

  // ── Resim ekleme ──
  const addFiles = useCallback((files: FileList | null) => {
    if (!files) return;
    const valid = Array.from(files).filter((f) => {
      if (!f.type.startsWith('image/')) return false;
      if (f.size > 5 * 1024 * 1024) return false;
      return true;
    });
    setImages((prev) => {
      const combined = [...prev, ...valid].slice(0, 5);
      return combined;
    });
    const newPreviews = valid.map((f) => URL.createObjectURL(f));
    setPreviews((prev) => [...prev, ...newPreviews].slice(0, 5));
  }, []);

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
    setPreviews((prev) => {
      URL.revokeObjectURL(prev[index]);
      return prev.filter((_, i) => i !== index);
    });
  };

  // ── Drag & Drop ──
  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      addFiles(e.dataTransfer.files);
    },
    [addFiles]
  );

  // ── Form değişikliği ──
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  // ── Submit ──
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Basit doğrulama
    if (!form.title.trim()) return setError('Ürün ismi zorunludur.');
    if (!form.description.trim()) return setError('Açıklama zorunludur.');
    if (!form.address.trim()) return setError('Konum zorunludur.');
    if (!form.categoryId) return setError('Kategori seçimi zorunludur.');
    if (images.length === 0 && previews.length === 0) return setError('En az 1 resim eklemelisiniz.');
    if (isGida && !form.expiresAt) return setError('Gıda ilanları için son kullanma tarihi zorunludur.');

    setSubmitting(true);
    try {
      // 1) Yeni eklenen Resimleri yükle (File olanlar)
      let uploadedUrls: string[] = [];
      if (images.length > 0) {
        const fd = new FormData();
        images.forEach((img) => fd.append('images', img));
        const uploadRes = await axiosClient.post('/upload/multiple', fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        uploadedUrls = uploadRes.data?.urls ?? uploadRes.data?.data?.urls ?? [];
      }

      // Mevcut resimler (URL string olanlar, `images` dizisine eklenmeyenler `previews` içindedir)
      // `previews` içinde `blob:` ile BAŞLAMAYANLAR eski resimlerdir.
      const existingUrls = previews.filter(p => !p.startsWith('blob:'));
      const finalImageUrls = [...existingUrls, ...uploadedUrls];

      // 2) İlanı oluştur veya güncelle
      const effectiveCategoryId = form.subCategoryId || form.categoryId;
      
      const payload = {
        title: form.title.trim(),
        description: form.description.trim(),
        condition: form.condition,
        deliveryType: form.deliveryType,
        address: form.address.trim(),
        categoryId: effectiveCategoryId,
        images: finalImageUrls,
        latitude: 41.0082,  // Varsayılan — ileride harita ile güncellenecek
        longitude: 28.9784,
        ...(isGida && form.expiresAt ? { expiresAt: new Date(form.expiresAt).toISOString() } : {}),
      };

      if (id) {
        await axiosClient.put(`/items/${id}`, payload);
      } else {
        await axiosClient.post('/items', payload);
      }

      setSuccess(true);
      setTimeout(() => navigate('/'), 2000);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Bir hata oluştu. Lütfen tekrar deneyin.';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  if (success) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center gap-4"
        style={{ paddingTop: '80px', background: 'var(--color-paper)' }}
      >
        <div
          className="w-20 h-20 rounded-full flex items-center justify-center"
          style={{ background: 'rgba(130,162,132,0.15)' }}
        >
          <CheckCircle2 size={40} style={{ color: 'var(--color-artisan-sage)' }} />
        </div>
        <h2 className="font-serif text-2xl font-bold" style={{ color: 'var(--color-ink-dark)' }}>
          {id ? 'İlanınız Güncellendi!' : 'İlanınız Yayınlandı!'}
        </h2>
        <p className="text-sm" style={{ color: 'var(--color-ink-light)' }}>
          Ana sayfaya yönlendiriliyorsunuz...
        </p>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen"
      style={{ paddingTop: '80px', background: 'var(--color-paper)' }}
    >
      {/* ─── Header ─── */}
      <div
        className="w-full py-8 px-4 md:px-8"
        style={{
          borderBottom: '1px solid rgba(74,59,50,0.08)',
          background: 'rgba(247,244,240,0.9)',
        }}
      >
        <div className="max-w-6xl mx-auto">
          <p
            className="text-xs font-semibold uppercase tracking-widest mb-1"
            style={{ color: 'var(--color-artisan-orange)' }}
          >
            Yeni İlan
          </p>
          <h1
            className="font-serif font-bold text-3xl md:text-4xl"
            style={{ color: 'var(--color-ink-dark)' }}
          >
            {id ? 'İlanı Düzenle' : 'Bir Şey Paylaş'}
          </h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--color-ink-light)' }}>
            {id ? 'İlan detaylarını güncelleyebilirsin.' : 'İhtiyacı olan biriyle buluşturmak için ilanını oluştur.'}
          </p>
        </div>
      </div>

      {/* ─── Split View ─── */}
      <form onSubmit={handleSubmit}>
        <div className="max-w-6xl mx-auto px-4 md:px-8 py-8 flex flex-col lg:flex-row gap-8">

          {/* ── SOL: Resim Yükleme ── */}
          <div className="lg:w-2/5 flex-shrink-0">
            <div
              className="sticky"
              style={{ top: '96px' }}
            >
              <FormLabel>Fotoğraflar (1-5)</FormLabel>

              {/* Drop Zone */}
              <div
                id="image-drop-zone"
                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
                onClick={() => images.length < 5 && fileInputRef.current?.click()}
                className="relative flex flex-col items-center justify-center gap-3 rounded-2xl transition-all duration-200 cursor-pointer"
                style={{
                  minHeight: '280px',
                  border: dragging
                    ? '2px dashed var(--color-artisan-orange)'
                    : '2px dashed rgba(74,59,50,0.2)',
                  background: dragging
                    ? 'rgba(212,141,91,0.06)'
                    : 'rgba(255,255,255,0.5)',
                  boxShadow: dragging ? '0 0 0 4px rgba(212,141,91,0.08)' : 'none',
                }}
              >
                {previews.length === 0 ? (
                  <>
                    <div
                      className="w-14 h-14 rounded-full flex items-center justify-center"
                      style={{ background: 'rgba(212,141,91,0.1)' }}
                    >
                      <Upload size={22} style={{ color: 'var(--color-artisan-orange)' }} />
                    </div>
                    <div className="text-center px-4">
                      <p className="text-sm font-semibold" style={{ color: 'var(--color-ink-dark)' }}>
                        Fotoğraf sürükle veya tıkla
                      </p>
                      <p className="text-xs mt-1" style={{ color: 'var(--color-ink-light)' }}>
                        PNG, JPG, WEBP — max 5MB — en fazla 5 fotoğraf
                      </p>
                    </div>
                  </>
                ) : (
                  <div className="w-full p-3 grid grid-cols-2 gap-3">
                    {previews.map((src, i) => (
                      <div
                        key={i}
                        className="relative rounded-xl overflow-hidden group"
                        style={{ aspectRatio: '1', background: 'rgba(74,59,50,0.05)' }}
                      >
                        <img
                          src={src}
                          alt={`preview-${i}`}
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); removeImage(i); }}
                          className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                          style={{ background: 'rgba(0,0,0,0.65)', color: '#fff' }}
                        >
                          <X size={12} />
                        </button>
                        {i === 0 && (
                          <span
                            className="absolute bottom-1.5 left-1.5 text-xs px-2 py-0.5 rounded-full font-semibold"
                            style={{
                              background: 'var(--color-artisan-orange)',
                              color: '#fff',
                              fontSize: '10px',
                            }}
                          >
                            Kapak
                          </span>
                        )}
                      </div>
                    ))}

                    {/* Daha fazla ekle butonu */}
                    {previews.length < 5 && (
                      <div
                        className="rounded-xl flex flex-col items-center justify-center gap-1 cursor-pointer transition-colors"
                        style={{
                          aspectRatio: '1',
                          border: '2px dashed rgba(74,59,50,0.15)',
                          background: 'rgba(255,255,255,0.5)',
                        }}
                      >
                        <ImageIcon size={20} style={{ color: 'var(--color-ink-light)' }} />
                        <span className="text-xs" style={{ color: 'var(--color-ink-light)' }}>
                          Ekle
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => addFiles(e.target.files)}
              />

              {/* Fotoğraf ipuçları */}
              <div
                className="mt-4 rounded-xl p-4 text-xs space-y-1"
                style={{
                  background: 'rgba(130,162,132,0.08)',
                  border: '1px solid rgba(130,162,132,0.2)',
                  color: 'var(--color-ink-light)',
                }}
              >
                <p className="font-semibold" style={{ color: 'var(--color-artisan-sage-dark)' }}>
                  💡 İyi bir ilan için ipuçları
                </p>
                <p>• İlk fotoğraf kapak olarak gösterilir</p>
                <p>• Ürünü iyi aydınlatılmış ortamda çek</p>
                <p>• Hasarları varsa mutlaka fotoğrafa ekle</p>
              </div>
            </div>
          </div>

          {/* ── SAĞ: Form ── */}
          <div className="flex-1 min-w-0">
            <div
              className="rounded-2xl p-6 md:p-8"
              style={{
                background: '#fff',
                boxShadow: '0 2px 24px rgba(74,59,50,0.06)',
                border: '1px solid rgba(74,59,50,0.06)',
              }}
            >
              {/* Ürün İsmi */}
              <div className="mb-5">
                <FormLabel required>Ürün İsmi</FormLabel>
                <input
                  id="share-title"
                  type="text"
                  name="title"
                  value={form.title}
                  onChange={handleChange}
                  placeholder="Ne paylaşıyorsunuz? (örn. Logitech Mouse, Kışlık Mont...)"
                  style={inputStyle}
                  maxLength={100}
                />
                <p
                  className="mt-1 text-right text-xs"
                  style={{ color: 'var(--color-ink-light)' }}
                >
                  {form.title.length}/100
                </p>
              </div>

              {/* Açıklama */}
              <div className="mb-5">
                <FormLabel required>Açıklama</FormLabel>
                <textarea
                  id="share-description"
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  placeholder="Ürün hakkında kısa ve samimi bilgi verin. Durumu, marka/model, neden paylaşıyorsunuz... (Maksimum 250 karakter)"
                  rows={4}
                  style={{ ...inputStyle, resize: 'vertical', minHeight: '110px' }}
                  maxLength={250}
                />
                <p
                  className="mt-1 text-right text-xs"
                  style={{ color: 'var(--color-ink-light)' }}
                >
                  {form.description.length}/250
                </p>
              </div>

              {/* Durum + Teslimat */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-5">
                <div>
                  <FormLabel required>Ürün Durumu</FormLabel>
                  <div className="relative">
                    <select
                      id="share-condition"
                      name="condition"
                      value={form.condition}
                      onChange={handleChange}
                      style={{ ...inputStyle, appearance: 'none', paddingRight: '36px' }}
                    >
                      {CONDITIONS.map((c) => (
                        <option key={c.value} value={c.value}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                    <ChevronDown
                      size={16}
                      className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"
                      style={{ color: 'var(--color-ink-light)' }}
                    />
                  </div>
                </div>

                <div>
                  <FormLabel required>Teslimat Şekli</FormLabel>
                  <div className="relative">
                    <select
                      id="share-delivery"
                      name="deliveryType"
                      value={form.deliveryType}
                      onChange={handleChange}
                      style={{ ...inputStyle, appearance: 'none', paddingRight: '36px' }}
                    >
                      {DELIVERY_TYPES.map((d) => (
                        <option key={d.value} value={d.value}>
                          {d.label}
                        </option>
                      ))}
                    </select>
                    <ChevronDown
                      size={16}
                      className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"
                      style={{ color: 'var(--color-ink-light)' }}
                    />
                  </div>
                </div>
              </div>

              {/* Konum (İl/İlçe) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-5">
                <SearchableSelect
                  label="İl"
                  placeholder="İl seçin veya arayın..."
                  value={selectedCity}
                  options={TURKEY_CITY_LIST}
                  onChange={(city) => {
                    setSelectedCity(city);
                    setSelectedDistrict('');
                    setForm((prev) => ({ ...prev, address: city ? `, ${city}` : '' }));
                  }}
                />

                <SearchableSelect
                  label="İlçe"
                  placeholder="İlçe seçin veya arayın..."
                  value={selectedDistrict}
                  options={selectedCity ? TURKEY_CITIES[selectedCity] ?? [] : []}
                  disabled={!selectedCity}
                  onChange={(district) => {
                    setSelectedDistrict(district);
                    setForm((prev) => ({
                      ...prev,
                      address: district && selectedCity ? `${district}, ${selectedCity}` : selectedCity,
                    }));
                  }}
                />
              </div>

              {/* Kategori + Alt Kategori */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-5">
                <div>
                  <FormLabel required>Kategori</FormLabel>
                  <div className="relative">
                    <select
                      id="share-category"
                      name="categoryId"
                      value={form.categoryId}
                      onChange={handleChange}
                      style={{ ...inputStyle, appearance: 'none', paddingRight: '36px' }}
                      disabled={loadingCats}
                    >
                      <option value="">
                        {loadingCats ? 'Yükleniyor...' : 'Kategori Seçin'}
                      </option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.icon} {c.name}
                        </option>
                      ))}
                    </select>
                    <ChevronDown
                      size={16}
                      className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"
                      style={{ color: 'var(--color-ink-light)' }}
                    />
                  </div>
                </div>

                <div>
                  <FormLabel>Alt Kategori</FormLabel>
                  <div className="relative">
                    <select
                      id="share-subcategory"
                      name="subCategoryId"
                      value={form.subCategoryId}
                      onChange={handleChange}
                      style={{
                        ...inputStyle,
                        appearance: 'none',
                        paddingRight: '36px',
                        opacity: subCategories.length === 0 ? 0.5 : 1,
                      }}
                      disabled={subCategories.length === 0}
                    >
                      <option value="">
                        {subCategories.length === 0 ? 'Önce kategori seçin' : 'Alt Kategori Seçin'}
                      </option>
                      {subCategories.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.icon} {s.name}
                        </option>
                      ))}
                    </select>
                    <ChevronDown
                      size={16}
                      className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"
                      style={{ color: 'var(--color-ink-light)' }}
                    />
                  </div>
                </div>
              </div>

              {/* Şartlı Alan: Gıda → Son Kullanma Tarihi */}
              {isGida && (
                <div
                  className="mb-5 p-4 rounded-xl"
                  style={{
                    background: 'rgba(212,141,91,0.06)',
                    border: '1px solid rgba(212,141,91,0.25)',
                  }}
                >
                  <FormLabel required>Son Kullanma / Tüketim Tarihi</FormLabel>
                  <input
                    id="share-expires-at"
                    type="date"
                    name="expiresAt"
                    value={form.expiresAt}
                    onChange={handleChange}
                    min={new Date().toISOString().split('T')[0]}
                    style={inputStyle}
                  />
                  <p className="mt-2 text-xs" style={{ color: 'var(--color-ink-light)' }}>
                    🥗 Gıda ilanlarında son kullanma tarihi zorunludur.
                  </p>
                </div>
              )}

              {/* Hata mesajı */}
              {error && (
                <div
                  className="mb-5 flex items-center gap-2 p-3 rounded-xl text-sm"
                  style={{
                    background: 'rgba(220,53,69,0.06)',
                    border: '1px solid rgba(220,53,69,0.2)',
                    color: '#dc3545',
                  }}
                >
                  <AlertCircle size={16} />
                  {error}
                </div>
              )}

              {/* Submit Butonu */}
              <button
                id="share-submit-btn"
                type="submit"
                disabled={submitting}
                className="tactile-btn w-full py-3 flex items-center justify-center gap-2 text-sm font-semibold text-white"
                style={{
                  background: submitting
                    ? 'rgba(212,141,91,0.6)'
                    : 'var(--color-artisan-orange)',
                  cursor: submitting ? 'not-allowed' : 'pointer',
                }}
              >
                {submitting ? (
                  <>
                    <Loader2 size={17} className="animate-spin" />
                    {id ? 'Güncelleniyor...' : 'Yayınlanıyor...'}
                  </>
                ) : (
                  id ? 'İlanı Güncelle' : 'İlanı Yayınla'
                )}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};

export default SharePage;
