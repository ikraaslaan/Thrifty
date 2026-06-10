import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  Image,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  Alert,
  StatusBar
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import apiClient from '../api/apiClient';

const { width } = Dimensions.get('window');

export default function ChatScreen({ socket, user, initialRoomId, onClearInitialRoom }) {
  const insets = useSafeAreaInsets();
  
  // Navigation & View States
  const [activeRoom, setActiveRoom] = useState(null); // Selected ChatRoom object or null
  const [chatRooms, setChatRooms] = useState([]);
  const [roomMessages, setRoomMessages] = useState([]);
  const [messageInput, setMessageInput] = useState('');
  
  // Loading & Error States
  const [loadingRooms, setLoadingRooms] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [isBlocking, setIsBlocking] = useState(false);
  
  // Search state for room list
  const [searchQuery, setSearchQuery] = useState('');
  
  // Real-time Chat States
  const [isOtherUserTyping, setIsOtherUserTyping] = useState(false);
  const [blockedUserIds, setBlockedUserIds] = useState(new Set());
  const [showBlockMenu, setShowBlockMenu] = useState(false);

  // Refs for ScrollView & Timeouts
  const flatListRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const activeRoomRef = useRef(null);

  // Sync activeRoom with ref so socket listeners always see the current active room ID
  useEffect(() => {
    activeRoomRef.current = activeRoom;
  }, [activeRoom]);

  // Fetch blocked users
  const fetchBlockedUsers = async () => {
    try {
      const res = await apiClient.get('/users/blocked');
      const ids = (res.data?.data ?? []).map((u) => u.id);
      setBlockedUserIds(new Set(ids));
    } catch (err) {
      console.log('Engellenenler alınamadı:', err);
    }
  };

  // Fetch Chat Rooms
  const fetchChatRooms = useCallback(async (showLoader = true) => {
    if (showLoader) setLoadingRooms(true);
    try {
      const res = await apiClient.get('/chat/rooms');
      const rooms = res.data?.data ?? [];
      setChatRooms(rooms);

      // Auto select initial room if provided
      if (initialRoomId) {
        const found = rooms.find(r => r.id === initialRoomId);
        if (found) {
          selectRoom(found);
        }
        if (onClearInitialRoom) onClearInitialRoom();
      }
    } catch (err) {
      console.error('Sohbet odaları yüklenirken hata:', err);
    } finally {
      setLoadingRooms(false);
    }
  }, [initialRoomId, onClearInitialRoom]);

  // Load Rooms on mount
  useEffect(() => {
    fetchChatRooms();
    fetchBlockedUsers();
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  // Helper to determine the other user in a room
  const getOtherUser = (room) => {
    if (!room || !user) return null;
    return room.ownerId === user.id ? room.applicant : room.owner;
  };

  // WebSocket listeners management (Memory leak prevention)
  useEffect(() => {
    if (!socket) return;

    // Listen for incoming messages
    const handleNewMessage = (msg) => {
      const currentActiveRoom = activeRoomRef.current;
      
      // If the message belongs to the active room, add to messages list
      if (currentActiveRoom && currentActiveRoom.id === msg.roomId) {
        setRoomMessages((prev) => {
          if (prev.some((m) => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
        
        // Mark room as read on server since we are looking at it
        if (msg.senderId !== user.id) {
          apiClient.patch(`/chat/rooms/${msg.roomId}/read`).catch(() => {});
        }
      }

      // Update room list preview
      setChatRooms((prevRooms) => {
        return prevRooms.map((room) => {
          if (room.id === msg.roomId) {
            return {
              ...room,
              messages: [msg],
              unreadCount: (currentActiveRoom && currentActiveRoom.id === msg.roomId) 
                ? 0 
                : (msg.senderId === user.id ? 0 : (room.unreadCount ?? 0) + 1),
              updatedAt: msg.createdAt
            };
          }
          return room;
        }).sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      });
    };

    // Listen for read receipts
    const handleMessagesRead = ({ roomId, readerId }) => {
      const currentActiveRoom = activeRoomRef.current;
      if (currentActiveRoom && currentActiveRoom.id === roomId && readerId !== user.id) {
        setRoomMessages((prev) =>
          prev.map((msg) => (msg.senderId === user.id ? { ...msg, isRead: true } : msg))
        );
      }
    };

    // Listen for typing indicators
    const handleUserTyping = ({ roomId, userId, isTyping }) => {
      const currentActiveRoom = activeRoomRef.current;
      if (currentActiveRoom && currentActiveRoom.id === roomId) {
        const partner = getOtherUser(currentActiveRoom);
        if (partner && userId === partner.id) {
          setIsOtherUserTyping(isTyping);
        }
      }
    };

    // Set listeners
    socket.on('new_message', handleNewMessage);
    socket.on('messages_read', handleMessagesRead);
    socket.on('user_typing', handleUserTyping);

    // Cleanup listeners on unmount (CRITICAL to avoid memory leak)
    return () => {
      socket.off('new_message', handleNewMessage);
      socket.off('messages_read', handleMessagesRead);
      socket.off('user_typing', handleUserTyping);
    };
  }, [socket, user]);

  // Select Chat Room
  const selectRoom = async (room) => {
    // Leave previous room if any
    if (activeRoom && socket) {
      socket.emit('leave_room', activeRoom.id);
    }

    setActiveRoom(room);
    setIsOtherUserTyping(false);
    setMessageInput('');
    setLoadingMessages(true);

    try {
      // Fetch messages & mark read
      const res = await apiClient.get(`/chat/rooms/${room.id}/messages`);
      setRoomMessages(res.data?.data ?? []);
      
      // Update unread count locally in room list
      setChatRooms((prev) =>
        prev.map((r) => (r.id === room.id ? { ...r, unreadCount: 0 } : r))
      );

      // Join room in socket
      if (socket) {
        socket.emit('join_room', room.id);
      }
    } catch (err) {
      console.error('Mesajlar alınamadı:', err);
    } finally {
      setLoadingMessages(false);
    }
  };

  // Exit Active Room
  const handleBackToRooms = () => {
    if (activeRoom && socket) {
      socket.emit('leave_room', activeRoom.id);
    }
    setActiveRoom(null);
    setIsOtherUserTyping(false);
    // Refresh rooms list to verify any new order/unread
    fetchChatRooms(false);
  };

  // Handle typing indicator trigger
  const handleTyping = () => {
    if (!activeRoom || !socket) return;

    socket.emit('typing', { roomId: activeRoom.id, isTyping: true });

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      if (socket && activeRoomRef.current) {
        socket.emit('typing', { roomId: activeRoomRef.current.id, isTyping: false });
      }
    }, 3000);
  };

  // Send Message
  const handleSendMessage = async () => {
    if (!activeRoom || !messageInput.trim()) return;

    const content = messageInput.trim();
    setMessageInput('');

    // Cancel typing socket immediately
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    if (socket) {
      socket.emit('typing', { roomId: activeRoom.id, isTyping: false });
    }

    try {
      const res = await apiClient.post(`/chat/rooms/${activeRoom.id}/messages`, { content });
      const newMsg = res.data?.data;
      if (newMsg) {
        setRoomMessages((prev) => [...prev, newMsg]);

        // Update room preview
        setChatRooms((prevRooms) =>
          prevRooms.map((r) =>
            r.id === activeRoom.id
              ? { ...r, messages: [newMsg], updatedAt: newMsg.createdAt }
              : r
          ).sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
        );
      }
    } catch (err) {
      Alert.alert('Hata', err.response?.data?.message || 'Mesaj gönderilemedi.');
    }
  };

  // Toggle user block
  const handleBlockToggle = async () => {
    const partner = getOtherUser(activeRoom);
    if (!partner) return;
    
    const isCurrentlyBlocked = blockedUserIds.has(partner.id);
    
    Alert.alert(
      isCurrentlyBlocked ? 'Engeli Kaldır' : 'Kullanıcıyı Engelle',
      isCurrentlyBlocked 
        ? `"${partner.fullName}" kullanıcısının engelini kaldırmak istediğinize emin misiniz?`
        : `"${partner.fullName}" kullanıcısını engellemek istediğinize emin misiniz? Bu kullanıcı size artık mesaj atamayacaktır.`,
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: isCurrentlyBlocked ? 'Evet, Kaldır' : 'Evet, Engelle',
          style: 'destructive',
          onPress: async () => {
            setIsBlocking(true);
            setShowBlockMenu(false);
            try {
              if (isCurrentlyBlocked) {
                await apiClient.delete(`/users/${partner.id}/block`);
                setBlockedUserIds((prev) => {
                  const copy = new Set(prev);
                  copy.delete(partner.id);
                  return copy;
                });
                Alert.alert('Başarılı', 'Kullanıcının engeli kaldırıldı.');
              } else {
                await apiClient.post(`/users/${partner.id}/block`);
                setBlockedUserIds((prev) => new Set([...prev, partner.id]));
                Alert.alert('Başarılı', 'Kullanıcı engellendi.');
              }
            } catch (err) {
              Alert.alert('Hata', 'Engelleme işlemi gerçekleştirilemedi.');
            } finally {
              setIsBlocking(false);
            }
          }
        }
      ]
    );
  };

  // Filtered rooms search list
  const filteredRooms = chatRooms.filter((room) => {
    const partner = getOtherUser(room);
    const partnerName = partner?.fullName?.toLowerCase() ?? '';
    const itemTitle = room.item?.title?.toLowerCase() ?? '';
    const query = searchQuery.toLowerCase();
    return partnerName.includes(query) || itemTitle.includes(query);
  });

  // Render Single Chat Room Card in the list
  const renderRoomItem = ({ item }) => {
    const partner = getOtherUser(item);
    const lastMsg = item.messages?.[0];
    const partnerName = partner?.fullName || 'Kullanıcı';
    const partnerChar = partnerName.charAt(0).toUpperCase();
    const hasImage = item.item?.images && item.item.images.length > 0;
    const isSelected = activeRoom?.id === item.id;

    return (
      <TouchableOpacity
        style={[styles.roomCard, isSelected && styles.roomCardSelected]}
        onPress={() => selectRoom(item)}
        activeOpacity={0.8}
      >
        <View style={styles.avatarContainer}>
          <Text style={styles.avatarText}>{partnerChar}</Text>
        </View>

        <View style={styles.roomInfo}>
          <View style={styles.roomHeaderRow}>
            <Text style={styles.partnerName} numberOfLines={1}>
              {partnerName}
            </Text>
            {item.updatedAt && (
              <Text style={styles.roomTime}>
                {new Date(item.updatedAt).toLocaleTimeString('tr-TR', {
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </Text>
            )}
          </View>
          <Text style={styles.roomAdTitle} numberOfLines={1}>
            📦 {item.item?.title}
          </Text>
          <Text style={styles.lastMessage} numberOfLines={1}>
            {lastMsg ? lastMsg.content : 'Henüz mesaj yok...'}
          </Text>
        </View>

        <View style={styles.roomRightCol}>
          {hasImage ? (
            <Image source={{ uri: item.item.images[0] }} style={styles.adThumb} />
          ) : (
            <View style={styles.adThumbPlaceholder}><Text style={{fontSize: 10}}>📷</Text></View>
          )}

          {(item.unreadCount ?? 0) > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadBadgeText}>
                {item.unreadCount}
              </Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  // Render Single Chat Message Item
  const renderMessageItem = ({ item }) => {
    const isMe = item.senderId === user.id;
    return (
      <View style={[styles.messageRow, isMe ? styles.messageRowMe : styles.messageRowOther]}>
        <View style={[styles.messageBubble, isMe ? styles.bubbleMe : styles.bubbleOther]}>
          <Text style={[styles.messageText, isMe ? styles.textMe : styles.textOther]}>
            {item.content}
          </Text>
          <View style={styles.msgFooter}>
            <Text style={[styles.msgTime, isMe ? styles.msgTimeMe : styles.msgTimeOther]}>
              {new Date(item.createdAt).toLocaleTimeString('tr-TR', {
                hour: '2-digit',
                minute: '2-digit'
              })}
            </Text>
            {isMe && (
              <Text style={styles.msgStatus}>
                {item.isRead ? '✓✓' : '✓'}
              </Text>
            )}
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor="#FAF8F5" translucent />

      {activeRoom ? (
        // ─── ACTIVE CHAT VIEW ───
        <KeyboardAvoidingView
          style={styles.chatWrapper}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        >
          {/* Active Chat Header */}
          <View style={[styles.chatHeader, { paddingTop: insets.top + 8 }]}>
            <TouchableOpacity onPress={handleBackToRooms} style={styles.backBtn} activeOpacity={0.7}>
              <Text style={styles.backBtnText}>←</Text>
            </TouchableOpacity>

            <View style={styles.chatHeaderDetails}>
              <Text style={styles.chatHeaderName} numberOfLines={1}>
                {getOtherUser(activeRoom)?.fullName || 'Sohbet'}
              </Text>
              <Text style={styles.chatHeaderSubtitle} numberOfLines={1}>
                Ürün: {activeRoom.item?.title}
              </Text>
            </View>

            {/* Block menu trigger */}
            <TouchableOpacity onPress={() => setShowBlockMenu(!showBlockMenu)} style={styles.menuBtn} activeOpacity={0.7}>
              <Text style={styles.menuBtnText}>⋯</Text>
            </TouchableOpacity>

            {showBlockMenu && (
              <View style={styles.blockDropMenu}>
                <TouchableOpacity onPress={handleBlockToggle} style={styles.blockMenuItem}>
                  <Text style={styles.blockMenuText}>
                    {blockedUserIds.has(getOtherUser(activeRoom)?.id) ? '🔓 Engeli Kaldır' : '🚫 Engelle'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Messages List */}
          {loadingMessages ? (
            <View style={styles.center}>
              <ActivityIndicator color="#E05D3A" size="large" />
              <Text style={styles.loadingText}>Yazışma yükleniyor...</Text>
            </View>
          ) : (
            <FlatList
              ref={flatListRef}
              data={roomMessages}
              keyExtractor={(item) => `msg-${item.id}`}
              renderItem={renderMessageItem}
              contentContainerStyle={styles.messagesListContent}
              onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
              onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
              ListHeaderComponent={<View style={{ height: 12 }} />}
              ListFooterComponent={
                isOtherUserTyping ? (
                  <View style={styles.typingRow}>
                    <Text style={styles.typingText}>
                      {getOtherUser(activeRoom)?.fullName?.split(' ')[0]} yazıyor...
                    </Text>
                  </View>
                ) : <View style={{ height: 12 }} />
              }
            />
          )}

          {/* Message Input Bar or Block Banner */}
          {(() => {
            const partner = getOtherUser(activeRoom);
            const isBlockedByMe = partner ? blockedUserIds.has(partner.id) : false;
            
            if (isBlockedByMe) {
              return (
                <View style={[styles.blockBanner, { paddingBottom: Math.max(insets.bottom, 12) }]}>
                  <Text style={styles.blockBannerText}>
                    🚫 Bu kullanıcıyı engellediniz.
                  </Text>
                  <TouchableOpacity onPress={handleBlockToggle}>
                    <Text style={styles.blockBannerBtnText}>Engeli Kaldır</Text>
                  </TouchableOpacity>
                </View>
              );
            }

            if (activeRoom.isBlocked && !isBlockedByMe) {
              return (
                <View style={[styles.blockBanner, { paddingBottom: Math.max(insets.bottom, 12) }]}>
                  <Text style={styles.blockBannerText}>
                    🚫 Bu kullanıcıyla şu anda mesajlaşamazsınız.
                  </Text>
                </View>
              );
            }

            return (
              <View style={[styles.inputBar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
                <TextInput
                  style={styles.textInput}
                  placeholder="Mesajınızı yazın..."
                  placeholderTextColor="#A09890"
                  value={messageInput}
                  onChangeText={(text) => {
                    setMessageInput(text);
                    handleTyping();
                  }}
                  multiline
                  maxLength={500}
                />
                <TouchableOpacity
                  style={[styles.sendBtn, !messageInput.trim() && styles.sendBtnDisabled]}
                  disabled={!messageInput.trim()}
                  onPress={handleSendMessage}
                  activeOpacity={0.8}
                >
                  <Text style={styles.sendBtnText}>Gönder</Text>
                </TouchableOpacity>
              </View>
            );
          })()}
        </KeyboardAvoidingView>
      ) : (
        // ─── CHAT ROOMS LIST VIEW ───
        <View style={styles.roomListWrapper}>
          {/* Header */}
          <View style={[styles.headerSection, { paddingTop: insets.top + 8 }]}>
            <Text style={styles.screenTitle}>Mesajlarım</Text>
            <Text style={styles.screenSubtitle}>Taleplerinizle ilgili sohbetler</Text>
          </View>

          {/* Search Bar */}
          <View style={styles.searchBarContainer}>
            <Text style={styles.searchIcon}>🔍</Text>
            <TextInput
              style={styles.searchInput}
              placeholder="Kullanıcı veya ilan ara..."
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

          {/* Rooms List */}
          {loadingRooms ? (
            <View style={styles.center}>
              <ActivityIndicator color="#E05D3A" size="large" />
              <Text style={styles.loadingText}>Sohbetler yükleniyor...</Text>
            </View>
          ) : (
            <FlatList
              data={filteredRooms}
              keyExtractor={(item) => `room-${item.id}`}
              renderItem={renderRoomItem}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              refreshing={loadingRooms}
              onRefresh={() => fetchChatRooms(false)}
              ListEmptyComponent={
                <View style={styles.emptyCard}>
                  <Text style={styles.emptyEmoji}>💬</Text>
                  <Text style={styles.emptyTitle}>Sohbet Bulunmuyor</Text>
                  <Text style={styles.emptySub}>
                    {searchQuery
                      ? 'Arama kriterlerinize uygun sohbet odası bulunamadı.'
                      : 'Paylaştığınız veya talip olduğunuz ilanlar için aktif sohbetiniz bulunmamaktadır.'}
                  </Text>
                </View>
              }
            />
          )}
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF8F5',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20
  },
  loadingText: {
    marginTop: 10,
    color: '#7C7267',
    fontSize: 13,
  },
  roomListWrapper: {
    flex: 1,
  },
  headerSection: {
    paddingHorizontal: 20,
    marginBottom: 12,
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
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#EFEAE4',
    borderRadius: 18,
    marginHorizontal: 20,
    marginBottom: 16,
    paddingHorizontal: 12,
    height: 44,
  },
  searchIcon: {
    marginRight: 8,
    fontSize: 14,
  },
  searchInput: {
    flex: 1,
    color: '#2C2520',
    fontSize: 13,
    fontWeight: '500',
    padding: 0,
  },
  clearSearchBtn: {
    padding: 4,
  },
  clearSearchText: {
    color: '#A09890',
    fontSize: 12,
    fontWeight: 'bold',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  roomCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: '#EFEAE4',
    padding: 14,
    marginBottom: 12,
    shadowColor: '#2C2520',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.02,
    shadowRadius: 10,
    elevation: 2,
  },
  roomCardSelected: {
    borderColor: '#E05D3A30',
    backgroundColor: '#FFFDFB',
  },
  avatarContainer: {
    width: 44,
    height: 44,
    borderRadius: 18,
    backgroundColor: '#E05D3A15',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#E05D3A',
    fontSize: 18,
    fontWeight: '800',
  },
  roomInfo: {
    flex: 1,
    marginRight: 8,
  },
  roomHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  partnerName: {
    fontSize: 13,
    fontWeight: '800',
    color: '#2C2520',
    flex: 1,
    marginRight: 4,
  },
  roomTime: {
    fontSize: 10,
    color: '#A09890',
    fontWeight: '500',
  },
  roomAdTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#E05D3A',
    marginTop: 2,
  },
  lastMessage: {
    fontSize: 12,
    color: '#7C7267',
    marginTop: 4,
  },
  roomRightCol: {
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 52,
  },
  adThumb: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#F8F6F2',
  },
  adThumbPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#FAF8F5',
    borderWidth: 1,
    borderColor: '#EFEAE4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  unreadBadge: {
    backgroundColor: '#E05D3A',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  unreadBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '950',
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#EFEAE4',
    paddingVertical: 50,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  emptyEmoji: {
    fontSize: 36,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 15,
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
  chatWrapper: {
    flex: 1,
  },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1.5,
    borderColor: '#EFEAE4',
    paddingHorizontal: 16,
    paddingBottom: 12,
    zIndex: 10,
    position: 'relative'
  },
  backBtn: {
    padding: 8,
    marginRight: 8,
  },
  backBtnText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#2C2520',
  },
  chatHeaderDetails: {
    flex: 1,
  },
  chatHeaderName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#2C2520',
    textTransform: 'capitalize',
  },
  chatHeaderSubtitle: {
    fontSize: 11,
    fontWeight: '600',
    color: '#7C7267',
    marginTop: 2,
  },
  menuBtn: {
    padding: 8,
  },
  menuBtnText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#7C7267',
  },
  blockDropMenu: {
    position: 'absolute',
    right: 16,
    top: 50,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EFEAE4',
    borderRadius: 14,
    shadowColor: '#2C2520',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 6,
    zIndex: 100,
    minWidth: 130,
  },
  blockMenuItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  blockMenuText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#EF4444',
  },
  messagesListContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  messageRow: {
    flexDirection: 'row',
    marginVertical: 4,
    width: '100%',
  },
  messageRowMe: {
    justifyContent: 'flex-end',
  },
  messageRowOther: {
    justifyContent: 'flex-start',
  },
  messageBubble: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
    maxWidth: width * 0.75,
    shadowColor: '#2C2520',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.01,
    shadowRadius: 2,
    elevation: 1,
  },
  bubbleMe: {
    backgroundColor: '#E05D3A',
    borderBottomRightRadius: 2,
  },
  bubbleOther: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EFEAE4',
    borderBottomLeftRadius: 2,
  },
  messageText: {
    fontSize: 13,
    lineHeight: 18,
  },
  textMe: {
    color: '#FFFFFF',
  },
  textOther: {
    color: '#2C2520',
  },
  msgFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 4,
  },
  msgTime: {
    fontSize: 8,
  },
  msgTimeMe: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  msgTimeOther: {
    color: '#7C7267',
  },
  msgStatus: {
    fontSize: 8,
    color: 'rgba(255,255,255,0.7)',
    marginLeft: 3,
    fontWeight: 'bold',
  },
  typingRow: {
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  typingText: {
    fontSize: 11,
    color: '#7C7267',
    fontStyle: 'italic',
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1.5,
    borderColor: '#EFEAE4',
    paddingHorizontal: 14,
    paddingTop: 8,
  },
  textInput: {
    flex: 1,
    backgroundColor: '#FAF8F5',
    borderWidth: 1,
    borderColor: '#EFEAE4',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingTop: 8,
    paddingBottom: 8,
    maxHeight: 100,
    color: '#2C2520',
    fontSize: 13,
  },
  sendBtn: {
    marginLeft: 10,
    backgroundColor: '#E05D3A',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendBtnDisabled: {
    opacity: 0.5,
  },
  sendBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  blockBanner: {
    backgroundColor: '#FFF5F5',
    borderTopWidth: 1.5,
    borderColor: '#EF444420',
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  blockBannerText: {
    fontSize: 12,
    color: '#EF4444',
    fontWeight: '600',
    textAlign: 'center',
  },
  blockBannerBtnText: {
    fontSize: 12,
    color: '#7C7267',
    fontWeight: '700',
    textDecorationLine: 'underline',
    marginTop: 6,
  },
});
