import React, { useRef, useEffect } from 'react';
import { View, TouchableOpacity, StyleSheet, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import LottieView from 'lottie-react-native';
import { BlurView } from 'expo-blur';
import { COLORS, FONT_SIZES, FONT_WEIGHTS, RADIUS, SHADOWS } from '../constants';
import { useApp } from '../context/AppContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from '../context/AppSettingsContext';
import { useDirection } from '../hooks/useDirection';
import { hapticTap } from '../utils/haptics';

const avatarAnim = require('../assets/wired-outline-21-avatar-in-reveal.json');
const homeAnim = require('../assets/wired-outline-63-home-hover-3d-roll.json');
const searchAnim = require('../assets/wired-outline-19-magnifier-zoom-search-hover-spin.json');

const LOTTIE_BY_ROUTE = {
  Profile: () => avatarAnim,
  Home: () => homeAnim,
  Search: () => searchAnim,
};

export default function BottomNav({ navigation, activeRoute, style }) {
  const insets = useSafeAreaInsets();
  const { cartCount } = useApp();
  const { t } = useTranslation();
  const dir = useDirection();
  const lottieRefs = useRef({});

  const playFor = (route) => {
    const ref = lottieRefs.current[route];
    ref?.reset?.();
    ref?.play?.();
  };

  // Delight on activation change only — no timers.
  useEffect(() => {
    playFor(activeRoute);
  }, [activeRoute]);

  const handlePress = (route) => () => {
    hapticTap();
    playFor(route);
    navigation.navigate(route);
  };

  const NAV_ITEMS = [
    { route: 'Profile', icon: 'person-circle-outline', iconActive: 'person-circle', label: t('nav.profile') },
    { route: 'Search', icon: 'search-outline', iconActive: 'search', label: t('nav.search') },
    { route: 'Home', icon: 'home-outline', iconActive: 'home', label: t('nav.home') },
    { route: 'Cart', icon: 'cart-outline', iconActive: 'cart', label: t('nav.cart'), badgeKey: 'cart' },
  ];

  return (
    <View style={[styles.dockPos, { bottom: Math.max(insets.bottom, 16) + 12 }, style]}>
      {/* Rounded clipping on the wrapper — BlurView must not carry
          overflow/radius itself or Android drops the blur. */}
      <View style={styles.dockClip}>
        <BlurView intensity={100} tint="light" style={styles.dockBlur}>
          <View style={[styles.dockRow, { flexDirection: dir.row }]}>
      {NAV_ITEMS.map((item) => {
        const isActive = activeRoute === item.route;
        const badge = item.badgeKey === 'cart' ? cartCount : 0;
        const lottieSource = LOTTIE_BY_ROUTE[item.route]?.();

        return (
          <TouchableOpacity
            key={item.route}
            style={styles.dockItem}
            onPress={handlePress(item.route)}
            activeOpacity={0.7}
          >
            <View style={[styles.dockIconPill, isActive && styles.dockIconPillActive]}>
              {lottieSource ? (
                <LottieView
                  ref={(r) => { lottieRefs.current[item.route] = r; }}
                  source={lottieSource}
                  style={styles.lottieIcon}
                  autoPlay={false}
                  loop={false}
                  resizeMode="cover"
                />
              ) : (
                <Ionicons
                  name={isActive ? item.iconActive : item.icon}
                  size={24}
                  color={isActive ? COLORS.primary : COLORS.gray400}
                />
              )}
              {badge > 0 && (
                <View style={[styles.dockBadge, dir.isRTL ? styles.dockBadgeRTL : styles.dockBadgeLTR]}>
                  <Text style={styles.dockBadgeText}>{badge > 9 ? '9+' : badge}</Text>
                </View>
              )}
            </View>
            <Text style={[styles.dockLabel, isActive && styles.dockLabelActive]}>
              {item.label}
            </Text>
          </TouchableOpacity>
        );
      })}
          </View>
        </BlurView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  dockPos: {
    position: 'absolute', left: 16, right: 16, height: 72,
  },
  dockClip: {
    flex: 1,
    borderRadius: RADIUS.xxl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.9)',
    ...SHADOWS.lg,
    backgroundColor: 'rgba(255,255,255,0.88)',
  },
  dockBlur: { flex: 1 },
  dockRow: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 6,
  },
  dockItem: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 4 },
  dockIconPill: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    paddingVertical: 3,
    borderRadius: RADIUS.full,
  },
  dockIconPillActive: {
    backgroundColor: COLORS.gray100,
  },
  lottieIcon: { width: 28, height: 28 },
  dockBadge: {
    position: 'absolute', top: -2,
    minWidth: 16, height: 16, borderRadius: 8,
    backgroundColor: COLORS.error,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1.5, borderColor: COLORS.white, paddingHorizontal: 3,
  },
  dockBadgeLTR: { left: 2 },
  dockBadgeRTL: { right: 2 },
  dockBadgeText: { color: COLORS.white, fontSize: FONT_SIZES.xs - 2, fontWeight: FONT_WEIGHTS.extrabold, lineHeight: 10 },
  dockLabel: { fontSize: FONT_SIZES.xs, color: COLORS.gray400, marginTop: 2, fontWeight: FONT_WEIGHTS.medium },
  dockLabelActive: { color: COLORS.primary, fontWeight: FONT_WEIGHTS.bold },
});
