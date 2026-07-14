import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, TouchableOpacity, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../services/supabase';
import { useTranslation } from '../context/AppSettingsContext';
import { useDirection } from '../hooks/useDirection';
import { useApp } from '../context/AppContext';
import ProductCard from '../components/ProductCard';
import ScreenHeader from '../components/ScreenHeader';
import { COLORS, SPACING } from '../constants';
import { localizedName } from '../utils/helpers';

export default function SectionProductsScreen({ navigation, route }) {
  const { sectionId, sectionName } = route.params || {};
  const insets = useSafeAreaInsets();
  const { t, locale } = useTranslation();
  const dir = useDirection();
  const { addToCart, isInCart } = useApp();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [addedMap, setAddedMap] = useState({});

  const fetchProducts = async (isRefresh = false) => {
    try {
      if (!isRefresh) setLoading(true);
      const { data, error } = await supabase
        .from('products')
        .select('*, product_images(id, url, "isPrimary", "sortOrder"), brands(name, "nameAr")')
        .eq('isActive', true)
        .eq('homeSection', sectionId)
        .order('homeOrder', { ascending: true, nullsFirst: false });
      if (error) throw error;
      setProducts(data || []);
    } catch (e) {
      console.error('Error fetching section products:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchProducts(); }, [sectionId]);

  const onRefresh = () => { setRefreshing(true); fetchProducts(true); };

  const handleAddToCart = (product) => {
    if (isInCart(product.id)) {
      addToCart({ ...product, _remove: true });
    } else {
      const price = product.usePriceRange ? (product.minPrice || product.basePrice) : (product.isOnSale && product.salePrice ? product.salePrice : product.basePrice);
      addToCart({
        id: product.id, productId: product.id,
        title: localizedName(product, locale),
        price,
        image: product.product_images?.find(i => i.isPrimary)?.url || product.product_images?.[0]?.url || null,
        variantId: null,
      });
      setAddedMap(prev => ({ ...prev, [product.id]: true }));
      setTimeout(() => setAddedMap(prev => ({ ...prev, [product.id]: false })), 1200);
    }
  };

  return (
    <View style={styles.container}>
      <ScreenHeader title={sectionName || t('home.products')} navigation={navigation} />
      {loading ? (
        <ActivityIndicator size="large" color={COLORS.primary} style={{ flex: 1 }} />
      ) : products.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>{t('search.noResults')}</Text>
        </View>
      ) : (
        <FlatList
          data={products}
          numColumns={2}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: SPACING.md, paddingBottom: 100 + insets.bottom }}
          columnWrapperStyle={{ gap: SPACING.sm }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          renderItem={({ item }) => (
            <ProductCard
              item={item}
              onPress={() => navigation.navigate('Item', { productId: item.id })}
              onAddToCart={() => handleAddToCart(item)}
              inCart={isInCart(item.id)}
              justAdded={addedMap[item.id]}
            />
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { fontSize: 16, color: COLORS.textSecondary },
});
