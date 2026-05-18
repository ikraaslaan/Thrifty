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
  Loader2,
  Heart,
  X,
  ChevronRight,
  User,
  Undo2,
  Users,
} from 'lucide-react';
import ItemCard, { type Item } from '../components/ItemCard';

type TabId = 'activeAds' | 'myApplications' | 'bought' | 'shared' | 'messages' | 'reviews';

interface TabItem {
  id: TabId;
  label: string;
  icon: React.ElementType;
}

const TABS: TabItem[] = [
  { id: 'activeAds', label: 'Aktif \u0130lanlar\u0131m', icon: List },
  { id: 'myApplications', label: 'Talip Olduklar\u0131m', icon: Heart },
  { id: 'bought', label: 'Ald\u0131klar\u0131m', icon: ShoppingBag },
  { id: 'shared', label: 'Payla\u015ft\u0131klar\u0131m', icon: Share2 },
  { id: 'messages', label: 'Mesaj Bildirimleri', icon: MessageSquare },
  { id: 'reviews', label: 'De\u011flendirmeler', icon: Star },
];



interface Application {
  id: string;
  note: string | null;
  status: 'PENDING' | 'WITHDRAWN';
  createdAt: string;
  item: Item & {
    user: { id: string; fullName: string; avatarUrl: string | null };
    category: { id: string; name: string; icon: string | null };
  };
}

interface ItemApplication {
  id: string;
  note: string | null;
  createdAt: string;
  user: { id: string; fullName: string; avatarUrl: string | null; email: string };
}

