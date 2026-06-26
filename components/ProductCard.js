import React, { useRef } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Image, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, RADIUS, FONT_SIZES, FONT_WEIGHTS, SCREEN, SHADOWS } from '../constants';
import { useTranslation } from '../context/AppSettingsContext';

const CARD_W = (SCREEN.width - 24) / 2;
const INFO_H = 105;

function formatPrice(n) {
  return Number(n || 0).toLocaleString();
}

export function ProductCardHorizontal({ item, onPress, onAddToCart, inCart, justAdded }) {
  const { t } = useTranslation();
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const cartScale = useRef(new Animated.Value(1)).current;

  const images = item.product_images || [];
  const primaryImage = images.find(img => img.isPrimary)?.url || images[0]?.url;
  const isPriceRange = item.usePriceRange && item.minPrice != null && item.maxPrice != null;
  const price = isPriceRange ? null : (item.isOnSale && item.salePrice ? item.salePrice : item.basePrice);
  const oldPrice = !isPriceRange && item.isOnSale && item.salePrice ? item.basePrice : null;
  const discountPercent = oldPrice ? Math.round((1 - price / oldPrice) * 100) : 0;
  const brandName = item.brands?.nameAr || item.brands?.name || null;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, { toValue: 0.97, useNativeDriver: true, friction: 8, tension: 200 }).start();
  };
  const handlePressOut = () => {
    Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, friction: 5, tension: 100 }).start();
  };
  const handleCartPress = () => {
    Animated.sequence([
      Animated.spring(cartScale, { toValue: 1.25, useNativeDriver: true, friction: 3 }),
      Animated.spring(cartScale, { toValue: 1, useNativeDriver: true, friction: 3 }),
    ]).start();
    onAddToCart?.();
  };

  const priceText = isPriceRange
    ? `${formatPrice(item.minPrice)} - ${formatPrice(item.maxPrice)} ${t('common.currency')}`
    : `${formatPrice(price)} ${t('common.currency')}`;

  return (
    <Animated.View style={[styles.hOuter, { transform: [{ scale: scaleAnim }] }]}>
      <TouchableOpacity style={styles.hCard} activeOpacity={1} onPress={onPress} onPressIn={handlePressIn} onPressOut={handlePressOut}>
        <View style={styles.hImageZone}>
          {primaryImage ? (
            <Image source={{ uri: primaryImage }} style={styles.hImage} resizeMode="contain" />
          ) : (
            <Ionicons name="phone-portrait-outline" size={32} color={COLORS.gray300} />
          )}
          {discountPercent > 0 && (
            <View style={styles.hRibbon}>
              <Text style={styles.hRibbonText}>-{discountPercent}%</Text>
            </View>
          )}
          {onAddToCart && (
            <Animated.View style={[styles.hCartWrap, { transform: [{ scale: cartScale }] }]}>
              <TouchableOpacity
                style={[styles.hCartBtn, (inCart || justAdded) && styles.hCartBtnDone]}
                onPress={handleCartPress}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                activeOpacity={1}
              >
                <Ionicons name={inCart || justAdded ? 'checkmark' : 'cart-outline'} size={14} color={(inCart || justAdded) ? '#FFF' : COLORS.gray600} />
              </TouchableOpacity>
            </Animated.View>
          )}
        </View>
        <View style={styles.hInfo}>
          {brandName && (
            <Text style={styles.hBrand} numberOfLines={1}>{brandName}</Text>
          )}
          <Text style={styles.hTitle} numberOfLines={3} ellipsizeMode="tail">{item.nameAr}</Text>
          <View style={styles.hPriceRow}>
            <Text style={styles.hPrice} numberOfLines={1} ellipsizeMode="tail">{priceText}</Text>
            {oldPrice && (
              <Text style={styles.hOldPrice}>{formatPrice(oldPrice)} {t('common.currency')}</Text>
            )}
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function ProductCard({
  item,
  onPress,
  onAddToCart,
  inCart,
  justAdded,
  wide = false,
  isFavorite,
  onToggleFavorite,
}) {
  const { t } = useTranslation();
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const heartScale = useRef(new Animated.Value(1)).current;
  const cartScale = useRef(new Animated.Value(1)).current;

  const images = item.product_images || [];
  const primaryImage = images.find(img => img.isPrimary)?.url || images[0]?.url;
  const isNew = item.createdAt && Date.now() - new Date(item.createdAt).getTime() < 7 * 24 * 60 * 60 * 1000;
  const isPriceRange = item.usePriceRange && item.minPrice != null && item.maxPrice != null;
  const price = isPriceRange ? null : (item.isOnSale && item.salePrice ? item.salePrice : item.basePrice);
  const oldPrice = !isPriceRange && item.isOnSale && item.salePrice ? item.basePrice : null;
  const hasRating = item.rating != null && item.rating > 0;
  const brandName = item.brands?.nameAr || item.brands?.name || null;
  const hasSoldCount = item.soldCount != null && item.soldCount > 0;
  const discountPercent = oldPrice ? Math.round((1 - price / oldPrice) * 100) : 0;
  const lowStock = item.totalStock != null && item.totalStock > 0 && item.totalStock <= 3;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, { toValue: 0.97, useNativeDriver: true, friction: 8, tension: 200 }).start();
  };
  const handlePressOut = () => {
    Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, friction: 5, tension: 100 }).start();
  };
  const handleHeartPress = (e) => {
    e.stopPropagation?.();
    Animated.sequence([
      Animated.spring(heartScale, { toValue: 1.35, useNativeDriver: true, friction: 3 }),
      Animated.spring(heartScale, { toValue: 1, useNativeDriver: true, friction: 3 }),
    ]).start();
    onToggleFavorite?.();
  };
  const handleCartPress = () => {
    Animated.sequence([
      Animated.spring(cartScale, { toValue: 1.25, useNativeDriver: true, friction: 3 }),
      Animated.spring(cartScale, { toValue: 1, useNativeDriver: true, friction: 3 }),
    ]).start();
    onAddToCart?.();
  };

  const priceText = isPriceRange
    ? `${formatPrice(item.minPrice)} - ${formatPrice(item.maxPrice)} ${t('common.currency')}`
    : `${formatPrice(price)} ${t('common.currency')}`;

  return (
    <Animated.View style={[styles.cardOuter, { transform: [{ scale: scaleAnim }] }]}>
      <TouchableOpacity
        style={styles.card}
        activeOpacity={1}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
      >
        <View style={styles.imageZone}>
          {primaryImage ? (
            <Image source={{ uri: primaryImage }} style={styles.image} resizeMode="contain" />
          ) : (
            <Ionicons name="phone-portrait-outline" size={40} color={COLORS.gray300} />
          )}

          {onToggleFavorite && (
            <Animated.View style={[styles.heartBtn, { transform: [{ scale: heartScale }] }]}>
              <TouchableOpacity onPress={handleHeartPress} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} activeOpacity={1}>
                <Ionicons name={isFavorite ? 'heart' : 'heart-outline'} size={15} color={isFavorite ? '#E63946' : COLORS.gray500} />
              </TouchableOpacity>
            </Animated.View>
          )}

          {discountPercent > 0 && (
            <View style={styles.ribbon}>
              <Text style={styles.ribbonText}>-{discountPercent}%</Text>
            </View>
          )}

          {isNew && !discountPercent && (
            <View style={styles.badgeNew}>
              <View style={styles.badgeNewDot} />
              <Text style={styles.badgeNewText}>{t('item.new')}</Text>
            </View>
          )}

          {lowStock && (
            <View style={styles.stockBadge}>
              <Text style={styles.stockBadgeText}>{t('item.remainingStock', { count: item.totalStock })}</Text>
            </View>
          )}

          {onAddToCart && (
            <Animated.View style={[styles.cartBtnWrap, { transform: [{ scale: cartScale }] }]}>
              <TouchableOpacity
                style={[styles.cartBtn, (inCart || justAdded) && styles.cartBtnDone]}
                onPress={handleCartPress}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                activeOpacity={1}
              >
                <Ionicons name={inCart || justAdded ? 'checkmark' : 'cart-outline'} size={17} color={(inCart || justAdded) ? '#FFF' : COLORS.gray600} />
              </TouchableOpacity>
            </Animated.View>
          )}
        </View>

        <View style={styles.info}>
          {brandName && (
            <Text style={styles.brandName} numberOfLines={1} ellipsizeMode="tail">{brandName}</Text>
          )}

          <Text style={styles.title} numberOfLines={3} ellipsizeMode="tail">{item.nameAr}</Text>

          <View style={styles.metaRow}>
            {hasRating && (
              <View style={styles.ratingRow}>
                <Ionicons name="star" size={11} color="#F59E0B" />
                <Text style={styles.ratingText}>{Number(item.rating).toFixed(1)}</Text>
                {item.reviewCount != null && (
                  <Text style={styles.reviewCount}>({item.reviewCount})</Text>
                )}
              </View>
            )}
            {hasSoldCount && (
              <Text style={styles.soldText}>{item.soldCount} {t('item.sold')}</Text>
            )}
          </View>

          <View style={styles.priceArea}>
            {oldPrice && (
              <Text style={styles.oldPrice}>{formatPrice(oldPrice)} {t('common.currency')}</Text>
            )}
            <Text style={styles.price} numberOfLines={1} ellipsizeMode="tail">{priceText}</Text>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  cardOuter: {
    width: CARD_W,
    marginBottom: 10,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 0.5,
    borderColor: '#E8ECF1',
    ...SHADOWS.md,
  },

  imageZone: {
    height: CARD_W,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F7F8FA',
    position: 'relative',
  },
  image: {
    width: '78%',
    height: '78%',
  },

  heartBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 0.5,
    borderColor: 'rgba(0,0,0,0.05)',
    ...SHADOWS.sm,
  },

  ribbon: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#E63946',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  ribbonText: {
    color: COLORS.white,
    fontSize: 10,
    fontWeight: '700',
  },

  badgeNew: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: 'rgba(34,197,94,0.12)',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 4,
  },
  badgeNewDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#22C55E',
  },
  badgeNewText: {
    color: '#15803D',
    fontSize: 9,
    fontWeight: '700',
  },

  stockBadge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  stockBadgeText: {
    color: COLORS.white,
    fontSize: 9,
    fontWeight: '600',
  },

  cartBtnWrap: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  cartBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 0.5,
    borderColor: 'rgba(0,0,0,0.05)',
    ...SHADOWS.sm,
  },
  cartBtnDone: {
    backgroundColor: '#22C55E',
    borderColor: '#22C55E',
  },

  info: {
    height: INFO_H,
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 10,
    justifyContent: 'flex-start',
  },

  brandName: {
    fontSize: 10,
    fontWeight: '600',
    color: '#94A3B8',
    textAlign: 'right',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 2,
  },

  title: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1E293B',
    textAlign: 'right',
    lineHeight: 18,
  },

  metaRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  ratingRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 2,
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
  soldText: {
    fontSize: 10,
    color: '#94A3B8',
  },

  priceArea: {
    marginTop: 'auto',
    alignItems: 'flex-end',
  },
  price: {
    fontSize: 16,
    fontWeight: '800',
    color: '#E63946',
    textAlign: 'right',
  },
  oldPrice: {
    fontSize: 11,
    textDecorationLine: 'line-through',
    color: '#94A3B8',
    textAlign: 'right',
    marginBottom: 1,
  },

  hOuter: {
    marginLeft: 10,
  },
  hCard: {
    width: 155,
    height: 250,
    backgroundColor: COLORS.white,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 0.5,
    borderColor: '#E8ECF1',
    ...SHADOWS.md,
  },
  hImageZone: {
    height: 155,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F7F8FA',
    position: 'relative',
  },
  hImage: {
    width: '72%',
    height: '72%',
  },
  hRibbon: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: '#E63946',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 5,
  },
  hRibbonText: {
    color: COLORS.white,
    fontSize: 9,
    fontWeight: '700',
  },
  hCartWrap: {
    position: 'absolute',
    top: 6,
    right: 6,
  },
  hCartBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 0.5,
    borderColor: 'rgba(0,0,0,0.05)',
    ...SHADOWS.sm,
  },
  hCartBtnDone: {
    backgroundColor: '#22C55E',
    borderColor: '#22C55E',
  },
  hInfo: {
    flex: 1,
    paddingHorizontal: 10,
    paddingTop: 8,
    paddingBottom: 8,
  },
  hBrand: {
    fontSize: 9,
    fontWeight: '600',
    color: '#94A3B8',
    textAlign: 'right',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 1,
  },
  hTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1E293B',
    textAlign: 'right',
    lineHeight: 16,
  },
  hPriceRow: {
    marginTop: 'auto',
    alignItems: 'flex-end',
  },
  hPrice: {
    fontSize: 14,
    fontWeight: '800',
    color: '#E63946',
    textAlign: 'right',
  },
  hOldPrice: {
    fontSize: 10,
    textDecorationLine: 'line-through',
    color: '#94A3B8',
    textAlign: 'right',
  },
});
