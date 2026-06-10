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

  const fetchRecommendations = async (refresh = false) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await axiosClient.get(`/ai/recommendations${refresh ? '?refresh=true' : ''}`);
      setRecommendations(res.data?.data ?? []);
    } catch (err: any) {
      console.error('Yapay zeka önerileri alınırken hata:', err);
      let msg = err.response?.data?.message || err.message || 'Öneriler yüklenirken bir hata oluştu.';
      if (typeof msg === 'string') {
        if (msg.includes('quota') || msg.includes('Quota') || msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED')) {
          const retryMatch = msg.match(/Please retry in ([\d\.]+)\s*s/i) || msg.match(/retry in ([\d\.]+)/i);
          if (retryMatch && retryMatch[1]) {
            const seconds = Math.ceil(parseFloat(retryMatch[1]));
            msg = `Yapay zeka servisinin günlük kullanım limiti (kotası) dolmuştur. Lütfen ${seconds} saniye sonra tekrar deneyiniz.`;
          } else {
            msg = 'Yapay zeka servisinin günlük kullanım limiti (kotası) dolmuştur. Lütfen daha sonra tekrar deneyiniz.';
          }
        } else if (msg.includes('demand') || msg.includes('503') || msg.includes('temporary') || msg.includes('spikes')) {
          msg = 'Yapay zeka servisi şu an yoğun talep görüyor. Lütfen birkaç dakika sonra tekrar deneyiniz.';
        } else if (msg.includes('API key') || msg.includes('key')) {
          msg = 'Yapay zeka API anahtarı geçersiz veya yapılandırılmamış.';
        }
      }
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRecommendations();
  }, []);

  return (
    <main className="pt-24 pb-16 min-h-screen text-ink-dark relative overflow-hidden" style={{ background: 'linear-gradient(to bottom, #FCDFD2 0%, #F7F4F0 100%)', fontFamily: 'var(--font-sans)' }}>
      {/* Decorative warm orange background glows */}
      <div className="absolute top-[-10%] right-[-10%] w-[450px] h-[450px] rounded-full bg-orange-500/15 blur-[130px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[350px] h-[350px] rounded-full bg-orange-400/10 blur-[110px] pointer-events-none" />
      
      <div className="max-w-6xl mx-auto px-4 md:px-8 relative z-10">
        
        {/* Back Button & Header */}
        <div className="mb-8 flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-full bg-white border border-orange-200 flex items-center justify-center shadow-sm hover:scale-105 transition-transform cursor-pointer text-artisan-orange hover:border-artisan-orange"
            title="Geri Dön"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <Sparkles size={20} className="text-artisan-orange animate-pulse" />
              <h1 className="font-serif text-3xl font-bold text-ink-dark">
                Yapay Zeka Önerileri
              </h1>
            </div>
            <p className="mt-1 text-sm text-ink-light">
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
            <h3 className="font-serif text-xl font-medium text-ink-dark">
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
            className="flex flex-col items-center justify-center py-16 gap-4 rounded-2xl p-6 text-center max-w-md mx-auto bg-white border border-red-200 shadow-sm"
          >
            <AlertCircle size={32} className="text-red-500" />
            <p className="font-semibold text-red-700 text-sm leading-relaxed">{error}</p>
            <button
              onClick={() => fetchRecommendations(true)}
              className="tactile-btn text-sm text-white px-6 py-2.5 cursor-pointer"
              style={{ background: 'var(--color-artisan-orange)' }}
            >
              Yeniden Hesapla
            </button>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !error && recommendations.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center max-w-md mx-auto gap-4 bg-white rounded-3xl border border-orange-200/50 shadow-sm p-8">
            <div className="w-16 h-16 rounded-full bg-orange-500/10 flex items-center justify-center text-artisan-orange mb-2 border border-orange-500/20">
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
                className="bg-white rounded-3xl border border-orange-200/50 shadow-sm overflow-hidden flex flex-col p-4 transition-all duration-300 hover:shadow-md hover:border-artisan-orange/50"
              >
                {/* Custom glowing match badge overlay */}
                <div className="relative group flex-1 flex flex-col">
                  
                  {/* Match Score Badge (Vibrant Orange Theme) */}
                  <div className="absolute top-2.5 left-2.5 z-20">
                    <span 
                      className="text-[10px] font-bold px-3 py-1.5 rounded-full flex items-center gap-1 shadow-md border text-white"
                      style={{
                        background: 'linear-gradient(135deg, #F97316, #C2410C)',
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
                      background: 'rgba(224,93,58,0.06)',
                      border: '1px dashed rgba(224,93,58,0.25)'
                    }}
                  >
                    <Sparkles className="flex-shrink-0 mt-0.5 text-artisan-orange" size={14} />
                    <div className="min-w-0">
                      <p className="text-[9px] font-bold uppercase tracking-wider mb-1 text-artisan-orange">
                        Yapay Zeka Eşleştirme Nedeni
                      </p>
                      <p className="leading-relaxed italic text-ink-dark">
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
