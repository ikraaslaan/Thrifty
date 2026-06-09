import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../stores/useAuthStore';
import axiosClient from '../api/axiosClient';
import {
  Share2,
  List,
  Star,
  LogOut,
  Edit2,
  Trash2,
  AlertTriangle,
  Loader2,
  Heart,
  X,
  User,
  Undo2,
  Users,
  History,
  Bell,
  MessageSquare,
  Check,
  CheckCheck,
  ArrowLeft,
  Send,
} from 'lucide-react';
import ItemCard, { type Item } from '../components/ItemCard';

type TabId = 'activeAds' | 'myApplications' | 'history' | 'notifications' | 'reviews' | 'messages';

interface TabItem {
  id: TabId;
  label: string;
  icon: React.ElementType;
}

const TABS: TabItem[] = [
  { id: 'activeAds', label: 'Aktif İlanlarım', icon: List },
  { id: 'myApplications', label: 'Talip Olduklarım', icon: Heart },
  { id: 'history', label: 'Geçmiş İşlemlerim', icon: History },
  { id: 'messages', label: 'Mesajlarım', icon: MessageSquare },
  { id: 'notifications', label: 'Bildirimler', icon: Bell },
  { id: 'reviews', label: 'Değerlendirmeler', icon: Star },
];

interface AppNotification {
  id: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}



interface SharedItem extends Item {
  updatedAt?: string;
  applications?: {
    id: string;
    status: string;
    user: { id: string; fullName: string; avatarUrl: string | null };
  }[];
}

interface Application {
  id: string;
  note: string | null;
  status: 'PENDING' | 'WITHDRAWN' | 'APPROVED' | 'REJECTED';
  isRated: boolean;
  createdAt: string;
  updatedAt?: string;
  item: Item & {
    user: { id: string; fullName: string; avatarUrl: string | null };
    category: { id: string; name: string; icon: string | null };
  };
}

interface ItemApplication {
  id: string;
  note: string | null;
  status: 'PENDING' | 'WITHDRAWN' | 'APPROVED' | 'REJECTED';
  isRated: boolean;
  createdAt: string;
  user: { id: string; fullName: string; avatarUrl: string | null; email: string };
}

interface ChatRoom {
  id: string;
  itemId: string;
  item: {
    id: string;
    title: string;
    images: string[];
    status: string;
  };
  ownerId: string;
  owner: {
    id: string;
    fullName: string;
    avatarUrl: string | null;
  };
  applicantId: string;
  applicant: {
    id: string;
    fullName: string;
    avatarUrl: string | null;
  };
  unreadCount?: number;
  messages?: ChatMessage[];
  updatedAt: string;
  isBlocked?: boolean;
  blockedByMe?: boolean;
}

interface ChatMessage {
  id: string;
  roomId: string;
  senderId: string;
  content: string;
  isRead: boolean;
  createdAt: string;
}

