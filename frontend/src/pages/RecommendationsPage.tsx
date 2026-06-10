import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, ArrowLeft, AlertCircle } from 'lucide-react';
import axiosClient from '../api/axiosClient';
import ItemCard, { type Item } from '../components/ItemCard';

interface Recommendation {
  itemId: string;
  title: string;
  matchScore: number;
  reason: string;
  item: Item;
}

const RecommendationsPage = () => {
  const navigate = useNavigate();
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRecommendations = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await axiosClient.get('/ai/recommendations');
      setRecommendations(res.data?.data ?? []);
    } catch (err: any) {
      console.error('Yapay zeka önerileri alınırken hata:', err);
      setError(err.response?.data?.message || 'Öneriler yüklenirken bir hata oluştu.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRecommendations();
  }, []);

  return (
    <main className="pt-24 pb-16 min-h-screen" style={{ background: 'var(--color-paper)', fontFamily: 'var(--font-sans)' }}>
      <div className="max-w-6xl mx-auto px-4 md:px-8">
        
        {/* Back Button & Header */}
        <div className="mb-8 flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-full bg-white border border-gray-100 flex items-center justify-center shadow-sm hover:scale-105 transition-transform cursor-pointer text-ink-dark"
            title="Geri Dön"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <Sparkles size={20} className="text-amber-500 animate-pulse" />
              <h1 className="font-serif text-3xl font-bold" style={{ color: 'var(--color-ink-dark)' }}>
                Yapay Zeka Önerileri
              </h1>
            </div>
            <p className="mt-1 text-sm" style={{ color: 'var(--color-ink-light)' }}>
              Aktif eşya taleplerinize ve ilgi alanlarınıza göre sizin için eşleştirilen paylaşımlar.
            </p>
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
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
            <h3 className="font-serif text-xl font-medium" style={{ color: 'var(--color-ink-dark)' }}>
              Yapay Zeka Eşleştiriyor...
            </h3>
            <p className="text-xs text-ink-light max-w-xs text-center leading-relaxed">
              Aradığınız eşyalar ile platformdaki aktif ilanlar analiz ediliyor ve en uygunları seçiliyor.
            </p>
          </div>
        )}

        {/* Error State */}
        {!isLoading && error && (
          <div
            className="flex flex-col items-center justify-center py-16 gap-4 rounded-2xl p-6 text-center max-w-md mx-auto"
            style={{ background: 'rgba(220,38,38,0.04)', border: '1px dashed rgba(220,38,38,0.2)' }}
          >
            <AlertCircle size={32} className="text-red-500" />
            <p className="font-semibold text-red-600 text-sm leading-relaxed">{error}</p>
            <button
              onClick={fetchRecommendations}
              className="tactile-btn text-sm text-white px-6 py-2.5 cursor-pointer"
              style={{ background: 'var(--color-artisan-orange)' }}
            >
              Yeniden Hesapla
            </button>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !error && recommendations.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center max-w-md mx-auto gap-4 bg-white rounded-3xl border border-gray-100 shadow-sm p-8">
            <div className="w-16 h-16 rounded-full bg-orange-50 flex items-center justify-center text-orange-500 mb-2">
              <Sparkles size={28} />
            </div>
            <h2 className="font-serif text-xl font-bold text-ink-dark">Kişiselleştirilmiş Öneri Bulunamadı</h2>
            <p className="text-xs text-ink-light leading-relaxed">
              Yapay zekanın size özel eşleşme bulabilmesi için profilinizde **aktif bir eşya talebi** bulunmalıdır. Talebinizi oluşturduktan sonra sistem otomatik olarak eşleşmeleri listeleyecektir.
            </p>
            <button
              onClick={() => navigate('/profile', { state: { activeTab: 'myApplications' } })}
              className="tactile-btn px-6 py-2.5 text-xs font-bold text-white transition-opacity hover:opacity-90 cursor-pointer"
              style={{ background: 'var(--color-artisan-orange)' }}
            >
              Taleplerime Git ve Talep Ekle
            </button>
          </div>
        )}

        {/* Recommendations Grid */}
        {!isLoading && !error && recommendations.length > 0 && (
          <div
            className="grid gap-6 md:gap-8"
            style={{
              gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))',
            }}
          >
            {recommendations.map((rec) => (
              <div 
                key={rec.itemId} 
                className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden flex flex-col p-4 transition-all duration-300 hover:shadow-md hover:border-orange-100"
              >
                {/* Custom glowing match badge overlay */}
                <div className="relative group flex-1 flex flex-col">
                  
                  {/* Match Score Badge */}
                  <div className="absolute top-2.5 left-2.5 z-20">
                    <span 
                      className="text-[10px] font-bold px-3 py-1.5 rounded-full flex items-center gap-1 shadow-md border text-white"
                      style={{
                        background: rec.matchScore >= 80 ? 'linear-gradient(135deg, #10B981, #059669)' : 'linear-gradient(135deg, #F59E0B, #D97706)',
                        borderColor: 'rgba(255, 255, 255, 0.2)'
                      }}
                    >
                      ✨ %{rec.matchScore} Uyum
                    </span>
                  </div>

                  {/* Card Previews */}
                  <ItemCard
                    item={rec.item}
                    onClick={(item) => navigate(`/ilan/${item.id}`)}
                  />
                  
                  {/* AI Reason speech bubble card */}
                  <div 
                    className="mt-4 p-3.5 rounded-2xl text-xs flex gap-2.5 items-start flex-1"
                    style={{
                      background: 'rgba(212,141,91,0.05)',
                      border: '1px dashed rgba(212,141,91,0.2)'
                    }}
                  >
                    <Sparkles className="flex-shrink-0 mt-0.5 text-artisan-orange" size={14} style={{ color: 'var(--color-artisan-orange)' }} />
                    <div className="min-w-0">
                      <p className="text-[9px] font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--color-artisan-orange)' }}>
                        Yapay Zeka Eşleştirme Nedeni
                      </p>
                      <p className="leading-relaxed italic" style={{ color: 'var(--color-ink-dark)' }}>
                        "{rec.reason}"
                      </p>
                    </div>
                  </div>

                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </main>
  );
};

export default RecommendationsPage;
