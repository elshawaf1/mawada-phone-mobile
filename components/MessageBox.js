import React, { useEffect, useRef, useCallback } from 'react';
import {
  Animated,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, RADIUS, FONT_SIZES, FONT_WEIGHTS, SHADOWS } from '../constants';
import { useDirection } from '../hooks/useDirection';

const TYPE_CONFIG = {
  success: {
    icon: 'checkmark-circle',
    color: COLORS.success,
    bgColor: COLORS.greenLight,
    borderColor: '#BBF7D0',
  },
  error: {
    icon: 'alert-circle',
    color: COLORS.error,
    bgColor: COLORS.redLight,
    borderColor: '#FECACA',
  },
  info: {
    icon: 'information-circle',
    color: COLORS.blue,
    bgColor: COLORS.blueLight,
    borderColor: '#BFDBFE',
  },
  warning: {
    icon: 'warning',
    color: COLORS.warning,
    bgColor: COLORS.amberLight,
    borderColor: '#FDE68A',
  },
};

export default function MessageBox({
  visible,
  type = 'info',
  title,
  message,
  onClose,
  buttons = [],
  t,
  isRTL,
  autoDismissMs,
}) {
  const scaleAnim = useRef(new Animated.Value(0.85)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const timerRef = useRef(null);
  const dir = useDirection();
  const insets = useSafeAreaInsets();

  const config = TYPE_CONFIG[type] || TYPE_CONFIG.info;

  const dismiss = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const handleClose = useCallback(() => {
    dismiss();
    onClose?.();
  }, [dismiss, onClose]);

  // Auto-dismiss logic
  useEffect(() => {
    if (!visible) return;

    // Animate in
    scaleAnim.setValue(0.85);
    fadeAnim.setValue(0);
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        damping: 18,
        stiffness: 260,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();

    // Auto-dismiss for success/info
    if (autoDismissMs && (type === 'success' || type === 'info')) {
      timerRef.current = setTimeout(() => {
        handleClose();
      }, autoDismissMs);
    }

    return () => dismiss();
  }, [visible, type, autoDismissMs]);

  // Animate out on hide
  useEffect(() => {
    if (!visible) {
      scaleAnim.setValue(0.85);
      fadeAnim.setValue(0);
    }
  }, [visible]);

  if (!visible) return null;

  const defaultButtonText = t?.('common.ok') || (isRTL ? 'موافق' : 'OK');

  const defaultButtons =
    buttons.length > 0
      ? buttons
      : [{ text: defaultButtonText, onPress: handleClose, style: 'primary' }];

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={handleClose}>
      <Animated.View
        style={[
          styles.overlay,
          { opacity: fadeAnim },
        ]}
      >
        <Pressable style={styles.overlayPressable} onPress={handleClose}>
          <Pressable onPress={(e) => e.stopPropagation()} style={styles.cardWrapper}>
            <Animated.View
              style={[
                styles.card,
                {
                  transform: [{ scale: scaleAnim }],
                  opacity: fadeAnim,
                  paddingBottom: insets.bottom > 0 ? insets.bottom + 16 : 20,
                },
              ]}
            >
              {/* Icon */}
              <View style={[styles.iconContainer, { backgroundColor: config.bgColor }]}>
                <Ionicons name={config.icon} size={40} color={config.color} />
              </View>

              {/* Title */}
              {title ? (
                <Text
                  style={[
                    styles.title,
                    {
                      textAlign: dir.textAlign,
                      color: COLORS.text,
                    },
                  ]}
                  numberOfLines={2}
                >
                  {title}
                </Text>
              ) : null}

              {/* Message */}
              {message ? (
                <Text
                  style={[
                    styles.message,
                    {
                      textAlign: dir.textAlign,
                      color: COLORS.textSecondary,
                    },
                  ]}
                  numberOfLines={4}
                >
                  {message}
                </Text>
              ) : null}

              {/* Buttons */}
              <View style={[styles.buttonRow, { flexDirection: dir.row }]}>
                {defaultButtons.map((btn, index) => {
                  const isPrimary = btn.style === 'primary' || (!btn.style && index === defaultButtons.length - 1);
                  return (
                    <Pressable
                      key={index}
                      onPress={() => {
                        dismiss();
                        btn.onPress?.();
                      }}
                      style={[
                        styles.button,
                        isPrimary
                          ? [styles.primaryButton, { backgroundColor: config.color }]
                          : styles.secondaryButton,
                        !isPrimary && {
                          borderColor: COLORS.border,
                        },
                        defaultButtons.length === 1 && styles.fullWidthButton,
                      ]}
                    >
                      <Text
                        style={[
                          styles.buttonText,
                          isPrimary
                            ? styles.primaryButtonText
                            : [styles.secondaryButtonText, { color: COLORS.text }],
                        ]}
                      >
                        {btn.text}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </Animated.View>
          </Pressable>
        </Pressable>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: COLORS.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10000,
    elevation: 10000,
  },
  overlayPressable: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  cardWrapper: {
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  card: {
    width: '100%',
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.xxl,
    paddingTop: 32,
    paddingHorizontal: 24,
    alignItems: 'center',
    ...SHADOWS.xl,
  },
  iconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: FONT_SIZES.xl,
    fontWeight: FONT_WEIGHTS.bold,
    marginBottom: 8,
    width: '100%',
  },
  message: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.regular,
    lineHeight: 22,
    marginBottom: 24,
    width: '100%',
  },
  buttonRow: {
    width: '100%',
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: RADIUS.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullWidthButton: {
    flex: undefined,
    width: '100%',
  },
  primaryButton: {
    ...SHADOWS.sm,
  },
  secondaryButton: {
    borderWidth: 1,
    backgroundColor: 'transparent',
  },
  buttonText: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.semibold,
  },
  primaryButtonText: {
    color: COLORS.white,
  },
  secondaryButtonText: {},
});
