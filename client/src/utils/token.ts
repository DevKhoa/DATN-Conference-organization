import { TokenType } from "@/features/auth/types";

/**
 * TokenManager handles token storage and retrieval
 * Automatically uses localStorage or sessionStorage based on persist preference
 */
const PERSIST_KEY =
  import.meta.env.VITE_PERSISTENCE_KEY || "app-persistence-key";

const getPersistPreference = (): boolean => {
  const persistItem = localStorage.getItem(PERSIST_KEY);
  return persistItem ? (JSON.parse(persistItem) as boolean) : false;
};

const getStorageType = (): "localStorage" | "sessionStorage" => {
  return getPersistPreference() ? "localStorage" : "sessionStorage";
};

export const TokenManager = {
  /**
   * Get access token from appropriate storage
   */
  getAccessToken: (): string | null => {
    const storage =
      getStorageType() === "localStorage" ? localStorage : sessionStorage;
    const item = storage.getItem(TokenType.ACCESS);
    return item ? (JSON.parse(item) as string) : null;
  },

  /**
   * Get refresh token from appropriate storage
   */
  getRefreshToken: (): string | null => {
    const storage =
      getStorageType() === "localStorage" ? localStorage : sessionStorage;
    const item = storage.getItem(TokenType.REFRESH);
    return item ? (JSON.parse(item) as string) : null;
  },

  /**
   * Set access token in appropriate storage
   */
  setAccessToken: (token: string | null): void => {
    const storage =
      getStorageType() === "localStorage" ? localStorage : sessionStorage;
    if (token === null) {
      storage.removeItem(TokenType.ACCESS);
    } else {
      storage.setItem(TokenType.ACCESS, JSON.stringify(token));
    }
  },

  /**
   * Set refresh token in appropriate storage
   */
  setRefreshToken: (token: string | null): void => {
    const storage =
      getStorageType() === "localStorage" ? localStorage : sessionStorage;
    if (token === null) {
      storage.removeItem(TokenType.REFRESH);
    } else {
      storage.setItem(TokenType.REFRESH, JSON.stringify(token));
    }
  },

  /**
   * Clear both tokens
   */
  clearTokens: (): void => {
    const localStorage_ = localStorage;
    const sessionStorage_ = sessionStorage;

    localStorage_.removeItem(TokenType.ACCESS);
    localStorage_.removeItem(TokenType.REFRESH);
    sessionStorage_.removeItem(TokenType.ACCESS);
    sessionStorage_.removeItem(TokenType.REFRESH);
  },

  /**
   * Get persist preference
   */
  getPersist: (): boolean => {
    return getPersistPreference();
  },
};
