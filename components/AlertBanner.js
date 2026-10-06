import React, { useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, AccessibilityInfo } from 'react-native';
import {
  Info,
  Bell,
  MinusCircle,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  X,
} from 'lucide-react-native';
import { COLORS, FONT_SIZES, FONT_WEIGHTS, RADIUS, SHADOWS } from '../constants';
import { useDirection } from '../hooks/useDirection';
import { hapticTap } from '../utils/haptics';

// Untitled UI-style alert: persistent + inline (banner or floating card),
// six semantic tones. Never auto-dismisses — stays until handled.

export const ALERT_TONES = {
  default: { bg: COLORS.gray50, border: COLORS.gray200, fg: COLORS.text, icon: Info },
  brand: { bg: COLORS.gray100, border: COLORS.gray300, fg: COLORS.primary, icon: Bell },
  gray: { bg: COLORS.gray50, border: COLORS.border, fg: COLORS.textSecondary, icon: MinusCircle },
  error: { bg: COLORS.redLight, border: '#FECACA', fg: COLORS.error, icon: AlertCircle },
  warning: { bg: COLORS.amberLight, border: '#FDE68A', fg: COLORS.warning, icon: AlertTriangle },
  success: { bg: COLORS.greenLight, border: '#BBF7D0', fg: COLORS.success, icon: CheckCircle2 },
};

export default function AlertBanner({
  tone = 'default',
  title,
  message,
  actionLabel,
  onAction,
  dismissLabel,
  onDismiss,
  placement = 'banner', // 'banner' | 'card'
}) {
  const dir = useDirection();
  const conf = ALERT_TONES[tone] || ALERT_TONES.default;
  const Icon = conf.icon;

  useEffect(() => {
    AccessibilityInfo.announceForAccessibility(`${title}. ${message || ''}`);
  }, []);

  return (
    <View
      accessibilityRole="alert"
      accessible
      style={[
        placement === 'card' ? styles.card : styles.banner,
        { backgroundColor: conf.bg, borderColor: conf.border },
      ]}
    >
      <View style={[styles.row, { flexDirection: dir.row }]}>
        <View style={styles.iconWrap}>
          <Icon size={20} color={conf.fg} />
        </View>
        <View style={styles.textWrap}>
          <Text style={[styles.title, { color: conf.fg, textAlign: dir.textAlign }]}>{title}</Text>
          {message ? (
            <Text style={[styles.message, { textAlign: dir.textAlign }]}>{message}</Text>
          ) : null}
          {(actionLabel && onAction) || onDismiss ? (
            <View style={[styles.actions, { flexDirection: dir.row }]}>
              {actionLabel && onAction ? (
                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: conf.fg }]}
                  onPress={() => { hapticTap(); onAction(); }}
                  activeOpacity={0.8}
                >
                  <Text style={styles.actionText}>{actionLabel}</Text>
                </TouchableOpacity>
              ) : null}
              {onDismiss ? (
                <TouchableOpacity
                  style={styles.dismissBtn}
                  onPress={() => { hapticTap(); onDismiss(); }}
                  accessibilityLabel={dismissLabel || 'Dismiss'}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <X size={16} color={COLORS.textSecondary} />
                </TouchableOpacity>
              ) : null}
            </View>
          ) : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    borderBottomWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  card: {
    marginHorizontal: 16,
    marginVertical: 8,
    borderWidth: 1,
    borderRadius: RADIUS.lg,
    paddingHorizontal: 14,
    paddingVertical: 12,
    ...SHADOWS.sm,
  },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  iconWrap: { marginTop: 1 },
  textWrap: { flex: 1 },
  title: { fontSize: FONT_SIZES.md, fontWeight: FONT_WEIGHTS.bold, marginBottom: 2 },
  message: { fontSize: FONT_SIZES.sm, fontWeight: FONT_WEIGHTS.regular, color: COLORS.textSecondary, lineHeight: 20 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  actionBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: RADIUS.md },
  actionText: { color: COLORS.white, fontSize: FONT_SIZES.sm, fontWeight: FONT_WEIGHTS.bold },
  dismissBtn: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
});
