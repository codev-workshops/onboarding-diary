"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import {
  getUserPrefs,
  updateUserPrefs,
  clearUserPrefs,
  type UserPrefs,
  type AddressingMode,
} from "@/lib/cache/userPrefsCache";
import {
  getCategoriesWithStaleness,
  setCachedCategories,
  invalidateCategoriesCache,
} from "@/lib/cache/categoriesCache";
import type { Category } from "@/types";

interface RecentItem {
  productId: string;
  name: string;
  imageUrl: string;
  price: number;
  currency: "LKR" | "USD";
  viewedAt: string;
}

interface DeliveryInfo {
  recipientName: string;
  recipientPhone: string;
  recipientAddress: string;
  deliveryCity: string;
  lastUsed: string;
}

interface CacheContextType {
  // User preferences
  userPrefs: UserPrefs | null;
  isReturningUser: boolean;
  setAddressingMode: (mode: AddressingMode, name?: string) => void;
  setPreferredLanguage: (lang: "en" | "si" | "tanglish") => void;
  clearPrefs: () => void;

  // Categories
  categories: Category[] | null;
  categoriesNeedRefresh: boolean;
  updateCategories: (cats: Category[]) => void;
  clearCategories: () => void;

  // Recent items
  recentItems: RecentItem[];
  addRecentItem: (item: Omit<RecentItem, "viewedAt">) => void;

  // Delivery info
  deliveryInfo: DeliveryInfo | null;
  saveDeliveryInfo: (info: Omit<DeliveryInfo, "lastUsed">) => void;
}

const RECENT_ITEMS_KEY = "aura_recent_items";
const DELIVERY_INFO_KEY = "aura_delivery_info";
const MAX_RECENT_ITEMS = 20;
const RECENT_ITEMS_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days

const CacheContext = createContext<CacheContextType>({
  userPrefs: null,
  isReturningUser: false,
  setAddressingMode: () => {},
  setPreferredLanguage: () => {},
  clearPrefs: () => {},
  categories: null,
  categoriesNeedRefresh: true,
  updateCategories: () => {},
  clearCategories: () => {},
  recentItems: [],
  addRecentItem: () => {},
  deliveryInfo: null,
  saveDeliveryInfo: () => {},
});

function loadRecentItems(): RecentItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(RECENT_ITEMS_KEY);
    if (!raw) return [];
    const items: RecentItem[] = JSON.parse(raw);
    const cutoff = Date.now() - RECENT_ITEMS_TTL;
    return items.filter((item) => new Date(item.viewedAt).getTime() > cutoff);
  } catch {
    return [];
  }
}

function saveRecentItems(items: RecentItem[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(RECENT_ITEMS_KEY, JSON.stringify(items));
  } catch {
    // ignore
  }
}

function loadDeliveryInfo(): DeliveryInfo | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(DELIVERY_INFO_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function saveDeliveryInfoToStorage(info: DeliveryInfo): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(DELIVERY_INFO_KEY, JSON.stringify(info));
  } catch {
    // ignore
  }
}

export function CacheProvider({ children }: { children: ReactNode }) {
  const [userPrefs, setUserPrefsState] = useState<UserPrefs | null>(null);
  const [isReturningUser, setIsReturningUser] = useState(false);
  const [categories, setCategoriesState] = useState<Category[] | null>(null);
  const [categoriesNeedRefresh, setCategoriesNeedRefresh] = useState(true);
  const [recentItems, setRecentItems] = useState<RecentItem[]>([]);
  const [deliveryInfo, setDeliveryInfo] = useState<DeliveryInfo | null>(null);

  // Hydrate all caches from localStorage on mount
  useEffect(() => {
    const prefs = getUserPrefs();
    if (prefs) {
      setUserPrefsState(prefs);
      setIsReturningUser(true);
    }

    const { categories: cats, needsRefresh } = getCategoriesWithStaleness();
    if (cats) setCategoriesState(cats);
    setCategoriesNeedRefresh(needsRefresh);

    setRecentItems(loadRecentItems());
    setDeliveryInfo(loadDeliveryInfo());
  }, []);

  const setAddressingMode = useCallback(
    (mode: AddressingMode, name?: string) => {
      updateUserPrefs({ addressingMode: mode, name });
      const updated = getUserPrefs();
      setUserPrefsState(updated);
    },
    []
  );

  const setPreferredLanguage = useCallback(
    (lang: "en" | "si" | "tanglish") => {
      updateUserPrefs({ preferredLanguage: lang });
      const updated = getUserPrefs();
      setUserPrefsState(updated);
    },
    []
  );

  const clearPrefs = useCallback(() => {
    clearUserPrefs();
    setUserPrefsState(null);
    setIsReturningUser(false);
  }, []);

  const updateCategories = useCallback((cats: Category[]) => {
    setCachedCategories(cats);
    setCategoriesState(cats);
    setCategoriesNeedRefresh(false);
  }, []);

  const clearCategories = useCallback(() => {
    invalidateCategoriesCache();
    setCategoriesState(null);
    setCategoriesNeedRefresh(true);
  }, []);

  const addRecentItem = useCallback(
    (item: Omit<RecentItem, "viewedAt">) => {
      setRecentItems((prev) => {
        const filtered = prev.filter((r) => r.productId !== item.productId);
        const newItem: RecentItem = {
          ...item,
          viewedAt: new Date().toISOString(),
        };
        const updated = [newItem, ...filtered].slice(0, MAX_RECENT_ITEMS);
        saveRecentItems(updated);
        return updated;
      });
    },
    []
  );

  const saveDeliveryInfoCb = useCallback(
    (info: Omit<DeliveryInfo, "lastUsed">) => {
      const full: DeliveryInfo = {
        ...info,
        lastUsed: new Date().toISOString(),
      };
      saveDeliveryInfoToStorage(full);
      setDeliveryInfo(full);
    },
    []
  );

  return (
    <CacheContext.Provider
      value={{
        userPrefs,
        isReturningUser,
        setAddressingMode,
        setPreferredLanguage,
        clearPrefs,
        categories,
        categoriesNeedRefresh,
        updateCategories,
        clearCategories,
        recentItems,
        addRecentItem,
        deliveryInfo,
        saveDeliveryInfo: saveDeliveryInfoCb,
      }}
    >
      {children}
    </CacheContext.Provider>
  );
}

export function useCache() {
  return useContext(CacheContext);
}
