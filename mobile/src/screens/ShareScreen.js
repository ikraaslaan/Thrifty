import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Image,
  ScrollView,
  Modal,
  Alert,
  Platform,
  Dimensions
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import apiClient from '../api/apiClient';
import { TURKEY_CITIES, TURKEY_CITY_LIST } from '../data/turkeyCities';

const { width } = Dimensions.get('window');

const CONDITIONS = [
  { value: 'NEW',      label: 'Sıfır',          desc: 'Hiç Kullanılmamış' },
  { value: 'LIKE_NEW', label: 'Az Kullanılmış', desc: 'Tertemiz durumunda' },
  { value: 'GOOD',     label: 'İyi Durumda',    desc: 'Ufak yıpranmalar var' },
  { value: 'FAIR',     label: 'Kullanılabilir', desc: 'İş görüyor durumda' }
];

const DELIVERY_TYPES = [
  { value: 'PICKUP',   label: '📍 Elden Teslim', desc: 'Kararlaştırılan yerde buluşma' },
  { value: 'DELIVERY', label: '📦 Kargolu',      desc: 'Alıcı ödemeli kargo' },
  { value: 'BOTH',     label: '🤝 Her İkisi',    desc: 'Alıcıyla anlaşmaya bağlı' }
];

// Reusable Searchable Picker Modal component
function SearchablePickerModal({ visible, onClose, title, data, onSelect, value, labelExtractor, keyExtractor }) {
  const [search, setSearch] = useState('');
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (visible) setSearch('');
  }, [visible]);

  const filteredData = data.filter((item) => {
    const label = labelExtractor ? labelExtractor(item) : item;
    return label.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { paddingBottom: Math.max(insets.bottom, 20) }]}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{title}</Text>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.modalSearchContainer}>
            <TextInput
              style={styles.modalSearchInput}
              placeholder="Ara..."
              placeholderTextColor="#A09890"
              value={search}
              onChangeText={setSearch}
              autoCorrect={false}
              autoCapitalize="none"
            />
          </View>

          <ScrollView style={styles.modalList} keyboardShouldPersistTaps="handled">
            {filteredData.length === 0 ? (
              <View style={styles.emptySearchContainer}>
                <Text style={styles.emptySearchText}>Sonuç bulunamadı.</Text>
              </View>
            ) : (
              filteredData.map((item, index) => {
                const label = labelExtractor ? labelExtractor(item) : item;
                const key = keyExtractor ? keyExtractor(item, index) : item;
                const isSelected = value === (keyExtractor ? keyExtractor(item, index) : item);

                return (
                  <TouchableOpacity
                    key={key}
                    style={[styles.modalItem, isSelected && styles.modalItemSelected]}
                    onPress={() => {
                      onSelect(item);
                      onClose();
                    }}
                  >
                    <Text style={[styles.modalItemText, isSelected && styles.modalItemTextSelected]}>
                      {label}
                    </Text>
                    {isSelected && <Text style={styles.modalItemCheck}>✓</Text>}
                  </TouchableOpacity>
                );
              })
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

export default function ShareScreen({ editItemId, onShareSuccess, onCancel, userProfile }) {
  const insets = useSafeAreaInsets();

  // Categories API State
  const [categories, setCategories] = useState([]);
  const [subCategories, setSubCategories] = useState([]);
  const [loadingCats, setLoadingCats] = useState(true);

  // Form Fields State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [condition, setCondition] = useState('GOOD');
  const [deliveryType, setDeliveryType] = useState('PICKUP');
  const [selectedCity, setSelectedCity] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [subCategoryId, setSubCategoryId] = useState('');
  const [expiresAt, setExpiresAt] = useState(''); // DD.MM.YYYY format

  // Images state (Both strings for existing URLs and objects/local paths for new picks)
  const [imageItems, setImageItems] = useState([]); // Array of { id, uri, isUploaded, serverUrl }
  const [isUploadingImages, setIsUploadingImages] = useState(false);

  // Modal display states
  const [cityModalVisible, setCityModalVisible] = useState(false);
  const [districtModalVisible, setDistrictModalVisible] = useState(false);
  const [catModalVisible, setCatModalVisible] = useState(false);
  const [subCatModalVisible, setSubCatModalVisible] = useState(false);

  // API Submit State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingListingData, setLoadingListingData] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Fetch Categories from Backend
  const fetchCategories = async () => {
    try {
      const res = await apiClient.get('/categories');
      const data = res.data?.data ?? res.data ?? [];
      setCategories(data);
    } catch (err) {
      console.error('Kategoriler alınamadı:', err);
    } finally {
      setLoadingCats(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  // Sync Subcategories when categoryId changes
  useEffect(() => {
    if (!categoryId) {
      setSubCategories([]);
      return;
    }
    const cat = categories.find((c) => c.id === categoryId);
    setSubCategories(cat?.children ?? []);
  }, [categoryId, categories]);

  // Fetch Existing Item in Edit Mode
  useEffect(() => {
    if (!editItemId || categories.length === 0) return;

    const fetchItemDetails = async () => {
      setLoadingListingData(true);
      setErrorMessage('');
      try {
        const res = await apiClient.get(`/items/${editItemId}`);
        const item = res.data?.data;
        if (item) {
          setTitle(item.title);
          setDescription(item.description);
          setCondition(item.condition);
          setDeliveryType(item.deliveryType);

          // Category Hierarchy Mapping
          let mainCatId = item.categoryId;
          let subCatId = '';

          const isMain = categories.some((c) => c.id === item.categoryId);
          if (!isMain) {
            for (const mainCat of categories) {
              const foundSub = mainCat.children?.find((sub) => sub.id === item.categoryId);
              if (foundSub) {
                mainCatId = mainCat.id;
                subCatId = foundSub.id;
                break;
              }
            }
          }
          setCategoryId(mainCatId);
          setSubCategoryId(subCatId);

          // Address Mapping
          if (item.address) {
            const parts = item.address.split(',').map((p) => p.trim());
            if (parts.length >= 2) {
              setSelectedDistrict(parts[0]);
              setSelectedCity(parts[1]);
            } else if (parts.length === 1) {
              setSelectedCity(parts[0]);
            }
          }

          // Images Mapping
          if (item.images && item.images.length > 0) {
            const mappedImages = item.images.map((url, index) => ({
              id: `existing-${index}`,
              uri: url,
              isUploaded: true,
              serverUrl: url
            }));
            setImageItems(mappedImages);
          }

          // Expiry Date Mapping
          if (item.expiresAt) {
            const date = new Date(item.expiresAt);
            const dd = String(date.getDate()).padStart(2, '0');
            const mm = String(date.getMonth() + 1).padStart(2, '0');
            const yyyy = date.getFullYear();
            setExpiresAt(`${dd}.${mm}.${yyyy}`);
          }
        }
      } catch (err) {
        setErrorMessage('İlan bilgileri alınırken bir hata oluştu.');
        console.error('İlan çekilemedi:', err);
      } finally {
        setLoadingListingData(false);
      }
    };

    fetchItemDetails();
  }, [editItemId, categories]);

  // Is Selected Category "Food" (Gıda)?
  const selectedCat = categories.find((c) => c.id === categoryId);
  const selectedSubCat = subCategories.find((c) => c.id === subCategoryId);
  const isGida = (selectedCat?.slug === 'gida' || selectedSubCat?.slug === 'gida' || selectedCat?.name?.toLowerCase().includes('gıda'));

  // Image Picker Trigger
  const handlePickImages = async () => {
    if (imageItems.length >= 5) {
      Alert.alert('Limit Sınırı', 'En fazla 5 fotoğraf yükleyebilirsiniz.');
      return;
    }

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Galeri İzni', 'Fotoğraf yüklemek için galeri erişim izni vermelisiniz.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: 5 - imageItems.length,
      quality: 0.8
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const newAssets = result.assets;
      
      // Temporary state while uploading
      const tempItems = newAssets.map((asset, index) => ({
        id: `pick-${Date.now()}-${index}`,
        uri: asset.uri,
        isUploaded: false,
        serverUrl: null
      }));

      setImageItems((prev) => [...prev, ...tempItems].slice(0, 5));
      uploadSelectedFiles(tempItems);
    }
  };

  // Upload to API
  const uploadSelectedFiles = async (itemsToUpload) => {
    setIsUploadingImages(true);
    try {
      const formData = new FormData();
      itemsToUpload.forEach((item) => {
        const localUri = item.uri;
        const filename = localUri.split('/').pop() || 'image.jpg';
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : `image/jpeg`;

        formData.append('images', {
          uri: Platform.OS === 'ios' ? localUri.replace('file://', '') : localUri,
          name: filename,
          type
        });
      });

      const res = await apiClient.post('/upload/multiple', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      const serverUrls = res.data?.urls ?? res.data?.data?.urls ?? [];

      setImageItems((prev) => {
        let urlIndex = 0;
        return prev.map((item) => {
          const matchingToUpload = itemsToUpload.find((t) => t.id === item.id);
          if (matchingToUpload && urlIndex < serverUrls.length) {
            const url = serverUrls[urlIndex++];
            return { ...item, isUploaded: true, serverUrl: url };
          }
          return item;
        });
      });
    } catch (err) {
      console.error('Görseller yüklenemedi:', err);
      Alert.alert('Yükleme Hatası', 'Bazı görseller sunucuya yüklenirken hata oluştu.');
      // Remove failed uploads
      setImageItems((prev) => prev.filter((item) => !itemsToUpload.some((t) => t.id === item.id)));
    } finally {
      setIsUploadingImages(false);
    }
  };

  // Remove Image
  const handleRemoveImage = (idToRemove) => {
    setImageItems((prev) => prev.filter((img) => img.id !== idToRemove));
  };

  // Date mask formatting input handler (DD.MM.YYYY)
  const handleDateChange = (text) => {
    // Only numbers
    let cleaned = text.replace(/[^0-9]/g, '');
    
    // Auto insert dot
    let formatted = '';
    if (cleaned.length > 0) {
      formatted += cleaned.substring(0, 2);
    }
    if (cleaned.length > 2) {
      formatted += '.' + cleaned.substring(2, 4);
    }
    if (cleaned.length > 4) {
      formatted += '.' + cleaned.substring(4, 8);
    }

    setExpiresAt(formatted);
  };

  // Parse DD.MM.YYYY string to ISO string for backend
  const parseLocalDate = (dateStr) => {
    if (!dateStr) return null;
    const parts = dateStr.split('.');
    if (parts.length === 3) {
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const year = parseInt(parts[2], 10);
      if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
        return new Date(year, month, day).toISOString();
      }
    }
    return null;
  };

  // Submit Listing Handler
  const handleSubmit = async () => {
    setErrorMessage('');

    // Validations
    if (!title.trim()) return setErrorMessage('Lütfen ürün ismini doldurun.');
    if (!description.trim()) return setErrorMessage('Lütfen ürün açıklamasını doldurun.');
    if (!categoryId) return setErrorMessage('Lütfen bir kategori seçin.');
    if (!selectedCity || !selectedDistrict) return setErrorMessage('Lütfen konum (il/ilçe) seçin.');
    
    // Check if images are uploaded
    const finishedImages = imageItems.filter((img) => img.isUploaded && img.serverUrl);
    if (finishedImages.length === 0) {
      return setErrorMessage('Lütfen en az 1 görsel ekleyin ve yüklenmesini bekleyin.');
    }
    
    let formattedExpiry = null;
    if (isGida) {
      if (!expiresAt) {
        return setErrorMessage('Gıda ilanları için son kullanma tarihi zorunludur.');
      }
      formattedExpiry = parseLocalDate(expiresAt);
      if (!formattedExpiry) {
        return setErrorMessage('Lütfen geçerli bir son kullanma tarihi girin (GG.AA.YYYY).');
      }
    }

    setIsSubmitting(true);
    try {
      const finalImageUrls = finishedImages.map((img) => img.serverUrl);
      const effectiveCategoryId = subCategoryId || categoryId;
      
      const payload = {
        title: title.trim(),
        description: description.trim(),
        condition,
        deliveryType,
        address: `${selectedDistrict}, ${selectedCity}`,
        categoryId: effectiveCategoryId,
        images: finalImageUrls,
        latitude: 41.0082, // defaults
        longitude: 28.9784,
        ...(isGida && formattedExpiry ? { expiresAt: formattedExpiry } : {})
      };

      if (editItemId) {
        await apiClient.put(`/items/${editItemId}`, payload);
        Alert.alert('Başarılı', 'İlanınız başarıyla güncellendi! 🎉');
      } else {
        await apiClient.post('/items', payload);
        Alert.alert('Başarılı', 'İlanınız başarıyla paylaşıldı! 🎉');
      }

      onShareSuccess();
    } catch (err) {
      console.error('İlan gönderme hatası:', err);
      const msg = err.response?.data?.message || 'İlan kaydedilirken bir hata oluştu.';
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loadingListingData) {
    return (
      <SafeAreaView style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color="#E05D3A" />
        <Text style={styles.loadingText}>İlan verileri yükleniyor...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.cancelBtn} onPress={onCancel}>
          <Text style={styles.cancelBtnText}>İptal</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {editItemId ? 'İlanı Düzenle' : 'Bir Şey Paylaş'}
        </Text>
        <View style={{ width: 50 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {errorMessage ? (
          <View style={styles.errorAlert}>
            <Text style={styles.errorAlertText}>{errorMessage}</Text>
          </View>
        ) : null}

        <Text style={styles.sectionTitle}>Fotoğraflar (En fazla 5)</Text>
        <View style={styles.imageSelectorRow}>
          <TouchableOpacity
            style={styles.pickerBox}
            activeOpacity={0.8}
            onPress={handlePickImages}
            disabled={isUploadingImages || imageItems.length >= 5}
          >
            {isUploadingImages ? (
              <ActivityIndicator color="#E05D3A" size="small" />
            ) : (
              <View style={styles.center}>
                <Text style={styles.pickerBoxIcon}>📷</Text>
                <Text style={styles.pickerBoxText}>{imageItems.length}/5 Ekle</Text>
              </View>
            )}
          </TouchableOpacity>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.previewsScroll}>
            {imageItems.map((item) => (
              <View key={item.id} style={styles.previewContainer}>
                <Image source={{ uri: item.uri }} style={styles.previewImage} />
                {!item.isUploaded && (
                  <View style={styles.uploadingOverlay}>
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  </View>
                )}
                <TouchableOpacity
                  style={styles.removeBadge}
                  onPress={() => handleRemoveImage(item.id)}
                >
                  <Text style={styles.removeBadgeText}>✕</Text>
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
        </View>

        <View style={styles.formCard}>
          <Text style={styles.inputLabel}>İlan Başlığı *</Text>
          <TextInput
            style={styles.textInput}
            value={title}
            onChangeText={setTitle}
            placeholder="Ne paylaşıyorsunuz? (örn. Bebek Arabası, Roman Kitaplar)"
            placeholderTextColor="#A09890"
            maxLength={100}
          />
          <Text style={styles.charCounter}>{title.length}/100</Text>

          <Text style={styles.inputLabel}>Açıklama *</Text>
          <TextInput
            style={[styles.textInput, styles.textArea]}
            value={description}
            onChangeText={setDescription}
            placeholder="Ürün hakkında kısa bilgi verin. Durumu, boyutu, nereden teslim edilebileceği vb."
            placeholderTextColor="#A09890"
            multiline
            numberOfLines={4}
            maxLength={250}
          />
          <Text style={styles.charCounter}>{description.length}/250</Text>
        </View>

        <Text style={styles.sectionTitle}>Kategori Seçimi</Text>
        <View style={styles.pickerCard}>
          <TouchableOpacity
            style={styles.customSelectTrigger}
            onPress={() => setCatModalVisible(true)}
            activeOpacity={0.7}
          >
            <View>
              <Text style={styles.selectLabel}>Kategori *</Text>
              <Text style={styles.selectValue}>
                {categoryId
                  ? categories.find((c) => c.id === categoryId)?.name || 'Kategori'
                  : 'Kategori Seçin'}
              </Text>
            </View>
            <Text style={styles.chevronIcon}>▼</Text>
          </TouchableOpacity>

          {categoryId && subCategories.length > 0 ? (
            <TouchableOpacity
              style={[styles.customSelectTrigger, { marginTop: 12 }]}
              onPress={() => setSubCatModalVisible(true)}
              activeOpacity={0.7}
            >
              <View>
                <Text style={styles.selectLabel}>Alt Kategori</Text>
                <Text style={styles.selectValue}>
                  {subCategoryId
                    ? subCategories.find((c) => c.id === subCategoryId)?.name || 'Alt Kategori'
                    : 'Tüm Alt Kategoriler'}
                </Text>
              </View>
              <Text style={styles.chevronIcon}>▼</Text>
            </TouchableOpacity>
          ) : null}

          {isGida ? (
            <View style={styles.gidaDateContainer}>
              <Text style={styles.inputLabel}>Son Tüketim Tarihi *</Text>
              <TextInput
                style={styles.textInput}
                value={expiresAt}
                onChangeText={handleDateChange}
                placeholder="GG.AA.YYYY (örn: 28.08.2026)"
                placeholderTextColor="#A09890"
                keyboardType="numeric"
                maxLength={10}
              />
              <Text style={styles.gidaHelper}>Gıda ürünlerinin güvenliği için son tüketim tarihi girilmelidir.</Text>
            </View>
          ) : null}
        </View>

        <Text style={styles.sectionTitle}>Ürün Durumu *</Text>
        <View style={styles.selectionGrid}>
          {CONDITIONS.map((c) => {
            const isSelected = condition === c.value;
            return (
              <TouchableOpacity
                key={c.value}
                style={[styles.selectionChip, isSelected && styles.selectionChipActive]}
                activeOpacity={0.8}
                onPress={() => setCondition(c.value)}
              >
                <Text style={[styles.chipLabel, isSelected && styles.chipLabelActive]}>{c.label}</Text>
                <Text style={[styles.chipDesc, isSelected && styles.chipDescActive]}>{c.desc}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={styles.sectionTitle}>Teslimat Şekli *</Text>
        <View style={styles.selectionGrid}>
          {DELIVERY_TYPES.map((d) => {
            const isSelected = deliveryType === d.value;
            return (
              <TouchableOpacity
                key={d.value}
                style={[styles.selectionChip, isSelected && styles.selectionChipActive]}
                activeOpacity={0.8}
                onPress={() => setDeliveryType(d.value)}
              >
                <Text style={[styles.chipLabel, isSelected && styles.chipLabelActive]}>{d.label}</Text>
                <Text style={[styles.chipDesc, isSelected && styles.chipDescActive]}>{d.desc}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={styles.sectionTitle}>Konum Bilgisi</Text>
        <View style={styles.pickerCard}>
          <TouchableOpacity
            style={styles.customSelectTrigger}
            onPress={() => setCityModalVisible(true)}
            activeOpacity={0.7}
          >
            <View>
              <Text style={styles.selectLabel}>Şehir (İl) *</Text>
              <Text style={styles.selectValue}>{selectedCity || 'İl Seçin'}</Text>
            </View>
            <Text style={styles.chevronIcon}>▼</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.customSelectTrigger, { marginTop: 12 }, !selectedCity && { opacity: 0.5 }]}
            onPress={() => selectedCity && setDistrictModalVisible(true)}
            disabled={!selectedCity}
            activeOpacity={0.7}
          >
            <View>
              <Text style={styles.selectLabel}>İlçe *</Text>
              <Text style={styles.selectValue}>
                {selectedCity ? selectedDistrict || 'İlçe Seçin' : 'Önce İl Seçin'}
              </Text>
            </View>
            <Text style={styles.chevronIcon}>▼</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.submitButton, (isUploadingImages || isSubmitting) && styles.submitButtonDisabled]}
          activeOpacity={0.85}
          onPress={handleSubmit}
          disabled={isUploadingImages || isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <Text style={styles.submitButtonText}>
              {editItemId ? 'Değişiklikleri Kaydet ✓' : 'İlanı Yayınla ✨'}
            </Text>
          )}
        </TouchableOpacity>
        <View style={{ height: 40 }} />
      </ScrollView>

      <SearchablePickerModal
        visible={catModalVisible}
        onClose={() => setCatModalVisible(false)}
        title="Kategori Seçin"
        data={categories}
        value={categoryId}
        labelExtractor={(item) => `${item.icon} ${item.name}`}
        keyExtractor={(item) => item.id}
        onSelect={(item) => {
          setCategoryId(item.id);
          setSubCategoryId(''); // Reset subcategory on main change
        }}
      />

      <SearchablePickerModal
        visible={subCatModalVisible}
        onClose={() => setSubCatModalVisible(false)}
        title="Alt Kategori Seçin"
        data={subCategories}
        value={subCategoryId}
        labelExtractor={(item) => `${item.icon || '🔹'} ${item.name}`}
        keyExtractor={(item) => item.id}
        onSelect={(item) => setSubCategoryId(item.id)}
      />

      <SearchablePickerModal
        visible={cityModalVisible}
        onClose={() => setCityModalVisible(false)}
        title="Şehir Seçin"
        data={TURKEY_CITY_LIST}
        value={selectedCity}
        onSelect={(city) => {
          setSelectedCity(city);
          setSelectedDistrict(''); // reset district on city change
        }}
      />

      <SearchablePickerModal
        visible={districtModalVisible}
        onClose={() => setDistrictModalVisible(false)}
        title="İlçe Seçin"
        data={selectedCity ? TURKEY_CITIES[selectedCity] ?? [] : []}
        value={selectedDistrict}
        onSelect={(district) => setSelectedDistrict(district)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF8F5'
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center'
  },
  loadingText: {
    fontSize: 14,
    color: '#7C7267',
    marginTop: 10,
    fontWeight: '500'
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    height: 56,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1.5,
    borderColor: '#EFEAE4'
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#2C2520'
  },
  cancelBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12
  },
  cancelBtnText: {
    color: '#7C7267',
    fontSize: 15,
    fontWeight: '600'
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16
  },
  errorAlert: {
    backgroundColor: '#FDF2F0',
    borderColor: '#F8D7DA',
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    marginBottom: 16
  },
  errorAlertText: {
    color: '#C94A28',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center'
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#4A3E38',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: 22,
    marginBottom: 10
  },
  imageSelectorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#EFEAE4',
    borderRadius: 22,
    padding: 12
  },
  pickerBox: {
    width: 80,
    height: 80,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#E05D3A30',
    borderStyle: 'dashed',
    backgroundColor: '#FFF8F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12
  },
  pickerBoxIcon: {
    fontSize: 22,
    marginBottom: 2
  },
  pickerBoxText: {
    fontSize: 10,
    color: '#E05D3A',
    fontWeight: '700'
  },
  previewsScroll: {
    flex: 1
  },
  previewContainer: {
    width: 80,
    height: 80,
    borderRadius: 16,
    marginRight: 10,
    position: 'relative',
    borderWidth: 1,
    borderColor: '#EFEAE4',
    overflow: 'hidden'
  },
  previewImage: {
    width: '100%',
    height: '100%'
  },
  uploadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(44,37,32,0.4)',
    alignItems: 'center',
    justifyContent: 'center'
  },
  removeBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(239,68,68,0.9)',
    borderRadius: 10,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#FFFFFF'
  },
  removeBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800'
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: '#EFEAE4',
    padding: 16,
    marginTop: 10
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: '#4A3E38',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6
  },
  textInput: {
    backgroundColor: '#FAF8F5',
    borderWidth: 1.5,
    borderColor: '#EFEAE4',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: '#2C2520'
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top'
  },
  charCounter: {
    fontSize: 10,
    color: '#A09890',
    textAlign: 'right',
    marginTop: 4,
    marginBottom: 12,
    fontWeight: '500'
  },
  pickerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: '#EFEAE4',
    padding: 16
  },
  customSelectTrigger: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FAF8F5',
    borderWidth: 1.5,
    borderColor: '#EFEAE4',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10
  },
  selectLabel: {
    fontSize: 10,
    color: '#7C7267',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5
  },
  selectValue: {
    fontSize: 14,
    color: '#2C2520',
    fontWeight: '600',
    marginTop: 2
  },
  chevronIcon: {
    fontSize: 12,
    color: '#7C7267'
  },
  gidaDateContainer: {
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#EFEAE4',
    paddingTop: 16
  },
  gidaHelper: {
    fontSize: 10,
    color: '#7C7267',
    marginTop: 4,
    fontStyle: 'italic'
  },
  selectionGrid: {
    flexDirection: 'column',
    gap: 8
  },
  selectionChip: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#EFEAE4',
    borderRadius: 18,
    padding: 14
  },
  selectionChipActive: {
    borderColor: '#E05D3A',
    backgroundColor: '#FFF8F6'
  },
  chipLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2C2520'
  },
  chipLabelActive: {
    color: '#E05D3A'
  },
  chipDesc: {
    fontSize: 11,
    color: '#7C7267',
    marginTop: 2
  },
  chipDescActive: {
    color: '#E05D3A90'
  },
  submitButton: {
    backgroundColor: '#E05D3A',
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 30,
    shadowColor: '#E05D3A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 8
  },
  submitButtonDisabled: {
    opacity: 0.6,
    elevation: 0,
    shadowOpacity: 0
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.5
  },
  // Reusable Searchable Picker Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(44,37,32,0.6)',
    justifyContent: 'flex-end'
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '80%',
    minHeight: '40%'
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#EFEAE4'
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#2C2520'
  },
  closeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FAF8F5',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#EFEAE4'
  },
  closeBtnText: {
    fontSize: 11,
    color: '#7C7267',
    fontWeight: '800'
  },
  modalSearchContainer: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#FAF8F5',
    borderBottomWidth: 1,
    borderBottomColor: '#EFEAE4'
  },
  modalSearchInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EFEAE4',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: '#2C2520'
  },
  modalList: {
    paddingHorizontal: 20
  },
  modalItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#FAF8F5'
  },
  modalItemSelected: {
    borderBottomColor: '#FFF8F6'
  },
  modalItemText: {
    fontSize: 14,
    color: '#4A3E38',
    fontWeight: '500'
  },
  modalItemTextSelected: {
    color: '#E05D3A',
    fontWeight: '700'
  },
  modalItemCheck: {
    fontSize: 14,
    color: '#E05D3A',
    fontWeight: '800'
  },
  emptySearchContainer: {
    alignItems: 'center',
    paddingVertical: 30
  },
  emptySearchText: {
    color: '#7C7267',
    fontSize: 13,
    fontWeight: '500'
  }
});
