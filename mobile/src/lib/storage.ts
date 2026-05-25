import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const TOKEN_KEY = "clearance_mobile_token";
const DASHBOARD_CACHE_KEY = "clearance_mobile_dashboard_cache";

function getWebStorage() {
  if (typeof window === "undefined") {
    return null;
  }
  return window.localStorage;
}

export const storage = {
  async getToken() {
    if (Platform.OS === "web") {
      return getWebStorage()?.getItem(TOKEN_KEY) ?? null;
    }

    try {
      return await SecureStore.getItemAsync(TOKEN_KEY);
    } catch {
      return null;
    }
  },
  async setToken(token: string) {
    if (Platform.OS === "web") {
      getWebStorage()?.setItem(TOKEN_KEY, token);
      return;
    }

    await SecureStore.setItemAsync(TOKEN_KEY, token);
  },
  async clearToken() {
    if (Platform.OS === "web") {
      getWebStorage()?.removeItem(TOKEN_KEY);
      return;
    }

    await SecureStore.deleteItemAsync(TOKEN_KEY);
  },
  async getDashboardCache<T>() {
    if (Platform.OS === "web") {
      const raw = getWebStorage()?.getItem(DASHBOARD_CACHE_KEY);
      return raw ? (JSON.parse(raw) as T) : null;
    }

    try {
      const raw = await SecureStore.getItemAsync(DASHBOARD_CACHE_KEY);
      return raw ? (JSON.parse(raw) as T) : null;
    } catch {
      return null;
    }
  },
  async setDashboardCache<T>(value: T) {
    const serialized = JSON.stringify(value);
    if (Platform.OS === "web") {
      getWebStorage()?.setItem(DASHBOARD_CACHE_KEY, serialized);
      return;
    }

    await SecureStore.setItemAsync(DASHBOARD_CACHE_KEY, serialized);
  },
  async clearDashboardCache() {
    if (Platform.OS === "web") {
      getWebStorage()?.removeItem(DASHBOARD_CACHE_KEY);
      return;
    }

    await SecureStore.deleteItemAsync(DASHBOARD_CACHE_KEY);
  }
};
