// mobile/config.js
import { Platform } from 'react-native';

// Bilgisayarınızın yerel Wi-Fi IP adresi:
const LOCAL_IP = '10.51.214.16';

// Emülatörler ve fiziksel cihazların ortak erişimi için:
const DEV_HOST = Platform.select({
  android: LOCAL_IP,
  ios: LOCAL_IP,
  default: LOCAL_IP
});

export const API_URL = `http://${DEV_HOST}:5000/api`;

export default {
  API_URL,
};
