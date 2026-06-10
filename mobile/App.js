import React, { useState, useEffect } from 'react';
import { StyleSheet, View, ActivityIndicator, Text, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import * as SecureStore from 'expo-secure-store';
import io from 'socket.io-client';
import { API_URL } from './config';
import apiClient from './src/api/apiClient';
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import HomeScreen from './src/screens/HomeScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import NotificationScreen from './src/screens/NotificationScreen';
import ShareScreen from './src/screens/ShareScreen';
import ChatScreen from './src/screens/ChatScreen';
import RecommendationsScreen from './src/screens/RecommendationsScreen';

function MainNavigator({ user, onLogout, socket }) {
  const [activeTab, setActiveTab] = useState('Home'); // 'Home', 'Share', 'Notifications', 'Messages', 'Profile'
  const [profileSubTab, setProfileSubTab] = useState('activeAds'); // default profile sub-tab
  const [shareEditItemId, setShareEditItemId] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);
  const [chatInitialRoomId, setChatInitialRoomId] = useState(null);
  const insets = useSafeAreaInsets();

  const fetchUnreadNotifications = async () => {
    try {
      const res = await apiClient.get('/notifications');
      const list = res.data?.data ?? [];
      const unread = list.filter(n => !n.isRead).length;
      setUnreadCount(unread);
    } catch (err) {
      console.error('Bildirim sayısını çekerken hata:', err);
    }
  };

  const fetchUnreadMessagesCount = async () => {
    try {
      const res = await apiClient.get('/chat/rooms');
      const rooms = res.data?.data ?? [];
      const count = rooms.reduce((sum, r) => sum + (r.unreadCount ?? 0), 0);
      setUnreadMessagesCount(count);
    } catch (err) {
      console.error('Mesaj sayısını çekerken hata:', err);
    }
  };

  // Poll for notifications unread count every 15 seconds
  useEffect(() => {
    fetchUnreadNotifications();
    const interval = setInterval(fetchUnreadNotifications, 15000);
    return () => clearInterval(interval);
  }, []);

  // Sync activeTab with notifications
  useEffect(() => {
    if (activeTab === 'Notifications') {
      setUnreadCount(0);
    }
  }, [activeTab]);

  // Real-time unread messages count sync with socket (Memory leak prevention)
  useEffect(() => {
    fetchUnreadMessagesCount();

    if (!socket) return;

    const handleBadgeUpdate = () => {
      fetchUnreadMessagesCount();
    };

    const handleNewMessage = () => {
      fetchUnreadMessagesCount();
    };

    socket.on('message_badge_update', handleBadgeUpdate);
    socket.on('new_message', handleNewMessage);

    return () => {
      socket.off('message_badge_update', handleBadgeUpdate);
      socket.off('new_message', handleNewMessage);
    };
  }, [socket]);

  // Refresh message count when entering Messages tab
  useEffect(() => {
    if (activeTab === 'Messages') {
      fetchUnreadMessagesCount();
    }
  }, [activeTab]);

  const handleTabChangeFromNotification = (tab, subTab) => {
    setActiveTab(tab);
    if (subTab) {
      setProfileSubTab(subTab);
    }
  };

  const handleShareTabPress = () => {
    setShareEditItemId(null);
    setActiveTab('Share');
  };

  const handleStartChat = async (itemId, applicantId = null) => {
    try {
      const res = await apiClient.post('/chat/rooms', {
        itemId,
        ...(applicantId && { applicantId })
      });
      if (res.data?.status === 'success' && res.data?.data) {
        setChatInitialRoomId(res.data.data.id);
        setActiveTab('Messages');
      }
    } catch (err) {
      console.error('Sohbet başlatılamadı:', err);
      Alert.alert('Hata', err.response?.data?.message || 'Sohbet başlatılamadı.');
    }
  };

  return (
    <View style={styles.mainContainer}>
      <View style={styles.screenContent}>
        {activeTab === 'Home' && (
          <HomeScreen
            userProfile={user}
            onLogout={onLogout}
            onProfilePress={() => {
              setActiveTab('Profile');
              setProfileSubTab('activeAds');
            }}
            onStartChat={handleStartChat}
            onRecommendationsPress={() => setActiveTab('Recommendations')}
          />
        )}
        {activeTab === 'Recommendations' && (
          <RecommendationsScreen
            userProfile={user}
            onBack={() => setActiveTab('Home')}
            onStartChat={handleStartChat}
          />
        )}
        {activeTab === 'Share' && (
          <ShareScreen
            userProfile={user}
            editItemId={shareEditItemId}
            onShareSuccess={() => {
              setShareEditItemId(null);
              setActiveTab('Profile');
              setProfileSubTab('activeAds');
            }}
            onCancel={() => {
              setShareEditItemId(null);
              setActiveTab('Profile');
            }}
          />
        )}
        {activeTab === 'Notifications' && (
          <NotificationScreen
            onTabChange={handleTabChangeFromNotification}
          />
        )}
        {activeTab === 'Profile' && (
          <ProfileScreen
            userProfile={user}
            onLogout={onLogout}
            initialSubTab={profileSubTab}
            onSubTabChange={(sub) => setProfileSubTab(sub)}
            onEditAd={(item) => {
              setShareEditItemId(item.id);
              setActiveTab('Share');
            }}
            onStartChat={handleStartChat}
          />
        )}
        {activeTab === 'Messages' && (
          <ChatScreen
            socket={socket}
            user={user}
            initialRoomId={chatInitialRoomId}
            onClearInitialRoom={() => setChatInitialRoomId(null)}
          />
        )}
      </View>
      
      {/* Bottom Tab Bar */}
      <View style={[styles.bottomTabBar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => setActiveTab('Home')}
          activeOpacity={0.7}
        >
          <Text style={[styles.tabIcon, activeTab === 'Home' && styles.tabIconActive]}>🏠</Text>
          <Text style={[styles.tabLabel, activeTab === 'Home' && styles.tabLabelActive]}>Keşfet</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tabItem}
          onPress={handleShareTabPress}
          activeOpacity={0.7}
        >
          <Text style={[styles.tabIcon, activeTab === 'Share' && styles.tabIconActive]}>➕</Text>
          <Text style={[styles.tabLabel, activeTab === 'Share' && styles.tabLabelActive]}>Paylaş</Text>
        </TouchableOpacity>

        {/* 🤖 Yapay Zeka Önerileri Raised Tab Item */}
        <TouchableOpacity
          style={styles.raisedTabItem}
          onPress={() => setActiveTab('Recommendations')}
          activeOpacity={0.8}
        >
          {/* Glowing backdrops */}
          <View style={styles.raisedGlow} />
          
          {/* Big raised circle */}
          <View style={styles.raisedCircle}>
            {/* Card 1 (Back, rotated) */}
            <View style={[styles.tabCard, styles.tabCardBack]}>
              <Text style={styles.tabCardText}>Q</Text>
              <Text style={styles.tabCardSuit}>♠</Text>
            </View>
            
            {/* Card 2 (Middle, rotated) */}
            <View style={[styles.tabCard, styles.tabCardMiddle]}>
              <Text style={styles.tabCardText}>Q</Text>
              <Text style={styles.tabCardSuit}>♠</Text>
            </View>
            
            {/* Card 3 (Front, rotated) */}
            <View style={[styles.tabCard, styles.tabCardFront]}>
              <Text style={[styles.tabCardText, { color: '#E05D3A' }]}>Q</Text>
              <Text style={[styles.tabCardSuit, { color: '#E05D3A' }]}>♠</Text>
            </View>
            
            {/* Sparkle badge */}
            <View style={styles.tabSparkle}>
              <Text style={styles.tabSparkleText}>✨</Text>
            </View>
          </View>
          
          <Text style={[
            styles.tabLabel, 
            activeTab === 'Recommendations' && styles.tabLabelActive, 
            { marginTop: 28 }
          ]}>
            Öneriler
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => setActiveTab('Notifications')}
          activeOpacity={0.7}
        >
          <View style={styles.badgeContainer}>
            <Text style={[styles.tabIcon, activeTab === 'Notifications' && styles.tabIconActive]}>🔔</Text>
            {unreadCount > 0 && (
              <View style={styles.tabBadge}>
                <Text style={styles.tabBadgeText}>
                  {unreadCount > 9 ? '9+' : unreadCount}
                </Text>
              </View>
            )}
          </View>
          <Text style={[styles.tabLabel, activeTab === 'Notifications' && styles.tabLabelActive]}>Bildirimler</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => setActiveTab('Messages')}
          activeOpacity={0.7}
        >
          <View style={styles.badgeContainer}>
            <Text style={[styles.tabIcon, activeTab === 'Messages' && styles.tabIconActive]}>💬</Text>
            {unreadMessagesCount > 0 && (
              <View style={styles.tabBadge}>
                <Text style={styles.tabBadgeText}>
                  {unreadMessagesCount > 9 ? '9+' : unreadMessagesCount}
                </Text>
              </View>
            )}
          </View>
          <Text style={[styles.tabLabel, activeTab === 'Messages' && styles.tabLabelActive]}>Mesajlaş</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function App() {
  const [currentScreen, setCurrentScreen] = useState('Splash'); // 'Splash', 'Login', 'Register', 'Home'
  const [user, setUser] = useState(null);
  const [socket, setSocket] = useState(null);

  const initializeSocket = (token) => {
    if (!token) return;
    try {
      const socketUrl = API_URL.replace('/api', '');
      const newSocket = io(socketUrl, {
        auth: { token },
        transports: ['websocket'],
      });

      newSocket.on('connect', () => {
        console.log('⚡ Socket connected to backend');
      });

      newSocket.on('connect_error', (err) => {
        console.log('❌ Socket connection error:', err.message);
      });

      setSocket(newSocket);
    } catch (err) {
      console.error('Socket başlatılırken hata:', err);
    }
  };

  useEffect(() => {
    checkAuthStatus();
    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, []);

  const checkAuthStatus = async () => {
    try {
      const token = await SecureStore.getItemAsync('thrifty_token');
      if (token) {
        // Token'ı sunucudan doğrula
        const response = await apiClient.get('/auth/me');
        setUser(response.data.data);
        initializeSocket(token);
        setCurrentScreen('Home');
      } else {
        setCurrentScreen('Login');
      }
    } catch (error) {
      console.log('Oturum doğrulanamadı, giriş sayfasına yönlendiriliyor.');
      try {
        await SecureStore.deleteItemAsync('thrifty_token');
      } catch (cleanError) {
        console.error('Token temizleme hatası:', cleanError);
      }
      setCurrentScreen('Login');
    }
  };

  const handleLoginSuccess = async (userObj) => {
    setUser(userObj);
    const token = await SecureStore.getItemAsync('thrifty_token');
    initializeSocket(token);
    setCurrentScreen('Home');
  };

  const handleRegisterSuccess = async (userObj) => {
    setUser(userObj);
    const token = await SecureStore.getItemAsync('thrifty_token');
    initializeSocket(token);
    setCurrentScreen('Home');
  };

  const handleLogout = () => {
    if (socket) {
      socket.disconnect();
      setSocket(null);
    }
    setUser(null);
    setCurrentScreen('Login');
  };

  const navigation = {
    navigate: (screenName) => setCurrentScreen(screenName),
  };

  if (currentScreen === 'Splash') {
    return (
      <SafeAreaProvider>
        <View style={styles.splashContainer}>
          <ActivityIndicator size="large" color="#E05D3A" />
          <Text style={styles.splashText}>Thrifty yükleniyor...</Text>
        </View>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <View style={styles.container}>
        {currentScreen === 'Login' && (
          <LoginScreen
            navigation={navigation}
            onLoginSuccess={handleLoginSuccess}
          />
        )}
        {currentScreen === 'Register' && (
          <RegisterScreen
            navigation={navigation}
            onRegisterSuccess={handleRegisterSuccess}
          />
        )}
        {currentScreen === 'Home' && (
          <MainNavigator
            user={user}
            onLogout={handleLogout}
            socket={socket}
          />
        )}
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF8F5',
  },
  splashContainer: {
    flex: 1,
    backgroundColor: '#FAF8F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  splashText: {
    marginTop: 12,
    fontSize: 14,
    color: '#7C7267',
    fontWeight: '500',
  },
  mainContainer: {
    flex: 1,
    backgroundColor: '#FAF8F5',
  },
  screenContent: {
    flex: 1,
  },
  bottomTabBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1.5,
    borderColor: '#EFEAE4',
    paddingTop: 10,
    shadowColor: '#2C2520',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.02,
    shadowRadius: 10,
    elevation: 8,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabIcon: {
    fontSize: 20,
    opacity: 0.5,
  },
  tabIconActive: {
    opacity: 1,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#7C7267',
    marginTop: 4,
  },
  tabLabelActive: {
    color: '#E05D3A',
  },
  badgeContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabBadge: {
    position: 'absolute',
    top: -6,
    right: -10,
    backgroundColor: '#E05D3A',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  tabBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '900',
  },
  raisedTabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  raisedGlow: {
    position: 'absolute',
    top: -24,
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: 'rgba(224, 93, 58, 0.12)',
    shadowColor: '#E05D3A',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 10,
  },
  raisedCircle: {
    position: 'absolute',
    top: -20,
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E05D3A',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#4A3B32',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 5,
    elevation: 6,
  },
  tabCard: {
    width: 20,
    height: 30,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
    borderWidth: 0.8,
    borderColor: '#4A3B32',
    padding: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabCardBack: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    transform: [{ rotate: '-22deg' }],
    zIndex: 10,
  },
  tabCardMiddle: {
    position: 'absolute',
    bottom: 10,
    left: 16,
    transform: [{ rotate: '-5deg' }],
    zIndex: 11,
  },
  tabCardFront: {
    position: 'absolute',
    bottom: 12,
    right: 8,
    transform: [{ rotate: '12deg' }],
    zIndex: 12,
    borderColor: '#E05D3A',
  },
  tabCardText: {
    fontSize: 5,
    fontWeight: '900',
    color: '#4A3B32',
    position: 'absolute',
    top: 1,
    left: 2,
    lineHeight: 6,
  },
  tabCardSuit: {
    fontSize: 8,
    fontWeight: '800',
    color: '#4A3B32',
    marginTop: 4,
  },
  tabSparkle: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#E05D3A',
    borderRadius: 6,
    width: 13,
    height: 13,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 15,
  },
  tabSparkleText: {
    fontSize: 8,
    lineHeight: 10,
    color: '#FFFFFF',
  },
});
