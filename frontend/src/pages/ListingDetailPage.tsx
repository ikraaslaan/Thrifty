import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  MapPin, 
  Tag, 
  Calendar, 
  MessageSquare, 
  Heart, 
  Clock, 
  Check, 
  ChevronRight, 
  Loader2, 
  Sparkles,
  PartyPopper,
  X,
  ChevronLeft
} from 'lucide-react';
import axiosClient from '../api/axiosClient';
import { type Item } from '../components/ItemCard';
import { useAuthStore } from '../stores/useAuthStore';

const CONDITION_MAP: Record<Item['condition'], { label: string; color: string; bg: string }> = {
  NEW:      { label: 'Sıfır',          color: '#3a7d44', bg: 'rgba(58,125,68,0.1)'   },
  LIKE_NEW: { label: 'Az Kullanılmış', color: '#2563EB', bg: 'rgba(37,99,235,0.08)'  },
  GOOD:     { label: 'İyi Durumda',    color: '#92400E', bg: 'rgba(146,64,14,0.1)'   },
  FAIR:     { label: 'Kullanılabilir', color: '#6B7280', bg: 'rgba(107,114,128,0.1)' },
};

const DELIVERY_MAP: Record<Item['deliveryType'], string> = {
  PICKUP:   'Elden Teslim',
  DELIVERY: 'Kargolu',
  BOTH:     'Her İkisi',
};

const ListingDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const [item, setItem] = useState<Item | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  // Etkileşim State'leri
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [requestNote, setRequestNote] = useState('');
  const [isRequestSending, setIsRequestSending] = useState(false);
  const [isRequested, setIsRequested] = useState(false);

  // Lightbox State'leri (Büyük resim modalı)
  const [showLightbox, setShowLightbox] = useState(false);
  const [lightboxImageIndex, setLightboxImageIndex] = useState(0);

  // Klavye ok tuşları ve ESC desteği
  useEffect(() => {
    if (!showLightbox) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowLightbox(false);
      if (e.key === 'ArrowRight' && item?.images && item.images.length > 1) {
        setLightboxImageIndex(prev => (prev + 1) % item.images.length);
      }
      if (e.key === 'ArrowLeft' && item?.images && item.images.length > 1) {
        setLightboxImageIndex(prev => (prev - 1 + item.images.length) % item.images.length);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showLightbox, item]);

  const handleImageClick = () => {
    setLightboxImageIndex(activeImageIndex);
    setShowLightbox(true);
  };

  useEffect(() => {
    const fetchItemDetail = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await axiosClient.get(`/items/${id}`);
        if (res.data?.status === 'success' && res.data?.data) {
          setItem(res.data.data);
        } else {
          setError('İlan verisi alınamadı.');
        }
      } catch (err) {
        console.error('İlan detayı getirme hatası:', err);
        setError('İlan detayı yüklenirken bir sorun oluştu veya ilan mevcut değil.');
      } finally {
        setIsLoading(false);
      }
    };

    if (id) {
      fetchItemDetail();
    }
  }, [id]);

  // İlan yüklenince mevcut kullanıcının talip olup olmadığını kontrol et
  useEffect(() => {
    const checkIfApplied = async () => {
      if (!id || !user) return;
      try {
        const res = await axiosClient.get(`/applications/check/${id}`);
        if (res.data?.data?.applied) {
          setIsRequested(true);
        }
      } catch {
        // Sessizce geç — kullanıcı giriş yapmamış olabilir
      }
    };
    checkIfApplied();
  }, [id, user]);

  // "Soru Sor" tost bildirimi tetikleyici
  const handleAskQuestion = () => {
    setToastMessage("Sohbet başlatabilmek için önce 'Talibim' butonuyla talep oluşturmalısınız. Thrifty ilkeleri gereği mesajlaşma talep oluşturulduktan sonra başlar.");
    setTimeout(() => {
      setToastMessage(null);
    }, 5500);
  };

  const handleStartChat = async () => {
    if (!user) {
      navigate('/login');
      return;
    }
    if (!item) return;
    setIsRequestSending(true);
    try {
      const res = await axiosClient.post('/chat/rooms', {
        itemId: item.id
      });
      if (res.data?.status === 'success' && res.data?.data) {
        navigate('/profile', { 
          state: { activeTab: 'messages', activeRoomId: res.data.data.id } 
        });
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Sohbet başlatılamadı.';
      setToastMessage(msg);
      setTimeout(() => setToastMessage(null), 4000);
    } finally {
      setIsRequestSending(false);
    }
  };

  // "Talibim" gerçek API çağrısı
  const handleSendRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!item) return;
    setIsRequestSending(true);
    try {
      await axiosClient.post('/applications', {
        itemId: item.id,
        note: requestNote || null,
      });
      setIsRequested(true);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      const msg = axiosErr.response?.data?.message ?? 'Talep gönderilemedi. Lütfen tekrar deneyin.';
      setToastMessage(msg);
      setTimeout(() => setToastMessage(null), 4000);
      setIsRequestSending(false);
    } finally {
      setIsRequestSending(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen py-24 gap-6" style={{ fontFamily: 'var(--font-sans)' }}>
        <div className="relative w-16 h-16">
          <div
            className="absolute inset-0 rounded-full border-4"
            style={{ borderColor: 'rgba(224,93,58,0.15)' }}
          />
          <div
            className="absolute inset-0 rounded-full border-4 border-transparent animate-spin"
            style={{ borderTopColor: 'var(--color-artisan-orange)' }}
          />
        </div>
        <p className="font-serif text-xl font-medium" style={{ color: 'var(--color-ink-dark)' }}>
          Detaylar Yükleniyor...
        </p>
      </div>
    );
  }

  if (error || !item) {
    return (
      <main className="pt-28 pb-16 min-h-screen flex items-center justify-center px-4" style={{ fontFamily: 'var(--font-sans)' }}>
        <div className="max-w-md w-full emboss-card p-8 text-center flex flex-col items-center gap-6">
          <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center text-red-500">
            <Clock size={28} />
          </div>
          <div>
            <h2 className="font-serif text-2xl font-bold mb-2" style={{ color: 'var(--color-ink-dark)' }}>
              İlan Bulunamadı
            </h2>
            <p className="text-sm" style={{ color: 'var(--color-ink-light)' }}>
              {error || 'Aradığınız ilan silinmiş veya yayından kaldırılmış olabilir.'}
            </p>
          </div>
          <button
            onClick={() => navigate('/')}
            className="tactile-btn flex items-center justify-center gap-2 text-white px-6 py-2.5 w-full text-sm font-semibold"
            style={{ background: 'var(--color-ink-dark)' }}
          >
            <ArrowLeft size={16} />
            Ana Sayfaya Dön
          </button>
        </div>
      </main>
    );
  }

  const cond = CONDITION_MAP[item.condition] || { label: 'Bilinmiyor', color: 'var(--color-ink-light)', bg: 'rgba(74,59,50,0.06)' };
  const hasImage = item.images && item.images.length > 0;
  const mainImage = hasImage ? item.images[activeImageIndex] : '';
  const isOwner = user?.id === item.user?.id;

  return (
    <main className="pt-24 pb-20 min-h-screen relative" style={{ fontFamily: 'var(--font-sans)' }}>
      {/* ── Tost Bildirimi (Ask Question Toast) ── */}
      {toastMessage && (
        <div 
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-4 rounded-2xl shadow-xl border border-orange-100 flex items-center gap-3 animate-bounce"
          style={{ 
            background: 'var(--color-paper-light)',
            boxShadow: '0 20px 40px rgba(74,59,50,0.15)',
            maxWidth: '90%',
            width: '420px'
          }}
        >
          <div className="w-9 h-9 rounded-full bg-orange-50 flex items-center justify-center text-orange-500 flex-shrink-0">
            <MessageSquare size={16} />
          </div>
          <div className="flex-1">
            <p className="text-xs font-bold" style={{ color: 'var(--color-ink-dark)' }}>Çok Yakında!</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--color-ink-light)' }}>{toastMessage}</p>
          </div>
        </div>
      )}

      <div className="max-w-5xl mx-auto px-4 md:px-8">
        {/* ── Geri Dön Butonu ── */}
        <button
          onClick={() => navigate(-1)}
          className="group flex items-center gap-2 mb-6 text-sm font-semibold transition-colors duration-200"
          style={{ color: 'var(--color-ink-light)' }}
          onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--color-ink-dark)')}
          onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--color-ink-light)')}
        >
          <ArrowLeft size={16} className="transition-transform duration-200 group-hover:-translate-x-1" />
          Geri Dön
        </button>

        {/* ── İki Sütunlu Düzen (Layout) ── */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 md:items-stretch items-start">
          
          {/* ── Sol Sütun: Görsel Alanı (Gallery) + Açıklama ── */}
          <div className="md:col-span-6 flex flex-col justify-between h-full gap-6">
            <div className="flex flex-col gap-4">
            <div 
              className="emboss-card overflow-hidden relative flex items-center justify-center cursor-pointer group"
              onClick={handleImageClick}
              style={{ aspectRatio: '4/3', borderRadius: '1.5rem', background: 'var(--color-paper-light)' }}
            >
              {item.status === 'RESERVED' && (
                <div
                  className="absolute inset-0 z-10 flex items-center justify-center animate-fade-in"
                  style={{
                    background: 'rgba(74, 59, 50, 0.4)',
                    backdropFilter: 'blur(2px)',
                    WebkitBackdropFilter: 'blur(2px)',
                  }}
                >
                  <span
                    className="text-sm font-bold px-5 py-2.5 rounded-full shadow-lg border text-white"
                    style={{
                      background: 'var(--color-artisan-orange)',
                      borderColor: 'rgba(255, 255, 255, 0.2)',
                      letterSpacing: '0.05em',
                      boxShadow: '0 8px 20px rgba(224,93,58,0.3)',
                    }}
                  >
                    Rezerve Edildi ✓
                  </span>
                </div>
              )}
              {hasImage ? (
                <img
                  src={mainImage}
                  alt={item.title}
                  className="w-full h-full object-cover transition-all duration-300 group-hover:scale-105"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center gap-3">
                  <div className="w-16 h-16 rounded-full bg-gray-50 flex items-center justify-center">
                    <Tag size={28} style={{ color: 'var(--color-ink-light)', opacity: 0.4 }} />
                  </div>
                  <span className="text-xs" style={{ color: 'var(--color-ink-light)' }}>Görsel Bulunmuyor</span>
                </div>
              )}

              {/* Durum Etiketi (Görselin sol altında sabit) */}
              <div className="absolute bottom-4 left-4">
                <span
                  className="text-xs font-semibold px-3 py-1.5 rounded-full"
                  style={{
                    color: cond.color,
                    background: cond.bg,
                    backdropFilter: 'blur(8px)',
                    border: `1px solid ${cond.color}22`,
                  }}
                >
                  {cond.label}
                </span>
              </div>
            </div>

            {/* Galeri Küçük Resimleri (Thumbnails) */}
            {hasImage && item.images.length > 1 && (
              <div className="flex gap-2.5 overflow-x-auto pb-2 scrollbar-thin">
                {item.images.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveImageIndex(idx)}
                    className="w-20 h-16 rounded-xl overflow-hidden border-2 flex-shrink-0 transition-all duration-200"
                    style={{
                      borderColor: activeImageIndex === idx ? 'var(--color-artisan-orange)' : 'transparent',
                      opacity: activeImageIndex === idx ? 1 : 0.65,
                      boxShadow: activeImageIndex === idx ? '0 4px 12px rgba(224,93,58,0.15)' : 'none'
                    }}
                  >
                    <img src={img} alt={`${item.title} galeri ${idx + 1}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
            </div>

            {/* İlan Açıklaması (Görselin Altında) */}
            <div 
              className="emboss-card p-5 flex flex-col flex-grow min-h-[140px]"
              style={{ 
                background: 'var(--color-paper-light)',
                borderRadius: '1.5rem',
                border: '1px solid rgba(74,59,50,0.06)',
                boxShadow: '0 2px 12px rgba(74,59,50,0.03)'
              }}
            >
              <h3 className="font-serif font-bold text-base mb-1.5" style={{ color: 'var(--color-ink-dark)' }}>Açıklama</h3>
              <p className="text-sm leading-relaxed whitespace-pre-wrap flex-grow text-ink-light" style={{ color: 'var(--color-ink-light)' }}>
                {item.description}
              </p>
            </div>
          </div>

          {/* ── Sağ Sütun: Detay Bilgileri ── */}
          <div className="md:col-span-6 flex flex-col h-full justify-between gap-6">
            <div className="flex flex-col flex-grow justify-start">
              
              {/* Kategori Etiketi */}
            {item.category && (
              <div 
                className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider mb-2.5"
                style={{ color: 'var(--color-artisan-sage-dark)' }}
              >
                <span className="text-sm">{item.category.icon || '🏷️'}</span>
                <span>{item.category.name}</span>
              </div>
            )}

            {/* İlan Başlığı */}
            <h1 
              className="font-serif text-2xl md:text-3xl font-bold leading-tight mb-4 capitalize"
              style={{ color: 'var(--color-ink-dark)' }}
            >
              {item.title}
            </h1>

            {/* Detay Bilgi Satırları Grid */}
            <div 
              className="grid grid-cols-2 gap-4 py-4 mb-6"
              style={{ 
                borderTop: '1px solid rgba(74,59,50,0.08)',
                borderBottom: '1px solid rgba(74,59,50,0.08)'
              }}
            >
              <div className="flex items-center gap-2">
                <Sparkles size={16} style={{ color: 'var(--color-artisan-sage)' }} />
                <div>
                  <span className="block text-[10px]" style={{ color: 'var(--color-ink-light)' }}>Ürün Durumu</span>
                  <span className="text-xs font-semibold" style={{ color: 'var(--color-ink-dark)' }}>{cond.label}</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <MapPin size={16} style={{ color: 'var(--color-artisan-earth)' }} />
                <div>
                  <span className="block text-[10px]" style={{ color: 'var(--color-ink-light)' }}>Teslimat Şekli</span>
                  <span className="text-xs font-semibold" style={{ color: 'var(--color-ink-dark)' }}>{DELIVERY_MAP[item.deliveryType]}</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Calendar size={16} style={{ color: 'var(--color-artisan-earth)' }} />
                <div>
                  <span className="block text-[10px]" style={{ color: 'var(--color-ink-light)' }}>Eklenme Tarihi</span>
                  <span className="text-xs font-semibold" style={{ color: 'var(--color-ink-dark)' }}>
                    {new Date(item.createdAt).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </span>
                </div>
              </div>
            </div>

            {/* İlan Sahibi (Topluluk Kartı) */}
            {item.user && (
              <div 
                className="flex items-center gap-3 p-3.5 rounded-2xl mb-6 shadow-sm"
                style={{ 
                  background: 'var(--color-paper-light)',
                  border: '1px solid rgba(74,59,50,0.06)'
                }}
              >
                <div 
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                  style={{ background: 'var(--color-artisan-earth)' }}
                >
                  {item.user.avatarUrl ? (
                    <img src={item.user.avatarUrl} alt={item.user.fullName} className="w-full h-full rounded-full object-cover" />
                  ) : (
                    item.user.fullName?.charAt(0)?.toUpperCase() ?? '?'
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px]" style={{ color: 'var(--color-ink-light)' }}>Paylaşan Topluluk Üyesi</p>
                  <p className="text-sm font-bold truncate capitalize" style={{ color: 'var(--color-ink-dark)' }}>{item.user.fullName}</p>
                </div>
              </div>
            )}

            {/* Konum Adresi */}
            {item.address && (
              <div className="flex items-start gap-2.5 p-4 rounded-2xl mb-6" style={{ background: 'rgba(74,59,50,0.03)' }}>
                <MapPin size={18} className="mt-0.5 flex-shrink-0" style={{ color: 'var(--color-artisan-earth)' }} />
                <div>
                  <h4 className="text-xs font-bold mb-0.5" style={{ color: 'var(--color-ink-dark)' }}>Buluşma / Teslim Alma Konumu</h4>
                  <p className="text-xs capitalize" style={{ color: 'var(--color-ink-light)' }}>{item.address}</p>
                </div>
              </div>
            )}
            
            </div>

            {/* ── Butonlar (Alt Kısım) ── */}
            {isOwner ? (
              /* İlan Sahibi Butonu */
              <button
                id="edit-item-btn"
                onClick={() => navigate(`/paylas/${item.id}`)}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-full text-xs font-bold transition-all cursor-pointer hover:opacity-90 active:scale-98"
                style={{
                  background: 'var(--color-artisan-orange)',
                  color: '#fff',
                  boxShadow: '0 4px 12px rgba(224,93,58,0.25)',
                }}
              >
                <Sparkles size={16} />
                İlanı Düzenle
              </button>
            ) : (
              /* Diğer Kullanıcı Butonları */
              <div className="flex gap-4 items-center w-full">
                
                {/* Soru Sor (Secondary) */}
                <button
                  id="ask-question-btn"
                  onClick={isRequested ? handleStartChat : handleAskQuestion}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-full text-xs font-bold transition-all border cursor-pointer hover:bg-gray-50 active:scale-98"
                  style={{
                    borderColor: 'rgba(74,59,50,0.2)',
                    color: 'var(--color-ink-dark)',
                    background: 'var(--color-paper-light)',
                    boxShadow: '0 4px 6px -1px rgba(74,59,50,0.05)'
                  }}
                >
                  <MessageSquare size={16} />
                  Soru Sor
                </button>

                {/* Talibim (Primary - Artisan Orange) */}
                <button
                  id="claim-item-btn"
                  disabled={isRequested || item.status === 'RESERVED'}
                  onClick={() => setShowRequestModal(true)}
                  className="flex-2 flex items-center justify-center gap-2 py-3 rounded-full text-xs font-bold transition-all cursor-pointer active:scale-98 text-white disabled:opacity-75 disabled:cursor-not-allowed"
                  style={{
                    background: item.status === 'RESERVED'
                      ? 'var(--color-artisan-sage-dark)'
                      : isRequested
                      ? 'var(--color-artisan-sage-dark)'
                      : 'var(--color-artisan-orange)',
                    boxShadow: (isRequested || item.status === 'RESERVED') ? 'none' : '0 4px 12px rgba(224,93,58,0.25)',
                  }}
                >
                  {item.status === 'RESERVED' ? (
                    <>
                      <Check size={16} />
                      Rezerve Edildi ✓
                    </>
                  ) : isRequested ? (
                    <>
                      <Check size={16} />
                      Talip Olundu ✓
                    </>
                  ) : (
                    <>
                      <Heart size={16} />
                      Talibim
                    </>
                  )}
                </button>

              </div>
            )}

          </div>

        </div>
      </div>

      {/* ── 5. Talep Bırakma Modalı (Claim Request Modal) ── */}
      {showRequestModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop Blur */}
          <div 
            className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity" 
            onClick={() => !isRequestSending && !isRequested && setShowRequestModal(false)}
          />

          <div 
            className="bg-white w-full max-w-md rounded-3xl p-6 relative shadow-2xl z-10 border border-orange-50 animate-in fade-in zoom-in-95 duration-200"
            style={{ 
              background: 'var(--color-paper-light)',
              fontFamily: 'var(--font-sans)' 
            }}
          >
            {/* Modal Başlığı */}
            {!isRequested ? (
              <form onSubmit={handleSendRequest} className="flex flex-col gap-4">
                <div className="w-12 h-12 rounded-full bg-orange-50 flex items-center justify-center text-orange-500 mb-2">
                  <Heart size={22} className="fill-current" />
                </div>
                
                <div>
                  <h3 className="font-serif text-xl font-bold" style={{ color: 'var(--color-ink-dark)' }}>
                    İlana Talip Ol
                  </h3>
                  <p className="text-xs mt-1 leading-relaxed" style={{ color: 'var(--color-ink-light)' }}>
                    <span className="font-semibold" style={{ color: 'var(--color-ink-dark)' }}>"{item.title}"</span> isimli ilana talip olmak üzeresiniz. İstek havuzuna katılacaksınız.
                  </p>
                </div>

                <div 
                  className="p-3.5 rounded-2xl text-[11px] leading-relaxed" 
                  style={{ 
                    background: 'rgba(130,162,132,0.08)', 
                    border: '1px solid rgba(130,162,132,0.15)',
                    color: 'var(--color-artisan-sage-dark)' 
                  }}
                >
                  💡 <strong>Thrifty Topluluk İlkesi:</strong> Paylaşımcı ruhumuz gereği, bir ilana birden fazla kişi talip olabilir. İlan sahibi ürünü kendi belirlediği kriterlere göre (örneğin mesafe yakınlığı, ihtiyaç önceliği veya samimi bir not) dilediği kişiye hediye etmekte özgürdür.
                </div>

                {/* Not Bırakma Alanı */}
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="request-note" className="text-xs font-semibold" style={{ color: 'var(--color-ink-dark)' }}>
                    İlan Sahibine Mesajınız (İsteğe Bağlı)
                  </label>
                  <textarea
                    id="request-note"
                    value={requestNote}
                    onChange={(e) => setRequestNote(e.target.value)}
                    placeholder="Neden bu eşyaya talip olduğunuzu kısa ve samimi bir dille yazabilirsiniz..."
                    rows={3}
                    maxLength={200}
                    disabled={isRequestSending}
                    className="w-full text-xs p-3 rounded-2xl border border-gray-200 bg-gray-50/50 outline-none focus:border-artisan-orange focus:bg-white resize-none transition-all"
                  />
                  <span className="text-[10px] text-right self-end" style={{ color: 'var(--color-ink-light)' }}>
                    {requestNote.length}/200 karakter
                  </span>
                </div>

                {/* Modal Aksiyon Butonları */}
                <div className="flex gap-3 mt-2">
                  <button
                    type="button"
                    disabled={isRequestSending}
                    onClick={() => setShowRequestModal(false)}
                    className="flex-1 py-2.5 rounded-full text-xs font-bold bg-gray-100 hover:bg-gray-200 transition-colors disabled:opacity-50"
                    style={{ color: 'var(--color-ink-dark)' }}
                  >
                    Vazgeç
                  </button>
                  <button
                    type="submit"
                    disabled={isRequestSending}
                    className="flex-1 py-2.5 rounded-full text-xs font-bold text-white transition-all hover:opacity-95 flex items-center justify-center gap-1.5 disabled:opacity-50"
                    style={{ 
                      background: 'var(--color-artisan-orange)',
                      boxShadow: '0 4px 12px rgba(224,93,58,0.2)' 
                    }}
                  >
                    {isRequestSending ? (
                      <>
                        <Loader2 size={14} className="animate-spin" />
                        İstek Gönderiliyor...
                      </>
                    ) : (
                      'Talebi İlet'
                    )}
                  </button>
                </div>
              </form>
            ) : (
              /* Başarılı İstek Gönderim Ekranı */
              <div className="flex flex-col items-center text-center py-6 gap-4 animate-in fade-in duration-200">
                <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-500 flex items-center justify-center animate-bounce">
                  <PartyPopper size={32} />
                </div>
                
                <div>
                  <h3 className="font-serif text-2xl font-bold" style={{ color: 'var(--color-ink-dark)' }}>
                    Talebiniz Alındı!
                  </h3>
                  <p className="text-xs mt-2 leading-relaxed max-w-sm" style={{ color: 'var(--color-ink-light)' }}>
                    Bu ilanın istek havuzuna başarıyla katıldınız. İlan sahibi talebinizi inceledikten sonra size olumlu dönüş yaparsa bildirim alacaksınız.
                  </p>
                </div>

                <div 
                  className="mt-2 text-xs font-semibold px-4 py-1.5 rounded-full"
                  style={{ 
                    background: 'rgba(58,125,68,0.08)', 
                    color: '#3a7d44',
                    border: '1px solid rgba(58,125,68,0.15)'
                  }}
                >
                  Harika Bir Adım! 🌱
                </div>

                <div className="flex flex-col gap-2.5 w-full mt-4">
                  <button
                    onClick={handleStartChat}
                    disabled={isRequestSending}
                    className="tactile-btn w-full py-2.5 text-xs font-bold text-white flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    style={{ background: 'var(--color-artisan-orange)' }}
                  >
                    {isRequestSending ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <MessageSquare size={14} />
                    )}
                    İlan Sahibiyle Mesajlaş
                  </button>
                  
                  <button
                    onClick={() => setShowRequestModal(false)}
                    className="w-full py-2 text-xs font-bold text-ink-light hover:text-ink-dark transition-colors cursor-pointer"
                  >
                    Kapat
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      )}

      {/* ── Lightbox (Büyük Görsel Modalı) ── */}
      {showLightbox && item && item.images && item.images.length > 0 && (
        <div 
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/90 backdrop-blur-md animate-fade-in"
          onClick={() => setShowLightbox(false)}
        >
          {/* Kapat Butonu */}
          <button
            onClick={(e) => { e.stopPropagation(); setShowLightbox(false); }}
            className="absolute top-6 right-6 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all duration-200 cursor-pointer"
          >
            <X size={24} />
          </button>

          {/* Sol Ok (Varsa) */}
          {item.images.length > 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setLightboxImageIndex(prev => (prev - 1 + item.images.length) % item.images.length);
              }}
              className="absolute left-6 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all duration-200 cursor-pointer"
            >
              <ChevronLeft size={24} />
            </button>
          )}

          {/* Büyük Görsel */}
          <div 
            className="max-w-4xl max-h-[75vh] px-4 flex items-center justify-center animate-zoom-in"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={item.images[lightboxImageIndex]}
              alt={`${item.title} büyütülmüş görsel ${lightboxImageIndex + 1}`}
              className="max-w-full max-h-[75vh] object-contain rounded-2xl shadow-2xl"
            />
          </div>

          {/* Sağ Ok (Varsa) */}
          {item.images.length > 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setLightboxImageIndex(prev => (prev + 1) % item.images.length);
              }}
              className="absolute right-6 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all duration-200 cursor-pointer"
            >
              <ChevronRight size={24} />
            </button>
          )}

          {/* Sayaç ve Küçük Resimler (Thumbnails) */}
          <div className="absolute bottom-6 flex flex-col items-center gap-3">
            <span className="text-white/70 text-xs font-semibold uppercase tracking-widest">
              {lightboxImageIndex + 1} / {item.images.length}
            </span>
            {item.images.length > 1 && (
              <div className="flex gap-2">
                {item.images.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={(e) => { e.stopPropagation(); setLightboxImageIndex(idx); }}
                    className="w-10 h-10 rounded-lg overflow-hidden border-2 transition-all duration-200 cursor-pointer"
                    style={{
                      borderColor: lightboxImageIndex === idx ? 'var(--color-artisan-orange)' : 'transparent',
                      opacity: lightboxImageIndex === idx ? 1 : 0.4
                    }}
                  >
                    <img src={img} alt="thumbnail" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
};

export default ListingDetailPage;
