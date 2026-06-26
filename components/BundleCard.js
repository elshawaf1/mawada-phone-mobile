import React, { useRef } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Image, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { COLORS, RADIUS, SHADOWS } from '../constants';
import { useTranslation } from '../context/AppSettingsContext';

function formatPrice(n) {
  return Number(n || 0).toLocaleString();
}

function getEffectivePrice(item) {
  if (item.custom_price != null) return item.custom_price;
  const p = item.product;
  if (!p) return 0;
  return p.isOnSale && p.salePrice ? p.salePrice : p.basePrice || 0;
}

function getDisplayName(item) {
  if (item.custom_name) return item.custom_name;
  return item.product?.nameAr || item.product?.name || '';
}

function getProductImage(item) {
  const images = item.product?.product_images;
  if (!images || images.length === 0) return null;
  const primary = images.find(img => img.isPrimary);
  return primary?.url || images[0]?.url || null;
}

export default function BundleCard({ bundle, onAddBundle }) {
  const { t } = useTranslation();
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const btnScale = useRef(new Animated.Value(1)).current;

  const bundleItems = bundle.bundle_items || [];
  const mainItem = bundleItems.find(i => i.role === 'main');
  const addonItems = bundleItems.filter(i => i.role === 'addon');
  const allItems = bundleItems;

  const originalTotal = allItems.reduce((sum, item) => {
    const p = item.product;
    if (!p) return sum;
    return sum + (p.isOnSale && p.salePrice ? p.salePrice : p.basePrice || 0);
  }, 0);

  const bundleTotal = allItems.reduce((sum, item) => sum + getEffectivePrice(item), 0);
  const savings = Math.round(originalTotal - bundleTotal);

  const handlePressIn = () => {
    Animated.spring(scaleAnim, { toValue: 0.97, useNativeDriver: true, friction: 8, tension: 200 }).start();
  };
  const handlePressOut = () => {
    Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, friction: 5, tension: 100 }).start();
  };
  const handleBtnPress = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Animated.sequence([
      Animated.spring(btnScale, { toValue: 0.92, useNativeDriver: true, friction: 4 }),
      Animated.spring(btnScale, { toValue: 1, useNativeDriver: true, friction: 4 }),
    ]).start();
    onAddBundle?.();
  };

  if (allItems.length === 0) return null;

  return (
    <Animated.View style={[styles.card, { transform: [{ scale: scaleAnim }] }]}>
      <View style={styles.gradientBg}>

        {savings > 0 && (
          <View style={styles.savingsBadge}>
            <Ionicons name="flash" size={12} color="#0F172A" />
            <Text style={styles.savingsText}>{t('home.bundleYouSave', { amount: formatPrice(savings) })}</Text>
          </View>
        )}

        {bundle.description_ar ? (
          <Text style={styles.bundleDesc}>{bundle.description_ar}</Text>
        ) : (
          <Text style={styles.bundleDesc}>{t('home.offerMawdaDesc')}</Text>
        )}

        <View style={styles.productsFrame}>
          {allItems.map((item, index) => {
            const img = getProductImage(item);
            const name = getDisplayName(item);
            const price = getEffectivePrice(item);
            const origPrice = item.product?.isOnSale && item.product?.salePrice
              ? item.product.salePrice
              : item.product?.basePrice || 0;
            const hasDiscount = item.custom_price != null && item.custom_price < origPrice;

            return (
              <View key={item.id || index} style={[
                styles.productRow,
                index < allItems.length - 1 && styles.productRowBorder,
              ]}>
                <View style={styles.productImageWrap}>
                  {img ? (
                    <Image source={{ uri: img }} style={styles.productImage} resizeMode="contain" />
                  ) : (
                    <View style={styles.imagePlaceholder}>
                      <Ionicons name="phone-portrait-outline" size={20} color="rgba(255,255,255,0.3)" />
                    </View>
                  )}
                </View>

                <View style={styles.productInfo}>
                  <Text style={styles.productName} numberOfLines={5}>{name}</Text>
                  <View style={styles.priceRow}>
                    {hasDiscount && (
                      <Text style={styles.originalItemPrice}>{formatPrice(origPrice)} {t('common.currency')}</Text>
                    )}
                    <Text style={styles.itemPrice}>{formatPrice(price)} {t('common.currency')}</Text>
                  </View>
                </View>
              </View>
            );
          })}
        </View>

        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>{t('common.total')}</Text>
          <View style={styles.totalPrices}>
            {savings > 0 && (
              <Text style={styles.originalTotal}>{formatPrice(originalTotal)} {t('common.currency')}</Text>
            )}
            <Text style={styles.bundleTotal}>{formatPrice(bundleTotal)} {t('common.currency')}</Text>
          </View>
        </View>

        <Animated.View style={{ transform: [{ scale: btnScale }] }}>
          <TouchableOpacity
            style={styles.ctaButton}
            activeOpacity={0.8}
            onPress={handleBtnPress}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
          >
            <Ionicons name="cart-outline" size={18} color="#0F172A" />
            <Text style={styles.ctaText}>{t('home.addToCartBtn')}</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: RADIUS.xxl || 24,
    overflow: 'hidden',
    marginBottom: 16,
  },
  gradientBg: {
    backgroundColor: '#0F172A',
    borderRadius: RADIUS.xxl || 24,
    padding: 10,
    position: 'relative',
    overflow: 'hidden',
  },
  glowOrb1: {
    position: 'absolute',
    top: -50,
    right: -50,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(212,175,55,0.08)',
  },
  glowOrb2: {
    position: 'absolute',
    bottom: -30,
    left: -30,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(59,130,246,0.06)',
  },
  savingsBadge: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    alignSelf: 'flex-end',
    backgroundColor: '#D4AF37',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    marginBottom: 12,
    gap: 4,
  },
  savingsText: {
    color: '#0F172A',
    fontSize: 12,
    fontWeight: '800',
  },
  bundleDesc: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 13,
    textAlign: 'right',
    marginBottom: 14,
    lineHeight: 18,
  },
  productsFrame: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
    marginBottom: 12,
  },
  productRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    padding: 12,
    gap: 12,
  },
  productRowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  productImageWrap: {
    position: 'relative',
  },
  productImage: {
    width: 64,
    height: 64,
    borderRadius: 12,
  },
  imagePlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.06)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mainBadge: {
    position: 'absolute',
    bottom: -4,
    left: -4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#D4AF37',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mainBadgeText: {
    color: '#0F172A',
    fontSize: 10,
    fontWeight: '900',
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
    textAlign: 'right',
  },
  priceRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
  },
  originalItemPrice: {
    color: 'rgba(255,255,255,0.35)',
    fontSize: 12,
    textDecorationLine: 'line-through',
  },
  itemPrice: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 13,
    fontWeight: '700',
  },
  totalRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingTop: 4,
  },
  totalLabel: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 14,
    fontWeight: '600',
  },
  totalPrices: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
  },
  originalTotal: {
    color: 'rgba(255,255,255,0.35)',
    fontSize: 14,
    textDecorationLine: 'line-through',
  },
  bundleTotal: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '900',
  },
  ctaButton: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    paddingVertical: 14,
    gap: 8,
    ...SHADOWS.md,
  },
  ctaText: {
    color: '#0F172A',
    fontSize: 15,
    fontWeight: '800',
  },
});
