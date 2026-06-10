import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StatusBar
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import apiClient from '../api/apiClient';

export default function NotificationScreen({ onTabChange }) {
  const insets = useSafeAreaInsets();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchNotifications = async (showIndicator = true) => {
    if (showIndicator) setLoading(true);
    try {
      const res = await apiClient.get('/notifications');
      const fetched = res.data?.data ?? [];
      setNotifications(fetched);

      // Otomatik olarak tüm okunmamış bildirimleri okundu yap
      const unreadIds = fetched.filter(n => !n.isRead).map(n => n.id);
      if (unreadIds.length > 0) {
        await apiClient.patch('/notifications/read', { ids: unreadIds });
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      }
    } catch (err) {
      console.error('Bildirimler yüklenirken hata:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchNotifications(false);
  };

  const handleNotificationPress = (item) => {
    const title = item.title;
    if (title.includes('Talep') && (title.includes('Yeni') || title.includes('Tekrar'))) {
      // Benim ilanım - Profil -> İlanlarım
      onTabChange('Profile', 'activeAds');
    } else if (title.includes('Onaylandı') || title.includes('Talep Sonucu') || title.includes('İptal Edildi')) {
      // Benim başvurum - Profil -> Taleplerim
      onTabChange('Profile', 'myApplications');
    } else if (title.includes('Değerlendirme')) {
      // Yorumlar - Profil -> Değerlendirmeler
      onTabChange('Profile', 'reviews');
    } else if (title.includes('Teslimat') && title.includes('Tamamlandı')) {
      // Geçmiş - Profil -> Geçmiş
      onTabChange('Profile', 'history');
    }
  };

  const renderItem = ({ item }) => {
    return (
      <TouchableOpacity
        style={[styles.card, !item.isRead && styles.cardUnread]}
        activeOpacity={0.8}
        onPress={() => handleNotificationPress(item)}
      >
        <View style={styles.headerRow}>
          <View style={[styles.iconCircle, !item.isRead && styles.iconCircleUnread]}>
            <Text style={{ fontSize: 16 }}>🔔</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.message}>{item.message}</Text>
            <Text style={styles.time}>
              {new Date(item.createdAt).toLocaleDateString('tr-TR', {
                day: 'numeric',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </Text>
          </View>
          {!item.isRead && <View style={styles.unreadDot} />}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor="#FAF8F5" translucent />
      
      <View style={[styles.headerSection, { paddingTop: insets.top + 8 }]}>
        <Text style={styles.screenTitle}>Bildirimler</Text>
        <Text style={styles.screenSubtitle}>Uygulama içi son gelişmeleri takip et</Text>
      </View>

      {loading && !refreshing ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color="#E05D3A" />
          <Text style={styles.loaderText}>Bildirimler yükleniyor...</Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => `notif-screen-${item.id}`}
          renderItem={renderItem}
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
          ListEmptyComponent={
            <View style={styles.emptyCard}>
              <Text style={styles.emptyEmoji}>🔔</Text>
              <Text style={styles.emptyTitle}>Bildiriminiz Yok</Text>
              <Text style={styles.emptySub}>Henüz bir bildirim almadınız.</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF8F5',
  },
  headerSection: {
    paddingHorizontal: 20,
    marginBottom: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1.5,
    borderColor: '#EFEAE4',
    paddingBottom: 16,
  },
  screenTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#2C2520',
  },
  screenSubtitle: {
    fontSize: 12,
    color: '#7C7267',
    marginTop: 2,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  loader: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loaderText: {
    marginTop: 10,
    color: '#7C7267',
    fontSize: 13,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: '#EFEAE4',
    padding: 16,
    marginBottom: 12,
    position: 'relative',
    shadowColor: '#2C2520',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.02,
    shadowRadius: 10,
    elevation: 2,
  },
  cardUnread: {
    borderColor: 'rgba(224,93,58,0.25)',
    backgroundColor: '#FFFDFB',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 14,
    backgroundColor: '#FAF8F5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  iconCircleUnread: {
    backgroundColor: 'rgba(224,93,58,0.1)',
  },
  title: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2C2520',
  },
  message: {
    fontSize: 12,
    color: '#7C7267',
    marginTop: 2,
    lineHeight: 16,
  },
  time: {
    fontSize: 10,
    color: '#A09890',
    marginTop: 6,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E05D3A',
    position: 'absolute',
    top: 6,
    right: 6,
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#EFEAE4',
    paddingVertical: 60,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  emptyEmoji: {
    fontSize: 40,
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
  },
});
