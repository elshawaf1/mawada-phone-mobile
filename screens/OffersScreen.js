import React, { useState, useEffect } from 'react';
import {
  StyleSheet, View, Text, FlatList, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ScreenHeader from '../components/ScreenHeader';
import ProductCard from '../components/ProductCard';
import { COLORS, SPACING } from '../constants';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from '../context/AppSettingsContext';
import { supabase } from '../services/supabase';

export default function OffersScreen({ navigation }) {
  const { addToCart, removeFromCart, isInCart, isFavorite, toggleFavorite } = useApp();
  const { user } = useAuth();
  const { t } = useTranslation();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async (isRefresh = false) => {
    try {
      if (!isRefresh) setLoading(true);
      const { data, error } = await supabase
        .from('products')
        .select('*, product_images(id, url, "isPrimary")')
        .eq('isActive', true)
        .eq('isOnSale', true)
        .order('createdAt', { ascending: false });
      if (error) throw error;
      setProducts(data || []);
    } catch (err) {
      console.error('Error fetching offers:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchProducts(true);
  };

  const handleAddToCart = (product) => {
    if (isInCart(product.id)) {
      removeFromCart(product.id);
    } else {
      addToCart({
        id: product.id, productId: product.id, title: product.nameAr,
        price: product.usePriceRange ? (product.minPrice || product.basePrice) : (product.isOnSale && product.salePrice ? product.salePrice : product.basePrice),
        image: product.product_images?.find(img => img.isPrimary)?.url || product.product_images?.[0]?.url || null, variantId: null,
      });
    }
  };

  if (!loading && products.length === 0) {
    return (
      <View style={styles.root}>
        <ScreenHeader title={t('offers.title')} onBack={() => navigation.goBack()} />
        <View style={styles.emptyContainer}>
          <Ionicons name="pricetag-outline" size={64} color={COLORS.gray200} />
          <Text style={styles.emptyTitle}>{t('offers.empty')}</Text>
          <Text style={styles.emptySubtitle}>{t('offers.emptySub')}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <ScreenHeader title={t('offers.title')} onBack={() => navigation.goBack()} />
      {loading ? (
        <View style={styles.centered}>
          <Text style={{ color: COLORS.textSecondary }}>{t('common.loading')}</Text>
        </View>
      ) : (
        <FlatList
          data={products}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={styles.columnWrapper}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} tintColor={COLORS.primary} />
          }
          renderItem={({ item }) => (
            <ProductCard
              item={item}
              onPress={() => navigation.navigate('Item', { productId: item.id })}
              onAddToCart={() => handleAddToCart(item)}
              inCart={isInCart(item.id)}
              isFavorite={isFavorite(item.id)}
              onToggleFavorite={() => toggleFavorite(item, user?.id)}
            />
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.white },
  listContent: { padding: SPACING.xl, paddingBottom: 100 },
  columnWrapper: { justifyContent: 'space-between', marginBottom: 12 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32, gap: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text, textAlign: 'center' },
  emptySubtitle: { fontSize: 14, color: COLORS.textTertiary, textAlign: 'center', lineHeight: 20 },
});
