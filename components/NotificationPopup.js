import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View, TouchableOpacity, PanResponder, AccessibilityInfo } from 'react-native';
import { BlurView } from 'expo-blur';
import { Package, Tag, Info, Bell } from 'lucide-react-native';
import { COLORS, FONT_SIZES, FONT_WEIGHTS, RADIUS, SHADOWS } from '../constants';
import { useDirection } from '../hooks/useDirection';
import { hapticTap } from '../utils/haptics';

const TYPE_STYLE = {
  order: { icon: Package, bg: COLORS.blueLight, color: COLORS.blue },
  promo: { icon: Tag, bg: COLORS.greenLight, color: COLORS.green },
  info: { icon: Info, bg: COLORS.amberLight, color: COLORS.amber },
  system: { icon: Bell, bg: COLORS.gray100, color: COLORS.gray500 },
  payment: { icon: Package, bg: COLORS.blueLight, color: COLORS.blue },
  payment_success: { icon: Package, bg: COLORS.greenLight, color: COLORS.green },
  payment_failed: { icon: Package, bg: COLORS.redLight, color: COLORS.error },
};

function clockNow() {
  try {
    return new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  } catch {
    return '';
  }
}

// Apple-style push banner: frosted glass, app-icon tile, timestamp,
// tap to open, swipe up to dismiss, auto-dismisses after a few seconds.
export default function NotificationPopup({ notif, onOpen, onDismiss }) {
  const dir = useDirection();
  const slide = useRef(new Animated.Value(-160)).current;
  const scale = useRef(new Animated.Value(0.92)).current;
  const dragY = useRef(new Animated.Value(0)).current;
  const dismissed = useRef(false);

  useEffect(() => {
    Animated.parallel([
      Animated.spring(slide, { toValue: 0, damping: 20, stiffness: 260, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, damping: 18, stiffness: 260, useNativeDriver: true }),
    ]).start();
    AccessibilityInfo.announceForAccessibility(`${notif.title}. ${notif.body || ''}`);
    const timer = setTimeout(dismiss, 6000);
    return () => clearTimeout(timer);
  }, []);

  const dismiss = () => {
    if (dismissed.current) return;
    dismissed.current = true;
    Animated.timing(slide, { toValue: -180, duration: 220, useNativeDriver: true })
      .start(() => onDismiss());
  };

  const pan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => g.dy < -8 && Math.abs(g.dy) > Math.abs(g.dx),
      onPanResponderMove: (_, g) => dragY.setValue(Math.min(0, g.dy)),
      onPanResponderRelease: (_, g) => {
        if (g.dy < -40 || g.vy < -0.6) {
          dismiss();
        } else {
          Animated.spring(dragY, { toValue: 0, damping: 20, stiffness: 300, useNativeDriver: true }).start();
        }
      },
    })
  ).current;

  if (!notif) return null;
  const conf = TYPE_STYLE[notif.type] || TYPE_STYLE.info;
  const Icon = conf.icon;

  return (
    <Animated.View
      accessibilityRole="alert"
      style={[styles.wrap, { transform: [{ translateY: slide }, { scale }] }]}
    >
      <Animated.View style={{ transform: [{ translateY: dragY }] }} {...pan.panHandlers}>
        {/* Rounded clipping lives on the wrapper — BlurView itself must NOT
            have overflow:hidden/borderRadius or Android drops the blur. */}
        <View style={styles.clip}>
          <BlurView intensity={100} tint="light" style={styles.blur}>
            <View style={styles.tint} />
            <TouchableOpacity
              style={[styles.row, { flexDirection: dir.row }]}
              onPress={() => { hapticTap(); dismiss(); onOpen(); }}
              activeOpacity={0.9}
            >
            <View style={[styles.tile, { backgroundColor: conf.bg }]}>
              <Icon size={19} color={conf.color} />
            </View>
              <View style={styles.texts}>
                <View style={[styles.topRow, { flexDirection: dir.row }]}>
                  <Text style={[styles.title, { textAlign: dir.textAlign }]}>
                    {notif.title}
                  </Text>
                  <Text style={styles.time}>{clockNow()}</Text>
                </View>
                {notif.body ? (
                  <Text style={[styles.body, { textAlign: dir.textAlign }]}>
                    {notif.body}
                  </Text>
                ) : null}
              </View>
            </TouchableOpacity>
          </BlurView>
        </View>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    top: 0,
    left: 10,
    right: 10,
    zIndex: 9999,
  },
  clip: {
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.9)',
    ...SHADOWS.lg,
    backgroundColor: 'rgba(255,255,255,0.7)',
  },
  blur: { flex: 1 },
  // Light milky layer so text stays readable over busy backdrops.
  tint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.8)',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 9,
    gap: 8,
  },
  tile: {
    width: 34,
    height: 34,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  texts: { flex: 1 },
  topRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  title: {
    flex: 1,
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.text,
  },
  time: { fontSize: 11, fontWeight: FONT_WEIGHTS.regular, color: COLORS.textTertiary },
  body: {
    fontSize: 12,
    fontWeight: FONT_WEIGHTS.regular,
    color: COLORS.textSecondary,
    lineHeight: 17,
    marginTop: 1,
  },
});