const ProfilePage = () => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabId>('activeAds');

  // Aktif İlanlar state
  const [myItems, setMyItems] = useState<Item[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);

  // İlana başvuranlar
  const [itemApplications, setItemApplications] = useState<Record<string, ItemApplication[]>>({});
  const [loadingApplications, setLoadingApplications] = useState<Record<string, boolean>>({});

  // Talip Olduklarım state
  const [myApplications, setMyApplications] = useState<Application[]>([]);
  const [loadingMyApps, setLoadingMyApps] = useState(false);
  const [withdrawingId, setWithdrawingId] = useState<string | null>(null);

  // Silme Modalı state
  const [itemToDelete, setItemToDelete] = useState<Item | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Başvuranlar Modalı state
  const [applicantsModalItemId, setApplicantsModalItemId] = useState<string | null>(null);
  const [applicantsModalTitle, setApplicantsModalTitle] = useState('');

  const fetchMyItems = async () => {
    setLoadingItems(true);
    try {
      const res = await axiosClient.get('/items/me');
      const data: Item[] = res.data?.data ?? [];
      setMyItems(data.filter(i => i.status === 'ACTIVE'));
    } catch {
      console.error('İlanlar alınırken hata');
    } finally {
      setLoadingItems(false);
    }
  };

  const fetchMyApplications = async () => {
    setLoadingMyApps(true);
    try {
      const res = await axiosClient.get('/applications/mine');
      setMyApplications(res.data?.data ?? []);
    } catch {
      console.error('Talepler alınırken hata');
    } finally {
      setLoadingMyApps(false);
    }
  };


  const handleWithdraw = async (applicationId: string) => {
    setWithdrawingId(applicationId);
    try {
      await axiosClient.delete(`/applications/${applicationId}`);
      setMyApplications(prev => prev.filter(a => a.id !== applicationId));
    } catch {
      alert('Talep geri çekilemedi, lütfen tekrar deneyin.');
    } finally {
      setWithdrawingId(null);
    }
  };

  useEffect(() => {
    if (activeTab === 'activeAds') fetchMyItems();
    if (activeTab === 'myApplications') fetchMyApplications();
  }, [activeTab]);

  const handleLogout = () => { logout(); navigate('/'); };
  const handleEdit = (item: Item) => navigate(`/paylas/${item.id}`);
  const handleDeleteConfirm = async () => {
    if (!itemToDelete) return;
    setDeleting(true);
    try {
      await axiosClient.delete(`/items/${itemToDelete.id}`);
      setMyItems(prev => prev.filter(i => i.id !== itemToDelete.id));
      setItemToDelete(null);
    } catch {
      alert('İlan silinirken bir hata oluştu.');
    } finally {
      setDeleting(false);
    }
  };

  // ─── Render: Aktif İlanlarım ─────────────────────────────────────────────────

  const renderActiveAds = () => {
    if (loadingItems) return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 size={32} className="animate-spin mb-4" style={{ color: 'var(--color-artisan-orange)' }} />
        <p style={{ color: 'var(--color-ink-light)' }}>İlanlarınız yükleniyor...</p>
      </div>
    );

    if (myItems.length === 0) return (
      <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-gray-100">
        <div className="w-16 h-16 rounded-full bg-orange-50 flex items-center justify-center mb-4">
          <List size={28} style={{ color: 'var(--color-artisan-orange)' }} />
        </div>
        <h3 className="font-serif text-xl font-bold mb-2" style={{ color: 'var(--color-ink-dark)' }}>Henüz aktif bir ilanınız yok</h3>
        <p className="text-sm text-center mb-6" style={{ color: 'var(--color-ink-light)', maxWidth: '300px' }}>
          Evde kullanmadığınız eşyaları paylaşmaya hemen başlayın.
        </p>
        <button onClick={() => navigate('/paylas')} className="tactile-btn px-6 py-2.5 text-sm font-semibold text-white" style={{ background: 'var(--color-artisan-orange)' }}>
          İlk İlanını Ver
        </button>
      </div>
    );

    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {myItems.map(item => {
          const apps = itemApplications[item.id];
          const loading = loadingApplications[item.id];
          const appCount = apps?.length ?? null;

          return (
            <div key={item.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
              {/* Kart + hover butonlar */}
              <div className="relative group flex-1">
                <ItemCard item={item} onClick={item => navigate(`/ilan/${item.id}`)} />
                <div className="absolute top-3 right-3 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10">
                  <button onClick={() => handleEdit(item)} className="w-8 h-8 rounded-full flex items-center justify-center bg-white shadow-sm hover:scale-110 transition-transform" title="Düzenle" style={{ color: 'var(--color-artisan-sage-dark)' }}>
                    <Edit2 size={14} />
                  </button>
                  <button onClick={() => setItemToDelete(item)} className="w-8 h-8 rounded-full flex items-center justify-center bg-white shadow-sm hover:scale-110 transition-transform" title="Sil" style={{ color: '#ef4444' }}>
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              {/* Başvuranlar Butonu */}
              <div className="border-t border-gray-50">
                <button
                  onClick={() => {
                    setApplicantsModalTitle(item.title);
                    setApplicantsModalItemId(item.id);
                    // Henüz yüklenmemisse çek
                    if (!itemApplications[item.id]) {
                      setLoadingApplications(prev => ({ ...prev, [item.id]: true }));
                      axiosClient.get(`/applications/item/${item.id}`)
                        .then(res => setItemApplications(prev => ({ ...prev, [item.id]: res.data?.data ?? [] })))
                        .catch(() => {})
                        .finally(() => setLoadingApplications(prev => ({ ...prev, [item.id]: false })));
                    }
                  }}
                  className="w-full flex items-center justify-between px-4 py-2.5 text-xs font-semibold transition-colors hover:bg-gray-50"
                  style={{ color: 'var(--color-ink-dark)' }}
                >
                  <span className="flex items-center gap-1.5">
                    <Users size={13} style={{ color: 'var(--color-artisan-orange)' }} />
                    {loading ? 'Yükleniyor...' : appCount !== null ? `${appCount} Başvuran` : 'Başvuranları Gör'}
                  </span>
                  <ChevronRight size={13} style={{ color: 'var(--color-ink-light)' }} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // ─── Render: Talip Olduklarım ────────────────────────────────────────────────


  const renderMyApplications = () => {
    if (loadingMyApps) return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 size={32} className="animate-spin mb-4" style={{ color: 'var(--color-artisan-orange)' }} />
        <p style={{ color: 'var(--color-ink-light)' }}>Talepleriniz yükleniyor...</p>
      </div>
    );

    if (myApplications.length === 0) return (
      <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-gray-100">
        <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mb-4">
          <Heart size={28} style={{ color: 'var(--color-artisan-orange)' }} />
        </div>
        <h3 className="font-serif text-xl font-bold mb-2" style={{ color: 'var(--color-ink-dark)' }}>Henüz talip olduğunuz ilan yok</h3>
        <p className="text-sm text-center mb-6" style={{ color: 'var(--color-ink-light)', maxWidth: '300px' }}>
          İlanları inceleyip beğendiklerinize "Talibim" diyerek talep oluşturabilirsiniz.
        </p>
        <button onClick={() => navigate('/')} className="tactile-btn px-6 py-2.5 text-sm font-semibold text-white" style={{ background: 'var(--color-artisan-orange)' }}>
          İlanları Keşfet
        </button>
      </div>
    );

    return (
      <div className="flex flex-col gap-4">
        {myApplications.map(app => (
          <div key={app.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex gap-4 p-4">
            {/* İlan Görseli */}
            <div
              className="w-24 h-24 rounded-xl overflow-hidden flex-shrink-0 cursor-pointer"
              onClick={() => navigate(`/ilan/${app.item.id}`)}
              style={{ background: 'var(--color-paper-light)' }}
            >
              {app.item.images?.[0]
                ? <img src={app.item.images[0]} alt={app.item.title} className="w-full h-full object-cover" />
                : <div className="w-full h-full flex items-center justify-center"><Share2 size={20} style={{ color: 'var(--color-ink-light)', opacity: 0.4 }} /></div>}
            </div>

            {/* Detaylar */}
            <div className="flex-1 min-w-0 flex flex-col justify-between">
              <div>
                <p
                  className="font-bold text-sm capitalize cursor-pointer hover:underline"
                  style={{ color: 'var(--color-ink-dark)' }}
                  onClick={() => navigate(`/ilan/${app.item.id}`)}
                >
                  {app.item.title}
                </p>
                <p className="text-[10px] mt-0.5 mb-2" style={{ color: 'var(--color-ink-light)' }}>
                  {app.item.category?.name} &bull; Talip Olundu: {new Date(app.createdAt).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' })}
                </p>
                {app.note && (
                  <p className="text-xs italic px-2.5 py-2 rounded-lg leading-relaxed" style={{ background: 'rgba(74,59,50,0.04)', color: 'var(--color-ink-dark)', border: '1px dashed rgba(74,59,50,0.1)' }}>
                    Notunuz: "{app.note}"
                  </p>
                )}
              </div>

              {/* Durum Badge + Geri Çek */}
              <div className="flex items-center justify-between mt-3">
                <span className="text-[10px] font-bold px-2.5 py-1 rounded-full" style={{ background: 'rgba(58,125,68,0.08)', color: '#3a7d44' }}>
                  ✓ Talep Aktif
                </span>
                <button
                  onClick={() => handleWithdraw(app.id)}
                  disabled={withdrawingId === app.id}
                  className="flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 rounded-full transition-all hover:bg-red-50 disabled:opacity-50"
                  style={{ color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)' }}
                >
                  {withdrawingId === app.id
                    ? <Loader2 size={12} className="animate-spin" />
                    : <Undo2 size={12} />}
                  Talebi Geri Çek
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderMessages = () => (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden flex h-[600px]">
      <div className="w-1/3 border-r border-gray-100 flex flex-col">
        <div className="p-4 border-b border-gray-100 bg-gray-50/50">
          <h3 className="font-semibold" style={{ color: 'var(--color-ink-dark)' }}>Sohbetler</h3>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          <div className="p-3 rounded-xl bg-orange-50/50 cursor-pointer flex gap-3 items-center">
            <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0" style={{ background: 'var(--color-artisan-earth)' }}>A</div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate" style={{ color: 'var(--color-ink-dark)' }}>Ahmet Yılmaz</p>
              <p className="text-xs truncate" style={{ color: 'var(--color-ink-light)' }}>Logitech Mouse için yazıyorum...</p>
            </div>
            <div className="w-2 h-2 rounded-full" style={{ background: 'var(--color-artisan-orange)' }}></div>
          </div>
        </div>
      </div>
      <div className="flex-1 flex flex-col items-center justify-center gap-3" style={{ color: 'var(--color-ink-light)' }}>
        <MessageSquare size={32} style={{ opacity: 0.3 }} />
        <p className="text-sm">Mesajlaşma yakında geliyor</p>
      </div>
    </div>
  );

  const renderEmptyState = (title: string, desc: string, icon: React.ElementType) => {
    const IconComponent = icon;
    return (
      <div className="flex flex-col items-center justify-center py-24 bg-white rounded-2xl border border-gray-100">
        <div className="w-16 h-16 rounded-full bg-gray-50 flex items-center justify-center mb-4">
          <IconComponent size={28} style={{ color: 'var(--color-ink-light)' }} />
        </div>
        <h3 className="font-serif text-xl font-bold mb-2" style={{ color: 'var(--color-ink-dark)' }}>{title}</h3>
        <p className="text-sm text-center" style={{ color: 'var(--color-ink-light)', maxWidth: '300px' }}>{desc}</p>
        <span className="mt-6 px-3 py-1 rounded-full text-xs font-semibold" style={{ background: 'rgba(224,93,58,0.08)', color: 'var(--color-artisan-orange)' }}>Yakında Gelecek</span>
      </div>
    );
  };

  return (
    <div className="min-h-screen pt-24 pb-12" style={{ background: 'var(--color-paper)' }}>
      <div className="max-w-7xl mx-auto px-4 md:px-8">

        <div className="mb-8">
          <h1 className="font-serif font-bold text-3xl md:text-4xl" style={{ color: 'var(--color-ink-dark)' }}>Profilim</h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--color-ink-light)' }}>
            Hoş geldin, {user?.fullName}. İlanlarını ve mesajlarını buradan yönetebilirsin.
          </p>
        </div>

        <div className="flex flex-col md:flex-row gap-8">

          {/* Sidebar */}
          <div className="w-full md:w-64 flex-shrink-0">
            <div className="bg-white rounded-2xl p-3 border border-gray-100 shadow-sm sticky top-24">
              <div className="p-4 mb-2 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold" style={{ background: 'var(--color-artisan-earth)' }}>
                  {user?.fullName?.charAt(0)?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold truncate" style={{ color: 'var(--color-ink-dark)' }}>{user?.fullName}</p>
                  <p className="text-xs truncate" style={{ color: 'var(--color-ink-light)' }}>{user?.email}</p>
                </div>
              </div>
              <div className="space-y-1">
                {TABS.map(tab => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  return (
                    <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${isActive ? 'bg-orange-50 text-artisan-orange' : 'text-ink-light hover:bg-gray-50 hover:text-ink-dark'}`}
                    >
                      <Icon size={16} />
                      {tab.label}
                    </button>
                  );
                })}
              </div>
              <div className="mt-6 pt-4 border-t border-gray-100 px-1">
                <button onClick={handleLogout} className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-semibold text-red-500 hover:bg-red-50 transition-colors">
                  <LogOut size={16} /> Çıkış Yap
                </button>
              </div>
            </div>
          </div>

          <div className="flex-1 min-w-0">
            {activeTab === 'activeAds' && renderActiveAds()}
            {activeTab === 'myApplications' && renderMyApplications()}
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
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => !deleting && setItemToDelete(null)} />
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm relative shadow-xl z-10">
            <button onClick={() => setItemToDelete(null)} className="absolute top-4 right-4 w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors">
              <X size={16} style={{ color: 'var(--color-ink-light)' }} />
            </button>
            <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mb-4 text-red-500">
              <AlertTriangle size={24} />
            </div>
            <h3 className="font-serif text-xl font-bold mb-2" style={{ color: 'var(--color-ink-dark)' }}>İlanı Sil</h3>
            <p className="text-sm mb-6" style={{ color: 'var(--color-ink-light)' }}>
              <span className="font-semibold" style={{ color: 'var(--color-ink-dark)' }}>"{itemToDelete.title}"</span> isimli ilanı silmek istediğinize emin misiniz?
            </p>
            <div className="flex gap-3">
              <button onClick={() => setItemToDelete(null)} disabled={deleting} className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-gray-100 hover:bg-gray-200 transition-colors disabled:opacity-50" style={{ color: 'var(--color-ink-dark)' }}>
                Vazgeç
              </button>
              <button onClick={handleDeleteConfirm} disabled={deleting} className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-red-500 text-white hover:bg-red-600 transition-colors flex items-center justify-center gap-2 disabled:opacity-50">
                {deleting ? <Loader2 size={16} className="animate-spin" /> : 'Evet, Sil'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Başvuranlar Modalı */}
      {applicantsModalItemId && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setApplicantsModalItemId(null)} />
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg relative shadow-xl z-10 max-h-[80vh] overflow-y-auto">
            <button onClick={() => setApplicantsModalItemId(null)} className="absolute top-4 right-4 w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors">
              <X size={16} style={{ color: 'var(--color-ink-light)' }} />
            </button>
            <h3 className="font-serif text-lg font-bold mb-1 pr-8" style={{ color: 'var(--color-ink-dark)' }}>Başvuranlar</h3>
            <p className="text-xs mb-5 capitalize" style={{ color: 'var(--color-ink-light)' }}>"{applicantsModalTitle}" ilanı için</p>

            {loadingApplications[applicantsModalItemId] ? (
              <div className="flex items-center justify-center py-10 gap-3">
                <Loader2 size={20} className="animate-spin" style={{ color: 'var(--color-artisan-orange)' }} />
                <span className="text-sm" style={{ color: 'var(--color-ink-light)' }}>Yükleniyor...</span>
              </div>
            ) : (itemApplications[applicantsModalItemId] ?? []).length === 0 ? (
              <div className="flex flex-col items-center py-10 gap-3">
                <div className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center">
                  <Users size={20} style={{ color: 'var(--color-ink-light)', opacity: 0.5 }} />
                </div>
                <p className="text-sm" style={{ color: 'var(--color-ink-light)' }}>Henüz başvuran yok</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {(itemApplications[applicantsModalItemId] ?? []).map(app => (
                  <div key={app.id} className="flex gap-3 p-4 rounded-xl" style={{ background: 'rgba(74,59,50,0.03)', border: '1px solid rgba(74,59,50,0.06)' }}>
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0 overflow-hidden" style={{ background: 'var(--color-artisan-earth)' }}>
                      {app.user.avatarUrl
                        ? <img src={app.user.avatarUrl} alt={app.user.fullName} className="w-full h-full object-cover" />
                        : <User size={16} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold capitalize" style={{ color: 'var(--color-ink-dark)' }}>{app.user.fullName}</p>
                      <p className="text-[10px] mb-2" style={{ color: 'var(--color-ink-light)' }}>
                        {new Date(app.createdAt).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </p>
                      {app.note ? (
                        <p className="text-xs italic leading-relaxed px-3 py-2 rounded-lg" style={{ background: 'rgba(255,255,255,0.9)', color: 'var(--color-ink-dark)', border: '1px solid rgba(74,59,50,0.06)' }}>
                          "{app.note}"
                        </p>
                      ) : (
                        <p className="text-xs italic" style={{ color: 'var(--color-ink-light)' }}>Not bırakılmamış</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfilePage;
