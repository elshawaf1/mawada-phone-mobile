import React, { useState, useEffect } from 'react';
import * as Haptics from 'expo-haptics';
import {
  StyleSheet, View, FlatList, RefreshControl,
} from 'react-native';
import ScreenHeader from '../components/ScreenHeader';
import EmptyState from '../components/EmptyState';
import ProductCard from '../components/ProductCard';
import { COLORS } from '../constants';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from '../context/AppSettingsContext';
import { localizedName } from '../utils/helpers';

export default function WishlistScreen({ navigation }) {
  const { addToCart, removeFromCart, isInCart, favorites, fetchFavorites, toggleFavorite } = useApp();
  const { user } = useAuth();
  const { t, locale } = useTranslation();
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
        id: product.id, productId: product.id, title: localizedName(product, locale),
        price: product.usePriceRange ? (product.minPrice || product.basePrice) : (product.isOnSale && product.salePrice ? product.salePrice : product.basePrice),
        image: product.product_images?.find(img => img.isPrimary)?.url || product.product_images?.[0]?.url || null, variantId: null,
      });
    }
  };

  if (!favorites || favorites.length === 0) {
    return (
      <View style={styles.root}>
        <ScreenHeader title={t('wishlist.title')} onBack={() => navigation.goBack()} />
        <EmptyState
          icon="heart-outline"
          title={t('wishlist.empty') || 'No favorites yet'}
          subtitle={t('wishlist.emptySub') || 'Tap the heart icon on any product to save it here'}
        />
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
            onToggleFavorite={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); toggleFavorite(item, user?.id); }}
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
});
