import React, { useState, useEffect } from 'react';
import {
  StyleSheet, View, FlatList, RefreshControl, Text,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ScreenHeader from '../components/ScreenHeader';
import ProductCard from '../components/ProductCard';
import { COLORS } from '../constants';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from '../context/AppSettingsContext';

export default function WishlistScreen({ navigation }) {
  const { addToCart, removeFromCart, isInCart, favorites, fetchFavorites, toggleFavorite } = useApp();
  const { user } = useAuth();
  const { t } = useTranslation();
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (user?.id) fetchFavorites(user.id);
  }, [user?.id]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchFavorites(user?.id);
    setRefreshing(false);
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

  if (!favorites || favorites.length === 0) {
    return (
      <View style={styles.root}>
        <ScreenHeader title={t('wishlist.title')} onBack={() => navigation.goBack()} />
        <View style={styles.emptyContainer}>
          <Ionicons name="heart-outline" size={64} color={COLORS.gray200} />
          <Text style={styles.emptyTitle}>{t('wishlist.empty')}</Text>
          <Text style={styles.emptySubtitle}>{t('wishlist.emptySub')}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <ScreenHeader title={t('wishlist.title')} onBack={() => navigation.goBack()} />
      <FlatList
        data={favorites}
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
            isFavorite={true}
            onToggleFavorite={() => toggleFavorite(item, user?.id)}
          />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.white },
  listContent: { padding: 16, paddingBottom: 100 },
  columnWrapper: { gap: 10, marginBottom: 12 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32, gap: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text, textAlign: 'center' },
  emptySubtitle: { fontSize: 14, color: COLORS.textTertiary, textAlign: 'center', lineHeight: 20 },
});
