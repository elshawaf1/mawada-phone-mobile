import React, { useState, useEffect } from 'react';
import {
  View, FlatList, StyleSheet, TouchableOpacity, Text,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ScreenHeader from '../components/ScreenHeader';
import ProductCard from '../components/ProductCard';
import { useApp } from '../context/AppContext';
import { useTranslation } from '../context/AppSettingsContext';
import { COLORS, SPACING } from '../constants';

export default function RecentlyViewedScreen({ navigation }) {
  const { t } = useTranslation();
  const { addToCart, isInCart } = useApp();
  const [items, setItems] = useState([]);

  useEffect(() => {
    loadItems();
  }, []);

  const loadItems = async () => {
    try {
      const raw = await AsyncStorage.getItem('recentlyViewed');
      if (raw) {
        const parsed = JSON.parse(raw);
        parsed.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        const mapped = parsed.map((p) => ({
          id: p.productId,
          nameAr: p.nameAr,
          basePrice: Number(p.usePriceRange ? (p.minPrice || p.basePrice) : p.price),
          product_images: p.image ? [{ url: p.image, isPrimary: true }] : [],
        }));
        setItems(mapped);
      }
    } catch (e) {
      console.error('Error loading recently viewed:', e);
    }
  };

  const clearAll = async () => {
    try {
      await AsyncStorage.removeItem('recentlyViewed');
      setItems([]);
    } catch (e) {
      console.error('Error clearing recently viewed:', e);
    }
  };

  const handleAddToCart = (item) => {
    const price = Number(item.basePrice);
    const image = item.product_images?.[0]?.url;
    addToCart({
      id: item.id,
      productId: item.id,
      title: item.nameAr,
      price,
      image,
      variantId: null,
    });
  };

  return (
    <View style={styles.root}>
      <ScreenHeader
        title={t('recentlyViewed.title')}
        onBack={() => navigation.goBack()}
        rightAction={items.length > 0 ? (
          <TouchableOpacity onPress={clearAll}>
            <Ionicons name="trash-outline" size={20} color={COLORS.error} />
          </TouchableOpacity>
        ) : null}
        onRightPress={items.length > 0 ? clearAll : null}
      />

      {items.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="time-outline" size={64} color={COLORS.gray200} />
          <Text style={styles.emptyTitle}>{t('recentlyViewed.empty')}</Text>
          <Text style={styles.emptySubtitle}>{t('recentlyViewed.emptySub')}</Text>
        </View>
      ) : (
        <FlatList
          data={items}
          numColumns={2}
          columnWrapperStyle={styles.columnWrapper}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ProductCard
              item={item}
              onPress={() => navigation.navigate('Item', { productId: item.id })}
              onAddToCart={() => handleAddToCart(item)}
              inCart={isInCart(item.id)}
            />
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.white },
  listContent: { padding: SPACING.md, paddingBottom: 32 },
  columnWrapper: { justifyContent: 'space-between', marginBottom: SPACING.md },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32, gap: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text, textAlign: 'center' },
  emptySubtitle: { fontSize: 14, color: COLORS.textTertiary, textAlign: 'center', lineHeight: 20 },
});
