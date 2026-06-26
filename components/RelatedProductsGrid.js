import React from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity } from 'react-native';
import ProductCard from './ProductCard';
import ProductMatchLabel from './ProductMatchLabel';
import { useTranslation } from '../context/AppSettingsContext';
import { useDirection } from '../hooks/useDirection';
import { SPACING } from '../constants';

export default function RelatedProductsGrid({
  products,
  title,
  label,
  onProductPress,
  onAddToCart,
  inCartMap,
  addedMap,
  isFavoriteMap,
  onToggleFavorite,
  horizontal = false,
}) {
  const { t } = useTranslation();
  const dir = useDirection();
  const displayTitle = title || t('home.youMayAlsoLike');

  if (!products || products.length === 0) return null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{displayTitle}</Text>
      </View>

      {label && <ProductMatchLabel text={label} />}

      {horizontal || products.length < 5 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          style={styles.scrollView}
        >
          {products.map((item) => (
            <View key={item.id} style={styles.scrollItem}>
              <ProductCard
                item={item}
                onPress={() => onProductPress?.(item)}
                onAddToCart={() => onAddToCart?.(item)}
                inCart={inCartMap?.[item.id]}
                justAdded={addedMap?.[item.id]}
                isFavorite={isFavoriteMap?.[item.id]}
                onToggleFavorite={() => onToggleFavorite?.(item)}
              />
            </View>
          ))}
        </ScrollView>
      ) : (
        <View style={styles.grid}>
          {products.map((item) => (
            <View key={item.id} style={styles.gridItem}>
              <ProductCard
                item={item}
                onPress={() => onProductPress?.(item)}
                onAddToCart={() => onAddToCart?.(item)}
                inCart={inCartMap?.[item.id]}
                justAdded={addedMap?.[item.id]}
                isFavorite={isFavoriteMap?.[item.id]}
                onToggleFavorite={() => onToggleFavorite?.(item)}
              />
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
  },
  header: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    marginBottom: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  scrollView: {
    marginLeft: -SPACING.md,
  },
  scrollContent: {
    paddingHorizontal: SPACING.md,
    gap: 10,
  },
  scrollItem: {
    marginLeft: 10,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
  },
  gridItem: {
    marginBottom: 10,
  },
});
