import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import type { Product, PurchaseType } from './types';

export interface CartItem {
  id: string;
  product: Product;
  quantity: number;
  customFieldValues: Record<string, string | number>;
  selectedServer?: number;
  purchaseType: PurchaseType;
  donationAmount?: number;
}

export type AddItemResult =
  | { ok: true; replaced: false }
  | { ok: true; replaced: true }
  | { ok: false; reason: 'subscription_in_cart' };

interface CartContextValue {
  items: CartItem[];
  itemCount: number;
  hasSubscription: boolean;
  addItem: (product: Product, customFieldValues: Record<string, string | number>, selectedServer?: number, purchaseType?: PurchaseType, quantity?: number, donationAmount?: number) => AddItemResult;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  updateCustomFields: (id: string, values: Record<string, string | number>) => void;
  clearCart: () => void;
  isOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

const STORAGE_KEY = 'ark-shop-cart';

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function loadCart(): CartItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function saveCart(items: CartItem[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch { /* ignore quota errors */ }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(loadCart);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    saveCart(items);
  }, [items]);

const addItem = useCallback((product: Product, customFieldValues: Record<string, string | number>, selectedServer?: number, purchaseType?: PurchaseType, quantity?: number, donationAmount?: number): AddItemResult => {
    const isSubscription = purchaseType === 'subscribe';
    const newItem: CartItem = {
      id: generateId(),
      product,
      quantity: quantity || 1,
      customFieldValues,
      selectedServer,
      purchaseType: purchaseType || 'addtocart',
      donationAmount,
    };

    let result: AddItemResult = { ok: true, replaced: false };

    setItems((prev) => {
      const cartHasSub = prev.some((i) => i.purchaseType === 'subscribe');
      const cartHasNonSub = prev.some((i) => i.purchaseType !== 'subscribe');

      if (isSubscription && cartHasNonSub && prev.length > 0) {
        result = { ok: true, replaced: true };
        return [newItem];
      }

      if (!isSubscription && cartHasSub) {
        result = { ok: false, reason: 'subscription_in_cart' };
        return prev;
      }

      if (isSubscription && cartHasSub) {
        result = { ok: true, replaced: true };
        return [newItem];
      }

      result = { ok: true, replaced: false };
      return [...prev, newItem];
    });

    if (result.ok) {
      setIsOpen(true);
    }
    return result;
  }, []);

  const removeItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const updateQuantity = useCallback((id: string, quantity: number) => {
    if (quantity < 1) return;
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, quantity } : item))
    );
  }, []);

  const updateCustomFields = useCallback((id: string, values: Record<string, string | number>) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, customFieldValues: values } : item))
    );
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
  }, []);

  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const hasSubscription = items.some((i) => i.purchaseType === 'subscribe');

  return (
    <CartContext.Provider
      value={{
        items,
        itemCount,
        hasSubscription,
        addItem,
        removeItem,
        updateQuantity,
        updateCustomFields,
        clearCart,
        isOpen,
        openCart: () => setIsOpen(true),
        closeCart: () => setIsOpen(false),
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}
