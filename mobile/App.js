import React, { useState, useEffect } from 'react';
import { StyleSheet, View, ActivityIndicator, Text, TouchableOpacity } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import * as SecureStore from 'expo-secure-store';
import apiClient from './src/api/apiClient';
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import HomeScreen from './src/screens/HomeScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import NotificationScreen from './src/screens/NotificationScreen';
import ShareScreen from './src/screens/ShareScreen';

function MainNavigator({ user, onLogout }) {
  const [activeTab, setActiveTab] = useState('Home'); // 'Home', 'Share', 'Notifications', 'Profile'
  const [profileSubTab, setProfileSubTab] = useState('activeAds'); // default profile sub-tab
  const [shareEditItemId, setShareEditItemId] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);
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

  // Poll for notifications unread count every 15 seconds
  useEffect(() => {
    fetchUnreadNotifications();
    const interval = setInterval(fetchUnreadNotifications, 15000);
    return () => clearInterval(interval);
  }, []);

  // Whenever we view the Notifications tab, reset the unread count locally (as the screen marks them read)
  useEffect(() => {
    if (activeTab === 'Notifications') {
      setUnreadCount(0);
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
          onPress={() => {
            setActiveTab('Profile');
            setProfileSubTab('activeAds'); // default to activeAds when entering Profile directly
          }}
          activeOpacity={0.7}
        >
          <Text style={[styles.tabIcon, activeTab === 'Profile' && styles.tabIconActive]}>👤</Text>
          <Text style={[styles.tabLabel, activeTab === 'Profile' && styles.tabLabelActive]}>Profilim</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function App() {
  const [currentScreen, setCurrentScreen] = useState('Splash'); // 'Splash', 'Login', 'Register', 'Home'
  const [user, setUser] = useState(null);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const token = await SecureStore.getItemAsync('thrifty_token');
      if (token) {
        // Token'ı sunucudan doğrula
        const response = await apiClient.get('/auth/me');
        setUser(response.data.data);
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

  const handleLoginSuccess = (userObj) => {
    setUser(userObj);
    setCurrentScreen('Home');
  };

  const handleRegisterSuccess = (userObj) => {
    setUser(userObj);
    setCurrentScreen('Home');
  };

  const handleLogout = () => {
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
});
