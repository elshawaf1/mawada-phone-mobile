import { supabase } from './supabase';

export const db = {
  async getProducts() {
    const { data, error } = await supabase
      .from('products')
      .select('*, categories(*), product_images(*), product_variants(*)')
      .eq('isActive', true);
    if (error) throw new Error(error.message);
    return data;
  },

  async getProduct(id) {
    const { data, error } = await supabase
      .from('products')
      .select('*, categories(*), product_images(*), product_variants(*), specifications(*)')
      .eq('id', id)
      .single();
    if (error) throw new Error(error.message);
    return data;
  },

  async getCategories() {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('isActive', true)
      .order('sortOrder');
    if (error) throw new Error(error.message);
    return data;
  },

  async getBrands() {
    const { data, error } = await supabase
      .from('brands')
      .select('*')
      .eq('isActive', true)
      .order('sortOrder');
    if (error) throw new Error(error.message);
    return data;
  },

  async getProductsByCategory(categoryId) {
    const { data, error } = await supabase
      .from('products')
      .select('*, product_images(*), product_variants(*)')
      .eq('isActive', true)
      .eq('categoryId', categoryId)
      .order('createdAt', { ascending: false });
    if (error) throw new Error(error.message);
    return data;
  },

  async getBanners() {
    const { data, error } = await supabase
      .from('banners')
      .select('*')
      .eq('isActive', true)
      .order('sortOrder');
    if (error) throw new Error(error.message);
    return data;
  },

  async getBranches() {
    const { data, error } = await supabase
      .from('branches')
      .select('*')
      .eq('isActive', true);
    if (error) throw new Error(error.message);
    return data;
  },

  async getCart(userId) {
    const { data, error } = await supabase
      .from('cart_items')
      .select('*, products(*), product_variants(*)')
      .eq('userId', userId);
    if (error) throw new Error(error.message);
    return data;
  },

  async addToCart(userId, productId, variantId = null, quantity = 1) {
    const { data, error } = await supabase
      .from('cart_items')
      .upsert({ userId, productId, variantId, quantity }, { onConflict: 'userId,productId,variantId' })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  },

  async updateCartItem(id, quantity) {
    const { data, error } = await supabase
      .from('cart_items')
      .update({ quantity })
      .eq('id', id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  },

  async removeFromCart(id) {
    const { error } = await supabase.from('cart_items').delete().eq('id', id);
    if (error) throw new Error(error.message);
  },

  async clearCart(userId) {
    const { error } = await supabase.from('cart_items').delete().eq('userId', userId);
    if (error) throw new Error(error.message);
  },

  async getOrders(userId) {
    const { data, error } = await supabase
      .from('orders')
      .select('*, order_items(*, products(*, product_images(*)), product_variants(*))')
      .eq('userId', userId)
      .order('createdAt', { ascending: false });
    if (error) throw new Error(error.message);
    return data;
  },

  async getMyOrdersWithItems(userId) {
    return this.getOrders(userId);
  },

  async getOrder(id, userId) {
    let query = supabase
      .from('orders')
      .select('*, order_items(*, products(*, product_images(*)), product_variants(*)), addresses(*)')
      .eq('id', id);
    if (userId) query = query.eq('userId', userId);
    const { data, error } = await query.single();
    if (error) throw new Error(error.message);
    return data;
  },

  async deleteOrder(id, userId) {
    let query = supabase.from('orders').delete().eq('id', id);
    if (userId) query = query.eq('userId', userId);
    const { error } = await query;
    if (error) throw new Error(error.message);
    return true;
  },

  async createOrder(orderData) {
    const { data, error } = await supabase
      .from('orders')
      .insert(orderData)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  },

  async getNotifications(userId) {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('userId', userId)
      .order('createdAt', { ascending: false });
    if (error) throw new Error(error.message);
    return data;
  },

  async markNotificationRead(id) {
    const { error } = await supabase
      .from('notifications')
      .update({ isRead: true })
      .eq('id', id);
    if (error) throw new Error(error.message);
  },

  async markAllNotificationsRead(userId) {
    const { error } = await supabase
      .from('notifications')
      .update({ isRead: true })
      .eq('userId', userId)
      .eq('isRead', false);
    if (error) throw new Error(error.message);
  },

  async savePushToken({ userId, token, platform }) {
    if (!userId || !token) return;
    const { error } = await supabase
      .from('push_tokens')
      .upsert(
        { userId, token, platform, lastSeenAt: new Date().toISOString() },
        { onConflict: 'userId,token' },
      );
    if (error) throw new Error(error.message);
  },

  async deletePushToken({ userId, token }) {
    if (!userId || !token) return;
    const { error } = await supabase
      .from('push_tokens')
      .delete()
      .eq('userId', userId)
      .eq('token', token);
    if (error) throw new Error(error.message);
  },

  async getAddresses(userId) {
    const { data, error } = await supabase.rpc('get_addresses', { p_user_id: userId });
    if (error) throw new Error(error.message);
    return data;
  },

  async createAddress(addressData) {
    const { data, error } = await supabase.rpc('create_address', {
      p_user_id: addressData.userId,
      p_label: addressData.label,
      p_city: addressData.city,
      p_street: addressData.street,
      p_region: addressData.region || null,
      p_phone: addressData.phone || null,
      p_is_default: addressData.isDefault || false,
    }).single();
    if (error) throw new Error(error.message);
    return data;
  },

  async updateAddress(id, addressData) {
    const { data, error } = await supabase.rpc('update_address', {
      p_id: id,
      p_user_id: addressData.userId,
      p_label: addressData.label,
      p_city: addressData.city,
      p_street: addressData.street,
      p_region: addressData.region || null,
      p_phone: addressData.phone || null,
      p_is_default: addressData.isDefault || false,
    }).single();
    if (error) throw new Error(error.message);
    return data;
  },

  async deleteAddress(id, userId) {
    const { data, error } = await supabase.rpc('delete_address', {
      p_id: id,
      p_user_id: userId,
    });
    if (error) throw new Error(error.message);
  },

  async searchProducts(query) {
    const sanitized = query.replace(/[%_]/g, '');
    const { data, error } = await supabase
      .from('products')
      .select('*, product_images(*), categories(*), brands(*)')
      .eq('isActive', true)
      .or(`nameAr.ilike.%${sanitized}%,name.ilike.%${sanitized}%,descriptionAr.ilike.%${sanitized}%`)
      .limit(50);
    if (error) throw new Error(error.message);
    return data;
  },

  async getBundleByProduct(productId) {
    const { data, error } = await supabase
      .from('product_bundles')
      .select('*')
      .eq('main_product_id', productId)
      .eq('is_active', true)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) return null;

    const addonIds = data.addon_product_ids || [];
    let addonProducts = [];
    if (addonIds.length > 0) {
      const { data: addons } = await supabase
        .from('products')
        .select('*, product_images(*)')
        .in('id', addonIds)
        .eq('isActive', true);
      addonProducts = addons || [];
    }

    const { data: mainProduct } = await supabase
      .from('products')
      .select('*, product_images(*)')
      .eq('id', data.main_product_id)
      .single();

    return { ...data, main_product: mainProduct, addon_products: addonProducts };
  },

  async getActiveBundles() {
    const { data, error } = await supabase
      .from('product_bundles')
      .select('*')
      .eq('is_active', true)
      .order('sort_order');
    if (error) throw new Error(error.message);
    if (!data || data.length === 0) return [];

    const enriched = await Promise.all(
      data.map(async (bundle) => {
        const addonIds = bundle.addon_product_ids || [];
        const [mainRes, addonsRes] = await Promise.all([
          supabase.from('products').select('*, product_images(*)').eq('id', bundle.main_product_id).single(),
          addonIds.length > 0
            ? supabase.from('products').select('*, product_images(*)').in('id', addonIds).eq('isActive', true)
            : { data: [] },
        ]);
        return {
          ...bundle,
          main_product: mainRes.data,
          addon_products: addonsRes.data || [],
        };
      })
    );
    return enriched;
  },

  async getRelatedProducts(productId, limit = 6) {
    if (!productId) return [];
    try {
      const { data: curated, error } = await supabase
        .from('product_related')
        .select('relatedProductId, products!product_related_relatedProductId_fkey(*, product_images(*), brands(name, nameAr))')
        .eq('productId', productId)
        .order('sortOrder');

      if (error) throw error;
      if (!curated || curated.length === 0) return [];

      return curated
        .map(r => r.products)
        .filter(p => p && p.isActive !== false && p.id !== productId)
        .slice(0, limit);
    } catch (e) {
      console.error('getRelatedProducts error:', e);
      return [];
    }
  },
};

export const authAPI = {
  register: async (name, email, phone, password) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name, phone } },
    });
    if (error) throw new Error(error.message);
    return data;
  },

  login: async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);
    return data;
  },

  logout: async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw new Error(error.message);
  },

  getCurrentUser: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');
    return user;
  },

  resetPassword: async (email) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) throw new Error(error.message);
  },
};
