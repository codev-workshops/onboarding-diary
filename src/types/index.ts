export interface Product {
  id: string;
  name: string;
  price: number;
  currency: "LKR" | "USD";
  imageUrl: string;
  images?: string[];
  description?: string;
  category?: string;
  inStock: boolean;
  stockLevel?: "high" | "medium" | "low";
  rating?: number;
  variants?: ProductVariant[];
  shipping?: ShippingInfo;
}

export interface ProductVariant {
  id: string;
  name: string;
  value: string;
  priceModifier?: number;
}

export interface ShippingInfo {
  deliverable: boolean;
  estimatedDays?: number;
  rate?: number;
}

export interface Category {
  id: string;
  name: string;
  url?: string;
  icon?: string;
}

export interface DeliveryCity {
  id: string;
  name: string;
  aliases?: string[];
}

export interface DeliveryCheck {
  available: boolean;
  estimatedDate?: string;
  rate?: number;
  currency?: string;
}

export interface OrderResult {
  orderId: string;
  orderRef?: string;
  payUrl: string;
  checkoutUrl?: string;
  total: number;
  currency: string;
  items: { productId: string; name: string; quantity: number; price: number }[];
  summary?: {
    items_total: number;
    delivery_fee: number;
    addons_total: number;
    grand_total: number;
    currency: string;
  };
  expiresAt: string;
  trackingNumber?: string;
}

export interface DeliveryResult {
  city: string;
  available: boolean;
  deliveryDate: string;
  rate: number;
  currency: string;
  perishableWarning?: string;
}

export interface City {
  name: string;
  aliases?: string[];
}

export interface OrderTracking {
  orderId: string;
  status: string;
  steps: OrderStep[];
  estimatedDelivery?: string;
}

export interface OrderStep {
  title: string;
  description?: string;
  timestamp?: string;
  completed: boolean;
  current?: boolean;
}

export interface CartItem {
  productId: string;
  name: string;
  price: number;
  currency: "LKR" | "USD";
  quantity: number;
  imageUrl: string;
  variant?: string;
}

export interface CartState {
  items: CartItem[];
  deliveryCity: string | null;
  giftMessage: string | null;
}

export type CartAction =
  | { type: "ADD_ITEM"; payload: CartItem }
  | { type: "REMOVE_ITEM"; payload: { productId: string } }
  | { type: "UPDATE_QUANTITY"; payload: { productId: string; quantity: number } }
  | { type: "SET_DELIVERY_CITY"; payload: string }
  | { type: "SET_GIFT_MESSAGE"; payload: string | null }
  | { type: "CLEAR_CART" };

export type AvatarState =
  | "idle"
  | "thinking"
  | "excited"
  | "celebrating"
  | "empathetic";

export type Language = "en" | "si" | "tanglish";
export type Theme = "light" | "dark";

export type IntentType =
  | "everyday_shopping"
  | "gift_sending"
  | "order_tracking"
  | "browsing"
  | "restocking";

export interface Recommendation {
  primaryProducts: {
    productId: string;
    name: string;
    price: number;
    currency: "LKR" | "USD";
    reason: string;
  }[];
  crossSellSuggestions: {
    productId: string;
    name: string;
    price: number;
    currency: "LKR" | "USD";
    relatedTo: string;
    pitch: string;
  }[];
  budgetSummary?: {
    userBudget: number | null;
    totalSuggested: number;
    remaining: number | null;
  };
}
