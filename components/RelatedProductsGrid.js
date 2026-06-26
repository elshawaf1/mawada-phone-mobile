import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import ProductCardList from './ProductCardList';
import ProductMatchLabel from './ProductMatchLabel';
import { useTranslation } from '../context/AppSettingsContext';
import { SPACING } from '../constants';

export default function RelatedProductsGrid({
  products,
  title,
  label,
  onProductPress,
  onAddToCart,
  onRemoveFromCart,
  inCartMap,
  addedMap,
}) {
  const { t } = useTranslation();
  const displayTitle = title || t('home.youMayAlsoLike');

  if (!products || products.length === 0) return null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{displayTitle}</Text>
      </View>

      {label && <ProductMatchLabel text={label} />}

      <View style={styles.list}>
        {products.map((item) => (
          <ProductCardList
            key={item.id}
            item={item}
            onPress={() => onProductPress?.(item)}
            onAddToCart={() => onAddToCart?.(item)}
            onRemoveFromCart={() => onRemoveFromCart?.(item)}
            inCart={inCartMap?.[item.id]}
            justAdded={addedMap?.[item.id]}
          />
        ))}
      </View>
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
  list: {
    marginTop: 8,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
});
