import React, { useEffect, useState, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  Image,
  RefreshControl,
  Dimensions,
  TextInput,
  Modal,
  Alert,
  ScrollView,
  StatusBar
} from 'react-native';
import { useSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context';
import * as SecureStore from 'expo-secure-store';
import apiClient from '../api/apiClient';

const { width } = Dimensions.get('window');

// Durum Haritaları
const CONDITION_MAP = {
  NEW:      { label: 'Sıfır',          color: '#3a7d44', bg: 'rgba(58,125,68,0.1)'   },
  LIKE_NEW: { label: 'Az Kullanılmış', color: '#2563EB', bg: 'rgba(37,99,235,0.08)'  },
  GOOD:     { label: 'İyi Durumda',    color: '#92400E', bg: 'rgba(146,64,14,0.1)'   },
  FAIR:     { label: 'Kullanılabilir', color: '#6B7280', bg: 'rgba(107,114,128,0.1)' },
};

const DELIVERY_MAP = {
  PICKUP:   'Elden Teslim',
  DELIVERY: 'Kargolu',
  BOTH:     'Her İkisi',
};

const CONDITIONS = [
  { value: '', label: 'Tüm Durumlar' },
  { value: 'NEW', label: 'Sıfır' },
  { value: 'LIKE_NEW', label: 'Az Kullanılmış' },
  { value: 'GOOD', label: 'İyi' },
  { value: 'FAIR', label: 'Kullanılabilir' },
];

export default function HomeScreen({ onLogout, userProfile, onProfilePress }) {
  const insets = useSafeAreaInsets();
  const [user, setUser] = useState(userProfile);
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  
  // Arama ve Filtreler
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedSubCategory, setSelectedSubCategory] = useState('');
  const [conditionFilter, setConditionFilter] = useState('');
  
  // Sayfalama ve Durumlar
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  // Item Detail & Request Modal States
  const [selectedItem, setSelectedItem] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isRequested, setIsRequested] = useState(false);
  const [checkingRequest, setCheckingRequest] = useState(false);

  // Request Form States
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [requestNote, setRequestNote] = useState('');
  const [sendingRequest, setSendingRequest] = useState(false);
  const [requestSuccess, setRequestSuccess] = useState(false);
  
  // Gallery Active Index inside Modal
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  const LIMIT = 10;

  // Profil Bilgilerini Çek
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await apiClient.get('/auth/me');
        setUser(response.data.data);
      } catch (err) {
        console.error('Profil yükleme hatası:', err);
      }
    };
    if (!userProfile) fetchProfile();
  }, [userProfile]);

  // Kategorileri Çek
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await apiClient.get('/categories');
        const data = res.data?.data ?? res.data ?? [];
        setCategories(data);
      } catch (err) {
        console.error('Kategoriler alınamadı:', err);
      }
    };
    fetchCategories();
  }, []);

  // İlanları Çek
  const fetchItems = useCallback(async (targetPage = page, isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setError('');
    try {
      const params = {
        page: targetPage,
        limit: LIMIT,
        status: 'ACTIVE',
      };
      
      if (conditionFilter) params.condition = conditionFilter;
      
      const activeCategory = selectedSubCategory || selectedCategory;
      if (activeCategory) params.category = activeCategory;

      const res = await apiClient.get('/items', { params });
      
      setItems(res.data.data ?? []);
      setTotalItems(res.data.pagination?.total ?? 0);
      setTotalPages(Math.ceil((res.data.pagination?.total ?? 0) / LIMIT));
    } catch (err) {
      console.error('İlanlar yüklenirken hata:', err);
      setError('İlanlar yüklenirken bir sorun oluştu.');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [page, conditionFilter, selectedCategory, selectedSubCategory]);

  useEffect(() => {
    fetchItems(page);
  }, [page, conditionFilter, selectedCategory, selectedSubCategory]);

  const handleRefresh = () => {
    setPage(1);
    fetchItems(1, true);
  };

  const handleMainCategorySelect = (catId) => {
    if (selectedCategory === catId) {
      setSelectedCategory('');
      setSelectedSubCategory('');
    } else {
      setSelectedCategory(catId);
      setSelectedSubCategory('');
    }
    setPage(1);
  };

  const handleSubCategorySelect = (subId) => {
    if (selectedSubCategory === subId) {
      setSelectedSubCategory('');
    } else {
      setSelectedSubCategory(subId);
    }
    setPage(1);
  };

  const handleLogout = async () => {
    try {
      await SecureStore.deleteItemAsync('thrifty_token');
      onLogout();
    } catch (err) {
      console.error('Çıkış hatası:', err);
    }
  };

  // Click handler for item detail modal
  const handleOpenItemDetails = async (item) => {
    setSelectedItem(item);
    setIsDetailModalOpen(true);
    setIsRequested(false);
    setShowRequestForm(false);
    setRequestSuccess(false);
    setRequestNote('');
    setActiveImageIndex(0);

    // Check if the current user is the owner of the listing
    if (user && item.user && user.id === item.user.id) {
      return;
    }

    setCheckingRequest(true);
    try {
      const res = await apiClient.get(`/applications/check/${item.id}`);
      if (res.data?.data?.applied) {
        setIsRequested(true);
      }
    } catch (err) {
      console.log('İlan talep edilme durumu sorgulanamadı:', err);
    } finally {
      setCheckingRequest(false);
    }
  };

  const handleSendRequest = async () => {
    if (!selectedItem) return;
    setSendingRequest(true);
    try {
      await apiClient.post('/applications', {
        itemId: selectedItem.id,
        note: requestNote.trim() || null
      });
      setIsRequested(true);
      setRequestSuccess(true);
    } catch (err) {
      Alert.alert('Hata', err.response?.data?.message || 'Talep iletilemedi.');
    } finally {
      setSendingRequest(false);
    }
  };

  // Client-side Arama Filtresi
  const filteredItems = searchQuery
    ? items.filter((item) =>
        item.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.category?.name?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : items;

  // İlan Kartı Tasarımı
  const renderItemCard = ({ item }) => {
    const cond = CONDITION_MAP[item.condition] || { label: item.condition, color: '#6B7280', bg: 'rgba(107,114,128,0.1)' };
    const hasImage = item.images && item.images.length > 0;
    const donorChar = item.user?.fullName?.charAt(0)?.toUpperCase() ?? '?';

    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.9}
        onPress={() => handleOpenItemDetails(item)}
      >
        {/* Görsel Alanı */}
        <View style={styles.imageContainer}>
          {hasImage ? (
            <Image source={{ uri: item.images[0] }} style={styles.cardImage} />
          ) : (
            <View style={styles.imagePlaceholder}>
              <Text style={styles.imagePlaceholderText}>📷 Görsel Yok</Text>
            </View>
          )}

          {item.status === 'RESERVED' && (
            <View style={styles.reservedBadge}>
              <Text style={styles.reservedText}>Rezerve Edildi ✓</Text>
            </View>
          )}

          {/* Çoklu Görsel Sayısı */}
          {item.images?.length > 1 && (
            <View style={styles.imageCountBadge}>
              <Text style={styles.imageCountText}>+{item.images.length - 1}</Text>
            </View>
          )}

          {/* Durum Etiketi */}
          <View style={[styles.conditionBadge, { backgroundColor: cond.bg }]}>
            <Text style={[styles.conditionText, { color: cond.color }]}>{cond.label}</Text>
          </View>
        </View>

        {/* Bilgi Alanı */}
        <View style={styles.cardInfo}>
          {item.category && (
            <Text style={styles.cardCategory}>
              {item.category.icon} {item.category.name}
            </Text>
          )}
          
          <Text style={styles.cardTitle} numberOfLines={2}>
            {item.title}
          </Text>

          {/* Konum ve Teslim Tipi */}
          <View style={styles.cardMetaRow}>
            <Text style={styles.cardMetaText}>
              📍 {item.distance != null ? `${item.distance} km` : item.address?.split(',')[0] || 'Konum yok'}
            </Text>
            <View style={styles.deliveryBadge}>
              <Text style={styles.deliveryText}>
                {DELIVERY_MAP[item.deliveryType] || item.deliveryType}
              </Text>
            </View>
          </View>

          {/* Paylaşan Kişi */}
          {item.user && (
            <View style={styles.donorRow}>
              <View style={styles.donorAvatar}>
                <Text style={styles.donorAvatarText}>{donorChar}</Text>
              </View>
              <Text style={styles.donorName} numberOfLines={1}>
                {item.user.fullName}
              </Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  // Header Bölümü
  const renderHeader = () => {
    const userChar = user?.fullName?.charAt(0)?.toUpperCase() ?? 'U';
    const activeMainCat = categories.find(c => c.id === selectedCategory);

    return (
      <View style={[styles.headerContainer, { paddingTop: insets.top + 8 }]}>
        {/* Üst Profil Barı */}
        <View style={styles.profileBar}>
          <TouchableOpacity 
            style={styles.profileInfo} 
            onPress={onProfilePress}
            activeOpacity={0.7}
          >
            <View style={styles.headerAvatar}>
              <Text style={styles.headerAvatarText}>{userChar}</Text>
            </View>
            <View>
              <Text style={styles.welcomeTitle}>Merhaba,</Text>
              <Text style={styles.welcomeName}>{user?.fullName || 'Kullanıcı'}</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerLogoutButton} onPress={onProfilePress}>
            <Text style={styles.logoutTextBtn}>Profilim 👤</Text>
          </TouchableOpacity>
        </View>

        {/* Arama Çubuğu */}
        <View style={styles.searchBarContainer}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Eşya veya kategori ara..."
            placeholderTextColor="#A09890"
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCorrect={false}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearSearchBtn}>
              <Text style={styles.clearSearchText}>✕</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Hero Yazısı */}
        <View style={styles.heroSection}>
          <Text style={styles.heroTitle}>Yakınındaki İlanlar</Text>
          <Text style={styles.heroSubtitle}>Seninle paylaşılmayı bekleyen eşyalar</Text>
        </View>

        {/* Ana Kategoriler Barı */}
        <View style={styles.categoriesWrapper}>
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={[{ id: '', name: 'Tümü', icon: '🌐' }, ...categories]}
            keyExtractor={(item) => `main-cat-${item.id}`}
            contentContainerStyle={styles.categoriesList}
            renderItem={({ item }) => {
              const isSelected = selectedCategory === item.id;
              return (
                <TouchableOpacity
                  style={[
                    styles.categoryButton,
                    isSelected && styles.categoryButtonSelected
                  ]}
                  onPress={() => handleMainCategorySelect(item.id)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.categoryIcon}>{item.icon || '🏷️'}</Text>
                  <Text style={[
                    styles.categoryButtonText,
                    isSelected && styles.categoryButtonTextSelected
                  ]}>
                    {item.name}
                  </Text>
                </TouchableOpacity>
              );
            }}
          />
        </View>

        {/* Alt Kategoriler Barı */}
        {selectedCategory && activeMainCat?.children?.length > 0 && (
          <View style={styles.subCategoriesWrapper}>
            <Text style={styles.subCategoryHeader}>ALT KATEGORİLER:</Text>
            <FlatList
              horizontal
              showsHorizontalScrollIndicator={false}
              data={[{ id: '', name: 'Tümü', icon: '🔸' }, ...activeMainCat.children]}
              keyExtractor={(item) => `sub-cat-${item.id}`}
              contentContainerStyle={styles.subCategoriesList}
              renderItem={({ item }) => {
                const isSelected = selectedSubCategory === item.id;
                return (
                  <TouchableOpacity
                    style={[
                      styles.subCategoryButton,
                      isSelected && styles.subCategoryButtonSelected
                    ]}
                    onPress={() => handleSubCategorySelect(item.id)}
                    activeOpacity={0.8}
                  >
                    <Text style={[
                      styles.subCategoryButtonText,
                      isSelected && styles.subCategoryButtonTextSelected
                    ]}>
                      {item.icon ? `${item.icon} ` : ''}{item.name}
                    </Text>
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        )}

        {/* Durum Filtreleri */}
        <View style={styles.conditionsWrapper}>
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={CONDITIONS}
            keyExtractor={(item) => `cond-filter-${item.value}`}
            contentContainerStyle={styles.conditionsList}
            renderItem={({ item }) => {
              const isSelected = conditionFilter === item.value;
              return (
                <TouchableOpacity
                  style={[
                    styles.conditionFilterButton,
                    isSelected && styles.conditionFilterButtonSelected
                  ]}
                  onPress={() => {
                    setConditionFilter(item.value);
                    setPage(1);
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={[
                    styles.conditionFilterButtonText,
                    isSelected && styles.conditionFilterButtonTextSelected
                  ]}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              );
            }}
          />
        </View>
      </View>
    );
  };

  // Footer / Sayfalama Bölümü
  const renderFooter = () => {
    if (isLoading || filteredItems.length === 0) return null;
    if (totalPages <= 1) return <View style={{ height: 40 }} />;

    return (
      <View style={styles.paginationContainer}>
        <TouchableOpacity
          style={[styles.pageButton, page === 1 && styles.pageButtonDisabled]}
          disabled={page === 1}
          onPress={() => setPage(p => Math.max(1, p - 1))}
        >
          <Text style={styles.pageButtonText}>← Önceki</Text>
        </TouchableOpacity>

        <Text style={styles.pageIndicator}>
          {page} / {totalPages}
        </Text>

        <TouchableOpacity
          style={[styles.pageButton, page === totalPages && styles.pageButtonDisabled]}
          disabled={page === totalPages}
          onPress={() => setPage(p => Math.min(totalPages, p + 1))}
        >
          <Text style={styles.pageButtonText}>Sonraki →</Text>
        </TouchableOpacity>
      </View>
    );
  };

  // Boş Liste Tasarımı
  const renderEmptyState = () => {
    if (isLoading) return null;

    return (
      <View style={styles.emptyContainer}>
        <View style={styles.emptyIconCircle}>
          <Text style={styles.emptyIcon}>🔍</Text>
        </View>
        <Text style={styles.emptyTitle}>İlan Bulunamadı</Text>
        <Text style={styles.emptyText}>
          {searchQuery
            ? `"${searchQuery}" aramasıyla eşleşen bir ürün bulamadık. Farklı kelimeler deneyebilirsiniz.`
            : 'Filtre kriterlerine veya seçilen kategoriye uygun aktif ürün bulunmamaktadır.'}
        </Text>
        <TouchableOpacity
          style={styles.refreshBtn}
          onPress={() => {
            setSearchQuery('');
            setSelectedCategory('');
            setSelectedSubCategory('');
            setConditionFilter('');
            setPage(1);
          }}
        >
          <Text style={styles.refreshBtnText}>Filtreleri Sıfırla</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const isOwner = selectedItem && user && selectedItem.user && selectedItem.user.id === user.id;
  const detailCond = selectedItem && (CONDITION_MAP[selectedItem.condition] || { label: selectedItem.condition, color: '#6B7280', bg: 'rgba(107,114,128,0.1)' });

  return (
    <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor="#FAF8F5" translucent />
      
      {isLoading && !refreshing ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#E05D3A" />
          <Text style={styles.loaderText}>Paylaşımlar yükleniyor...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredItems}
          renderItem={renderItemCard}
          keyExtractor={(item) => `item-card-${item.id}`}
          ListHeaderComponent={renderHeader}
          ListFooterComponent={renderFooter}
          ListEmptyComponent={renderEmptyState}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={['#E05D3A']}
              tintColor="#E05D3A"
            />
          }
        />
      )}

      {/* ─── MODAL: ITEM DETAIL (İLAN DETAYI - PREMIUM BOTTOM SHEET) ─── */}
      <Modal
        visible={isDetailModalOpen}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsDetailModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedItem && (
              <>
                {/* Drag Handle Indicator */}
                <View style={styles.dragHandle} />

                {/* Floating Close Button */}
                <TouchableOpacity 
                  style={styles.floatingCloseBtn} 
                  onPress={() => setIsDetailModalOpen(false)}
                >
                  <Text style={styles.floatingCloseBtnText}>✕</Text>
                </TouchableOpacity>

                <ScrollView 
                  contentContainerStyle={styles.modalScrollContent}
                  showsVerticalScrollIndicator={false}
                >
                  {/* Image Gallery */}
                  {selectedItem.images && selectedItem.images.length > 0 ? (
                    <View style={styles.modalGalleryWrapper}>
                      <ScrollView
                        horizontal
                        pagingEnabled
                        showsHorizontalScrollIndicator={false}
                        onScroll={(e) => {
                          const slideSize = e.nativeEvent.layoutMeasurement.width;
                          const offset = e.nativeEvent.contentOffset.x;
                          const activeIndex = Math.floor(offset / slideSize);
                          setActiveImageIndex(activeIndex);
                        }}
                        scrollEventThrottle={16}
                      >
                        {selectedItem.images.map((img, idx) => (
                          <Image
                            key={`gal-img-${idx}`}
                            source={{ uri: img }}
                            style={styles.modalGalleryImage}
                          />
                        ))}
                      </ScrollView>
                      
                      {/* Numerical image counter overlay */}
                      {selectedItem.images.length > 1 && (
                        <View style={styles.galleryCounterBadge}>
                          <Text style={styles.galleryCounterText}>
                            {activeImageIndex + 1} / {selectedItem.images.length}
                          </Text>
                        </View>
                      )}

                      {/* Pagination Indicator dots */}
                      {selectedItem.images.length > 1 && (
                        <View style={styles.galleryIndicators}>
                          {selectedItem.images.map((_, idx) => (
                            <View
                              key={`ind-${idx}`}
                              style={[
                                styles.indicatorDot,
                                activeImageIndex === idx && styles.indicatorDotActive
                              ]}
                            />
                          ))}
                        </View>
                      )}
                    </View>
                  ) : (
                    <View style={styles.modalImagePlaceholder}>
                      <Text style={{ fontSize: 40 }}>📷</Text>
                      <Text style={{ color: '#7C7267', fontSize: 12, marginTop: 10 }}>Görsel Yok</Text>
                    </View>
                  )}

                  {/* Category & Title */}
                  <View style={styles.detailTitleSection}>
                    {selectedItem.category && (
                      <Text style={styles.detailCategoryText}>
                        {selectedItem.category.icon} {selectedItem.category.name}
                      </Text>
                    )}
                    <Text style={styles.detailTitleText}>{selectedItem.title}</Text>
                  </View>

                  {/* Spec Grid */}
                  <View style={styles.specGrid}>
                    <View style={styles.specBox}>
                      <Text style={styles.specEmoji}>✨</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.specLabel}>Durum</Text>
                        <Text style={[styles.specValue, { color: detailCond.color }]} numberOfLines={1}>
                          {detailCond.label}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.specBox}>
                      <Text style={styles.specEmoji}>📦</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.specLabel}>Teslimat</Text>
                        <Text style={styles.specValue} numberOfLines={1}>
                          {DELIVERY_MAP[selectedItem.deliveryType] || selectedItem.deliveryType}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Buluşma / Teslim Alma Konumu */}
                  {selectedItem.address && (
                    <View style={styles.locationBanner}>
                      <Text style={styles.locationIcon}>📍</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.locationHeader}>Teslim Alma Noktası</Text>
                        <Text style={styles.locationText}>{selectedItem.address}</Text>
                      </View>
                    </View>
                  )}

                  {/* Description */}
                  <View style={styles.descBox}>
                    <Text style={styles.descHeader}>Açıklama</Text>
                    <Text style={styles.descText}>{selectedItem.description}</Text>
                  </View>

                  {/* Sharing user Profile Card */}
                  {selectedItem.user && (
                    <View style={styles.donorProfileCard}>
                      <View style={styles.donorAvatarLarge}>
                        <Text style={styles.donorAvatarLargeText}>
                          {selectedItem.user.fullName?.charAt(0).toUpperCase()}
                        </Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.donorProfileLabel}>Paylaşan Üye</Text>
                        <Text style={styles.donorProfileName}>{selectedItem.user.fullName}</Text>
                        
                        {selectedItem.user?.ratingCount > 0 ? (
                          <View style={styles.donorProfileRating}>
                            <Text style={styles.donorRatingStar}>★</Text>
                            <Text style={styles.donorRatingText}>
                              {selectedItem.user.rating?.toFixed(1)} ({selectedItem.user.ratingCount} Değerlendirme)
                            </Text>
                          </View>
                        ) : (
                          <Text style={styles.donorProfileNoRating}>Henüz değerlendirme almamış</Text>
                        )}
                      </View>
                    </View>
                  )}
                </ScrollView>

                {/* Sticky Pinned Bottom Actions Bar */}
                <View style={[styles.modalActionsBar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
                  {isOwner ? (
                    <View style={styles.ownerNotice}>
                      <Text style={styles.ownerNoticeText}>Bu sizin kendi ilanınızdır.</Text>
                    </View>
                  ) : checkingRequest ? (
                    <View style={{ py: 10, alignItems: 'center' }}>
                      <ActivityIndicator color="#E05D3A" />
                    </View>
                  ) : isRequested ? (
                    <View style={styles.requestedBadge}>
                      <Text style={styles.requestedBadgeText}>Talip Olundu ✓</Text>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={styles.claimBtn}
                      onPress={() => setShowRequestForm(true)}
                    >
                      <Text style={styles.claimBtnText}>Talibim ❤️</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* ─── MODAL: REQUEST FORM & SUCCESS ─── */}
      <Modal
        visible={showRequestForm}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowRequestForm(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.requestModalContent}>
            {!requestSuccess ? (
              <>
                <Text style={styles.requestModalTitle}>Talep İlet 💬</Text>
                <Text style={styles.requestModalSubtitle}>
                  Eşyaya neden talip olduğunuzu açıklayan samimi bir not yazabilirsiniz.
                </Text>

                <TextInput
                  style={styles.requestNoteInput}
                  placeholder="Not bırakın (Örn: Öğrenci evimiz için çok yararlı olacak, teşekkürler!)..."
                  placeholderTextColor="#A09890"
                  multiline
                  numberOfLines={4}
                  maxLength={200}
                  value={requestNote}
                  onChangeText={setRequestNote}
                  disabled={sendingRequest}
                />
                
                <Text style={styles.charCountText}>{requestNote.length}/200</Text>

                <View style={styles.requestFormActions}>
                  <TouchableOpacity
                    style={styles.requestCancelBtn}
                    onPress={() => setShowRequestForm(false)}
                    disabled={sendingRequest}
                  >
                    <Text style={styles.requestCancelBtnText}>Vazgeç</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.requestSubmitBtn}
                    onPress={handleSendRequest}
                    disabled={sendingRequest}
                  >
                    {sendingRequest ? (
                      <ActivityIndicator color="#FFFFFF" size="small" />
                    ) : (
                      <Text style={styles.requestSubmitBtnText}>Talebi Gönder</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <View style={styles.successWrapper}>
                <Text style={styles.successIcon}>🎉</Text>
                <Text style={styles.successTitle}>Talebiniz Gönderildi!</Text>
                <Text style={styles.successMessage}>
                  Eşya sahibinin onaylaması durumunda bir bildirim alacaksınız. Harika bir geri dönüşüm adımı! 🌱
                </Text>

                <TouchableOpacity
                  style={styles.successCloseBtn}
                  onPress={() => {
                    setShowRequestForm(false);
                    setIsDetailModalOpen(false); // Close details modal too
                  }}
                >
                  <Text style={styles.successCloseBtnText}>Kapat</Text>
                </TouchableOpacity>
              </View>
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
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loaderText: {
    marginTop: 12,
    fontSize: 14,
    color: '#7C7267',
    fontWeight: '500',
  },
  listContent: {
    paddingBottom: 24,
  },
  headerContainer: {
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  profileBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  profileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: '#E05D3A20',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  headerAvatarText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#E05D3A',
  },
  welcomeTitle: {
    fontSize: 13,
    color: '#7C7267',
    fontWeight: '500',
  },
  welcomeName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2C2520',
  },
  headerLogoutButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#EFEAE4',
  },
  logoutTextBtn: {
    color: '#7C7267',
    fontSize: 11,
    fontWeight: '700',
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#EFEAE4',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 20,
    shadowColor: '#2C2520',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.02,
    shadowRadius: 10,
    elevation: 1,
  },
  searchIcon: {
    marginRight: 8,
    fontSize: 14,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#2C2520',
    padding: 0,
    fontWeight: '500',
  },
  clearSearchBtn: {
    padding: 4,
  },
  clearSearchText: {
    color: '#A09890',
    fontSize: 12,
    fontWeight: 'bold',
  },
  heroSection: {
    marginBottom: 16,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#2C2520',
  },
  heroSubtitle: {
    fontSize: 13,
    color: '#7C7267',
    marginTop: 4,
    fontWeight: '500',
  },
  categoriesWrapper: {
    marginBottom: 12,
  },
  categoriesList: {
    paddingRight: 20,
  },
  categoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#EFEAE4',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginRight: 10,
    shadowColor: '#2C2520',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 1,
  },
  categoryButtonSelected: {
    backgroundColor: '#E05D3A',
    borderColor: '#E05D3A',
    shadowColor: '#E05D3A',
    shadowOpacity: 0.15,
  },
  categoryIcon: {
    fontSize: 15,
    marginRight: 6,
  },
  categoryButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2C2520',
  },
  categoryButtonTextSelected: {
    color: '#FFFFFF',
  },
  subCategoriesWrapper: {
    backgroundColor: 'rgba(130,162,132,0.06)',
    borderColor: 'rgba(130,162,132,0.15)',
    borderWidth: 1,
    borderRadius: 18,
    padding: 12,
    marginBottom: 12,
  },
  subCategoryHeader: {
    fontSize: 10,
    fontWeight: '800',
    color: '#6e8570',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  subCategoriesList: {
    paddingRight: 10,
  },
  subCategoryButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#EFEAE4',
  },
  subCategoryButtonSelected: {
    backgroundColor: '#526b54',
    borderColor: '#526b54',
  },
  subCategoryButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4A3E38',
  },
  subCategoryButtonTextSelected: {
    color: '#FFFFFF',
  },
  conditionsWrapper: {
    marginBottom: 16,
  },
  conditionsList: {
    paddingRight: 20,
  },
  conditionFilterButton: {
    backgroundColor: 'rgba(74,59,50,0.05)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginRight: 8,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  conditionFilterButtonSelected: {
    backgroundColor: '#2C2520',
  },
  conditionFilterButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#7C7267',
  },
  conditionFilterButtonTextSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    marginHorizontal: 20,
    marginBottom: 18,
    shadowColor: '#2C2520',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.04,
    shadowRadius: 16,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F0ECE6',
    overflow: 'hidden',
  },
  imageContainer: {
    position: 'relative',
    width: '100%',
    height: width * 0.54,
    backgroundColor: '#F8F6F2',
  },
  cardImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imagePlaceholderText: {
    color: '#A09890',
    fontSize: 13,
    fontWeight: '600',
  },
  reservedBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    right: 12,
    bottom: 12,
    backgroundColor: 'rgba(74, 59, 50, 0.45)',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reservedText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
    backgroundColor: '#E05D3A',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#E05D3A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  imageCountBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  imageCountText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  conditionBadge: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  conditionText: {
    fontSize: 11,
    fontWeight: '700',
  },
  cardInfo: {
    padding: 16,
  },
  cardCategory: {
    fontSize: 11,
    fontWeight: '700',
    color: '#526b54',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#2C2520',
    lineHeight: 20,
    marginBottom: 10,
  },
  cardMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardMetaText: {
    fontSize: 12,
    color: '#7C7267',
    fontWeight: '600',
  },
  deliveryBadge: {
    backgroundColor: 'rgba(74,59,50,0.05)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  deliveryText: {
    fontSize: 11,
    color: '#7C7267',
    fontWeight: '600',
  },
  donorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#FAF8F5',
  },
  donorAvatar: {
    width: 24,
    height: 24,
    borderRadius: 10,
    backgroundColor: '#7C7267',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  donorAvatarText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  donorName: {
    fontSize: 12,
    color: '#7C7267',
    fontWeight: '600',
    flex: 1,
  },
  emptyContainer: {
    paddingVertical: 60,
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(74,59,50,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyIcon: {
    fontSize: 28,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2C2520',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 13,
    color: '#7C7267',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
  },
  refreshBtn: {
    backgroundColor: '#E05D3A',
    borderRadius: 14,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  refreshBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 20,
  },
  pageButton: {
    backgroundColor: '#2C2520',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  pageButtonDisabled: {
    backgroundColor: 'rgba(74,59,50,0.08)',
    opacity: 0.5,
  },
  pageButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  pageIndicator: {
    fontSize: 14,
    color: '#7C7267',
    fontWeight: '600',
    marginHorizontal: 20,
  },

  // Premium Bottom Sheet Layout
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(44,37,32,0.45)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FAF8F5',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    maxHeight: '90%',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 0,
    shadowColor: '#2C2520',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 12,
    position: 'relative',
  },
  dragHandle: {
    width: 44,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#EFEAE4',
    alignSelf: 'center',
    marginBottom: 16,
  },
  floatingCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#EFEAE4',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
    top: 15,
    right: 20,
    zIndex: 10,
    shadowColor: '#2C2520',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 3,
  },
  floatingCloseBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#7C7267',
  },
  modalScrollContent: {
    paddingBottom: 24,
  },
  modalGalleryWrapper: {
    width: '100%',
    height: width * 0.62,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#F8F6F2',
    position: 'relative',
    marginBottom: 16,
  },
  modalGalleryImage: {
    width: width - 40,
    height: width * 0.62,
    resizeMode: 'cover',
  },
  galleryCounterBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: 'rgba(44, 37, 32, 0.65)',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  galleryCounterText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  galleryIndicators: {
    position: 'absolute',
    bottom: 12,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  indicatorDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
  },
  indicatorDotActive: {
    backgroundColor: '#E05D3A',
    width: 14,
  },
  modalImagePlaceholder: {
    width: '100%',
    height: width * 0.62,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#EFEAE4',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  detailTitleSection: {
    marginBottom: 16,
  },
  detailCategoryText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#526b54',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  detailTitleText: {
    fontSize: 20,
    fontWeight: '800',
    color: '#2C2520',
    lineHeight: 26,
    textTransform: 'capitalize',
  },

  // Spec Grid Styling
  specGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  specBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#EFEAE4',
    borderRadius: 16,
    padding: 12,
    gap: 10,
  },
  specEmoji: {
    fontSize: 20,
  },
  specLabel: {
    fontSize: 10,
    color: '#7C7267',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  specValue: {
    fontSize: 13,
    fontWeight: '800',
    color: '#2C2520',
    marginTop: 1,
  },

  // Location Callout
  locationBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(74,59,50,0.03)',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1.5,
    borderColor: '#EFEAE4',
    marginBottom: 16,
    gap: 12,
  },
  locationIcon: {
    fontSize: 22,
  },
  locationHeader: {
    fontSize: 11,
    fontWeight: '800',
    color: '#2C2520',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  locationText: {
    fontSize: 12,
    color: '#7C7267',
    marginTop: 2,
    lineHeight: 16,
  },

  // Description Styling
  descBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#EFEAE4',
    padding: 16,
    marginBottom: 16,
  },
  descHeader: {
    fontSize: 13,
    fontWeight: '800',
    color: '#2C2520',
    marginBottom: 6,
  },
  descText: {
    fontSize: 12,
    color: '#7C7267',
    lineHeight: 18,
  },

  // Donor stats card styling
  donorProfileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#EFEAE4',
    padding: 14,
    marginBottom: 10,
    gap: 12,
  },
  donorAvatarLarge: {
    width: 44,
    height: 44,
    borderRadius: 18,
    backgroundColor: '#E05D3A20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  donorAvatarLargeText: {
    color: '#E05D3A',
    fontSize: 18,
    fontWeight: '800',
  },
  donorProfileLabel: {
    fontSize: 10,
    color: '#7C7267',
    textTransform: 'uppercase',
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  donorProfileName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#2C2520',
    marginTop: 1,
    textTransform: 'capitalize',
  },
  donorProfileRating: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  donorRatingStar: {
    color: '#F59E0B',
    fontSize: 12,
    marginRight: 3,
  },
  donorRatingText: {
    color: '#7C7267',
    fontSize: 11,
    fontWeight: '700',
  },
  donorProfileNoRating: {
    fontSize: 10,
    color: '#7C7267',
    fontStyle: 'italic',
    marginTop: 4,
  },

  // Floating sticky bottom bar
  modalActionsBar: {
    paddingTop: 12,
    borderTopWidth: 1.5,
    borderColor: '#EFEAE4',
    backgroundColor: '#FAF8F5',
  },
  claimBtn: {
    backgroundColor: '#E05D3A',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#E05D3A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  claimBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  requestedBadge: {
    backgroundColor: 'rgba(130,162,132,0.15)',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(130,162,132,0.3)',
  },
  requestedBadgeText: {
    color: '#526b54',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  ownerNotice: {
    backgroundColor: 'rgba(74,59,50,0.05)',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ownerNoticeText: {
    color: '#7C7267',
    fontSize: 12,
    fontWeight: '700',
  },

  // Request Form & Success Modal styles
  requestModalContent: {
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
  requestModalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#2C2520',
    textAlign: 'center',
    marginBottom: 8,
  },
  requestModalSubtitle: {
    fontSize: 12,
    color: '#7C7267',
    textAlign: 'center',
    lineHeight: 16,
    marginBottom: 16,
  },
  requestNoteInput: {
    backgroundColor: '#FAF8F5',
    borderWidth: 1.5,
    borderColor: '#EFEAE4',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: '#2C2520',
    height: 90,
    textAlignVertical: 'top',
  },
  charCountText: {
    fontSize: 10,
    color: '#A09890',
    textAlign: 'right',
    marginTop: 4,
    marginBottom: 16,
  },
  requestFormActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  requestCancelBtn: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: '#EFEAE4',
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
  },
  requestCancelBtnText: {
    color: '#7C7267',
    fontSize: 13,
    fontWeight: '700',
  },
  requestSubmitBtn: {
    flex: 1,
    backgroundColor: '#E05D3A',
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  requestSubmitBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  successWrapper: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  successIcon: {
    fontSize: 44,
    marginBottom: 12,
  },
  successTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#2C2520',
    marginBottom: 8,
  },
  successMessage: {
    fontSize: 12,
    color: '#7C7267',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
    paddingHorizontal: 10,
  },
  successCloseBtn: {
    backgroundColor: '#E05D3A',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  successCloseBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
});
