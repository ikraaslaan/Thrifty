import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/useAuthStore';
import axiosClient from '../api/axiosClient';
import {
  ShoppingBag,
  Share2,
  List,
  MessageSquare,
  Star,
  LogOut,
  Edit2,
  Trash2,
  AlertTriangle,
  Loader2
} from 'lucide-react';
import ItemCard, { type Item } from '../components/ItemCard';

type TabId = 'bought' | 'shared' | 'activeAds' | 'messages' | 'reviews';

interface TabItem {
  id: TabId;
  label: string;
  icon: React.ElementType;
}

const TABS: TabItem[] = [
  { id: 'bought', label: 'Aldıklarım', icon: ShoppingBag },
  { id: 'shared', label: 'Paylaştıklarım', icon: Share2 },
  { id: 'activeAds', label: 'Aktif İlanlarım', icon: List },
  { id: 'messages', label: 'Mesaj Bildirimleri', icon: MessageSquare },
  { id: 'reviews', label: 'Değerlendirmeler', icon: Star },
];

const ProfilePage = () => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabId>('activeAds');

  // Aktif İlanlar state
  const [myItems, setMyItems] = useState<Item[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);

  // Silme Modalı state
  const [itemToDelete, setItemToDelete] = useState<Item | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchMyItems = async () => {
    setLoadingItems(true);
    try {
      // Backend'de eklediğimiz GET /api/items/me
      const res = await axiosClient.get('/items/me');
      // Sadece ACTIVE olanları filtreleyelim (veya arka uca da bırakılabilir)
      const data: Item[] = res.data?.data ?? [];
      setMyItems(data.filter(i => i.status === 'ACTIVE'));
    } catch (error) {
      console.error('İlanlar alınırken hata:', error);
    } finally {
      setLoadingItems(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'activeAds') {
      fetchMyItems();
    }
  }, [activeTab]);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const handleEdit = (item: Item) => {
    navigate(`/paylas/${item.id}`);
  };

  const handleDeleteConfirm = async () => {
    if (!itemToDelete) return;
    setDeleting(true);
    try {
      await axiosClient.delete(`/items/${itemToDelete.id}`);
      setMyItems((prev) => prev.filter((i) => i.id !== itemToDelete.id));
      setItemToDelete(null);
    } catch (err) {
      alert('İlan silinirken bir hata oluştu.');
    } finally {
      setDeleting(false);
    }
  };

  // ─── Render İçerikleri ────────────────────────────────────────────────────────

  const renderActiveAds = () => {
    if (loadingItems) {
      return (
        <div className="flex flex-col items-center justify-center py-20 text-ink-light">
          <Loader2 size={32} className="animate-spin mb-4" />
          <p>İlanlarınız yükleniyor...</p>
        </div>
      );
    }

    if (myItems.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-gray-100">
          <div className="w-16 h-16 rounded-full bg-orange-50 flex items-center justify-center mb-4">
            <List size={28} style={{ color: 'var(--color-artisan-orange)' }} />
          </div>
          <h3 className="font-serif text-xl font-bold mb-2" style={{ color: 'var(--color-ink-dark)' }}>
            Henüz aktif bir ilanınız yok
          </h3>
          <p className="text-sm text-center mb-6" style={{ color: 'var(--color-ink-light)', maxWidth: '300px' }}>
            Evde kullanmadığınız, bir başkasının işine yarayabilecek eşyalarınızı paylaşmaya hemen başlayın.
          </p>
          <button
            onClick={() => navigate('/paylas')}
            className="tactile-btn px-6 py-2.5 text-sm font-semibold text-white"
            style={{ background: 'var(--color-artisan-orange)' }}
          >
            İlk İlanını Ver
          </button>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {myItems.map((item) => (
          <div key={item.id} className="relative group">
            {/* Orijinal ItemCard Bileşeni */}
            <ItemCard item={item} />

            {/* İlanın üzerindeki aksiyon butonları */}
            <div className="absolute top-3 right-3 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10">
              <button
                onClick={() => handleEdit(item)}
                className="w-8 h-8 rounded-full flex items-center justify-center bg-white shadow-sm hover:scale-110 transition-transform"
                title="Düzenle"
                style={{ color: 'var(--color-artisan-sage-dark)' }}
              >
                <Edit2 size={14} />
              </button>
              <button
                onClick={() => setItemToDelete(item)}
                className="w-8 h-8 rounded-full flex items-center justify-center bg-white shadow-sm hover:scale-110 transition-transform"
                title="Sil"
                style={{ color: '#ef4444' }}
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderMessages = () => {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden flex h-[600px]">
        {/* Sol Menü: Kullanıcılar */}
        <div className="w-1/3 border-r border-gray-100 flex flex-col">
          <div className="p-4 border-b border-gray-100 bg-gray-50/50">
            <h3 className="font-semibold" style={{ color: 'var(--color-ink-dark)' }}>Sohbetler</h3>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            {/* Fake Sohbet Öğesi */}
            <div className="p-3 rounded-xl bg-orange-50/50 cursor-pointer flex gap-3 items-center">
              <div className="w-10 h-10 rounded-full bg-artisan-earth flex items-center justify-center text-white font-semibold flex-shrink-0">
                A
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate text-ink-dark">Ahmet Yılmaz</p>
                <p className="text-xs truncate text-ink-light">Logitech Mouse için yazıyorum...</p>
              </div>
              <div className="w-2 h-2 rounded-full bg-artisan-orange"></div>
            </div>
          </div>
        </div>

        {/* Sağ Taraf: Chat Alanı */}
        <div className="flex-1 flex flex-col bg-gray-50/30">
          <div className="p-4 border-b border-gray-100 bg-white flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-artisan-earth flex items-center justify-center text-white text-xs font-semibold">
              A
            </div>
            <p className="font-semibold text-sm" style={{ color: 'var(--color-ink-dark)' }}>Ahmet Yılmaz</p>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <div className="flex justify-start">
              <div className="bg-white border border-gray-100 rounded-2xl rounded-tl-sm px-4 py-2 max-w-[80%] shadow-sm">
                <p className="text-sm text-ink-dark">Merhaba, ilanınız hala aktif mi?</p>
                <span className="text-[10px] text-gray-400 mt-1 block">14:30</span>
              </div>
            </div>
            <div className="flex justify-end">
              <div className="bg-artisan-orange text-white rounded-2xl rounded-tr-sm px-4 py-2 max-w-[80%] shadow-sm">
                <p className="text-sm">Evet, hala elimde. Ne zaman teslim alabilirsiniz?</p>
                <span className="text-[10px] text-orange-100 mt-1 block text-right">14:32</span>
              </div>
            </div>
          </div>

          <div className="p-4 bg-white border-t border-gray-100">
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Mesaj yazın..."
                className="flex-1 rounded-full border border-gray-200 px-4 py-2 text-sm outline-none focus:border-artisan-orange"
              />
              <button className="w-10 h-10 rounded-full flex items-center justify-center bg-artisan-orange text-white">
                <Share2 size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderEmptyState = (title: string, desc: string, icon: React.ElementType) => {
    const IconComponent = icon;
    return (
      <div className="flex flex-col items-center justify-center py-24 bg-white rounded-2xl border border-gray-100">
        <div className="w-16 h-16 rounded-full bg-gray-50 flex items-center justify-center mb-4">
          <IconComponent size={28} style={{ color: 'var(--color-ink-light)' }} />
        </div>
        <h3 className="font-serif text-xl font-bold mb-2" style={{ color: 'var(--color-ink-dark)' }}>
          {title}
        </h3>
        <p className="text-sm text-center" style={{ color: 'var(--color-ink-light)', maxWidth: '300px' }}>
          {desc}
        </p>
        <span className="mt-6 px-3 py-1 rounded-full text-xs font-semibold bg-orange-50 text-artisan-orange">
          Yakında Gelecek
        </span>
      </div>
    );
  };

  // ─── Ana Render ──────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen pt-24 pb-12" style={{ background: 'var(--color-paper)' }}>
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        
        {/* Başlık */}
        <div className="mb-8">
          <h1 className="font-serif font-bold text-3xl md:text-4xl" style={{ color: 'var(--color-ink-dark)' }}>
            Profilim
          </h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--color-ink-light)' }}>
            Hoş geldin, {user?.fullName}. İlanlarını ve mesajlarını buradan yönetebilirsin.
          </p>
        </div>

        <div className="flex flex-col md:flex-row gap-8">
          
          {/* Sol Panel: Sidebar */}
          <div className="w-full md:w-64 flex-shrink-0">
            <div className="bg-white rounded-2xl p-3 border border-gray-100 shadow-sm sticky top-24">
              
              <div className="p-4 mb-2 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold" style={{ background: 'var(--color-artisan-earth)' }}>
                  {user?.fullName?.charAt(0)?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold truncate" style={{ color: 'var(--color-ink-dark)' }}>
                    {user?.fullName}
                  </p>
                  <p className="text-xs truncate" style={{ color: 'var(--color-ink-light)' }}>
                    {user?.email}
                  </p>
                </div>
              </div>

              <div className="space-y-1">
                {TABS.map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                        isActive
                          ? 'bg-orange-50 text-artisan-orange'
                          : 'text-ink-light hover:bg-gray-50 hover:text-ink-dark'
                      }`}
                    >
                      <Icon size={16} />
                      {tab.label}
                    </button>
                  );
                })}
              </div>

              <div className="mt-6 pt-4 border-t border-gray-100 px-1">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-semibold text-red-500 hover:bg-red-50 transition-colors"
                >
                  <LogOut size={16} />
                  Çıkış Yap
                </button>
              </div>
            </div>
          </div>

          {/* Sağ Panel: Content */}
          <div className="flex-1 min-w-0">
            {activeTab === 'activeAds' && renderActiveAds()}
            {activeTab === 'messages' && renderMessages()}
            {activeTab === 'bought' && renderEmptyState('Henüz bir şey almadınız', 'Talip olup teslim aldığınız ürünler burada listelenecek.', ShoppingBag)}
            {activeTab === 'shared' && renderEmptyState('Henüz paylaşım tamamlanmadı', 'Başkasına verdiğiniz ve süreci tamamlanan ilanlar burada listelenecek.', Share2)}
            {activeTab === 'reviews' && renderEmptyState('Değerlendirmeleriniz', 'Diğer kullanıcıların sizin hakkınızda yaptığı yorumlar burada olacak.', Star)}
          </div>
        </div>

      </div>

      {/* Silme Onay Modalı */}
      {itemToDelete && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => !deleting && setItemToDelete(null)}></div>
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm relative shadow-xl z-10">
            <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mb-4 text-red-500">
              <AlertTriangle size={24} />
            </div>
            <h3 className="font-serif text-xl font-bold mb-2 text-ink-dark">İlanı Sil</h3>
            <p className="text-sm text-ink-light mb-6">
              <span className="font-semibold text-ink-dark">"{itemToDelete.title}"</span> isimli ilanı silmek istediğinize emin misiniz? Bu işlem geri alınamaz.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setItemToDelete(null)}
                disabled={deleting}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-gray-100 text-ink-dark hover:bg-gray-200 transition-colors disabled:opacity-50"
              >
                Vazgeç
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={deleting}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-red-500 text-white hover:bg-red-600 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {deleting ? <Loader2 size={16} className="animate-spin" /> : 'Evet, Sil'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default ProfilePage;
