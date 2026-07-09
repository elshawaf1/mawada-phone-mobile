import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../services/supabase';

const AppContext = createContext(null);

const CART_KEY = '@mawada_cart';
const SAVED_KEY = '@mawada_saved';

export function AppProvider({ children }) {
  const [cart, setCart] = useState([]);
  const [savedForLater, setSavedForLater] = useState([]);
  const [coupon, setCoupon] = useState(null);
  const [favorites, setFavorites] = useState([]);
  const loadedRef = useRef(false);

  useEffect(() => {
    (async () => {
      try {
        const [cartRaw, savedRaw] = await AsyncStorage.multiGet([CART_KEY, SAVED_KEY]);
        if (cartRaw[1]) setCart(JSON.parse(cartRaw[1]));
        if (savedRaw[1]) setSavedForLater(JSON.parse(savedRaw[1]));
      } catch (e) {
        console.error('Failed to load cart from storage', e);
      } finally {
        loadedRef.current = true;
      }
    })();
  }, []);

  useEffect(() => {
    if (!loadedRef.current) return;
    AsyncStorage.setItem(CART_KEY, JSON.stringify(cart)).catch(() => {});
  }, [cart]);

  useEffect(() => {
    if (!loadedRef.current) return;
    AsyncStorage.setItem(SAVED_KEY, JSON.stringify(savedForLater)).catch(() => {});
  }, [savedForLater]);

  const addToCart = useCallback((product) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.id === product.id);
      if (existing) {
        return prev.map((i) =>
          i.id === product.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prev, { ...product, quantity: 1, selected: true }];
    });
  }, []);

  const removeFromCart = useCallback((id) => {
    setCart((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const updateCartQty = useCallback((id, dir) => {
    setCart((prev) =>
      prev.map((i) =>
        i.id === id ? { ...i, quantity: Math.min(99, Math.max(1, i.quantity + dir)) } : i
      )
    );
  }, []);

  const toggleCartSelect = useCallback((id) => {
    setCart((prev) =>
      prev.map((i) => (i.id === id ? { ...i, selected: !i.selected } : i))
    );
  }, []);

  const toggleAllCartSelect = useCallback(() => {
    setCart((prev) => {
      const allSelected = prev.every((i) => i.selected);
      return prev.map((i) => ({ ...i, selected: !allSelected }));
    });
  }, []);

  const clearCart = useCallback(() => setCart([]), []);

  const moveToSaved = useCallback((id) => {
    setCart((prev) => {
      const item = prev.find((i) => i.id === id);
      if (item) {
        setSavedForLater((saved) => [...saved, { ...item, selected: true }]);
      }
      return prev.filter((i) => i.id !== id);
    });
  }, []);

  const moveToCart = useCallback((id) => {
    setSavedForLater((prev) => {
      const item = prev.find((i) => i.id === id);
      if (item) {
        setCart((c) => [...c, { ...item, quantity: 1, selected: true }]);
      }
      return prev.filter((i) => i.id !== id);
    });
  }, []);

  const removeSaved = useCallback((id) => {
    setSavedForLater((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const applyCoupon = useCallback(async (code) => {
    if (!code || !code.trim()) return { success: false, error: 'Invalid coupon' };
    const { data } = await supabase
      .from('coupons')
      .select('*')
      .eq('code', code.toUpperCase())
      .eq('is_active', true)
      .single();
    if (!data) return { success: false, error: 'Invalid coupon' };
    if (data.expires_at && new Date(data.expires_at) < new Date()) return { success: false, error: 'Coupon expired' };
    if (data.max_uses && data.used_count >= data.max_uses) return { success: false, error: 'Coupon usage limit reached' };
    setCoupon({ code: code.toUpperCase(), discount: data.discount_percent || 0 });
    return { success: true };
  }, []);

  const removeCoupon = useCallback(() => setCoupon(null), []);

  const isInCart = useCallback(
    (id) => cart.some((i) => i.id === id),
    [cart]
  );

  const cartCount = cart.reduce((s, i) => s + i.quantity, 0);

  const fetchFavorites = useCallback(async (userId) => {
    if (!userId) { setFavorites([]); return; }
    try {
      const { data, error } = await supabase
        .from('wishlist_items')
        .select('*, products(*, product_images(*))')
        .eq('userId', userId);
      if (error) throw error;
      const mapped = (data || [])
        .filter((w) => w.products && w.products.isActive !== false)
        .map((w) => ({
          ...w.products,
          wishlistItemId: w.id,
          wishlistCreatedAt: w.createdAt,
        }));
      setFavorites(mapped);
    } catch (err) {
      console.error('fetchFavorites error:', err);
    }
  }, []);

  const toggleFavorite = useCallback(async (product, userId) => {
    if (!userId || !product?.id) return;
    const existing = favorites.find((f) => f.id === product.id);
    if (existing) {
      setFavorites((prev) => prev.filter((f) => f.id !== product.id));
      await supabase.from('wishlist_items').delete().eq('id', existing.wishlistItemId);
    } else {
      const tempId = 'temp_' + Date.now();
      setFavorites((prev) => [...prev, { ...product, wishlistItemId: tempId }]);
      const { data, error } = await supabase
        .from('wishlist_items')
        .insert({ userId, productId: product.id })
        .select()
        .single();
      if (!error && data) {
        setFavorites((prev) =>
          prev.map((f) => (f.wishlistItemId === tempId ? { ...f, wishlistItemId: data.id } : f))
        );
      }
    }
  }, [favorites]);

  const isFavorite = useCallback(
    (id) => favorites.some((f) => f.id === id),
    [favorites]
  );

  const favoritesCount = favorites.length;

  return (
    <AppContext.Provider
      value={{
        cart,
        cartCount,
        savedForLater,
        coupon,
        addToCart,
        removeFromCart,
        updateCartQty,
        toggleCartSelect,
        toggleAllCartSelect,
        clearCart,
        moveToSaved,
        moveToCart,
        removeSaved,
        applyCoupon,
        removeCoupon,
        isInCart,
        favorites,
        favoritesCount,
        fetchFavorites,
        toggleFavorite,
        isFavorite,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}
