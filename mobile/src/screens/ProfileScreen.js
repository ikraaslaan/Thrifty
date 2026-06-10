import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  RefreshControl,
  Dimensions,
  TextInput,
  Modal,
  Alert,
  ScrollView,
  StatusBar
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import apiClient from '../api/apiClient';

const { width } = Dimensions.get('window');

const TABS = [
  { id: 'activeAds', label: 'İlanlarım' },
  { id: 'myApplications', label: 'Taleplerim' },
  { id: 'history', label: 'Geçmiş' },
  { id: 'reviews', label: 'Yorumlar' }
];

const CONDITION_MAP = {
  NEW:      { label: 'Sıfır',          color: '#3a7d44', bg: 'rgba(58,125,68,0.1)'   },
  LIKE_NEW: { label: 'Az Kullanılmış', color: '#2563EB', bg: 'rgba(37,99,235,0.08)'  },
  GOOD:     { label: 'İyi Durumda',    color: '#92400E', bg: 'rgba(146,64,14,0.1)'   },
  FAIR:     { label: 'Kullanılabilir', color: '#6B7280', bg: 'rgba(107,114,128,0.1)' },
};

export default function ProfileScreen({ onLogout, userProfile, initialSubTab, onSubTabChange, onEditAd }) {
  const insets = useSafeAreaInsets();
  const [user, setUser] = useState(userProfile);
  const [activeTab, setActiveTab] = useState(initialSubTab || 'activeAds');

  // Loading States
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Tab Data States
  const [myItems, setMyItems] = useState([]);
  const [myApplications, setMyApplications] = useState([]);
  const [historyBought, setHistoryBought] = useState([]);
  const [historyShared, setHistoryShared] = useState([]);
  const [historySubTab, setHistorySubTab] = useState('bought'); // 'bought' | 'shared'
  const [myReviews, setMyReviews] = useState([]);

  // Modals & Action States
  const [applicantsModalItemId, setApplicantsModalItemId] = useState(null);
  const [applicantsModalTitle, setApplicantsModalTitle] = useState('');
  const [itemApplications, setItemApplications] = useState({});
  const [loadingApplications, setLoadingApplications] = useState(false);
  const [processingAppId, setProcessingAppId] = useState(null);

  // Rating Modal States
  const [ratingModalAppId, setRatingModalAppId] = useState(null);
  const [selectedRating, setSelectedRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [isSubmittingRating, setIsSubmittingRating] = useState(false);

  // User Reviews Profile modal (when clicking an applicant)
  const [selectedUserForReviews, setSelectedUserForReviews] = useState(null);
  const [selectedUserReviews, setSelectedUserReviews] = useState([]);
  const [loadingSelectedUserReviews, setLoadingSelectedUserReviews] = useState(false);

  // Sync activeTab when initialSubTab changes
  useEffect(() => {
    if (initialSubTab) {
      setActiveTab(initialSubTab);
    }
  }, [initialSubTab]);

  const handleTabSelect = (tabId) => {
    setActiveTab(tabId);
    if (onSubTabChange) {
      onSubTabChange(tabId);
    }
  };

  // Fetch Current User Fresh Stats
  const fetchProfile = async () => {
    try {
      const response = await apiClient.get('/auth/me');
      setUser(response.data.data);
    } catch (err) {
      console.error('Profil güncellenirken hata:', err);
    }
  };

  // Fetch functions for tabs
  const fetchMyItems = async () => {
    try {
      const res = await apiClient.get('/items/me');
      const data = res.data?.data ?? [];
      setMyItems(data.filter(i => i.status === 'ACTIVE' || i.status === 'RESERVED'));
    } catch (err) {
      console.error('İlanlar alınamadı:', err);
    }
  };

  const fetchMyApplications = async () => {
    try {
      const res = await apiClient.get('/applications/mine');
      setMyApplications(res.data?.data ?? []);
    } catch (err) {
      console.error('Başvurular alınamadı:', err);
    }
  };

  const fetchHistoryBought = async () => {
    try {
      const res = await apiClient.get('/applications/history/bought');
      setHistoryBought(res.data?.data ?? []);
    } catch (err) {
      console.error('Satın alım geçmişi alınamadı:', err);
    }
  };

  const fetchHistoryShared = async () => {
    try {
      const res = await apiClient.get('/applications/history/shared');
      setHistoryShared(res.data?.data ?? []);
    } catch (err) {
      console.error('Paylaşım geçmişi alınamadı:', err);
    }
  };

  const fetchMyReviews = async () => {
    try {
      const res = await apiClient.get('/applications/reviews/me');
      setMyReviews(res.data?.data ?? []);
    } catch (err) {
      console.error('Değerlendirmeler alınamadı:', err);
    }
  };

  const fetchSelectedUserReviews = async (userId) => {
    setLoadingSelectedUserReviews(true);
    try {
      const res = await apiClient.get(`/applications/reviews/user/${userId}`);
      setSelectedUserReviews(res.data?.data ?? []);
    } catch (err) {
      console.error('Kullanıcı yorumları alınamadı:', err);
      setSelectedUserReviews([]);
    } finally {
      setLoadingSelectedUserReviews(false);
    }
  };

  // Trigger data load when tab changes
  const loadData = useCallback(async (showIndicator = true) => {
    if (showIndicator) setLoading(true);
    await fetchProfile();

    if (activeTab === 'activeAds') {
      await fetchMyItems();
    } else if (activeTab === 'myApplications') {
      await fetchMyApplications();
    } else if (activeTab === 'history') {
      if (historySubTab === 'bought') {
        await fetchHistoryBought();
      } else {
        await fetchHistoryShared();
      }
    } else if (activeTab === 'reviews') {
      await fetchMyReviews();
    }
    setLoading(false);
  }, [activeTab, historySubTab]);

  useEffect(() => {
    loadData();
  }, [activeTab, historySubTab, loadData]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData(false);
    setRefreshing(false);
  };

  // Delete Ad
  const handleDeleteAd = (item) => {
    Alert.alert(
      'İlanı Sil',
      `"${item.title}" ilanını silmek istediğinize emin misiniz?`,
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Evet, Sil',
          style: 'destructive',
          onPress: async () => {
            try {
              await apiClient.delete(`/items/${item.id}`);
              setMyItems(prev => prev.filter(i => i.id !== item.id));
              Alert.alert('Başarılı', 'İlan başarıyla silindi.');
            } catch (err) {
              Alert.alert('Hata', 'İlan silinirken bir hata oluştu.');
            }
          }
        }
      ]
    );
  };

  // Open Applicants Modal
  const handleOpenApplicants = async (item) => {
    setApplicantsModalTitle(item.title);
    setApplicantsModalItemId(item.id);
    setLoadingApplications(true);
    try {
      const res = await apiClient.get(`/applications/item/${item.id}`);
      setItemApplications(prev => ({ ...prev, [item.id]: res.data?.data ?? [] }));
    } catch (err) {
      console.error('Başvurular alınırken hata:', err);
    } finally {
      setLoadingApplications(false);
    }
  };

  // Approve Application
  const handleApproveApplication = async (applicationId, itemId) => {
    setProcessingAppId(applicationId);
    try {
      await apiClient.patch(`/applications/${applicationId}/approve`);
      Alert.alert('Onaylandı', 'Talep onaylandı ve ürün bu kullanıcıya rezerve edildi.');
      // Talepleri ve ilanları yeniden yükle
      const res = await apiClient.get(`/applications/item/${itemId}`);
      setItemApplications(prev => ({ ...prev, [itemId]: res.data?.data ?? [] }));
      await fetchMyItems();
    } catch (err) {
      Alert.alert('Hata', err.response?.data?.message || 'Talep onaylanırken hata oluştu.');
    } finally {
      setProcessingAppId(null);
    }
  };

  // Reject Application
  const handleRejectApplication = async (applicationId, itemId) => {
    setProcessingAppId(applicationId);
    try {
      await apiClient.patch(`/applications/${applicationId}/reject`);
      // Talepleri yeniden yükle
      const res = await apiClient.get(`/applications/item/${itemId}`);
      setItemApplications(prev => ({ ...prev, [itemId]: res.data?.data ?? [] }));
    } catch (err) {
      Alert.alert('Hata', 'Talep reddedilirken hata oluştu.');
    } finally {
      setProcessingAppId(null);
    }
  };

  // Cancel Delivery
  const handleCancelDelivery = async (applicationId, itemId) => {
    Alert.alert(
      'Teslimatı İptal Et',
      'Teslimatı iptal etmek istediğinize emin misiniz? İlan tekrar aktif olacaktır.',
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Evet, İptal Et',
          onPress: async () => {
            try {
              await apiClient.patch(`/applications/${applicationId}/cancel-delivery`);
              Alert.alert('Başarılı', 'Teslimat iptal edildi ve ilan tekrar yayında.');
              
              if (applicantsModalItemId === itemId) {
                const res = await apiClient.get(`/applications/item/${itemId}`);
                setItemApplications(prev => ({ ...prev, [itemId]: res.data?.data ?? [] }));
              }
              await fetchMyItems();
            } catch (err) {
              Alert.alert('Hata', 'Teslimat iptal edilemedi.');
            }
          }
        }
      ]
    );
  };

  const handleCancelItemReservation = async (item) => {
    try {
      const res = await apiClient.get(`/applications/item/${item.id}`);
      const apps = res.data?.data ?? [];
      const approvedApp = apps.find(a => a.status === 'APPROVED');
      if (approvedApp) {
        await handleCancelDelivery(approvedApp.id, item.id);
      } else {
        Alert.alert('Bilgi', 'Bu ilan için henüz onaylanmış bir talep bulunamadı.');
      }
    } catch (err) {
      console.error('Rezervasyon iptal edilirken hata:', err);
      Alert.alert('Hata', 'İlan başvuruları sorgulanamadı.');
    }
  };

  // Cancel My Application (Talebi Geri Çek)
  const handleWithdrawApplication = (applicationId) => {
    Alert.alert(
      'Talebi Geri Çek',
      'Bu ilana olan başvurunuzu geri çekmek istediğinize emin misiniz?',
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Evet, Çek',
          onPress: async () => {
            try {
              await apiClient.delete(`/applications/${applicationId}`);
              setMyApplications(prev => prev.filter(app => app.id !== applicationId));
              Alert.alert('Başarılı', 'Talebiniz geri çekildi.');
            } catch (err) {
              Alert.alert('Hata', 'Talep geri çekilemedi.');
            }
          }
        }
      ]
    );
  };

  // Complete Application (Teslim Aldım)
  const handleCompleteApplication = async (applicationId) => {
    try {
      await apiClient.patch(`/applications/${applicationId}/complete`);
      // Puanlama modalını aç
      setRatingModalAppId(applicationId);
      setSelectedRating(5);
      setReviewComment('');
      // Listeleri yenile
      await fetchMyApplications();
    } catch (err) {
      Alert.alert('Hata', 'İşlem tamamlanamadı.');
    }
  };

  // Rate Application
  const handleRateApplication = async () => {
    setIsSubmittingRating(true);
    try {
      await apiClient.patch(`/applications/${ratingModalAppId}/rate`, {
        rating: selectedRating,
        comment: reviewComment
      });
      Alert.alert('Teşekkürler', 'Değerlendirmeniz başarıyla kaydedildi! 🌟');
      setRatingModalAppId(null);
      await loadData(false);
    } catch (err) {
      Alert.alert('Hata', 'Değerlendirme gönderilemedi.');
    } finally {
      setIsSubmittingRating(false);
    }
  };

  // Handle Applicant user reviews tap
  const handleOpenUserReviews = (applicant) => {
    setSelectedUserForReviews(applicant);
    fetchSelectedUserReviews(applicant.id);
  };

  // Render Functions for Tabs - REPLACED FlatLists with Maps to prevent nested virtualized list bug.

  // 1. ACTIVE ADS TAB
  const renderActiveAds = () => {
    if (myItems.length === 0) {
      return (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyEmoji}>📋</Text>
          <Text style={styles.emptyTitle}>Aktif İlanınız Yok</Text>
          <Text style={styles.emptySub}>Evde kullanmadığınız eşyaları paylaşmaya başlayın.</Text>
        </View>
      );
    }

    return (
      <View style={styles.mappedListContainer}>
        {myItems.map((item) => {
          const cond = CONDITION_MAP[item.condition] || { label: item.condition, color: '#6B7280', bg: 'rgba(107,114,128,0.1)' };
          const hasImage = item.images && item.images.length > 0;
          const appCount = itemApplications[item.id]?.length ?? 0;

          return (
            <View key={`active-ad-${item.id}`} style={styles.profileAdCard}>
              <View style={styles.cardHeaderRow}>
                {hasImage ? (
                  <Image source={{ uri: item.images[0] }} style={styles.adThumb} />
                ) : (
                  <View style={styles.adThumbPlaceholder}><Text style={{fontSize:16}}>📷</Text></View>
                )}
                <View style={styles.adDetails}>
                  <Text style={styles.adTitle} numberOfLines={1}>{item.title}</Text>
                  <Text style={styles.adCat}>{item.category?.name || 'Kategorisiz'}</Text>
                  <View style={[styles.condBadge, { backgroundColor: cond.bg }]}>
                    <Text style={[styles.condText, { color: cond.color }]}>{cond.label}</Text>
                  </View>
                </View>
              </View>

              <View style={styles.adActionsRow}>
                <TouchableOpacity
                  style={styles.adBtnSecondary}
                  onPress={() => handleOpenApplicants(item)}
                >
                  <Text style={styles.adBtnSecondaryText}>👤 Başvuranlar ({appCount > 0 ? appCount : '?'})</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.adBtnEdit}
                  onPress={() => onEditAd && onEditAd(item)}
                >
                  <Text style={styles.adBtnEditText}>📝 Düzenle</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.adBtnDelete}
                  onPress={() => handleDeleteAd(item)}
                >
                  <Text style={styles.adBtnDeleteText}>🗑️ Sil</Text>
                </TouchableOpacity>
              </View>

              {item.status === 'RESERVED' && (
                <View style={styles.reservedOverlay}>
                  <Text style={styles.reservedOverlayText}>Rezerve Edildi 🤝</Text>
                  <TouchableOpacity
                    style={styles.reservedCancelBtn}
                    onPress={() => handleCancelItemReservation(item)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.reservedCancelBtnText}>İptal Et ♻️</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          );
        })}
      </View>
    );
  };

  // 2. MY APPLICATIONS (TALEPLERİM) TAB
  const renderMyApplications = () => {
    if (myApplications.length === 0) {
      return (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyEmoji}>❤️</Text>
          <Text style={styles.emptyTitle}>Başvurunuz Yok</Text>
          <Text style={styles.emptySub}>Beğendiğiniz ilanlara "Talibim" diyerek başvurabilirsiniz.</Text>
        </View>
      );
    }

    return (
      <View style={styles.mappedListContainer}>
        {myApplications.map((item) => {
          const hasImage = item.item?.images && item.item.images.length > 0;

          // Status render helper
          let statusText = 'Beklemede';
          let statusColor = '#7C7267';
          let statusBg = 'rgba(124,114,103,0.1)';

          if (item.status === 'APPROVED') {
            if (item.item.status === 'RESERVED') {
              statusText = 'Teslimat Bekliyor 🤝';
              statusColor = '#E05D3A';
              statusBg = 'rgba(224,93,58,0.1)';
            } else if (item.item.status === 'COMPLETED') {
              statusText = 'Teslim Alındı 🎉';
              statusColor = '#3a7d44';
              statusBg = 'rgba(58,125,68,0.1)';
            }
          } else if (item.status === 'REJECTED') {
            statusText = 'Reddedildi';
            statusColor = '#EF4444';
            statusBg = 'rgba(239,68,68,0.1)';
          } else if (item.status === 'WITHDRAWN') {
            statusText = 'Geri Çekildi';
            statusColor = '#6B7280';
            statusBg = 'rgba(107,114,128,0.1)';
          }

          return (
            <View key={`app-card-${item.id}`} style={styles.profileAdCard}>
              <View style={styles.cardHeaderRow}>
                {hasImage ? (
                  <Image source={{ uri: item.item.images[0] }} style={styles.adThumb} />
                ) : (
                  <View style={styles.adThumbPlaceholder}><Text style={{fontSize:16}}>📷</Text></View>
                )}
                <View style={styles.adDetails}>
                  <Text style={styles.adTitle} numberOfLines={1}>{item.item.title}</Text>
                  <Text style={styles.adCat}>Sahibi: {item.item.user?.fullName || 'Bilinmiyor'}</Text>
                  <View style={[styles.condBadge, { backgroundColor: statusBg, alignSelf: 'flex-start' }]}>
                    <Text style={[styles.condText, { color: statusColor }]}>{statusText}</Text>
                  </View>
                </View>
              </View>

              {item.note && (
                <View style={styles.noteBox}>
                  <Text style={styles.noteText} numberOfLines={2}>Notunuz: "{item.note}"</Text>
                </View>
              )}

              <View style={styles.adActionsRow}>
                {item.status === 'PENDING' && (
                  <TouchableOpacity
                    style={styles.adBtnDelete}
                    onPress={() => handleWithdrawApplication(item.id)}
                  >
                    <Text style={styles.adBtnDeleteText}>↩ Talebi Geri Çek</Text>
                  </TouchableOpacity>
                )}

                {item.status === 'APPROVED' && item.item.status === 'RESERVED' && (
                  <TouchableOpacity
                    style={styles.adBtnPrimary}
                    onPress={() => handleCompleteApplication(item.id)}
                  >
                    <Text style={styles.adBtnPrimaryText}>📦 Teslim Aldım</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          );
        })}
      </View>
    );
  };

  // 3. HISTORY TAB
  const renderHistory = () => {
    const dataList = historySubTab === 'bought' ? historyBought : historyShared;

    return (
      <View>
        <View style={styles.subTabSelector}>
          <TouchableOpacity
            style={[styles.subTabButton, historySubTab === 'bought' && styles.subTabButtonActive]}
            onPress={() => setHistorySubTab('bought')}
          >
            <Text style={[styles.subTabButtonText, historySubTab === 'bought' && styles.subTabButtonTextActive]}>
              Aldıklarım
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.subTabButton, historySubTab === 'shared' && styles.subTabButtonActive]}
            onPress={() => setHistorySubTab('shared')}
          >
            <Text style={[styles.subTabButtonText, historySubTab === 'shared' && styles.subTabButtonTextActive]}>
              Paylaştıklarım
            </Text>
          </TouchableOpacity>
        </View>

        {dataList.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyEmoji}>⏳</Text>
            <Text style={styles.emptyTitle}>İşlem Bulunmuyor</Text>
            <Text style={styles.emptySub}>Bu kategoride henüz tamamlanmış bir işleminiz yoktur.</Text>
          </View>
        ) : (
          <View style={styles.mappedListContainer}>
            {dataList.map((item) => {
              const isBought = historySubTab === 'bought';
              const targetItem = isBought ? item.item : item;
              const hasImage = targetItem?.images && targetItem.images.length > 0;
              const partnerName = isBought 
                ? (targetItem?.user?.fullName || 'Bilinmiyor')
                : (item.applications?.find(a => a.status === 'APPROVED')?.user?.fullName || 'Bilinmiyor');

              return (
                <View key={`history-card-${item.id}`} style={styles.profileAdCard}>
                  <View style={styles.cardHeaderRow}>
                    {hasImage ? (
                      <Image source={{ uri: targetItem.images[0] }} style={styles.adThumb} />
                    ) : (
                      <View style={styles.adThumbPlaceholder}><Text style={{fontSize:16}}>📷</Text></View>
                    )}
                    <View style={styles.adDetails}>
                      <Text style={styles.adTitle} numberOfLines={1}>{targetItem.title}</Text>
                      <Text style={styles.adCat}>
                        {isBought ? `Veren: ${partnerName}` : `Alan: ${partnerName}`}
                      </Text>
                      <Text style={styles.adTime}>
                        Tamamlandı: {new Date(item.updatedAt || item.createdAt).toLocaleDateString('tr-TR')}
                      </Text>
                    </View>
                  </View>

                  {isBought && (
                    <View style={styles.adActionsRow}>
                      {item.isRated ? (
                        <View style={styles.ratedStatus}>
                          <Text style={styles.ratedStatusText}>★ Değerlendirildi</Text>
                        </View>
                      ) : (
                        <TouchableOpacity
                          style={styles.adBtnPrimary}
                          onPress={() => {
                            setRatingModalAppId(item.id);
                            setSelectedRating(5);
                            setReviewComment('');
                          }}
                        >
                          <Text style={styles.adBtnPrimaryText}>★ Puan Ver</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        )}
      </View>
    );
  };

  // 4. REVIEWS TAB
  const renderReviews = () => {
    const totalReviews = myReviews.length;
    const avgRating = totalReviews > 0
      ? myReviews.reduce((sum, r) => sum + (r.rating ?? 0), 0) / totalReviews
      : 0;

    if (totalReviews === 0) {
      return (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyEmoji}>🌟</Text>
          <Text style={styles.emptyTitle}>Değerlendirme Yok</Text>
          <Text style={styles.emptySub}>Paylaştığınız eşyaları alan kullanıcıların değerlendirmeleri burada listelenir.</Text>
        </View>
      );
    }

    return (
      <View>
        <View style={styles.ratingStatsCard}>
          <Text style={styles.ratingScore}>{avgRating.toFixed(1)}</Text>
          <View style={styles.ratingStarRow}>
            {Array.from({ length: 5 }).map((_, i) => (
              <Text key={i} style={[styles.starIconText, i < Math.round(avgRating) && styles.starIconActive]}>★</Text>
            ))}
          </View>
          <Text style={styles.ratingSubText}>{totalReviews} Değerlendirme</Text>
          <Text style={styles.ratingInfoParagraph}>
            Paylaştığınız eşyaları teslim alan diğer topluluk üyelerinden aldığınız puanların ortalamasıdır.
          </Text>
        </View>

        <View style={styles.mappedListContainer}>
          {myReviews.map((item) => {
            return (
              <View key={`review-feed-${item.id}`} style={styles.reviewFeedCard}>
                <View style={styles.reviewHeaderRow}>
                  <View style={styles.reviewerAvatar}>
                    <Text style={styles.reviewerAvatarText}>
                      {(item.user?.fullName || '?').charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.reviewerName}>{item.user?.fullName || 'Kullanıcı'}</Text>
                    <Text style={styles.reviewAdTitle}>İlan: {item.item?.title}</Text>
                  </View>
                  <View style={styles.reviewStarRow}>
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Text key={i} style={[styles.reviewStarText, i < (item.rating ?? 0) && styles.starIconActive]}>★</Text>
                    ))}
                  </View>
                </View>

                {item.reviewComment ? (
                  <View style={styles.reviewCommentBox}>
                    <Text style={styles.reviewCommentText}>"{item.reviewComment}"</Text>
                  </View>
                ) : null}

                <Text style={styles.reviewDate}>
                  {new Date(item.updatedAt || item.createdAt).toLocaleDateString('tr-TR')}
                </Text>
              </View>
            );
          })}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor="#FAF8F5" translucent />

      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={['#E05D3A']}
            tintColor="#E05D3A"
          />
        }
      >
        {/* Profile Header */}
        <View style={[styles.headerSection, { paddingTop: insets.top + 8 }]}>
          <View style={styles.profileMeta}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarText}>
                {(user?.fullName || 'U').charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={styles.profileTextDetails}>
              <Text style={styles.userName}>{user?.fullName || 'Kullanıcı'}</Text>
              <Text style={styles.userEmail}>{user?.email}</Text>
              {user?.ratingCount > 0 ? (
                <View style={styles.ratingBadge}>
                  <Text style={styles.ratingBadgeText}>★ {user.rating?.toFixed(1)} ({user.ratingCount} Değerlendirme)</Text>
                </View>
              ) : (
                <Text style={styles.noRatingText}>Henüz değerlendirme yok</Text>
              )}
            </View>
          </View>

          <TouchableOpacity style={styles.logoutBtn} onPress={onLogout}>
            <Text style={styles.logoutBtnText}>Çıkış Yap</Text>
          </TouchableOpacity>
        </View>

        {/* Tab Menu */}
        <View style={styles.tabsWrapper}>
          <View style={styles.tabsList}>
            {TABS.map((item) => {
              const isSelected = activeTab === item.id;
              return (
                <TouchableOpacity
                  key={`tab-select-${item.id}`}
                  style={[styles.tabButton, isSelected && styles.tabButtonActive]}
                  onPress={() => handleTabSelect(item.id)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.tabText, isSelected && styles.tabTextActive]}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Tab Contents */}
        <View style={styles.contentWrapper}>
          {loading ? (
            <View style={styles.loader}>
              <ActivityIndicator size="large" color="#E05D3A" />
              <Text style={styles.loaderText}>Yükleniyor...</Text>
            </View>
          ) : (
            <>
              {activeTab === 'activeAds' && renderActiveAds()}
              {activeTab === 'myApplications' && renderMyApplications()}
              {activeTab === 'history' && renderHistory()}
              {activeTab === 'reviews' && renderReviews()}
            </>
          )}
        </View>
      </ScrollView>

      {/* ─── MODAL: APPLICANTS (BAŞVURANLAR) ─── */}
      <Modal
        visible={applicantsModalItemId !== null}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setApplicantsModalItemId(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle} numberOfLines={1}>Başvuranlar</Text>
              <TouchableOpacity style={styles.closeBtn} onPress={() => setApplicantsModalItemId(null)}>
                <Text style={styles.closeBtnText}>✕</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.modalSubtitle}>"{applicantsModalTitle}" için başvurular</Text>

            {loadingApplications ? (
              <View style={styles.modalLoader}>
                <ActivityIndicator size="small" color="#E05D3A" />
              </View>
            ) : (itemApplications[applicantsModalItemId] ?? []).length === 0 ? (
              <View style={styles.modalEmpty}>
                <Text style={styles.modalEmptyText}>Henüz başvuru bulunmuyor.</Text>
              </View>
            ) : (
              <ScrollView contentContainerStyle={{ paddingBottom: 30 }}>
                {(itemApplications[applicantsModalItemId] ?? []).map((item) => {
                  const isReserved = myItems.find(i => i.id === applicantsModalItemId)?.status === 'RESERVED';

                  return (
                    <View key={`applicant-${item.id}`} style={styles.applicantUserCard}>
                      <View style={styles.applicantHeader}>
                        <TouchableOpacity 
                          style={styles.applicantAvatar}
                          onPress={() => handleOpenUserReviews(item.user)}
                        >
                          <Text style={styles.applicantAvatarText}>
                            {(item.user?.fullName || '?').charAt(0).toUpperCase()}
                          </Text>
                        </TouchableOpacity>
                        <View style={{ flex: 1 }}>
                          <TouchableOpacity onPress={() => handleOpenUserReviews(item.user)}>
                            <Text style={styles.applicantName}>
                              {item.user?.fullName} <Text style={{ fontSize: 10, color: '#F59E0B' }}>★ Karnesi</Text>
                            </Text>
                          </TouchableOpacity>
                          <Text style={styles.applicantEmail}>{item.user?.email}</Text>
                        </View>
                        <View style={styles.appStatusBadge}>
                          <Text style={styles.appStatusBadgeText}>{item.status}</Text>
                        </View>
                      </View>

                      {item.note && (
                        <View style={styles.applicantNoteBox}>
                          <Text style={styles.applicantNoteText}>"{item.note}"</Text>
                        </View>
                      )}

                      {item.status === 'PENDING' && (
                        <View style={styles.applicantActions}>
                          <TouchableOpacity
                            style={styles.adBtnDelete}
                            disabled={processingAppId !== null}
                            onPress={() => handleRejectApplication(item.id, applicantsModalItemId)}
                          >
                            <Text style={styles.adBtnDeleteText}>Reddet</Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={[styles.adBtnPrimary, isReserved && { backgroundColor: '#A09890' }]}
                            disabled={processingAppId !== null || isReserved}
                            onPress={() => handleApproveApplication(item.id, applicantsModalItemId)}
                          >
                            <Text style={styles.adBtnPrimaryText}>Onayla</Text>
                          </TouchableOpacity>
                        </View>
                      )}

                      {item.status === 'APPROVED' && isReserved && (
                        <TouchableOpacity
                          style={styles.adBtnDelete}
                          disabled={processingAppId !== null}
                          onPress={() => handleCancelDelivery(item.id, applicantsModalItemId)}
                        >
                          <Text style={styles.adBtnDeleteText}>İptal Et (Alıcı Gelmedi)</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  );
                })}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* ─── MODAL: RATING (PUAN VER) ─── */}
      <Modal
        visible={ratingModalAppId !== null}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setRatingModalAppId(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.ratingModalContent}>
            <Text style={styles.ratingModalTitle}>Paylaşımı Değerlendir 🌟</Text>
            <Text style={styles.ratingModalSub}>
              Ürünü teslim aldınız! İlan sahibine 1-5 arası yıldız puanı vererek topluluk içi itibarını belirleyebilirsiniz.
            </Text>

            <View style={styles.ratingStarPickerRow}>
              {[1, 2, 3, 4, 5].map((starVal) => (
                <TouchableOpacity
                  key={starVal}
                  onPress={() => setSelectedRating(starVal)}
                  style={{ padding: 6 }}
                >
                  <Text style={[styles.starPickerText, starVal <= selectedRating && styles.starPickerTextActive]}>
                    ★
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              style={styles.ratingCommentInput}
              placeholder="Geri bildirim veya teşekkür yorumu yazın..."
              placeholderTextColor="#A09890"
              multiline
              numberOfLines={3}
              value={reviewComment}
              onChangeText={setReviewComment}
            />

            <View style={styles.ratingModalActions}>
              <TouchableOpacity
                style={styles.ratingModalCancelBtn}
                onPress={() => setRatingModalAppId(null)}
                disabled={isSubmittingRating}
              >
                <Text style={styles.ratingModalCancelText}>Geç</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.ratingModalSubmitBtn}
                onPress={handleRateApplication}
                disabled={isSubmittingRating}
              >
                {isSubmittingRating ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.ratingModalSubmitText}>Gönder</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ─── MODAL: USER PROFILE / REVIEW CARD (KARNE) ─── */}
      <Modal
        visible={selectedUserForReviews !== null}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setSelectedUserForReviews(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle} numberOfLines={1}>
                {selectedUserForReviews?.fullName}
              </Text>
              <TouchableOpacity style={styles.closeBtn} onPress={() => setSelectedUserForReviews(null)}>
                <Text style={styles.closeBtnText}>✕</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.modalSubtitle}>Paylaşım Karnesi & Yorumları</Text>

            {loadingSelectedUserReviews ? (
              <View style={styles.modalLoader}>
                <ActivityIndicator size="small" color="#E05D3A" />
              </View>
            ) : selectedUserReviews.length === 0 ? (
              <View style={styles.modalEmpty}>
                <Text style={styles.modalEmptyText}>Henüz yapılmış bir değerlendirme bulunmuyor.</Text>
              </View>
            ) : (
              <ScrollView contentContainerStyle={{ paddingBottom: 30 }}>
                {selectedUserReviews.map((item) => (
                  <View key={`selected-review-${item.id}`} style={styles.reviewFeedCard}>
                    <View style={styles.reviewHeaderRow}>
                      <View style={styles.reviewerAvatar}>
                        <Text style={styles.reviewerAvatarText}>
                          {(item.user?.fullName || '?').charAt(0).toUpperCase()}
                        </Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.reviewerName}>{item.user?.fullName || 'Kullanıcı'}</Text>
                        <Text style={styles.reviewAdTitle}>İlan: {item.item?.title}</Text>
                      </View>
                      <View style={styles.reviewStarRow}>
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Text key={i} style={[styles.reviewStarText, i < (item.rating ?? 0) && styles.starIconActive]}>★</Text>
                        ))}
                      </View>
                    </View>
                    {item.reviewComment ? (
                      <View style={styles.reviewCommentBox}>
                        <Text style={styles.reviewCommentText}>"{item.reviewComment}"</Text>
                      </View>
                    ) : null}
                    <Text style={styles.reviewDate}>
                      {new Date(item.updatedAt || item.createdAt).toLocaleDateString('tr-TR')}
                    </Text>
                  </View>
                ))}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF8F5',
  },
  scrollContainer: {
    paddingBottom: 40,
  },
  headerSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1.5,
    borderColor: '#EFEAE4',
    paddingBottom: 20,
  },
  profileMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatarCircle: {
    width: 54,
    height: 54,
    borderRadius: 22,
    backgroundColor: '#E05D3A20',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  avatarText: {
    fontSize: 22,
    fontWeight: '800',
    color: '#E05D3A',
  },
  profileTextDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#2C2520',
    textTransform: 'capitalize',
  },
  userEmail: {
    fontSize: 12,
    color: '#7C7267',
    marginTop: 2,
  },
  ratingBadge: {
    backgroundColor: '#FEF3C7',
    alignSelf: 'flex-start',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginTop: 6,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  ratingBadgeText: {
    color: '#D97706',
    fontSize: 10,
    fontWeight: '700',
  },
  noRatingText: {
    fontSize: 10,
    color: '#7C7267',
    fontStyle: 'italic',
    marginTop: 6,
  },
  logoutBtn: {
    borderWidth: 1.5,
    borderColor: '#EF444430',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#FFF5F5',
  },
  logoutBtnText: {
    color: '#EF4444',
    fontSize: 11,
    fontWeight: '700',
  },
  tabsWrapper: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1.5,
    borderColor: '#EFEAE4',
    marginBottom: 16,
  },
  tabsList: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderBottomWidth: 3,
    borderColor: 'transparent',
  },
  tabButtonActive: {
    borderColor: '#E05D3A',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#7C7267',
  },
  tabTextActive: {
    color: '#E05D3A',
  },
  contentWrapper: {
    paddingHorizontal: 20,
  },
  mappedListContainer: {
    flexDirection: 'column',
    gap: 12,
    paddingBottom: 20,
  },
  loader: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  loaderText: {
    marginTop: 10,
    color: '#7C7267',
    fontSize: 13,
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#EFEAE4',
    paddingVertical: 40,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyEmoji: {
    fontSize: 36,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2C2520',
    marginBottom: 4,
  },
  emptySub: {
    fontSize: 12,
    color: '#7C7267',
    textAlign: 'center',
    lineHeight: 16,
  },
  profileAdCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: '#EFEAE4',
    padding: 16,
    position: 'relative',
    overflow: 'hidden',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  adThumb: {
    width: 60,
    height: 60,
    borderRadius: 14,
    backgroundColor: '#F8F6F2',
    marginRight: 12,
  },
  adThumbPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 14,
    backgroundColor: '#FAF8F5',
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#EFEAE4',
  },
  adDetails: {
    flex: 1,
  },
  adTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2C2520',
  },
  adCat: {
    fontSize: 11,
    color: '#7C7267',
    marginTop: 2,
  },
  adTime: {
    fontSize: 10,
    color: '#A09890',
    marginTop: 2,
  },
  condBadge: {
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginTop: 6,
    alignSelf: 'flex-start',
  },
  condText: {
    fontSize: 10,
    fontWeight: '700',
  },
  adActionsRow: {
    flexDirection: 'row',
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#FAF8F5',
    justifyContent: 'flex-end',
    gap: 10,
  },
  adBtnSecondary: {
    borderWidth: 1.5,
    borderColor: '#EFEAE4',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  adBtnSecondaryText: {
    color: '#2C2520',
    fontSize: 11,
    fontWeight: '600',
  },
  adBtnEdit: {
    borderWidth: 1.5,
    borderColor: '#E05D3A30',
    backgroundColor: '#FFF8F6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  adBtnEditText: {
    color: '#E05D3A',
    fontSize: 11,
    fontWeight: '600',
  },
  adBtnDelete: {
    borderWidth: 1.5,
    borderColor: '#EF444430',
    backgroundColor: '#FFF5F5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  adBtnDeleteText: {
    color: '#EF4444',
    fontSize: 11,
    fontWeight: '600',
  },
  adBtnPrimary: {
    backgroundColor: '#E05D3A',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  adBtnPrimaryText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  reservedOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(250,248,245,0.82)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reservedOverlayText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '850',
    backgroundColor: '#E05D3A',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 12,
    overflow: 'hidden',
  },
  reservedCancelBtn: {
    marginTop: 10,
    backgroundColor: '#FAF8F5',
    borderWidth: 1.5,
    borderColor: '#EF444450',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  reservedCancelBtnText: {
    color: '#EF4444',
    fontSize: 11,
    fontWeight: '700',
  },
  noteBox: {
    marginTop: 10,
    backgroundColor: '#FAF8F5',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#EFEAE4',
  },
  noteText: {
    fontSize: 11,
    color: '#4A3E38',
    fontStyle: 'italic',
  },
  subTabSelector: {
    flexDirection: 'row',
    backgroundColor: '#EFEAE4',
    borderRadius: 14,
    padding: 3,
    marginBottom: 16,
    alignSelf: 'flex-start',
  },
  subTabButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 11,
  },
  subTabButtonActive: {
    backgroundColor: '#FFFFFF',
  },
  subTabButtonText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#7C7267',
  },
  subTabButtonTextActive: {
    color: '#E05D3A',
    fontWeight: '700',
  },
  ratedStatus: {
    backgroundColor: 'rgba(58,125,68,0.1)',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  ratedStatusText: {
    color: '#3a7d44',
    fontSize: 11,
    fontWeight: '700',
  },
  // Reviews Tab Styles
  ratingStatsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#EFEAE4',
    padding: 20,
    alignItems: 'center',
    marginBottom: 16,
  },
  ratingScore: {
    fontSize: 40,
    fontWeight: '900',
    color: '#2C2520',
  },
  ratingStarRow: {
    flexDirection: 'row',
    marginVertical: 4,
  },
  starIconText: {
    fontSize: 22,
    color: '#EFEAE4',
    marginHorizontal: 1,
  },
  starIconActive: {
    color: '#F59E0B',
  },
  ratingSubText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#7C7267',
  },
  ratingInfoParagraph: {
    fontSize: 11,
    color: '#7C7267',
    textAlign: 'center',
    marginTop: 10,
    lineHeight: 15,
  },
  reviewFeedCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#EFEAE4',
    padding: 14,
    marginBottom: 10,
  },
  reviewHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reviewerAvatar: {
    width: 32,
    height: 32,
    borderRadius: 11,
    backgroundColor: '#7C7267',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  reviewerAvatarText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  reviewerName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2C2520',
  },
  reviewAdTitle: {
    fontSize: 10,
    color: '#7C7267',
    marginTop: 1,
  },
  reviewStarRow: {
    flexDirection: 'row',
  },
  reviewStarText: {
    fontSize: 12,
    color: '#EFEAE4',
  },
  reviewCommentBox: {
    marginTop: 10,
    backgroundColor: '#FAF8F5',
    borderRadius: 10,
    padding: 8,
    borderWidth: 1,
    borderColor: '#EFEAE4',
  },
  reviewCommentText: {
    fontSize: 11,
    color: '#4A3E38',
    fontStyle: 'italic',
  },
  reviewDate: {
    fontSize: 9,
    color: '#A09890',
    marginTop: 8,
  },
  // Modal Overlay General
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(44,37,32,0.45)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FAF8F5',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '82%',
    padding: 20,
    shadowColor: '#2C2520',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#2C2520',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#EFEAE4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#7C7267',
  },
  modalSubtitle: {
    fontSize: 11,
    color: '#7C7267',
    marginTop: 2,
    marginBottom: 16,
    textTransform: 'uppercase',
  },
  modalLoader: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  modalEmpty: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  modalEmptyText: {
    fontSize: 12,
    color: '#7C7267',
  },
  applicantUserCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: '#EFEAE4',
    padding: 14,
    marginBottom: 12,
  },
  applicantHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  applicantAvatar: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#E05D3A20',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  applicantAvatarText: {
    color: '#E05D3A',
    fontSize: 14,
    fontWeight: '700',
  },
  applicantName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2C2520',
  },
  applicantEmail: {
    fontSize: 11,
    color: '#7C7267',
  },
  appStatusBadge: {
    backgroundColor: '#FAF8F5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#EFEAE4',
  },
  appStatusBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#7C7267',
  },
  applicantNoteBox: {
    marginTop: 8,
    backgroundColor: '#FAF8F5',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#EFEAE4',
  },
  applicantNoteText: {
    fontSize: 11,
    color: '#4A3E38',
    fontStyle: 'italic',
  },
  applicantActions: {
    flexDirection: 'row',
    marginTop: 12,
    justifyContent: 'flex-end',
    gap: 8,
  },
  // Rating Modal Specific
  ratingModalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: 24,
    margin: 20,
    alignSelf: 'center',
    width: width - 40,
    shadowColor: '#2C2520',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 8,
    marginTop: 'auto',
    marginBottom: 'auto',
  },
  ratingModalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#2C2520',
    textAlign: 'center',
    marginBottom: 8,
  },
  ratingModalSub: {
    fontSize: 12,
    color: '#7C7267',
    textAlign: 'center',
    lineHeight: 16,
    marginBottom: 18,
  },
  ratingStarPickerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 16,
  },
  starPickerText: {
    fontSize: 36,
    color: '#EFEAE4',
    marginHorizontal: 4,
  },
  starPickerTextActive: {
    color: '#F59E0B',
  },
  ratingCommentInput: {
    backgroundColor: '#FAF8F5',
    borderWidth: 1.5,
    borderColor: '#EFEAE4',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: '#2C2520',
    height: 70,
    textAlignVertical: 'top',
    marginBottom: 18,
  },
  ratingModalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  ratingModalCancelBtn: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: '#EFEAE4',
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
  },
  ratingModalCancelText: {
    color: '#7C7267',
    fontSize: 13,
    fontWeight: '700',
  },
  ratingModalSubmitBtn: {
    flex: 1,
    backgroundColor: '#E05D3A',
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ratingModalSubmitText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
});
