import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { Animated, Text, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, RADIUS, FONT_SIZES, FONT_WEIGHTS, SHADOWS } from '../constants';
import { useDirection } from '../hooks/useDirection';

const ToastContext = createContext(null);

const ICONS = {
  success: 'checkmark-circle',
  error: 'alert-circle',
  info: 'information-circle',
  warning: 'warning',
};

const BG_COLORS = {
  success: '#F0FDF4',
  error: '#FEF2F2',
  info: '#EFF6FF',
  warning: '#FFFBEB',
};

const ICON_COLORS = {
  success: COLORS.success,
  error: COLORS.error,
  info: COLORS.blue,
  warning: COLORS.warning,
};

const BORDER_COLORS = {
  success: '#BBF7D0',
  error: '#FECACA',
  info: '#BFDBFE',
  warning: '#FDE68A',
};

export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null);
  const translateY = useRef(new Animated.Value(100)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const insets = useSafeAreaInsets();
  const dir = useDirection();
  const timerRef = useRef(null);

  const show = useCallback((message, type = 'info', duration = 3000) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setToast({ message, type });
    Animated.parallel([
      Animated.spring(translateY, { toValue: 0, damping: 15, stiffness: 200, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();
    timerRef.current = setTimeout(() => hide(), duration);
  }, []);

  const hide = useCallback(() => {
    Animated.parallel([
      Animated.timing(translateY, { toValue: 100, duration: 200, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start(() => setToast(null));
  }, []);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return (
    <ToastContext.Provider value={{ show, hide }}>
      {children}
      {toast && (
        <Animated.View
          style={[
            styles.container,
            { bottom: insets.bottom + 80, transform: [{ translateY }], opacity },
          ]}
        >
          <View style={[styles.toast, { flexDirection: dir.row }, { backgroundColor: BG_COLORS[toast.type], borderColor: BORDER_COLORS[toast.type] }]}>
            <Ionicons name={ICONS[toast.type]} size={20} color={ICON_COLORS[toast.type]} />
            <Text style={[styles.message, { textAlign: dir.textAlign }, { color: ICON_COLORS[toast.type] }]}>{toast.message}</Text>
          </View>
        </Animated.View>
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside ToastProvider');
  return ctx;
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 9999,
    alignItems: 'center',
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    ...SHADOWS.lg,
    width: '100%',
  },
  message: {
    flex: 1,
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.medium,
    textAlign: 'left',
  },
});
