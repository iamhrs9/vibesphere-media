import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

export const AUTH_STORAGE_KEYS = {
  token: 'staffToken',
  profile: 'staffProfile',
};

const BASE_URL = 'https://vibespheremedia.in/api/';

const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

apiClient.interceptors.request.use(
  async (config) => {
    try {
      const token = await SecureStore.getItemAsync(AUTH_STORAGE_KEYS.token);
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.error('Error fetching token from SecureStore', error);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export async function storeStaffSession(token, staff) {
  const operations = [];

  if (token) {
    operations.push(SecureStore.setItemAsync(AUTH_STORAGE_KEYS.token, token));
  }

  if (staff) {
    operations.push(
      SecureStore.setItemAsync(AUTH_STORAGE_KEYS.profile, JSON.stringify(staff))
    );
  }

  await Promise.all(operations);
}

export async function getStoredToken() {
  return SecureStore.getItemAsync(AUTH_STORAGE_KEYS.token);
}

export async function getStoredProfile() {
  const rawProfile = await SecureStore.getItemAsync(AUTH_STORAGE_KEYS.profile);

  if (!rawProfile) {
    return null;
  }

  try {
    return JSON.parse(rawProfile);
  } catch (error) {
    console.warn('Failed to parse stored staff profile.', error);
    await SecureStore.deleteItemAsync(AUTH_STORAGE_KEYS.profile);
    return null;
  }
}

export async function updateStoredProfile(staff) {
  if (!staff) {
    await SecureStore.deleteItemAsync(AUTH_STORAGE_KEYS.profile);
    return;
  }

  await SecureStore.setItemAsync(AUTH_STORAGE_KEYS.profile, JSON.stringify(staff));
}

export async function clearStaffSession() {
  await Promise.all([
    SecureStore.deleteItemAsync(AUTH_STORAGE_KEYS.token),
    SecureStore.deleteItemAsync(AUTH_STORAGE_KEYS.profile),
  ]);
}

export default apiClient;
