import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { SlidersHorizontal, RefreshCw, PackageOpen } from 'lucide-react';
import axiosClient from '../api/axiosClient';
import ItemCard, { type Item } from '../components/ItemCard';

// Kategori filtre seçenekleri (backend'den dinamik alınabilir)
const CONDITIONS = [
  { value: '', label: 'Tüm Durumlar' },
  { value: 'NEW', label: 'Sıfır — Hiç Kullanılmamış' },
  { value: 'LIKE_NEW', label: 'Az Kullanılmış' },
  { value: 'GOOD', label: 'Orta Durumda' },
  { value: 'FAIR', label: 'Kötü Durumda' },
];

interface Category {
  id: string;
  name: string;
  slug: string;
  icon?: string;
  parentId?: string | null;
  children?: Category[];
}

const HomePage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryParam = searchParams.get('q') ?? '';

  const [items, setItems] = useState<Item[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [conditionFilter, setConditionFilter] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const LIMIT = 12;

  // Kategori ve alt kategori state'leri
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedSubCategory, setSelectedSubCategory] = useState<string>('');

  // Kategorileri API'den yükle
  useEffect(() => {
    const fetchCats = async () => {
      try {
        const res = await axiosClient.get('/categories');
        const data = res.data?.data ?? res.data ?? [];
        setCategories(data);
      } catch (err) {
        console.error('Kategoriler alınamadı:', err);
      }
    };
    fetchCats();
  }, []);

  const fetchItems = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params: Record<string, string> = {
        page: String(page),
        limit: String(LIMIT),
        status: 'ACTIVE',
      };
      if (conditionFilter) params.condition = conditionFilter;
      
      // Hiyerarşik kategori filtresini parametrelere ekle
      const activeCategory = selectedSubCategory || selectedCategory;
      if (activeCategory) params.category = activeCategory;

      const res = await axiosClient.get('/items', { params });
      setItems(res.data.data ?? []);
      setTotal(res.data.pagination?.total ?? 0);
    } catch {
      setError('İlanlar yüklenirken bir hata oluştu. Lütfen tekrar deneyin.');
    } finally {
      setIsLoading(false);
    }
  }, [page, conditionFilter, selectedCategory, selectedSubCategory]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const handleMainCategoryClick = (catId: string) => {
    if (selectedCategory === catId) {
      setSelectedCategory('');
      setSelectedSubCategory('');
    } else {
      setSelectedCategory(catId);
      setSelectedSubCategory(''); // Alt kategoriyi sıfırla
    }
    setPage(1);
  };

  const handleSubCategoryClick = (subId: string) => {
    if (selectedSubCategory === subId) {
      setSelectedSubCategory('');
    } else {
      setSelectedSubCategory(subId);
    }
    setPage(1);
  };

  // Client-side arama filtresi (search param varsa)
  const filteredItems = queryParam
    ? items.filter(
        (i) =>
          i.title.toLowerCase().includes(queryParam.toLowerCase()) ||
          i.description.toLowerCase().includes(queryParam.toLowerCase()) ||
          i.category?.name.toLowerCase().includes(queryParam.toLowerCase())
      )
    : items;

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <main className="pt-24 pb-16 min-h-screen" style={{ fontFamily: 'var(--font-sans)' }}>
      <div className="max-w-7xl mx-auto px-4 md:px-8">

        {/* ── Hero başlık ── */}
        <section className="mb-8 mt-2">
          {queryParam ? (
            <div>
              <h1 className="font-serif text-3xl font-bold" style={{ color: 'var(--color-ink-dark)' }}>
                "{queryParam}" için sonuçlar
              </h1>
              <p className="mt-1 text-sm" style={{ color: 'var(--color-ink-light)' }}>
                {filteredItems.length} ilan bulundu
              </p>
            </div>
          ) : (
            <div>
              <h1 className="font-serif text-3xl md:text-4xl font-bold" style={{ color: 'var(--color-ink-dark)' }}>
                Yakınındaki İlanlar
              </h1>
              <p className="mt-1 text-sm" style={{ color: 'var(--color-ink-light)' }}>
                Seninle paylaşılmayı bekleyen eşyalar
              </p>
            </div>
          )}
        </section>

        {/* ── Kategori Seçici Bar ── */}
        <div className="mb-6">
          <div className="flex items-center gap-2 overflow-x-auto pb-3 scrollbar-thin">
            {/* Tümü Seçeneği */}
            <button
              id="filter-category-all"
              onClick={() => {
                setSelectedCategory('');
                setSelectedSubCategory('');
                setPage(1);
              }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl font-semibold text-xs transition-all duration-200 cursor-pointer"
              style={
                !selectedCategory
                  ? {
                      background: 'var(--color-artisan-orange)',
                      color: '#fff',
                      boxShadow: '0 4px 12px rgba(224,93,58,0.2)',
                      border: '1px solid var(--color-artisan-orange)'
                    }
                  : {
                      background: 'rgba(255,255,255,0.7)',
                      color: 'var(--color-ink-dark)',
                      border: '1px solid rgba(74,59,50,0.08)',
                    }
              }
            >
              <span>🌐</span>
              <span>Tümü</span>
            </button>

            {/* Kategoriler */}
            {categories.map((cat) => {
              const isSelected = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  id={`filter-category-${cat.slug}`}
                  onClick={() => handleMainCategoryClick(cat.id)}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-2xl font-semibold text-xs transition-all duration-200 whitespace-nowrap cursor-pointer"
                  style={
                    isSelected
                      ? {
                          background: 'var(--color-artisan-orange)',
                          color: '#fff',
                          boxShadow: '0 4px 12px rgba(224,93,58,0.2)',
                          border: '1px solid var(--color-artisan-orange)'
                        }
                      : {
                          background: 'rgba(255,255,255,0.7)',
                          color: 'var(--color-ink-dark)',
                          border: '1px solid rgba(74,59,50,0.08)',
                        }
                  }
                >
                  <span className="text-sm">{cat.icon || '🏷️'}</span>
                  <span>{cat.name}</span>
                </button>
              );
            })}
          </div>

          {/* Alt Kategori Seçici Bar */}
          {selectedCategory && (
            <div 
              className="flex items-center gap-2 overflow-x-auto py-2.5 px-3 rounded-2xl mt-2 mb-4 scrollbar-thin transition-all duration-300"
              style={{ 
                background: 'rgba(130,162,132,0.06)',
                border: '1px dashed rgba(130,162,132,0.25)' 
              }}
            >
              <span className="text-[10px] font-bold uppercase tracking-wider mr-2" style={{ color: 'var(--color-artisan-sage-dark)' }}>
                Alt Kategori:
              </span>

              {/* Alt Kategori Tümü */}
              <button
                id="filter-subcategory-all"
                onClick={() => {
                  setSelectedSubCategory('');
                  setPage(1);
                }}
                className="px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 cursor-pointer"
                style={
                  !selectedSubCategory
                    ? {
                        background: 'var(--color-artisan-sage-dark)',
                        color: '#fff',
                      }
                    : {
                        background: 'rgba(255,255,255,0.8)',
                        color: 'var(--color-ink-dark)',
                        border: '1px solid rgba(74,59,50,0.06)',
                      }
                }
              >
                Tümü
              </button>

              {/* Alt Kategoriler Listesi */}
              {categories.find((c) => c.id === selectedCategory)?.children?.map((sub) => {
                const isSubSelected = selectedSubCategory === sub.id;
                return (
                  <button
                    key={sub.id}
                    id={`filter-subcategory-${sub.slug}`}
                    onClick={() => handleSubCategoryClick(sub.id)}
                    className="px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 whitespace-nowrap cursor-pointer"
                    style={
                      isSubSelected
                        ? {
                            background: 'var(--color-artisan-sage-dark)',
                            color: '#fff',
                          }
                        : {
                            background: 'rgba(255,255,255,0.8)',
                            color: 'var(--color-ink-dark)',
                            border: '1px solid rgba(74,59,50,0.06)',
                          }
                    }
                  >
                    <span className="mr-1">{sub.icon || '🔸'}</span>
                    {sub.name}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Filtre çubuğu ── */}
        <div
          className="flex items-center gap-3 mb-8 flex-wrap"
        >
          <div className="flex items-center gap-1.5" style={{ color: 'var(--color-ink-light)' }}>
            <SlidersHorizontal size={15} />
            <span className="text-xs font-semibold uppercase tracking-widest">Filtre</span>
          </div>

          {CONDITIONS.map((c) => (
            <button
              key={c.value}
              id={`filter-condition-${c.value || 'all'}`}
              onClick={() => { setConditionFilter(c.value); setPage(1); }}
              className="text-xs px-3 py-1.5 rounded-full transition-all duration-200 font-medium"
              style={
                conditionFilter === c.value
                  ? {
                      background: 'var(--color-ink-dark)',
                      color: '#fff',
                      boxShadow: '0 2px 8px rgba(74,59,50,0.2)',
                    }
                  : {
                      background: 'rgba(74,59,50,0.06)',
                      color: 'var(--color-ink-light)',
                      border: '1px solid rgba(74,59,50,0.1)',
                    }
              }
            >
              {c.label}
            </button>
          ))}

          <button
            id="refresh-items-btn"
            onClick={fetchItems}
            className="ml-auto flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full transition-all duration-200"
            style={{
              background: 'rgba(130,162,132,0.1)',
              color: 'var(--color-artisan-sage-dark)',
              border: '1px solid rgba(130,162,132,0.25)',
            }}
          >
            <RefreshCw size={13} />
            Yenile
          </button>
        </div>

        {/* ── İçerik Alanı ── */}

        {/* LOADING */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-24 gap-6">
            {/* Animated spinner */}
            <div className="relative w-14 h-14">
              <div
                className="absolute inset-0 rounded-full border-4"
                style={{ borderColor: 'rgba(224,93,58,0.15)' }}
              />
              <div
                className="absolute inset-0 rounded-full border-4 border-transparent animate-spin"
                style={{ borderTopColor: 'var(--color-artisan-orange)' }}
              />
            </div>
            <p className="font-serif text-xl font-medium" style={{ color: 'var(--color-ink-light)' }}>
              İlanlar Yükleniyor...
            </p>
            <p className="text-sm" style={{ color: 'var(--color-ink-light)', opacity: 0.6 }}>
              Yakınındaki paylaşımlar aranıyor
            </p>
          </div>
        )}

        {/* ERROR */}
        {!isLoading && error && (
          <div
            className="flex flex-col items-center justify-center py-20 gap-4 rounded-2xl"
            style={{ background: 'rgba(220,38,38,0.04)', border: '1px dashed rgba(220,38,38,0.2)' }}
          >
            <p className="font-semibold text-red-600">{error}</p>
            <button
              onClick={fetchItems}
              className="tactile-btn text-sm text-white px-6 py-2.5"
              style={{ background: 'var(--color-artisan-orange)' }}
            >
              Tekrar Dene
            </button>
          </div>
        )}

        {/* EMPTY */}
        {!isLoading && !error && filteredItems.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 gap-4 animate-fade-in">
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center animate-bounce"
              style={{ background: 'rgba(74,59,50,0.05)', animationDuration: '3s' }}
            >
              <PackageOpen size={36} style={{ color: 'var(--color-ink-light)', opacity: 0.5 }} />
            </div>
            <h3 className="font-serif text-xl font-semibold text-center" style={{ color: 'var(--color-ink-dark)' }}>
              {conditionFilter 
                ? 'Seçtiğiniz kriterde ürün bulunmamaktadır.' 
                : selectedCategory 
                  ? 'Bu kategoride ilan bulunmamaktadır.' 
                  : 'İlan Bulunamadı'}
            </h3>
            <p className="text-sm text-center max-w-xs" style={{ color: 'var(--color-ink-light)' }}>
              {queryParam
                ? `"${queryParam}" ile eşleşen ilan yok. Farklı bir arama yapmayı deneyin.`
                : conditionFilter
                  ? 'Farklı bir ürün durumu seçebilir veya tüm durumları filtreleyebilirsiniz!'
                  : selectedCategory 
                    ? 'Farklı bir kategori seçebilir veya ilk ilanı siz oluşturabilirsiniz!'
                    : 'Henüz aktif ilan yok. İlk paylaşımı siz yapın!'}
            </p>
          </div>
        )}

        {/* GRID */}
        {!isLoading && !error && filteredItems.length > 0 && (
          <>
            <div
              id="items-grid"
              className="grid gap-5"
              style={{
                gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
              }}
            >
              {filteredItems.map((item) => (
                <ItemCard
                  key={item.id}
                  item={item}
                  onClick={(item) => {
                    navigate(`/ilan/${item.id}`);
                  }}
                />
              ))}
            </div>

            {/* Sayfalama */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-3 mt-12">
                <button
                  disabled={page === 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="tactile-btn px-5 py-2 text-sm disabled:opacity-40"
                  style={{
                    background: 'rgba(74,59,50,0.08)',
                    color: 'var(--color-ink-dark)',
                  }}
                >
                  ← Önceki
                </button>
                <span className="text-sm font-medium" style={{ color: 'var(--color-ink-light)' }}>
                  {page} / {totalPages}
                </span>
                <button
                  disabled={page === totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="tactile-btn px-5 py-2 text-sm disabled:opacity-40"
                  style={{
                    background: 'var(--color-ink-dark)',
                    color: '#fff',
                  }}
                >
                  Sonraki →
                </button>
              </div>
            )}
          </>
        )}

      </div>
    </main>
  );
};

export default HomePage;