const ProfilePage = () => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const routeState = location.state as { activeTab?: TabId; activeRoomId?: string } | null;
  const [activeTab, setActiveTab] = useState<TabId>(routeState?.activeTab || 'activeAds');

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

  // Geçmiş İşlemler state
  const [historyBought, setHistoryBought] = useState<Application[]>([]);
  const [historyShared, setHistoryShared] = useState<SharedItem[]>([]);
  const [loadingBought, setLoadingBought] = useState(false);
  const [loadingShared, setLoadingShared] = useState(false);
  const [historySubTab, setHistorySubTab] = useState<'bought' | 'shared'>('bought');

  // Sohbet (Chat) state'leri
  const [chatRooms, setChatRooms] = useState<ChatRoom[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(false);
  const [activeRoom, setActiveRoom] = useState<ChatRoom | null>(null);
  const [roomMessages, setRoomMessages] = useState<ChatMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [messageInput, setMessageInput] = useState('');
  const [isOtherUserTyping, setIsOtherUserTyping] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Engelleme state'leri
  const [blockedUserIds, setBlockedUserIds] = useState<Set<string>>(new Set());
  const [blockMenuOpen, setBlockMenuOpen] = useState(false);
  const [isBlocking, setIsBlocking] = useState(false);

  // Yıldız Puanlama Modalı state
  const [ratingModalAppId, setRatingModalAppId] = useState<string | null>(null);
  const [selectedRating, setSelectedRating] = useState<number>(5);
  const [isSubmittingRating, setIsSubmittingRating] = useState(false);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [reviewComment, setReviewComment] = useState('');

  // Değerlendirmeler state
  const [myReviews, setMyReviews] = useState<any[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(false);

  // Bildirimler state
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loadingNotifications, setLoadingNotifications] = useState(false);

  // Silme Modalı state
  const [itemToDelete, setItemToDelete] = useState<Item | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Başvuranlar Modalı state
  const [applicantsModalItemId, setApplicantsModalItemId] = useState<string | null>(null);
  const [applicantsModalTitle, setApplicantsModalTitle] = useState('');
  const [processingAppId, setProcessingAppId] = useState<string | null>(null);

  // Başvuran Kullanıcının Değerlendirmeleri Modalı state
  const [selectedUserForReviews, setSelectedUserForReviews] = useState<{ id: string; fullName: string } | null>(null);
  const [selectedUserReviews, setSelectedUserReviews] = useState<any[]>([]);
  const [loadingSelectedUserReviews, setLoadingSelectedUserReviews] = useState(false);

  const fetchMyItems = async () => {
    setLoadingItems(true);
    try {
      const res = await axiosClient.get('/items/me');
      const data: Item[] = res.data?.data ?? [];
      setMyItems(data.filter(i => i.status === 'ACTIVE' || i.status === 'RESERVED'));
    } catch {
      console.error('İlanlar alınırken hata');
    } finally {
      setLoadingItems(false);
    }
  };

  const handleApproveApplication = async (applicationId: string, itemId: string) => {
    setProcessingAppId(applicationId);
    try {
      await axiosClient.patch(`/applications/${applicationId}/approve`);
      
      // Talepleri yeniden çek
      const appsRes = await axiosClient.get(`/applications/item/${itemId}`);
      setItemApplications(prev => ({ ...prev, [itemId]: appsRes.data?.data ?? [] }));
      
      // İlanlar listesini yeniden çek (ilan RESERVED olacağı için)
      await fetchMyItems();
    } catch (err) {
      alert('Talep onaylanırken bir hata oluştu.');
    } finally {
      setProcessingAppId(null);
    }
  };

  const handleRejectApplication = async (applicationId: string, itemId: string) => {
    setProcessingAppId(applicationId);
    try {
      await axiosClient.patch(`/applications/${applicationId}/reject`);
      
      // Talepleri yeniden çek
      const appsRes = await axiosClient.get(`/applications/item/${itemId}`);
      setItemApplications(prev => ({ ...prev, [itemId]: appsRes.data?.data ?? [] }));
    } catch (err) {
      alert('Talep reddedilirken bir hata oluştu.');
    } finally {
      setProcessingAppId(null);
    }
  };

  const closeRatingModal = () => {
    setRatingModalAppId(null);
    setSelectedRating(5);
    setReviewComment('');
  };

  const handleCompleteApplication = async (applicationId: string) => {
    try {
      await axiosClient.patch(`/applications/${applicationId}/complete`);
      // Puanlama modalını aç
      setRatingModalAppId(applicationId);
      setSelectedRating(5);
      setReviewComment('');
      // Listeleri yenile
      fetchMyApplications();
    } catch (err) {
      alert('Teslim alma işlemi başarısız oldu.');
    }
  };

  const handleRateApplication = async (applicationId: string, ratingValue: number) => {
    setIsSubmittingRating(true);
    try {
      await axiosClient.patch(`/applications/${applicationId}/rate`, { 
        rating: ratingValue,
        comment: reviewComment 
      });
      closeRatingModal();
      alert('Değerlendirmeniz iletildi. Teşekkürler! 🌟');
      
      // Hangi tab aktifse orayı yenile
      if (activeTab === 'myApplications') {
        fetchMyApplications();
      } else if (activeTab === 'history') {
        fetchHistoryBought();
      }
    } catch (err) {
      alert('Puanlama kaydedilemedi.');
    } finally {
      setIsSubmittingRating(false);
    }
  };

  const handleCancelDelivery = async (applicationId: string, itemId: string) => {
    if (!window.confirm('Teslimatı iptal etmek istediğinize emin misiniz? İlan tekrar aktif olacaktır.')) return;
    try {
      await axiosClient.patch(`/applications/${applicationId}/cancel-delivery`);
      alert('Teslimat başarıyla iptal edildi ve ilan tekrar yayına alındı. ♻️');
      
      // Modal açıksa başvuruları güncelle
      if (applicantsModalItemId === itemId) {
        const appsRes = await axiosClient.get(`/applications/item/${itemId}`);
        setItemApplications(prev => ({ ...prev, [itemId]: appsRes.data?.data ?? [] }));
      }
      
      // İlanlar listesini yenile
      await fetchMyItems();
    } catch (err) {
      alert('Teslimat iptal edilemedi.');
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

  const fetchHistoryBought = async () => {
    setLoadingBought(true);
    try {
      const res = await axiosClient.get('/applications/history/bought');
      setHistoryBought(res.data?.data ?? []);
    } catch {
      console.error('Alım geçmişi alınırken hata');
    } finally {
      setLoadingBought(false);
    }
  };

  const fetchHistoryShared = async () => {
    setLoadingShared(true);
    try {
      const res = await axiosClient.get('/applications/history/shared');
      setHistoryShared(res.data?.data ?? []);
    } catch {
      console.error('Paylaşım geçmişi alınırken hata');
    } finally {
      setLoadingShared(false);
    }
  };

  const fetchNotifications = async (markAsRead = false) => {
    if (markAsRead) setLoadingNotifications(true);
    try {
      const res = await axiosClient.get('/notifications');
      const fetched: AppNotification[] = res.data?.data ?? [];
      setNotifications(fetched);
      if (markAsRead) {
        const hasUnread = fetched.some((n: AppNotification) => !n.isRead);
        if (hasUnread) {
          const ids = fetched.filter(n => !n.isRead).map(n => n.id);
          await axiosClient.patch('/notifications/read', { ids });
          setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
        }
      }
    } catch {
      console.error('Bildirimler alınırken hata');
    } finally {
      if (markAsRead) setLoadingNotifications(false);
    }
  };

  const fetchMyReviews = async () => {
    setLoadingReviews(true);
    try {
      const res = await axiosClient.get('/applications/reviews/me');
      setMyReviews(res.data?.data ?? []);
    } catch {
      console.error('Değerlendirmeler alınırken hata');
    } finally {
      setLoadingReviews(false);
    }
  };

  const fetchSelectedUserReviews = async (userId: string) => {
    setLoadingSelectedUserReviews(true);
    try {
      const res = await axiosClient.get(`/applications/reviews/user/${userId}`);
      setSelectedUserReviews(res.data?.data ?? []);
    } catch {
      console.error('Kullanıcı değerlendirmeleri alınırken hata');
      setSelectedUserReviews([]);
    } finally {
      setLoadingSelectedUserReviews(false);
    }
  };

  useEffect(() => {
    if (selectedUserForReviews) {
      fetchSelectedUserReviews(selectedUserForReviews.id);
    } else {
      setSelectedUserReviews([]);
    }
  }, [selectedUserForReviews]);

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

  const handleStartChat = async (itemId: string, applicantId?: string) => {
    try {
      const res = await axiosClient.post('/chat/rooms', {
        itemId,
        ...(applicantId && { applicantId })
      });
      if (res.data?.status === 'success' && res.data?.data) {
        setActiveTab('messages');
        selectRoom(res.data.data);
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Sohbet başlatılamadı.');
    }
  };

  useEffect(() => {
    if (routeState?.activeRoomId && chatRooms.length > 0 && !activeRoom) {
      const roomToSelect = chatRooms.find(r => r.id === routeState.activeRoomId);
      if (roomToSelect) {
        selectRoom(roomToSelect);
        window.history.replaceState({}, document.title);
      }
    }
  }, [chatRooms, routeState?.activeRoomId, activeRoom]);

  // WebSocket bağlantısını yöneten useEffect
  useEffect(() => {
    const token = useAuthStore.getState().token;
    if (!token || !user) return;

    const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    const socket = io(backendUrl, {
      auth: { token }
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('⚡ Socket.io sunucusuna baglanildi');
    });

    socket.on('new_message', (msg: ChatMessage) => {
      setRoomMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });

      setChatRooms((prevRooms) => {
        return prevRooms.map((room) => {
          if (room.id === msg.roomId) {
            return {
              ...room,
              messages: [msg],
              // Aktif odadayken gelen mesajı okunmuş say
              unreadCount: activeRoom?.id === msg.roomId ? 0 : (room.unreadCount ?? 0) + 1,
              updatedAt: msg.createdAt
            };
          }
          return room;
        }).sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      });
      
      // Aktif odadayken alınan mesajı okundu olarak işaretle (sessizce)
      if (activeRoom && activeRoom.id === msg.roomId && msg.senderId !== user?.id) {
        axiosClient.patch(`/chat/rooms/${msg.roomId}/read`).catch(() => {});
      }
    });

    socket.on('messages_read', ({ roomId, readerId }: { roomId: string; readerId: string }) => {
      if (activeRoom && activeRoom.id === roomId && readerId !== user?.id) {
        setRoomMessages((prev) =>
          prev.map((msg) => (msg.senderId === user?.id ? { ...msg, isRead: true } : msg))
        );
      }
    });

    socket.on('user_typing', ({ roomId, userId, isTyping }: { roomId: string; userId: string; isTyping: boolean }) => {
      if (activeRoom && activeRoom.id === roomId) {
        const otherUserId = activeRoom.ownerId === user?.id ? activeRoom.applicantId : activeRoom.ownerId;
        if (userId === otherUserId) {
          setIsOtherUserTyping(isTyping);
        }
      }
    });

    socket.on('message_badge_update', ({ roomId, message }: { roomId: string; message: ChatMessage }) => {
      if (activeRoom?.id !== roomId) {
        setChatRooms((prevRooms) => {
          return prevRooms.map((room) => {
            if (room.id === roomId) {
              return {
                ...room,
                messages: [message],
                unreadCount: (room.unreadCount ?? 0) + 1,
                updatedAt: message.createdAt
              };
            }
            return room;
          }).sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
        });
      }
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [activeRoom?.id, user?.id]);

  // Mesaj listesi güncellendiğinde otomatik en aşağı kaydır
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [roomMessages, isOtherUserTyping]);

  const selectRoom = async (room: ChatRoom) => {
    if (activeRoom && socketRef.current) {
      socketRef.current.emit('leave_room', activeRoom.id);
    }
    setActiveRoom(room);
    setIsOtherUserTyping(false);
    setLoadingMessages(true);
    try {
      const res = await axiosClient.get(`/chat/rooms/${room.id}/messages`);
      setRoomMessages(res.data?.data ?? []);
      
      setChatRooms((prev) =>
        prev.map((r) => (r.id === room.id ? { ...r, unreadCount: 0 } : r))
      );

      if (socketRef.current) {
        socketRef.current.emit('join_room', room.id);
      }
    } catch {
      console.error('Mesajlar yüklenirken hata');
    } finally {
      setLoadingMessages(false);
    }
  };

  const fetchChatRooms = async () => {
    setLoadingRooms(true);
    try {
      const res = await axiosClient.get('/chat/rooms');
      setChatRooms(res.data?.data ?? []);
    } catch {
      console.error('Sohbet odaları yüklenirken hata');
    } finally {
      setLoadingRooms(false);
    }
  };

  const fetchBlockedUsers = async () => {
    try {
      const res = await axiosClient.get('/users/blocked');
      const ids = (res.data?.data ?? []).map((u: { id: string }) => u.id);
      setBlockedUserIds(new Set(ids));
    } catch {
      console.error('Engellenenler alınamadı');
    }
  };

  const handleBlockToggle = async (targetUserId: string) => {
    setIsBlocking(true);
    setBlockMenuOpen(false);
    try {
      const isCurrentlyBlocked = blockedUserIds.has(targetUserId);
      if (isCurrentlyBlocked) {
        await axiosClient.delete(`/users/${targetUserId}/block`);
        setBlockedUserIds(prev => { const s = new Set(prev); s.delete(targetUserId); return s; });
      } else {
        await axiosClient.post(`/users/${targetUserId}/block`);
        setBlockedUserIds(prev => new Set([...prev, targetUserId]));
      }
    } catch {
      alert('Engelleme işlemi başarısız oldu.');
    } finally {
      setIsBlocking(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeRoom || !messageInput.trim()) return;

    const content = messageInput.trim();
    setMessageInput('');
    
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    socketRef.current?.emit('typing', { roomId: activeRoom.id, isTyping: false });

    try {
      const res = await axiosClient.post(`/chat/rooms/${activeRoom.id}/messages`, { content });
      const newMsg = res.data?.data;
      if (newMsg) {
        setRoomMessages((prev) => [...prev, newMsg]);

        setChatRooms((prev) =>
          prev.map((r) =>
            r.id === activeRoom.id
              ? { ...r, messages: [newMsg], updatedAt: newMsg.createdAt }
              : r
          ).sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
        );
      }
    } catch {
      alert('Mesaj gönderilemedi, lütfen tekrar deneyin.');
    }
  };

  const handleTyping = () => {
    if (!activeRoom || !socketRef.current) return;

    socketRef.current.emit('typing', { roomId: activeRoom.id, isTyping: true });

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      socketRef.current?.emit('typing', { roomId: activeRoom.id, isTyping: false });
    }, 3000);
  };

  // Sayfa ilk yüklendiğinde bildirimleri ve sohbetleri arka planda çek (rozet sayıları için)
  useEffect(() => {
    fetchNotifications(false);
    fetchChatRooms();
  }, []);

  // Yönlendirme (routeState) ile sekme değiştiğinde aktif sekmeyi güncelle
  useEffect(() => {
    if (routeState?.activeTab) {
      setActiveTab(routeState.activeTab);
    }
  }, [routeState?.activeTab]);

  // Aktif sekmeye ait okunmamış bildirimleri otomatik okundu olarak işaretle
  useEffect(() => {
    const markTabNotificationsAsRead = async () => {
      const unread = notifications.filter(n => !n.isRead);
      let idsToRead: string[] = [];
      if (activeTab === 'activeAds') {
        idsToRead = unread.filter(n => n.title.includes('Talep') && (n.title.includes('Yeni') || n.title.includes('Tekrar'))).map(n => n.id);
      } else if (activeTab === 'myApplications') {
        idsToRead = unread.filter(n => n.title.includes('Onaylandı') || n.title.includes('Talep Sonucu') || n.title.includes('İptal Edildi')).map(n => n.id);
      } else if (activeTab === 'history') {
        idsToRead = unread.filter(n => n.title.includes('Teslimat Tamamlandı')).map(n => n.id);
      } else if (activeTab === 'reviews') {
        idsToRead = unread.filter(n => n.title.includes('Değerlendirme')).map(n => n.id);
      }

      if (idsToRead.length > 0) {
        try {
          await axiosClient.patch('/notifications/read', { ids: idsToRead });
          setNotifications(prev => prev.map(n => idsToRead.includes(n.id) ? { ...n, isRead: true } : n));
        } catch (err) {
          console.error('Error marking tab notifications as read:', err);
        }
      }
    };

    markTabNotificationsAsRead();
  }, [activeTab, notifications.filter(n => !n.isRead).length]);

  useEffect(() => {
    if (activeTab === 'activeAds') fetchMyItems();
    if (activeTab === 'myApplications') fetchMyApplications();
    if (activeTab === 'history') {
      if (historySubTab === 'bought') fetchHistoryBought();
      if (historySubTab === 'shared') fetchHistoryShared();
    }
    if (activeTab === 'notifications') fetchNotifications(true);
    if (activeTab === 'reviews') fetchMyReviews();
    if (activeTab === 'messages') { fetchChatRooms(); fetchBlockedUsers(); }
  }, [activeTab, historySubTab]);

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

              {/* Başvuranlar veya İptal Et Butonu */}
              <div className="border-t border-gray-50 flex divide-x divide-gray-50">
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
                  className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-semibold transition-colors hover:bg-gray-50"
                  style={{ color: 'var(--color-ink-dark)' }}
                >
                  <Users size={13} style={{ color: 'var(--color-artisan-orange)' }} />
                  {loading ? 'Yükleniyor...' : appCount !== null ? `${appCount} Başvuran` : 'Başvuranlar'}
                </button>
                {item.status === 'RESERVED' && (
                  <button
                    onClick={async () => {
                      let targetAppId = '';
                      if (apps) {
                        const approved = apps.find(a => a.status === 'APPROVED');
                        if (approved) targetAppId = approved.id;
                      }
                      
                      if (!targetAppId) {
                        try {
                          const res = await axiosClient.get(`/applications/item/${item.id}`);
                          const fetchedApps = res.data?.data ?? [];
                          const approved = fetchedApps.find((a: any) => a.status === 'APPROVED');
                          if (approved) targetAppId = approved.id;
                        } catch {
                          // ignore
                        }
                      }
                      
                      if (targetAppId) {
                        handleCancelDelivery(targetAppId, item.id);
                      } else {
                        alert('Onaylanmış talep bulunamadı.');
                      }
                    }}
                    className="px-4 py-2.5 text-xs font-bold text-red-500 hover:bg-red-50 transition-colors flex items-center justify-center gap-1 cursor-pointer"
                  >
                    İptal Et
                  </button>
                )}
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

              {/* Durum Badge + Geri Çek / Teslim Aldım */}
              <div className="flex items-center justify-between mt-3">
                {app.status === 'PENDING' && (
                  <span className="text-[10px] font-bold px-2.5 py-1 rounded-full" style={{ background: 'rgba(58,125,68,0.08)', color: '#3a7d44' }}>
                    ✓ Talep Aktif
                  </span>
                )}
                {app.status === 'APPROVED' && app.item.status === 'RESERVED' && (
                  <span className="text-[10px] font-bold px-2.5 py-1 rounded-full animate-pulse" style={{ background: 'rgba(224,93,58,0.1)', color: 'var(--color-artisan-orange)' }}>
                    🤝 Teslimat Bekliyor
                  </span>
                )}
                {app.status === 'APPROVED' && app.item.status === 'COMPLETED' && (
                  <span className="text-[10px] font-bold px-2.5 py-1 rounded-full" style={{ background: 'rgba(58,125,68,0.15)', color: '#3a7d44' }}>
                    🎉 Onaylandı ve Teslim Alındı
                  </span>
                )}
                {app.status === 'REJECTED' && (
                  <span className="text-[10px] font-bold px-2.5 py-1 rounded-full" style={{ background: 'rgba(239,68,68,0.08)', color: '#ef4444' }}>
                    ❌ Reddedildi
                  </span>
                )}
                {app.status === 'WITHDRAWN' && (
                  <span className="text-[10px] font-bold px-2.5 py-1 rounded-full" style={{ background: 'rgba(74,59,50,0.08)', color: 'var(--color-ink-light)' }}>
                    Geri Çekildi
                  </span>
                )}

                {app.status === 'PENDING' && (
                  <button
                    onClick={() => handleWithdraw(app.id)}
                    disabled={withdrawingId === app.id}
                    className="flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 rounded-full transition-all hover:bg-red-50 disabled:opacity-50 cursor-pointer"
                    style={{ color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)' }}
                  >
                    {withdrawingId === app.id
                      ? <Loader2 size={12} className="animate-spin" />
                      : <Undo2 size={12} />}
                    Talebi Geri Çek
                  </button>
                )}

                {(app.status === 'PENDING' || (app.status === 'APPROVED' && app.item.status === 'RESERVED')) && (
                  <button
                    onClick={() => handleStartChat(app.item.id)}
                    className="flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 rounded-full transition-all cursor-pointer"
                    style={{ background: 'rgba(224,93,58,0.08)', color: 'var(--color-artisan-orange)', border: '1px solid rgba(224,93,58,0.15)' }}
                  >
                    <MessageSquare size={12} />
                    Sahibiyle Mesajlaş
                  </button>
                )}

                {app.status === 'APPROVED' && app.item.status === 'RESERVED' && (
                  <button
                    onClick={() => handleCompleteApplication(app.id)}
                    className="flex items-center gap-1.5 text-[11px] font-bold px-4 py-2 rounded-full transition-all text-white bg-artisan-orange hover:opacity-90 cursor-pointer"
                    style={{ boxShadow: '0 4px 12px rgba(224,93,58,0.2)' }}
                  >
                    Teslim Aldım
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderHistory = () => {
    return (
      <div className="flex flex-col gap-6" style={{ fontFamily: 'var(--font-sans)' }}>
        {/* Alt Sekme Seçici */}
        <div className="flex gap-2 p-1 bg-gray-100/50 border border-gray-100 rounded-2xl self-start">
          <button
            onClick={() => setHistorySubTab('bought')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${historySubTab === 'bought' ? 'bg-white shadow-sm text-artisan-orange' : 'text-ink-light'}`}
            style={historySubTab === 'bought' ? { color: 'var(--color-artisan-orange)' } : {}}
          >
            Aldıklarım (Alıcı)
          </button>
          <button
            onClick={() => setHistorySubTab('shared')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${historySubTab === 'shared' ? 'bg-white shadow-sm text-artisan-orange' : 'text-ink-light'}`}
            style={historySubTab === 'shared' ? { color: 'var(--color-artisan-orange)' } : {}}
          >
            Paylaştıklarım (Bağışçı)
          </button>
        </div>

        {/* Aldıklarım (Bought) Geçmişi */}
        {historySubTab === 'bought' && (
          loadingBought ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 size={32} className="animate-spin mb-4" style={{ color: 'var(--color-artisan-orange)' }} />
              <p className="text-sm" style={{ color: 'var(--color-ink-light)' }}>Geçmiş alımlar yükleniyor...</p>
            </div>
          ) : historyBought.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
              <p className="text-sm" style={{ color: 'var(--color-ink-light)' }}>Henüz teslim aldığınız bir ürün bulunmuyor.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {historyBought.map(app => (
                <div key={app.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex gap-4 p-4">
                  {/* İlan görseli */}
                  <div className="w-20 h-20 rounded-xl overflow-hidden flex-shrink-0 cursor-pointer bg-gray-50" onClick={() => navigate(`/ilan/${app.item.id}`)}>
                    {app.item.images?.[0] ? (
                      <img src={app.item.images[0]} alt={app.item.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-300">Resim Yok</div>
                    )}
                  </div>
                  {/* Detaylar */}
                  <div className="flex-1 min-w-0 flex flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="font-bold text-sm truncate capitalize cursor-pointer hover:underline text-ink-dark" onClick={() => navigate(`/ilan/${app.item.id}`)}>
                          {app.item.title}
                        </h4>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100 flex-shrink-0">
                          Tamamlandı ✓
                        </span>
                      </div>
                      <p className="text-[10px] mt-0.5" style={{ color: 'var(--color-ink-light)' }}>
                        Kategori: {app.item.category?.name} &bull; Teslim Alındı: {new Date(app.updatedAt || app.createdAt).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </p>
                      {app.item.user && (
                        <div className="flex items-center gap-1.5 mt-2">
                          <span className="text-[10px]" style={{ color: 'var(--color-ink-light)' }}>Veren:</span>
                          <div className="w-4 h-4 rounded-full flex items-center justify-center text-white text-[8px] font-bold overflow-hidden" style={{ background: 'var(--color-artisan-earth)' }}>
                            {app.item.user.avatarUrl ? (
                              <img src={app.item.user.avatarUrl} alt={app.item.user.fullName} className="w-full h-full object-cover" />
                            ) : (
                              app.item.user.fullName.charAt(0).toUpperCase()
                            )}
                          </div>
                          <span className="text-[10px] font-bold text-ink-dark capitalize">{app.item.user.fullName}</span>
                        </div>
                      )}
                    </div>
                    {/* Puanlama Durumu */}
                    <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
                      {app.isRated ? (
                        <span className="text-[10px] font-bold flex items-center gap-1" style={{ color: 'var(--color-artisan-orange)' }}>
                          <Star size={12} className="fill-current" />
                          Değerlendirildi (Puan Verildi)
                        </span>
                      ) : (
                        <button
                          onClick={() => {
                            setRatingModalAppId(app.id);
                            setSelectedRating(5);
                            setReviewComment('');
                          }}
                          className="flex items-center gap-1 text-[11px] font-bold px-3 py-1.5 rounded-full transition-all text-white bg-artisan-orange hover:opacity-90 cursor-pointer"
                          style={{ background: 'var(--color-artisan-orange)' }}
                        >
                          <Star size={12} />
                          Puan Ver (1-5 Yıldız)
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )
        )}

        {/* Paylaştıklarım (Shared) Geçmişi */}
        {historySubTab === 'shared' && (
          loadingShared ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 size={32} className="animate-spin mb-4" style={{ color: 'var(--color-artisan-orange)' }} />
              <p className="text-sm" style={{ color: 'var(--color-ink-light)' }}>Geçmiş paylaşımlar yükleniyor...</p>
            </div>
          ) : historyShared.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
              <p className="text-sm" style={{ color: 'var(--color-ink-light)' }}>Henüz tamamlanan bir paylaşımınız bulunmuyor.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {historyShared.map(item => {
                const approvedApp = item.applications?.find(a => a.status === 'APPROVED');
                const receiver = approvedApp?.user;
                return (
                  <div key={item.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex gap-4 p-4">
                    {/* İlan görseli */}
                    <div className="w-20 h-20 rounded-xl overflow-hidden flex-shrink-0 cursor-pointer bg-gray-50" onClick={() => navigate(`/ilan/${item.id}`)}>
                      {item.images?.[0] ? (
                        <img src={item.images[0]} alt={item.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-300">Resim Yok</div>
                      )}
                    </div>
                    {/* Detaylar */}
                    <div className="flex-1 min-w-0 flex flex-col justify-between">
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="font-bold text-sm truncate capitalize cursor-pointer hover:underline text-ink-dark" onClick={() => navigate(`/ilan/${item.id}`)}>
                            {item.title}
                          </h4>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100 flex-shrink-0">
                            Paylaşıldı ✓
                          </span>
                        </div>
                        <p className="text-[10px] mt-0.5" style={{ color: 'var(--color-ink-light)' }}>
                          Kategori: {item.category?.name} &bull; Tamamlandı: {item.updatedAt ? new Date(item.updatedAt).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Bilinmiyor'}
                        </p>
                        {receiver && (
                          <div className="flex items-center gap-1.5 mt-2.5">
                            <span className="text-[10px]" style={{ color: 'var(--color-ink-light)' }}>Alan kişi:</span>
                            <div className="w-4 h-4 rounded-full flex items-center justify-center text-white text-[8px] font-bold overflow-hidden" style={{ background: 'var(--color-artisan-earth)' }}>
                              {receiver.avatarUrl ? (
                                <img src={receiver.avatarUrl} alt={receiver.fullName} className="w-full h-full object-cover" />
                              ) : (
                                receiver.fullName.charAt(0).toUpperCase()
                              )}
                            </div>
                            <span className="text-[10px] font-bold text-ink-dark capitalize">{receiver.fullName}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        )}
      </div>
    );
  };

  const renderNotifications = () => {
    if (loadingNotifications) return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 size={32} className="animate-spin mb-4" style={{ color: 'var(--color-artisan-orange)' }} />
        <p style={{ color: 'var(--color-ink-light)' }}>Bildirimler yükleniyor...</p>
      </div>
    );

    if (notifications.length === 0) return (
      <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-gray-100">
        <div className="w-16 h-16 rounded-full bg-orange-50/50 flex items-center justify-center mb-4" style={{ color: 'var(--color-artisan-orange)' }}>
          <Bell size={28} />
        </div>
        <h3 className="font-serif text-xl font-bold mb-2" style={{ color: 'var(--color-ink-dark)' }}>Henüz bildiriminiz yok</h3>
        <p className="text-sm text-center" style={{ color: 'var(--color-ink-light)', maxWidth: '300px' }}>
          Talepleriniz, onay durumları ve puanlamalar hakkında bildirimler burada görünecektir.
        </p>
      </div>
    );

    return (
      <div className="flex flex-col gap-4">
        {notifications.map(n => {
          let targetTabLabel = '';
          const title = n.title;
          if (title.includes('Talep') && (title.includes('Yeni') || title.includes('Tekrar'))) {
            targetTabLabel = 'İlanlarıma Git';
          } else if (title.includes('Onaylandı') || title.includes('Talep Sonucu') || title.includes('İptal Edildi')) {
            targetTabLabel = 'Taleplerime Git';
          } else if (title.includes('Değerlendirme')) {
            targetTabLabel = 'Değerlendirmelerime Git';
          } else if (title.includes('Teslimat') && title.includes('Tamamlandı')) {
            targetTabLabel = 'Geçmiş İşlemlerime Git';
          }

          return (
            <div
              key={n.id}
              onClick={() => {
                if (title.includes('Talep') && (title.includes('Yeni') || title.includes('Tekrar'))) {
                  setActiveTab('activeAds');
                } else if (title.includes('Onaylandı') || title.includes('Talep Sonucu') || title.includes('İptal Edildi')) {
                  setActiveTab('myApplications');
                } else if (title.includes('Değerlendirme')) {
                  setActiveTab('reviews');
                } else if (title.includes('Teslimat') && title.includes('Tamamlandı')) {
                  setActiveTab('history');
                  setHistorySubTab('shared');
                }
              }}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex gap-4 items-start relative transition-all duration-200 hover:shadow-md cursor-pointer hover:border-orange-100"
            >
              {/* Okunmamış işareti */}
              {!n.isRead && (
                <span
                  className="absolute top-4 right-4 w-2.5 h-2.5 rounded-full animate-pulse"
                  style={{ background: 'var(--color-artisan-orange)' }}
                />
              )}

              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-white flex-shrink-0"
                style={{ background: n.isRead ? 'rgba(74,59,50,0.15)' : 'var(--color-artisan-orange)' }}
              >
                <Bell size={18} />
              </div>

              <div className="flex-1 min-w-0 pr-6">
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <h4 className="text-sm font-bold" style={{ color: 'var(--color-ink-dark)' }}>
                    {n.title}
                  </h4>
                  {targetTabLabel && (
                    <span 
                      className="text-[10px] font-bold px-2 py-0.5 rounded-lg transition-colors bg-orange-50 text-artisan-orange hover:bg-orange-100"
                    >
                      {targetTabLabel} &rarr;
                    </span>
                  )}
                </div>
                <p className="text-xs mt-1 leading-relaxed" style={{ color: 'var(--color-ink-light)' }}>
                  {n.message}
                </p>
                <span className="text-[10px] mt-2 block font-medium" style={{ color: 'var(--color-ink-light)' }}>
                  {new Date(n.createdAt).toLocaleDateString('tr-TR', {
                    day: 'numeric',
                    month: 'long',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderReviews = () => {
    if (loadingReviews) return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 size={32} className="animate-spin mb-4" style={{ color: 'var(--color-artisan-orange)' }} />
        <p style={{ color: 'var(--color-ink-light)' }}>Değerlendirmeler yükleniyor...</p>
      </div>
    );

    const totalReviews = myReviews.length;
    const avgRating = totalReviews > 0
      ? myReviews.reduce((sum, r) => sum + (r.rating ?? 0), 0) / totalReviews
      : 0;

    if (totalReviews === 0) return (
      <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-gray-100">
        <div className="w-16 h-16 rounded-full bg-orange-50/50 flex items-center justify-center mb-4" style={{ color: 'var(--color-artisan-orange)' }}>
          <Star size={28} />
        </div>
        <h3 className="font-serif text-xl font-bold mb-2" style={{ color: 'var(--color-ink-dark)' }}>Henüz değerlendirme yok</h3>
        <p className="text-sm text-center" style={{ color: 'var(--color-ink-light)', maxWidth: '300px' }}>
          Paylaştığınız eşyaları teslim alan kullanıcıların yaptığı değerlendirmeler burada listelenir.
        </p>
      </div>
    );

    return (
      <div className="flex flex-col gap-4">
        {/* Ortalama Puan Özet Kartı */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col sm:flex-row items-center gap-6" style={{ background: 'var(--color-paper-light)' }}>
          <div className="text-center sm:text-left flex flex-col items-center sm:items-start flex-shrink-0">
            <span className="text-5xl font-serif font-black" style={{ color: 'var(--color-ink-dark)' }}>
              {avgRating.toFixed(1)}
            </span>
            <div className="flex gap-1 text-amber-400 mt-2">
              {Array.from({ length: 5 }).map((_, i) => {
                const isFilled = i < Math.round(avgRating);
                return (
                  <Star
                    key={i}
                    size={18}
                    className={isFilled ? 'fill-current' : 'text-gray-200'}
                  />
                );
              })}
            </div>
            <span className="text-xs mt-1.5 font-semibold" style={{ color: 'var(--color-ink-light)' }}>
              {totalReviews} Değerlendirme
            </span>
          </div>
          <div className="h-px sm:h-16 w-full sm:w-px bg-gray-100" />
          <div className="flex-1 text-xs text-ink-light space-y-1.5 w-full">
            <p className="font-bold text-sm" style={{ color: 'var(--color-ink-dark)' }}>Paylaşım Karneniz 🌟</p>
            <p style={{ color: 'var(--color-ink-light)' }}>
              Paylaştığınız eşyaları teslim alan diğer topluluk üyelerinden aldığınız puanların ortalamasıdır. 
              Daha fazla eşya paylaşarak topluluğa katkıda bulunmaya devam edebilirsiniz!
            </p>
          </div>
        </div>

        {/* Değerlendirme Kartları */}
        {myReviews.map(review => (
          <div key={review.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex gap-4 items-start animate-in fade-in duration-200">
            <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0 overflow-hidden" style={{ background: 'var(--color-artisan-earth)' }}>
              {review.user.avatarUrl ? (
                <img src={review.user.avatarUrl} alt={review.user.fullName} className="w-full h-full object-cover" />
              ) : (
                review.user.fullName.charAt(0).toUpperCase()
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <h4 className="text-sm font-bold capitalize" style={{ color: 'var(--color-ink-dark)' }}>
                  {review.user.fullName}
                </h4>
                <div className="flex gap-0.5 text-amber-400">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      size={14}
                      className={i < (review.rating ?? 0) ? 'fill-current' : 'text-gray-200'}
                    />
                  ))}
                </div>
              </div>
              <p className="text-xs mt-1.5" style={{ color: 'var(--color-ink-light)' }}>
                İlan: <span className="font-semibold cursor-pointer hover:underline text-artisan-orange" onClick={() => navigate(`/ilan/${review.item.id}`)}>{review.item.title}</span>
              </p>
              {review.reviewComment ? (
                <p className="text-xs italic mt-2 px-3 py-2 rounded-xl bg-gray-50/50 text-ink-dark border border-gray-100">
                  "{review.reviewComment}"
                </p>
              ) : null}
              <span className="text-[10px] mt-2 block" style={{ color: 'var(--color-ink-light)' }}>
                {new Date(review.updatedAt || review.createdAt).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}
              </span>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderMessages = () => {
    const otherUser = (room: ChatRoom) => {
      return room.ownerId === user?.id ? room.applicant : room.owner;
    };

    return (
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden flex h-[600px] transition-all duration-300" style={{ fontFamily: 'var(--font-sans)' }}>
        {/* Sol Panel: Sohbet Odaları */}
        <div className={`${activeRoom ? 'hidden md:flex' : 'flex'} flex-col w-full md:w-80 border-r border-gray-100 bg-gray-50/20`}>
          <div className="p-4 border-b border-gray-50 flex items-center justify-between">
            <h3 className="font-serif font-bold text-lg" style={{ color: 'var(--color-ink-dark)' }}>Sohbetlerim</h3>
            <span className="text-[10px] font-bold px-2 py-0.5 bg-orange-50 rounded-full" style={{ color: 'var(--color-artisan-orange)' }}>
              {chatRooms.length} Oda
            </span>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-gray-50 scrollbar-thin">
            {loadingRooms ? (
              <div className="flex flex-col items-center justify-center h-48 gap-2">
                <Loader2 size={24} className="animate-spin" style={{ color: 'var(--color-artisan-orange)' }} />
                <p className="text-xs" style={{ color: 'var(--color-ink-light)' }}>Sohbetler yükleniyor...</p>
              </div>
            ) : chatRooms.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-center p-6 gap-2">
                <MessageSquare size={32} className="opacity-40" style={{ color: 'var(--color-ink-light)' }} />
                <p className="text-xs font-bold" style={{ color: 'var(--color-ink-dark)' }}>Henüz mesaj yok</p>
                <p className="text-[10px] leading-relaxed" style={{ color: 'var(--color-ink-light)' }}>
                  Paylaşılan ürünler için onaylanan başvurular üzerinden sohbetler otomatik oluşur.
                </p>
              </div>
            ) : (
              chatRooms.map((room) => {
                const partner = otherUser(room);
                const isSelected = activeRoom?.id === room.id;
                const lastMsg = room.messages?.[0];
                const partnerName = partner?.fullName || 'Kullanıcı';

                return (
                  <button
                    key={room.id}
                    onClick={() => selectRoom(room)}
                    className={`w-full text-left p-4 transition-colors flex gap-3 items-start cursor-pointer hover:bg-orange-50/20 ${isSelected ? 'bg-orange-50/40 border-l-4' : ''}`}
                    style={isSelected ? { borderLeftColor: 'var(--color-artisan-orange)' } : {}}
                  >
                    {/* Avatar */}
                    <div className="w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center text-white font-bold text-sm overflow-hidden" style={{ background: 'var(--color-artisan-earth)' }}>
                      {partner?.avatarUrl ? (
                        <img src={partner.avatarUrl || undefined} alt={partnerName} className="w-full h-full object-cover" />
                      ) : (
                        partnerName.charAt(0).toUpperCase()
                      )}
                    </div>
                    {/* Detaylar */}
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-baseline mb-0.5">
                        <span className="text-xs font-bold truncate capitalize" style={{ color: 'var(--color-ink-dark)' }}>{partnerName}</span>
                        {room.updatedAt && (
                          <span className="text-[9px]" style={{ color: 'var(--color-ink-light)' }}>
                            {new Date(room.updatedAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] font-bold truncate mb-1" style={{ color: 'var(--color-artisan-orange)' }}>
                        🏷️ {room.item?.title}
                      </p>
                      <p className="text-xs truncate" style={{ color: 'var(--color-ink-light)' }}>
                        {lastMsg ? lastMsg.content : 'Henüz mesaj yok...'}
                      </p>
                    </div>
                    {/* Okunmamış Rozeti */}
                    {(room.unreadCount ?? 0) > 0 && !isSelected && (
                      <span
                        className="w-4 h-4 rounded-full text-white text-[9px] font-bold flex items-center justify-center flex-shrink-0 animate-pulse"
                        style={{ background: 'var(--color-artisan-orange)' }}
                      >
                        {room.unreadCount}
                      </span>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Sağ Panel: Mesajlaşma Penceresi */}
        <div className={`${activeRoom ? 'flex' : 'hidden md:flex'} flex-1 flex-col bg-white`}>
          {activeRoom ? (
            <>
              {/* Header */}
              <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-white shadow-sm z-10">
                <div className="flex items-center gap-3 min-w-0">
                  {/* Mobil Geri Dön Butonu */}
                  <button
                    onClick={() => setActiveRoom(null)}
                    className="md:hidden p-1.5 rounded-full hover:bg-gray-100 flex-shrink-0 cursor-pointer text-ink-dark"
                  >
                    <ArrowLeft size={18} />
                  </button>

                  <div className="w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center text-white font-bold text-sm overflow-hidden" style={{ background: 'var(--color-artisan-earth)' }}>
                    {otherUser(activeRoom)?.avatarUrl ? (
                      <img src={otherUser(activeRoom).avatarUrl || undefined} alt={otherUser(activeRoom).fullName} className="w-full h-full object-cover" />
                    ) : (
                      (otherUser(activeRoom)?.fullName || 'K').charAt(0).toUpperCase()
                    )}
                  </div>

                  <div className="min-w-0">
                    <p className="text-xs font-bold truncate capitalize" style={{ color: 'var(--color-ink-dark)' }}>
                      {otherUser(activeRoom)?.fullName}
                    </p>
                    <button
                      onClick={() => navigate(`/ilan/${activeRoom.itemId}`)}
                      className="text-[10px] hover:underline truncate flex items-center gap-1 font-semibold text-left"
                      style={{ color: 'var(--color-artisan-orange)' }}
                    >
                      📦 Ürün: {activeRoom.item?.title}
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  {activeRoom.item?.images?.[0] && (
                    <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-50 border border-gray-100 cursor-pointer" onClick={() => navigate(`/ilan/${activeRoom.itemId}`)}>
                      <img src={activeRoom.item.images[0]} alt={activeRoom.item.title} className="w-full h-full object-cover" />
                    </div>
                  )}
                  {/* 3 Nokta Menüsü - Engelleme */}
                  <div className="relative">
                    <button
                      onClick={() => setBlockMenuOpen(v => !v)}
                      className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-100 transition-colors cursor-pointer"
                      style={{ color: 'var(--color-ink-light)' }}
                      disabled={isBlocking}
                    >
                      {isBlocking ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <span className="text-lg leading-none font-bold" style={{ letterSpacing: '1px' }}>⋯</span>
                      )}
                    </button>
                    {blockMenuOpen && (
                      <>
                        <div className="fixed inset-0 z-30" onClick={() => setBlockMenuOpen(false)} />
                        <div className="absolute right-0 top-full mt-1 z-40 bg-white border border-gray-100 rounded-2xl shadow-xl overflow-hidden min-w-[180px] animate-in fade-in zoom-in-95 duration-150">
                          {(() => {
                            const partnerId = otherUser(activeRoom)?.id;
                            const isPartnerBlocked = partnerId ? blockedUserIds.has(partnerId) : false;
                            return (
                              <button
                                onClick={() => partnerId && handleBlockToggle(partnerId)}
                                className="w-full text-left px-4 py-3 text-xs font-bold flex items-center gap-2.5 hover:bg-red-50 transition-colors cursor-pointer"
                                style={{ color: isPartnerBlocked ? 'var(--color-artisan-sage-dark)' : '#ef4444' }}
                              >
                                <span>{isPartnerBlocked ? '✅ Engeli Kaldır' : '🚫 Kullanıcıyı Engelle'}</span>
                              </button>
                            );
                          })()}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Mesaj Listesi */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3" style={{ background: 'rgba(247, 244, 240, 0.4)' }}>
                {loadingMessages ? (
                  <div className="flex flex-col items-center justify-center h-full gap-2">
                    <Loader2 size={24} className="animate-spin" style={{ color: 'var(--color-artisan-orange)' }} />
                    <p className="text-xs" style={{ color: 'var(--color-ink-light)' }}>Mesajlar yükleniyor...</p>
                  </div>
                ) : (
                  <>
                    {roomMessages.map((msg) => {
                      const isMe = msg.senderId === user?.id;
                      return (
                        <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'} animate-in fade-in duration-200`}>
                          <div
                            className={`relative px-4 py-2 rounded-2xl max-w-[75%] shadow-sm ${
                              isMe
                                ? 'text-white rounded-tr-none'
                                : 'bg-white rounded-tl-none border border-gray-100'
                            }`}
                            style={{
                              background: isMe ? 'var(--color-artisan-orange)' : '#ffffff',
                              color: isMe ? '#ffffff' : 'var(--color-ink-dark)'
                            }}
                          >
                            <p className="text-xs leading-relaxed break-words">{msg.content}</p>
                            
                            <div className="flex items-center justify-end gap-1 mt-1">
                              <span className="text-[9px]" style={{ color: isMe ? 'rgba(255,255,255,0.7)' : 'var(--color-ink-light)' }}>
                                {new Date(msg.createdAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                              {isMe && (
                                msg.isRead ? (
                                  <CheckCheck size={12} className="text-orange-200" />
                                ) : (
                                  <Check size={12} className="text-white/60" />
                                )
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    
                    {/* Yazıyor Durumu */}
                    {isOtherUserTyping && (
                      <div className="flex justify-start animate-in fade-in duration-200">
                        <div className="bg-white border border-gray-100 rounded-2xl rounded-tl-none px-4 py-2 flex items-center gap-1.5 shadow-sm">
                          <span className="text-[11px] italic font-semibold" style={{ color: 'var(--color-ink-light)' }}>
                            {otherUser(activeRoom)?.fullName?.split(' ')[0]} yazıyor
                          </span>
                          <span className="flex gap-0.5">
                            <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: 'var(--color-ink-light)', animationDelay: '0ms' }} />
                            <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: 'var(--color-ink-light)', animationDelay: '150ms' }} />
                            <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: 'var(--color-ink-light)', animationDelay: '300ms' }} />
                          </span>
                        </div>
                      </div>
                    )}
                    
                    <div ref={messagesEndRef} />
                  </>
                )}
              </div>

              {/* Mesaj Giriş Alanı */}
              {(() => {
                const partnerId = otherUser(activeRoom)?.id;
                const isBlockedByMe = partnerId ? blockedUserIds.has(partnerId) : false;
                const isBlockedByPartner = activeRoom?.isBlocked && !isBlockedByMe;

                if (isBlockedByMe) {
                  return (
                    <div className="p-4 border-t border-gray-100 bg-red-50 flex items-center justify-center gap-2">
                      <span className="text-xs font-semibold" style={{ color: '#ef4444' }}>
                        🚫 Bu kullanıcıyı engellediniz. Mesaj gönderemezsiniz.
                      </span>
                      <button
                        onClick={() => partnerId && handleBlockToggle(partnerId)}
                        className="text-xs font-bold underline cursor-pointer"
                        style={{ color: 'var(--color-artisan-sage-dark)' }}
                      >
                        Engeli Kaldır
                      </button>
                    </div>
                  );
                }

                if (isBlockedByPartner) {
                  return (
                    <div className="p-4 border-t border-gray-100 bg-red-50 flex items-center justify-center gap-2">
                      <span className="text-xs font-semibold" style={{ color: '#ef4444' }}>
                        🚫 Bu kullanıcıyla mesajlaşamazsınız.
                      </span>
                    </div>
                  );
                }
                return (
                  <form onSubmit={handleSendMessage} className="p-3 border-t border-gray-100 bg-white flex gap-2 items-center">
                    <input
                      type="text"
                      value={messageInput}
                      onChange={(e) => {
                        setMessageInput(e.target.value);
                        handleTyping();
                      }}
                      placeholder="Mesajınızı yazın..."
                      className="flex-1 text-sm outline-none px-4 py-2.5 rounded-full border border-gray-200 focus:border-orange-300 transition-colors"
                      style={{ color: 'var(--color-ink-dark)', background: 'var(--color-paper)' }}
                    />
                    <button
                      type="submit"
                      disabled={!messageInput.trim()}
                      className="w-10 h-10 rounded-full flex items-center justify-center text-white disabled:opacity-50 transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-md"
                      style={{ 
                        background: 'var(--color-artisan-orange)',
                        boxShadow: '0 4px 12px rgba(224,93,58,0.2)'
                      }}
                    >
                      <Send size={16} />
                    </button>
                  </form>
                );
              })()}
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 gap-3" style={{ background: 'rgba(247, 244, 240, 0.2)' }}>
              <div className="w-16 h-16 rounded-full bg-orange-50 flex items-center justify-center text-artisan-orange" style={{ background: 'rgba(224,93,58,0.08)' }}>
                <MessageSquare size={28} style={{ color: 'var(--color-artisan-orange)' }} />
              </div>
              <h3 className="font-serif text-lg font-bold" style={{ color: 'var(--color-ink-dark)' }}>Sohbet Seçin</h3>
              <p className="text-xs max-w-[280px]" style={{ color: 'var(--color-ink-light)' }}>
                Mesajlaşmak ve teslimat koordinasyonunu sağlamak için soldan bir konuşma seçin.
              </p>
            </div>
          )}
        </div>
      </div>
    );
  };

  const getTabUnreadCount = (tabId: TabId) => {
    const unread = notifications.filter(n => !n.isRead);
    if (tabId === 'notifications') {
      return unread.length;
    }
    if (tabId === 'messages') {
      return chatRooms.reduce((sum, room) => sum + (room.unreadCount ?? 0), 0);
    }
    if (tabId === 'activeAds') {
      return unread.filter(n => n.title.includes('Talep') && (n.title.includes('Yeni') || n.title.includes('Tekrar'))).length;
    }
    if (tabId === 'myApplications') {
      return unread.filter(n => n.title.includes('Onaylandı') || n.title.includes('Talep Sonucu') || n.title.includes('İptal Edildi')).length;
    }
    if (tabId === 'history') {
      return unread.filter(n => n.title.includes('Teslimat Tamamlandı')).length;
    }
    if (tabId === 'reviews') {
      return unread.filter(n => n.title.includes('Değerlendirme')).length;
    }
    return 0;
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
              <div className="p-4 mb-2 border-b border-gray-100 flex flex-col gap-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0" style={{ background: 'var(--color-artisan-earth)' }}>
                    {user?.fullName?.charAt(0)?.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold truncate capitalize" style={{ color: 'var(--color-ink-dark)' }}>{user?.fullName}</p>
                    <p className="text-xs truncate" style={{ color: 'var(--color-ink-light)' }}>{user?.email}</p>
                  </div>
                </div>
                {user?.ratingCount !== undefined && user.ratingCount > 0 ? (
                  <div className="flex items-center gap-1.5 mt-1 text-[11px] font-bold text-amber-500 bg-amber-50/50 px-2 py-1 rounded-xl w-max border border-amber-100/50">
                    <Star size={12} className="fill-current" />
                    <span>{user.rating?.toFixed(1) ?? '0.0'} ({user.ratingCount} Değerlendirme)</span>
                  </div>
                ) : (
                  <p className="text-[10px] mt-1 italic" style={{ color: 'var(--color-ink-light)' }}>Henüz değerlendirme yok</p>
                )}
              </div>
              <div className="space-y-1">
                {TABS.map(tab => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  const unreadCount = getTabUnreadCount(tab.id);

                  return (
                    <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                      className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${isActive ? 'bg-orange-50 text-artisan-orange' : 'text-ink-light hover:bg-gray-50 hover:text-ink-dark'}`}
                    >
                      <span className="flex items-center gap-3">
                        <Icon size={16} />
                        {tab.label}
                      </span>
                      {unreadCount > 0 && (
                        <span
                          className="px-2 py-0.5 text-[10px] font-bold rounded-full text-white animate-pulse"
                          style={{
                            background: 'var(--color-artisan-orange)',
                            boxShadow: '0 2px 6px rgba(224,93,58,0.3)',
                          }}
                        >
                          {unreadCount}
                        </span>
                      )}
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
            {activeTab === 'history' && renderHistory()}
            {activeTab === 'notifications' && renderNotifications()}
            {activeTab === 'reviews' && renderReviews()}
            {activeTab === 'messages' && renderMessages()}
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
      {applicantsModalItemId && (() => {
        const currentItem = myItems.find(i => i.id === applicantsModalItemId);
        const isItemReserved = currentItem?.status === 'RESERVED';
        
        return (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setApplicantsModalItemId(null)} />
            <div className="bg-white rounded-2xl p-6 w-full max-w-lg relative shadow-xl z-10 max-h-[80vh] overflow-y-auto">
              <button onClick={() => setApplicantsModalItemId(null)} className="absolute top-4 right-4 w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors">
                <X size={16} style={{ color: 'var(--color-ink-light)' }} />
              </button>
              <h3 className="font-serif text-lg font-bold mb-1 pr-8" style={{ color: 'var(--color-ink-dark)' }}>Başvuranlar</h3>
              <p className="text-xs mb-4 capitalize" style={{ color: 'var(--color-ink-light)' }}>"{applicantsModalTitle}" ilanı için</p>

              {isItemReserved && (
                <div className="mb-4 p-3 rounded-2xl text-xs font-semibold animate-fade-in" style={{ background: 'rgba(130,162,132,0.1)', color: 'var(--color-artisan-sage-dark)', border: '1px solid rgba(130,162,132,0.2)' }}>
                  🎉 Bu ilan için bir talep onaylanmış ve ürün rezerve edilmiştir.
                </div>
              )}

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
                    <div key={app.id} className="flex flex-col p-4 rounded-2xl" style={{ background: 'rgba(74,59,50,0.03)', border: '1px solid rgba(74,59,50,0.06)' }}>
                      <div className="flex gap-3 items-start">
                        <div 
                          onClick={() => setSelectedUserForReviews({ id: app.user.id, fullName: app.user.fullName })}
                          className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0 overflow-hidden cursor-pointer hover:opacity-80 transition-opacity" 
                          style={{ background: 'var(--color-artisan-earth)' }}
                          title="Kullanıcı Değerlendirmeleri"
                        >
                          {app.user.avatarUrl
                            ? <img src={app.user.avatarUrl} alt={app.user.fullName} className="w-full h-full object-cover" />
                            : <User size={16} />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <div className="flex items-center gap-2">
                              <p 
                                onClick={() => setSelectedUserForReviews({ id: app.user.id, fullName: app.user.fullName })}
                                className="text-sm font-bold capitalize cursor-pointer hover:text-artisan-orange transition-colors flex items-center gap-1.5" 
                                style={{ color: 'var(--color-ink-dark)' }}
                                title="Kullanıcı Değerlendirmeleri"
                              >
                                {app.user.fullName}
                                <span className="text-[9px] font-semibold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-lg flex items-center gap-0.5 border border-amber-100">
                                  <Star size={10} className="fill-current" /> Karnesi
                                </span>
                              </p>
                              {(app.status === 'PENDING' || app.status === 'APPROVED') && (
                                <button
                                  title="Mesaj Gönder"
                                  onClick={() => { const itemId = applicantsModalItemId!; setApplicantsModalItemId(null); handleStartChat(itemId, app.user.id); }}
                                  className="w-6 h-6 rounded-full flex items-center justify-center transition-all hover:scale-110 cursor-pointer"
                                  style={{ background: 'rgba(224,93,58,0.10)', color: 'var(--color-artisan-orange)', border: '1px solid rgba(224,93,58,0.2)' }}
                                >
                                  <MessageSquare size={11} />
                                </button>
                              )}
                            </div>
                            
                            {/* Başvuru durum rozeti */}
                            {app.status === 'PENDING' && (
                              <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full" style={{ background: 'rgba(74,59,50,0.06)', color: 'var(--color-ink-light)' }}>Bekliyor</span>
                            )}
                            {app.status === 'APPROVED' && (
                              <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full" style={{ background: 'rgba(130,162,132,0.15)', color: 'var(--color-artisan-sage-dark)' }}>Onaylandı ✓</span>
                            )}
                            {app.status === 'REJECTED' && (
                              <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full" style={{ background: 'rgba(239,68,68,0.08)', color: '#ef4444' }}>Reddedildi</span>
                            )}
                            {app.status === 'WITHDRAWN' && (
                              <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full" style={{ background: 'rgba(74,59,50,0.06)', color: 'var(--color-ink-light)' }}>Geri Çekildi</span>
                            )}
                          </div>
                          
                          <p className="text-[10px] mb-2" style={{ color: 'var(--color-ink-light)' }}>
                            {new Date(app.createdAt).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}
                          </p>
                          {app.note ? (
                            <p className="text-xs italic leading-relaxed px-3 py-2 rounded-xl" style={{ background: 'rgba(255,255,255,0.9)', color: 'var(--color-ink-dark)', border: '1px solid rgba(74,59,50,0.06)' }}>
                              "{app.note}"
                            </p>
                          ) : (
                            <p className="text-xs italic text-ink-light" style={{ color: 'var(--color-ink-light)', opacity: 0.6 }}>Not bırakılmamış</p>
                          )}
                        </div>
                      </div>

                      {/* Onayla / Reddet / Mesajlaş Butonları */}
                      {app.status === 'PENDING' && (
                        <div className="flex gap-2.5 mt-3 border-t border-gray-100/30 pt-3">
                          <button
                            disabled={processingAppId !== null}
                            onClick={() => handleRejectApplication(app.id, applicantsModalItemId)}
                            className="flex-1 py-2 rounded-xl text-xs font-bold bg-gray-100 hover:bg-gray-200 transition-colors disabled:opacity-50 flex items-center justify-center gap-1 cursor-pointer"
                            style={{ color: 'var(--color-ink-dark)' }}
                          >
                            {processingAppId === app.id ? <Loader2 size={12} className="animate-spin" /> : null}
                            Reddet
                          </button>
                          <button
                            onClick={() => { const itemId = applicantsModalItemId!; setApplicantsModalItemId(null); handleStartChat(itemId, app.user.id); }}
                            className="py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer"
                            style={{ background: 'rgba(224,93,58,0.08)', color: 'var(--color-artisan-orange)', border: '1px solid rgba(224,93,58,0.15)' }}
                          >
                            <MessageSquare size={11} />
                            Mesajlaş
                          </button>
                          <button
                            disabled={processingAppId !== null || isItemReserved}
                            onClick={() => handleApproveApplication(app.id, applicantsModalItemId)}
                            className="flex-1 py-2 rounded-xl text-xs font-bold text-white transition-colors disabled:opacity-50 flex items-center justify-center gap-1 cursor-pointer"
                            style={{ 
                              background: isItemReserved ? 'rgba(74,59,50,0.15)' : 'var(--color-artisan-orange)',
                              color: isItemReserved ? 'var(--color-ink-light)' : '#fff'
                            }}
                          >
                            {processingAppId === app.id ? <Loader2 size={12} className="animate-spin" /> : null}
                            Onayla
                          </button>
                        </div>
                      )}

                      {/* İlan sahibi için teslimat iptali butonu */}
                      {app.status === 'APPROVED' && isItemReserved && (
                        <button
                          disabled={processingAppId !== null}
                          onClick={() => handleCancelDelivery(app.id, applicantsModalItemId)}
                          className="mt-3 w-full py-2 rounded-xl text-xs font-bold text-red-500 bg-red-50 hover:bg-red-100 transition-colors flex items-center justify-center gap-1 cursor-pointer"
                        >
                          Teslimatı İptal Et (Alıcı Gelmedi)
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* Yıldız Puanlama Modalı */}
      {ratingModalAppId && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => !isSubmittingRating && closeRatingModal()} />
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm relative shadow-2xl z-10 text-center animate-in fade-in zoom-in-95 duration-200">
            <button 
              onClick={closeRatingModal} 
              disabled={isSubmittingRating}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors disabled:opacity-50 cursor-pointer"
            >
              <X size={16} style={{ color: 'var(--color-ink-light)' }} />
            </button>
            
            <div className="w-14 h-14 rounded-full bg-orange-50 flex items-center justify-center text-artisan-orange mx-auto mb-4 animate-bounce" style={{ animationDuration: '2.5s' }}>
              <Star size={26} className="fill-current" />
            </div>
 
            <h3 className="font-serif text-xl font-bold mb-2" style={{ color: 'var(--color-ink-dark)' }}>Paylaşımı Puanla</h3>
            <p className="text-xs mb-4 px-2" style={{ color: 'var(--color-ink-light)' }}>
              Ürünü teslim aldınız! İlan sahibinin bu iyilik adımını değerlendirmek için 1 ile 5 arasında bir puan verebilirsiniz.
            </p>
 
            {/* 5 Yıldız Seçici */}
            <div className="flex items-center justify-center gap-2 mb-5">
              {[1, 2, 3, 4, 5].map((starVal) => {
                const isFilled = hoverRating !== null ? starVal <= hoverRating : starVal <= selectedRating;
                return (
                  <button
                    key={starVal}
                    type="button"
                    disabled={isSubmittingRating}
                    onMouseEnter={() => setHoverRating(starVal)}
                    onMouseLeave={() => setHoverRating(null)}
                    onClick={() => setSelectedRating(starVal)}
                    className="p-1 transition-transform hover:scale-125 focus:outline-none cursor-pointer"
                    style={{ color: isFilled ? 'var(--color-artisan-orange)' : 'rgba(74,59,50,0.15)' }}
                  >
                    <Star size={32} className={isFilled ? 'fill-current' : ''} />
                  </button>
                );
              })}
            </div>

            {/* Yorum Kutusu */}
            <div className="mb-5 text-left">
              <label 
                htmlFor="review-comment" 
                className="block text-[10px] font-bold mb-1 uppercase tracking-wider" 
                style={{ color: 'var(--color-ink-light)' }}
              >
                Değerlendirme Yorumu (İsteğe Bağlı)
              </label>
              <textarea
                id="review-comment"
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                disabled={isSubmittingRating}
                placeholder="Paylaşım hakkında yorumlarınızı yazın..."
                className="w-full h-20 px-3 py-2 text-xs rounded-xl border border-gray-200 focus:outline-none focus:ring-1 focus:ring-artisan-orange focus:border-artisan-orange transition-all resize-none bg-gray-50/30"
                style={{ color: 'var(--color-ink-dark)' }}
              />
            </div>
 
            {/* Aksiyonlar */}
            <div className="flex gap-3">
              <button
                disabled={isSubmittingRating}
                onClick={closeRatingModal}
                className="flex-1 py-2.5 rounded-full text-xs font-bold bg-gray-100 hover:bg-gray-200 transition-colors disabled:opacity-50 cursor-pointer"
                style={{ color: 'var(--color-ink-dark)' }}
              >
                Geç
              </button>
              <button
                disabled={isSubmittingRating}
                onClick={() => handleRateApplication(ratingModalAppId, selectedRating)}
                className="flex-1 py-2.5 rounded-full text-xs font-bold text-white transition-all hover:opacity-95 flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
                style={{ 
                  background: 'var(--color-artisan-orange)',
                  boxShadow: '0 4px 12px rgba(224,93,58,0.2)' 
                }}
              >
                {isSubmittingRating ? <Loader2 size={12} className="animate-spin" /> : null}
                Gönder
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Başvuran Kullanıcının Değerlendirmeleri Modalı */}
      {selectedUserForReviews && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setSelectedUserForReviews(null)} />
          <div className="bg-white rounded-3xl p-6 w-full max-w-md relative shadow-2xl z-10 max-h-[85vh] flex flex-col animate-in fade-in zoom-in-95 duration-200">
            <button 
              onClick={() => setSelectedUserForReviews(null)} 
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors cursor-pointer"
            >
              <X size={16} style={{ color: 'var(--color-ink-light)' }} />
            </button>
            
            <div className="mb-4">
              <h3 className="font-serif text-lg font-bold capitalize pr-8 text-left" style={{ color: 'var(--color-ink-dark)' }}>
                {selectedUserForReviews.fullName}
              </h3>
              <p className="text-[10px] uppercase tracking-wider font-semibold text-left mt-0.5" style={{ color: 'var(--color-ink-light)' }}>
                Paylaşım Karnesi & Değerlendirmeler
              </p>
            </div>

            <div className="flex-1 overflow-y-auto pr-1 scrollbar-thin">
              {loadingSelectedUserReviews ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Loader2 size={24} className="animate-spin mb-2" style={{ color: 'var(--color-artisan-orange)' }} />
                  <p className="text-xs" style={{ color: 'var(--color-ink-light)' }}>Değerlendirmeler yükleniyor...</p>
                </div>
              ) : selectedUserReviews.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center bg-gray-50/50 rounded-2xl border border-gray-100/50">
                  <div className="w-12 h-12 rounded-full bg-orange-50 flex items-center justify-center mb-3 text-artisan-orange">
                    <Star size={20} className="fill-current" />
                  </div>
                  <p className="text-xs font-bold" style={{ color: 'var(--color-ink-dark)' }}>Henüz değerlendirme yok</p>
                  <p className="text-[11px] mt-1 px-4 leading-relaxed" style={{ color: 'var(--color-ink-light)' }}>
                    Bu kullanıcı paylaştığı eşyalar için henüz bir puanlama almamış.
                  </p>
                </div>
              ) : (() => {
                const total = selectedUserReviews.length;
                const avg = selectedUserReviews.reduce((sum, r) => sum + (r.rating ?? 0), 0) / total;
                
                return (
                  <div className="space-y-4 text-left">
                    {/* Özet Kartı */}
                    <div className="bg-orange-50/30 rounded-2xl p-4 border border-orange-100/30 flex items-center gap-4">
                      <div className="text-center flex-shrink-0">
                        <span className="text-4xl font-serif font-black text-ink-dark">{avg.toFixed(1)}</span>
                        <div className="flex gap-0.5 text-amber-400 mt-1 justify-center">
                          {Array.from({ length: 5 }).map((_, idx) => {
                            const isFilled = idx < Math.round(avg);
                            return <Star key={idx} size={12} className={isFilled ? 'fill-current' : 'text-gray-200'} />;
                          })}
                        </div>
                        <span className="text-[9px] mt-1 block text-ink-light font-semibold">{total} Değerlendirme</span>
                      </div>
                      <div className="h-12 w-px bg-gray-200" />
                      <div className="text-[10px]" style={{ color: 'var(--color-ink-light)' }}>
                        Bu puan, kullanıcının paylaştığı eşyaları teslim alan diğer üyeler tarafından verilmiştir.
                      </div>
                    </div>

                    {/* Yorum Listesi */}
                    <div className="space-y-3">
                      {selectedUserReviews.map(review => (
                        <div key={review.id} className="p-3 bg-gray-50/50 border border-gray-100 rounded-2xl flex flex-col gap-1.5">
                          <div className="flex justify-between items-center gap-2">
                            <span className="text-[11px] font-bold capitalize text-ink-dark">{review.user.fullName}</span>
                            <div className="flex text-amber-400">
                              {Array.from({ length: 5 }).map((_, idx) => (
                                <Star key={idx} size={10} className={idx < (review.rating ?? 0) ? 'fill-current' : 'text-gray-200'} />
                              ))}
                            </div>
                          </div>
                          {review.reviewComment ? (
                            <p className="text-xs italic text-ink-dark bg-white border border-gray-100/50 px-3 py-1.5 rounded-xl">
                              "{review.reviewComment}"
                            </p>
                          ) : (
                            <p className="text-[10px] italic text-ink-light px-1">Sadece puan verdi, yorum yazmadı.</p>
                          )}
                          <div className="flex items-center justify-between text-[9px] text-ink-light pt-0.5 border-t border-gray-100/30">
                            <span>İlan: {review.item.title}</span>
                            <span>{new Date(review.updatedAt || review.createdAt).toLocaleDateString('tr-TR')}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>
            
            <div className="mt-4 pt-3 border-t border-gray-100 flex justify-end">
              <button 
                onClick={() => setSelectedUserForReviews(null)}
                className="px-5 py-2 rounded-full text-xs font-bold bg-gray-100 hover:bg-gray-200 transition-colors cursor-pointer"
                style={{ color: 'var(--color-ink-dark)' }}
              >
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfilePage;
