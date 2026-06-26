import React, { useRef } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Image, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { COLORS, RADIUS, SHADOWS } from '../constants';
import { useDirection } from '../hooks/useDirection';
import { useTranslation } from '../context/AppSettingsContext';

function formatPrice(n) {
  return Number(n || 0).toLocaleString();
}

export default function BundleCard({ bundle, onAddBundle }) {
  const { t } = useTranslation();
  const dir = useDirection();
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const btnScale = useRef(new Animated.Value(1)).current;

  const mainProduct = bundle.main_product;
  const addons = bundle.addon_products || [];
  const discount = bundle.discount_percent || 0;

  const mainImage = mainProduct?.product_images?.find(img => img.isPrimary)?.url
    || mainProduct?.product_images?.[0]?.url;

  const mainPrice = mainProduct?.isOnSale && mainProduct?.salePrice
    ? mainProduct.salePrice
    : mainProduct?.basePrice || 0;

  const bundlePrice = Math.round(mainPrice * (1 - discount / 100));

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

  if (!mainProduct) return null;

  return (
    <Animated.View style={[styles.card, { transform: [{ scale: scaleAnim }] }]}>
      <View style={styles.gradientBg}>
        <View style={styles.glowOrb} />

        {discount > 0 && (
          <View style={styles.savingsBadge}>
            <Text style={styles.savingsText}>{t('home.bundleSavings', { percent: discount })}</Text>
          </View>
        )}

        <View style={styles.contentRow}>
          <View style={styles.mainProductArea}>
            {mainImage ? (
              <Image source={{ uri: mainImage }} style={styles.mainImage} resizeMode="contain" />
            ) : (
              <View style={styles.imagePlaceholder}>
                <Ionicons name="phone-portrait-outline" size={36} color="rgba(255,255,255,0.3)" />
              </View>
            )}
            <Text style={styles.mainProductName} numberOfLines={1}>
              {mainProduct.nameAr}
            </Text>
          </View>

          {addons.length > 0 && (
            <View style={styles.addonArea}>
              <View style={styles.plusIcon}>
                <Text style={styles.plusText}>+</Text>
              </View>
              <View style={styles.addonThumbs}>
                {addons.slice(0, 2).map((addon) => {
                  const img = addon.product_images?.find(i => i.isPrimary)?.url
                    || addon.product_images?.[0]?.url;
                  return (
                    <View key={addon.id} style={styles.addonThumb}>
                      {img ? (
                        <Image source={{ uri: img }} style={styles.addonImage} resizeMode="contain" />
                      ) : (
                        <Ionicons name="phone-portrait-outline" size={16} color="rgba(255,255,255,0.4)" />
                      )}
                    </View>
                  );
                })}
              </View>
            </View>
          )}
        </View>

        {bundle.name_ar && (
          <Text style={styles.bundleTitle} numberOfLines={1}>{bundle.name_ar}</Text>
        )}

        <View style={styles.priceRow}>
          <Text style={styles.originalPrice}>{formatPrice(mainPrice)} {t('common.currency')}</Text>
          <Ionicons name="arrow-back" size={14} color="rgba(255,255,255,0.4)" style={{ marginHorizontal: 6 }} />
          <Text style={styles.bundlePrice}>{formatPrice(bundlePrice)} {t('common.currency')}</Text>
        </View>

        <Animated.View style={{ transform: [{ scale: btnScale }] }}>
          <TouchableOpacity
            style={styles.ctaButton}
            activeOpacity={0.8}
            onPress={handleBtnPress}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
          >
            <Ionicons name="cart-outline" size={18} color={COLORS.primary || '#0F172A'} />
            <Text style={styles.ctaText}>{t('home.addToBundle')}</Text>
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
    padding: 20,
    position: 'relative',
    overflow: 'hidden',
  },
  glowOrb: {
    position: 'absolute',
    top: -40,
    right: -40,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(59,130,246,0.12)',
  },
  savingsBadge: {
    alignSelf: 'flex-end',
    backgroundColor: '#D4AF37',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    marginBottom: 16,
  },
  savingsText: {
    color: '#0F172A',
    fontSize: 12,
    fontWeight: '800',
  },
  contentRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    marginBottom: 16,
  },
  mainProductArea: {
    flex: 1,
    alignItems: 'center',
  },
  mainImage: {
    width: 110,
    height: 110,
    marginBottom: 8,
  },
  imagePlaceholder: {
    width: 110,
    height: 110,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.06)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  mainProductName: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  addonArea: {
    alignItems: 'center',
    marginHorizontal: 12,
  },
  plusIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  plusText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 18,
    fontWeight: '700',
  },
  addonThumbs: {
    gap: 6,
  },
  addonThumb: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  addonImage: {
    width: 36,
    height: 36,
  },
  bundleTitle: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  priceRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  originalPrice: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 14,
    textDecorationLine: 'line-through',
  },
  bundlePrice: {
    color: '#FFFFFF',
    fontSize: 20,
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
