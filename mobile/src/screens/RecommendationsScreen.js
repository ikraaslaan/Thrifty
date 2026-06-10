import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  Image,
  Modal,
  ScrollView,
  Dimensions,
  Alert,
  TextInput
} from 'react-native';
import { useSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context';
import apiClient from '../api/apiClient';

const { width } = Dimensions.get('window');

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

export default function RecommendationsScreen({ userProfile, onBack, onStartChat }) {
  const insets = useSafeAreaInsets();
  const [recommendations, setRecommendations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Detail Modal States
  const [selectedItem, setSelectedItem] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isApplied, setIsApplied] = useState(false);
  const [checkingApplication, setCheckingApplication] = useState(false);
  const [sendingRequest, setSendingRequest] = useState(false);
  const [requestNote, setRequestNote] = useState('');
  const [showRequestForm, setShowRequestForm] = useState(false);

  const fetchRecommendations = async (refresh = false) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await apiClient.get(`/ai/recommendations${refresh ? '?refresh=true' : ''}`, { timeout: 30000 });
      setRecommendations(res.data?.data ?? []);
    } catch (err) {
      console.error('Yapay zeka önerileri yüklenirken hata:', err);
      let msg = err.response?.data?.message || err.message || 'Öneriler yüklenirken bir sorun oluştu.';
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

  const handleOpenDetails = async (item) => {
    setSelectedItem(item);
    setIsDetailModalOpen(true);
    setIsApplied(false);
    setShowRequestForm(false);
    setRequestNote('');

    if (userProfile && item.user && userProfile.id === item.user.id) {
      return;
    }

    setCheckingApplication(true);
    try {
      const res = await apiClient.get(`/applications/check/${item.id}`);
      if (res.data?.data?.applied) {
        setIsApplied(true);
      }
    } catch (err) {
      console.log('Talep durumu kontrol edilemedi:', err);
    } finally {
      setCheckingApplication(false);
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
      setIsApplied(true);
      setShowRequestForm(false);
      Alert.alert('Başarılı', 'Eşya talebiniz başarıyla iletildi!');
    } catch (err) {
      Alert.alert('Hata', err.response?.data?.message || 'Talep iletilemedi.');
    } finally {
      setSendingRequest(false);
    }
  };

  const renderRecItem = ({ item: rec }) => {
    const item = rec.item;
    if (!item) return null;

    const cond = CONDITION_MAP[item.condition] || { label: item.condition, color: '#6B7280', bg: 'rgba(107,114,128,0.1)' };
    const hasImage = item.images && item.images.length > 0;

    // Color gradient simulated
    const scoreColor = rec.matchScore >= 80 ? '#10B981' : '#F59E0B';

    return (
      <View style={styles.recCardWrapper}>
        <TouchableOpacity
          style={styles.card}
          activeOpacity={0.9}
          onPress={() => handleOpenDetails(item)}
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

            {/* Match Score Badge */}
            <View style={[styles.matchBadge, { backgroundColor: scoreColor }]}>
              <Text style={styles.matchBadgeText}>✨ %{rec.matchScore} Uyum</Text>
            </View>

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
            
            <Text style={styles.cardTitle} numberOfLines={1}>
              {item.title}
            </Text>

            <Text style={styles.cardMetaText}>
              📍 {item.distance != null ? `${item.distance} km` : item.address?.split(',')[0] || 'Konum yok'}
            </Text>
          </View>
        </TouchableOpacity>

        {/* AI Reason Speech Bubble */}
        <View style={styles.aiReasonContainer}>
          <Text style={styles.aiReasonHeader}>💡 YAPAY ZEKA NEDENİ</Text>
          <Text style={styles.aiReasonText}>"{rec.reason}"</Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>✨ Yapay Zeka Önerileri</Text>
          <Text style={styles.headerSubtitle}>Taleplerinize göre sizin için seçilenler</Text>
        </View>
      </View>

      {/* Loading */}
      {isLoading && (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#E05D3A" />
          <Text style={styles.loadingText}>Yapay zeka eşleştiriyor...</Text>
        </View>
      )}

      {/* Error */}
      {!isLoading && error && (
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => fetchRecommendations(true)}>
            <Text style={styles.retryButtonText}>Yeniden Hesapla</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Empty State */}
      {!isLoading && !error && recommendations.length === 0 && (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>✨</Text>
          <Text style={styles.emptyTitle}>Öneri Bulunamadı</Text>
          <Text style={styles.emptyText}>
            Yapay zekanın size özel eşleşme bulabilmesi için profilinizde aktif bir eşya talebi bulunmalıdır.
          </Text>
        </View>
      )}

      {/* Recommendations List */}
      {!isLoading && !error && recommendations.length > 0 && (
        <FlatList
          data={recommendations}
          renderItem={renderRecItem}
          keyExtractor={(item) => `rec-${item.itemId}`}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Item Detail Modal */}
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
                <View style={styles.dragHandle} />
                <TouchableOpacity 
                  style={styles.floatingCloseBtn} 
                  onPress={() => setIsDetailModalOpen(false)}
                >
                  <Text style={styles.floatingCloseBtnText}>✕</Text>
                </TouchableOpacity>

                <ScrollView contentContainerStyle={styles.modalScrollContent} showsVerticalScrollIndicator={false}>
                  {selectedItem.images && selectedItem.images.length > 0 ? (
                    <Image source={{ uri: selectedItem.images[0] }} style={styles.modalImage} />
                  ) : (
                    <View style={styles.modalImagePlaceholder}>
                      <Text>📷 Görsel Yok</Text>
                    </View>
                  )}

                  <View style={styles.modalDetailsContainer}>
                    <Text style={styles.modalCategory}>
                      {selectedItem.category?.icon} {selectedItem.category?.name}
                    </Text>
                    <Text style={styles.modalTitle}>{selectedItem.title}</Text>

                    <View style={styles.metaRow}>
                      <View style={[styles.conditionBadge, { backgroundColor: (CONDITION_MAP[selectedItem.condition] || {}).bg }]}>
                        <Text style={{ color: (CONDITION_MAP[selectedItem.condition] || {}).color }}>
                          {(CONDITION_MAP[selectedItem.condition] || {}).label}
                        </Text>
                      </View>
                      <Text style={styles.metaText}>
                        📦 {DELIVERY_MAP[selectedItem.deliveryType]}
                      </Text>
                    </View>

                    <Text style={styles.modalDescription}>{selectedItem.description}</Text>

                    {/* Owner Details */}
                    {selectedItem.user && (
                      <View style={styles.ownerCard}>
                        <View style={styles.ownerAvatar}>
                          <Text style={styles.ownerAvatarText}>
                            {selectedItem.user.fullName?.charAt(0)?.toUpperCase()}
                          </Text>
                        </View>
                        <Text style={styles.ownerName}>{selectedItem.user.fullName}</Text>
                      </View>
                    )}
                  </View>
                </ScrollView>

                {/* Actions */}
                <View style={[styles.actionRow, { paddingBottom: Math.max(insets.bottom, 12) }]}>
                  {userProfile && selectedItem.user && userProfile.id !== selectedItem.user.id && (
                    <>
                      <TouchableOpacity 
                        style={styles.msgButton}
                        onPress={() => {
                          setIsDetailModalOpen(false);
                          onStartChat(selectedItem.id, selectedItem.user.id);
                        }}
                      >
                        <Text style={styles.msgButtonText}>Mesaj Gönder 💬</Text>
                      </TouchableOpacity>

                      {isApplied ? (
                        <View style={styles.appliedBadge}>
                          <Text style={styles.appliedBadgeText}>Talep Edildi ✓</Text>
                        </View>
                      ) : showRequestForm ? (
                        <View style={styles.formContainer}>
                          <TextInput
                            style={styles.formInput}
                            placeholder="Başvuru notu ekleyin..."
                            value={requestNote}
                            onChangeText={setRequestNote}
                          />
                          <TouchableOpacity 
                            style={styles.submitBtn}
                            onPress={handleSendRequest}
                            disabled={sendingRequest}
                          >
                            <Text style={styles.submitBtnText}>Gönder</Text>
                          </TouchableOpacity>
                        </View>
                      ) : (
                        <TouchableOpacity 
                          style={styles.applyButton}
                          onPress={() => setShowRequestForm(true)}
                        >
                          <Text style={styles.applyButtonText}>Talep Et ✨</Text>
                        </TouchableOpacity>
                      )}
                    </>
                  )}
                </View>
              </>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderColor: '#EFEAE4',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FAF8F5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  backButtonText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2C2520',
  },
  headerTitleContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#2C2520',
  },
  headerSubtitle: {
    fontSize: 11,
    color: '#7C7267',
    marginTop: 2,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#7C7267',
    fontWeight: '500',
  },
  errorText: {
    fontSize: 14,
    color: '#EF4444',
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#E05D3A',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 14,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#2C2520',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 12,
    color: '#7C7267',
    textAlign: 'center',
    lineHeight: 18,
  },
  listContent: {
    padding: 16,
    gap: 16,
  },
  recCardWrapper: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#EFEAE4',
    overflow: 'hidden',
    shadowColor: '#2C2520',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 3,
  },
  card: {
    flexDirection: 'row',
    padding: 12,
  },
  imageContainer: {
    width: 90,
    height: 90,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#FAF8F5',
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
    fontSize: 10,
    color: '#7C7267',
  },
  matchBadge: {
    position: 'absolute',
    top: 4,
    left: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  matchBadgeText: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: '800',
  },
  conditionBadge: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  conditionText: {
    fontSize: 8,
    fontWeight: '700',
  },
  cardInfo: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  cardCategory: {
    fontSize: 10,
    fontWeight: '700',
    color: '#82A284',
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#2C2520',
    marginBottom: 4,
  },
  cardMetaText: {
    fontSize: 11,
    color: '#7C7267',
  },
  aiReasonContainer: {
    backgroundColor: 'rgba(224, 93, 58, 0.03)',
    borderTopWidth: 1,
    borderColor: '#EFEAE4',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  aiReasonHeader: {
    fontSize: 9,
    fontWeight: '800',
    color: '#E05D3A',
    marginBottom: 4,
  },
  aiReasonText: {
    fontSize: 12,
    color: '#2C2520',
    fontStyle: 'italic',
    lineHeight: 18,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(44, 37, 32, 0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    height: '85%',
  },
  dragHandle: {
    width: 40,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#EFEAE4',
    alignSelf: 'center',
    marginTop: 12,
  },
  floatingCloseBtn: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FAF8F5',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  floatingCloseBtnText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#7C7267',
  },
  modalScrollContent: {
    paddingBottom: 100,
  },
  modalImage: {
    width: '100%',
    height: 250,
    resizeMode: 'cover',
  },
  modalImagePlaceholder: {
    width: '100%',
    height: 250,
    backgroundColor: '#FAF8F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalDetailsContainer: {
    padding: 20,
  },
  modalCategory: {
    fontSize: 12,
    fontWeight: '700',
    color: '#82A284',
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#2C2520',
    marginBottom: 12,
  },
  metaRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  metaText: {
    fontSize: 12,
    color: '#7C7267',
    fontWeight: '600',
  },
  modalDescription: {
    fontSize: 14,
    color: '#7C7267',
    lineHeight: 22,
    marginBottom: 20,
  },
  ownerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAF8F5',
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#EFEAE4',
  },
  ownerAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#82A284',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  ownerAvatarText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  ownerName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2C2520',
  },
  actionRow: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderColor: '#EFEAE4',
    padding: 16,
    flexDirection: 'row',
    gap: 12,
  },
  msgButton: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E05D3A30',
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  msgButtonText: {
    color: '#E05D3A',
    fontSize: 13,
    fontWeight: '800',
  },
  applyButton: {
    flex: 1,
    backgroundColor: '#E05D3A',
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  appliedBadge: {
    flex: 1,
    backgroundColor: 'rgba(130, 162, 132, 0.1)',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(130, 162, 132, 0.3)',
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  appliedBadgeText: {
    color: '#526b54',
    fontSize: 13,
    fontWeight: '800',
  },
  formContainer: {
    flex: 1,
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  formInput: {
    flex: 1,
    backgroundColor: '#FAF8F5',
    borderWidth: 1,
    borderColor: '#EFEAE4',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 6,
    fontSize: 12,
  },
  submitBtn: {
    backgroundColor: '#E05D3A',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: 'bold',
  }
});
