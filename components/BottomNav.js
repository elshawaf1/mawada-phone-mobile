import React, { useRef, useEffect } from 'react';
import { View, TouchableOpacity, StyleSheet, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import LottieView from 'lottie-react-native';
import { COLORS, FONT_SIZES, FONT_WEIGHTS, RADIUS, SHADOWS } from '../constants';
import { useApp } from '../context/AppContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from '../context/AppSettingsContext';
import { useDirection } from '../hooks/useDirection';

const avatarAnim = require('../assets/wired-outline-21-avatar-in-reveal.json');
const homeAnim = require('../assets/wired-outline-63-home-hover-3d-roll.json');

export default function BottomNav({ navigation, activeRoute }) {
  const insets = useSafeAreaInsets();
  const { cartCount } = useApp();
  const { t } = useTranslation();
  const dir = useDirection();
  const lottieRef = useRef(null);
  const homeLottieRef = useRef(null);

  useEffect(() => {
    const interval = setInterval(() => {
      lottieRef.current?.reset();
      lottieRef.current?.play();
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (activeRoute === 'Home') {
      homeLottieRef.current?.reset();
      homeLottieRef.current?.play();
    }
  }, [activeRoute]);
  const NAV_ITEMS = [
    { route: 'Profile', icon: 'person-circle-outline', iconActive: 'person-circle', label: t('nav.profile') },
    { route: 'Search', icon: 'search-outline', iconActive: 'search', label: t('nav.search') },
    { route: 'Home', icon: 'home-outline', iconActive: 'home', label: t('nav.home') },
    { route: 'Cart', icon: 'cart-outline', iconActive: 'cart', label: t('nav.cart'), badgeKey: 'cart' },
  ];

  return (
    <View style={[styles.dock, { bottom: Math.max(insets.bottom, 16) + 12, flexDirection: dir.row }]}>
      {NAV_ITEMS.map((item) => {
        const isActive = activeRoute === item.route;
        const badge = item.badgeKey === 'cart' ? cartCount : 0;

        return (
          <TouchableOpacity
            key={item.route}
            style={styles.dockItem}
            onPress={() => navigation.navigate(item.route)}
            activeOpacity={0.7}
          >
            <View style={styles.dockIconWrapper}>
              {item.route === 'Profile' ? (
                <LottieView
                  ref={lottieRef}
                  source={avatarAnim}
                  style={styles.lottieIcon}
                  autoPlay={false}
                  loop={false}
                  resizeMode="cover"
                />
              ) : item.route === 'Home' && isActive ? (
                <LottieView
                  ref={homeLottieRef}
                  source={homeAnim}
                  style={styles.lottieIcon}
                  autoPlay
                  loop
                  resizeMode="cover"
                />
              ) : (
                <Ionicons
                  name={isActive ? item.iconActive : item.icon}
                  size={24}
                  color={isActive ? COLORS.black : COLORS.gray400}
                />
              )}
              {isActive && <View style={styles.dockActiveDot} />}
              {badge > 0 && (
                <View style={styles.dockBadge}>
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
  );
}

const styles = StyleSheet.create({
  dock: {
    position: 'absolute', left: 16, right: 16, height: 64,
    flexDirection: 'row-reverse', justifyContent: 'space-around', alignItems: 'center',
    backgroundColor: COLORS.white, borderRadius: RADIUS.xxl,
    ...SHADOWS.lg,
    borderWidth: 1, borderColor: COLORS.borderLight,
  },
  dockItem: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 4 },
  dockIconWrapper: { position: 'relative', alignItems: 'center' },
  lottieIcon: { width: 28, height: 28 },
  dockActiveDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: COLORS.text, marginTop: 2 },
  dockBadge: {
    position: 'absolute', top: -4, left: -8,
    minWidth: 16, height: 16, borderRadius: 8,
    backgroundColor: COLORS.error,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1.5, borderColor: COLORS.white, paddingHorizontal: 3,
  },
  dockBadgeText: { color: COLORS.white, fontSize: 8, fontWeight: FONT_WEIGHTS.extrabold, lineHeight: 10 },
  dockLabel: { fontSize: 10, color: COLORS.gray400, marginTop: 2, fontWeight: FONT_WEIGHTS.medium },
  dockLabelActive: { color: COLORS.text, fontWeight: FONT_WEIGHTS.bold },
});
