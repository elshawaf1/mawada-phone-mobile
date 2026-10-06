import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View, TouchableOpacity, AccessibilityInfo } from 'react-native';
import { Package, Tag, Info, Bell, X } from 'lucide-react-native';
import { COLORS, FONT_SIZES, FONT_WEIGHTS, RADIUS, SHADOWS } from '../constants';
import { useDirection } from '../hooks/useDirection';

const TYPE_STYLE = {
  order: { icon: Package, bg: COLORS.blueLight, color: COLORS.blue },
  promo: { icon: Tag, bg: COLORS.greenLight, color: COLORS.green },
  info: { icon: Info, bg: COLORS.amberLight, color: COLORS.amber },
  system: { icon: Bell, bg: COLORS.gray100, color: COLORS.gray500 },
  payment: { icon: Package, bg: COLORS.blueLight, color: COLORS.blue },
  payment_success: { icon: Package, bg: COLORS.greenLight, color: COLORS.green },
  payment_failed: { icon: Package, bg: COLORS.redLight, color: COLORS.error },
};

// Floating top popup for an incoming notification. Tap opens the target,
// X dismisses, auto-dismisses after a few seconds.
export default function NotificationPopup({ notif, onOpen, onDismiss }) {
  const dir = useDirection();
  const slide = useRef(new Animated.Value(-140)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(slide, { toValue: 0, damping: 18, stiffness: 220, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();
    AccessibilityInfo.announceForAccessibility(`${notif.title}. ${notif.body || ''}`);
    const timer = setTimeout(onDismiss, 6000);
    return () => clearTimeout(timer);
  }, []);

  if (!notif) return null;
  const conf = TYPE_STYLE[notif.type] || TYPE_STYLE.info;
  const Icon = conf.icon;

  return (
    <Animated.View
      accessibilityRole="alert"
      style={[styles.wrap, { transform: [{ translateY: slide }], opacity }]}
    >
      <TouchableOpacity
        style={[styles.card, { flexDirection: dir.row }]}
        onPress={onOpen}
        activeOpacity={0.92}
      >
        <View style={[styles.icon, { backgroundColor: conf.bg }]}>
          <Icon size={22} color={conf.color} />
        </View>
        <View style={styles.texts}>
          <Text style={[styles.title, { textAlign: dir.textAlign }]} numberOfLines={1}>
            {notif.title}
          </Text>
          {notif.body ? (
            <Text style={[styles.body, { textAlign: dir.textAlign }]} numberOfLines={2}>
              {notif.body}
            </Text>
          ) : null}
        </View>
        <TouchableOpacity
          style={styles.close}
          onPress={onDismiss}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <X size={16} color={COLORS.textSecondary} />
        </TouchableOpacity>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    top: 0,
    left: 12,
    right: 12,
    zIndex: 9999,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 10,
    ...SHADOWS.xl,
  },
  icon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  texts: { flex: 1 },
  title: { fontSize: FONT_SIZES.md, fontWeight: FONT_WEIGHTS.bold, color: COLORS.text, marginBottom: 2 },
  body: { fontSize: FONT_SIZES.sm, fontWeight: FONT_WEIGHTS.regular, color: COLORS.textSecondary, lineHeight: 18 },
  close: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.gray100,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
