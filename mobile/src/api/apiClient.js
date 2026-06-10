import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { API_URL } from '../../config';

const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000, // 10 saniye zaman aşımı
});

// İstek interceptor'ı: SecureStore'dan token'ı okuyup Authorization header'ına ekler
apiClient.interceptors.request.use(
  async (config) => {
    try {
      const token = await SecureStore.getItemAsync('thrifty_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.error('Token okuma hatası:', error);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Yanıt interceptor'ı: 401 hatası durumunda token'ı temizler
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    if (error.response && error.response.status === 401) {
      try {
        await SecureStore.deleteItemAsync('thrifty_token');
      } catch (err) {
        console.error('Token silme hatası:', err);
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;
