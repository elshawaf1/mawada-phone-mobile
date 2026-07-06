import React, { useRef } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Image, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { COLORS, SHADOWS } from '../constants';
import { useTranslation } from '../context/AppSettingsContext';
import { useDirection } from '../hooks/useDirection';

function formatPrice(n) {
  return Number(n || 0).toLocaleString();
}

export default function ProductCardList({ item, onPress, onAddToCart, onRemoveFromCart, inCart, justAdded }) {
  const { t } = useTranslation();
  const dir = useDirection();
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const cartScale = useRef(new Animated.Value(1)).current;

  const images = item.product_images || [];
  const primaryImage = images.find(img => img.isPrimary)?.url || images[0]?.url;
  const isPriceRange = item.usePriceRange && item.minPrice != null && item.maxPrice != null;
  const price = isPriceRange ? null : (item.isOnSale && item.salePrice ? item.salePrice : item.basePrice);
  const oldPrice = !isPriceRange && item.isOnSale && item.salePrice ? item.basePrice : null;
  const discountPercent = oldPrice ? Math.round((1 - price / oldPrice) * 100) : 0;
  const brandName = item.brands?.nameAr || item.brands?.name || null;
  const hasRating = item.rating != null && item.rating > 0;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, { toValue: 0.98, useNativeDriver: true, friction: 8, tension: 200 }).start();
  };
  const handlePressOut = () => {
    Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, friction: 5, tension: 100 }).start();
  };
  const handleCartPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Animated.sequence([
      Animated.spring(cartScale, { toValue: 1.25, useNativeDriver: true, friction: 3 }),
      Animated.spring(cartScale, { toValue: 1, useNativeDriver: true, friction: 3 }),
    ]).start();
    if (inCart || justAdded) {
      onRemoveFromCart?.();
    } else {
      onAddToCart?.();
    }
  };

  const priceText = isPriceRange
    ? `${formatPrice(item.minPrice)} - ${formatPrice(item.maxPrice)} ${t('common.currency')}`
    : `${formatPrice(price)} ${t('common.currency')}`;

  return (
    <Animated.View style={[styles.row, { transform: [{ scale: scaleAnim }] }]}>
        <TouchableOpacity style={[styles.container, { flexDirection: dir.row }]} activeOpacity={1} onPress={onPress} onPressIn={handlePressIn} onPressOut={handlePressOut}>
        {/* Right: Image */}
        <View style={styles.imageZone}>
          {primaryImage ? (
            <Image source={{ uri: primaryImage }} style={styles.image} resizeMode="contain" />
          ) : (
            <Ionicons name="phone-portrait-outline" size={28} color={COLORS.gray300} />
          )}
          {discountPercent > 0 && (
            <View style={styles.ribbon}>
              <Text style={styles.ribbonText}>-{discountPercent}%</Text>
            </View>
          )}
          {onAddToCart && (
            <Animated.View style={[styles.cartWrap, { transform: [{ scale: cartScale }] }]}>
              <TouchableOpacity
                style={[styles.cartBtn, (inCart || justAdded) && styles.cartBtnDone]}
                onPress={handleCartPress}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                activeOpacity={1}
              >
                <Ionicons name={inCart || justAdded ? 'checkmark-circle' : 'add-circle-outline'} size={24} color={(inCart || justAdded) ? '#22C55E' : COLORS.gray600} />
              </TouchableOpacity>
            </Animated.View>
          )}
        </View>

        {/* Left: Info */}
        <View style={styles.info}>
          {brandName && (
            <Text style={[styles.brand, { textAlign: dir.textAlign }]} numberOfLines={1}>{brandName}</Text>
          )}

          <Text style={[styles.title, { textAlign: dir.textAlign }]} numberOfLines={5} ellipsizeMode="tail">{item.nameAr}</Text>

          {hasRating && (
            <View style={[styles.ratingRow, { flexDirection: dir.row }]}>
              <Ionicons name="star" size={11} color="#F59E0B" />
              <Text style={styles.ratingText}>{Number(item.rating).toFixed(1)}</Text>
              {item.reviewCount != null && (
                <Text style={styles.reviewCount}>({item.reviewCount})</Text>
              )}
            </View>
          )}

          <View style={[styles.priceRow, { flexDirection: dir.row }]}>
            {oldPrice && (
              <Text style={[styles.oldPrice, { textAlign: dir.textAlign }]}>{formatPrice(oldPrice)} {t('common.currency')}</Text>
            )}
            <Text style={[styles.price, { textAlign: dir.textAlign }]} numberOfLines={1}>{priceText}</Text>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: {
    marginBottom: 0,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },

  imageZone: {
    width: 110,
    height: 110,
    borderRadius: 12,
    backgroundColor: '#F7F7F7',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  image: {
    width: '90%',
    height: '90%',
  },
  ribbon: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    backgroundColor: '#E63946',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  ribbonText: {
    color: COLORS.white,
    fontSize: 9,
    fontWeight: '700',
  },

  info: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  brand: {
    fontSize: 10,
    fontWeight: '600',
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 2,
    textAlign: 'left',
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
    textAlign: 'left',
    lineHeight: 20,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 4,
  },
  ratingText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#F59E0B',
  },
  reviewCount: {
    fontSize: 10,
    color: '#94A3B8',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
  },
  price: {
    fontSize: 15,
    fontWeight: '800',
    color: '#E63946',
    textAlign: 'left',
  },
  oldPrice: {
    fontSize: 11,
    textDecorationLine: 'line-through',
    color: '#94A3B8',
    textAlign: 'left',
  },

  cartWrap: {
    position: 'absolute',
    top: 4,
    right: 4,
    zIndex: 5,
  },
  cartBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.92)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 0.5,
    borderColor: 'rgba(0,0,0,0.06)',
  },
  cartBtnDone: {
    backgroundColor: 'rgba(34,197,94,0.1)',
  },
});
