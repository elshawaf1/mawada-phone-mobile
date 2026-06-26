import React, { useRef } from 'react';
import { TouchableOpacity, Text, StyleSheet, Animated, ActivityIndicator, View } from 'react-native';
import { COLORS, RADIUS, FONT_SIZES, FONT_WEIGHTS, SHADOWS } from '../constants';

export default function Button({
  title,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  icon,
  iconPosition = 'left',
  style,
  textStyle,
  fullWidth = false,
  height = 54,
}) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.97,
      useNativeDriver: true,
      damping: 20,
      stiffness: 300,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      damping: 20,
      stiffness: 300,
    }).start();
  };

  const isDisabled = disabled || loading;

  const getVariantStyles = () => {
    switch (variant) {
      case 'primary':
        return {
          container: { backgroundColor: isDisabled ? COLORS.gray300 : COLORS.primary },
          text: { color: isDisabled ? COLORS.gray400 : COLORS.white },
        };
      case 'secondary':
        return {
          container: {
            backgroundColor: isDisabled ? COLORS.gray300 : COLORS.white,
            borderWidth: 1.5,
            borderColor: isDisabled ? COLORS.gray300 : COLORS.gray200,
          },
          text: { color: isDisabled ? COLORS.gray400 : COLORS.text },
        };
      case 'outline':
        return {
          container: {
            backgroundColor: 'transparent',
            borderWidth: 1.5,
            borderColor: isDisabled ? COLORS.gray300 : COLORS.primary,
          },
          text: { color: isDisabled ? COLORS.gray300 : COLORS.primary },
        };
      case 'ghost':
        return {
          container: { backgroundColor: 'transparent' },
          text: { color: isDisabled ? COLORS.gray300 : COLORS.primary },
        };
      default:
        return {
          container: { backgroundColor: isDisabled ? COLORS.gray300 : COLORS.primary },
          text: { color: isDisabled ? COLORS.gray400 : COLORS.white },
        };
    }
  };

  const variantStyles = getVariantStyles();

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }], width: fullWidth ? '100%' : undefined }}>
      <TouchableOpacity
        style={[
          styles.button,
          { height },
          variantStyles.container,
          fullWidth && styles.fullWidth,
          style,
        ]}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.9}
        disabled={isDisabled}
      >
        {loading ? (
          <ActivityIndicator color={variantStyles.text.color} />
        ) : (
          <View style={styles.content}>
            {icon && iconPosition === 'right' && <View style={styles.iconRight}>{icon}</View>}
            <Text style={[styles.text, variantStyles.text, textStyle]}>{title}</Text>
            {icon && iconPosition === 'left' && <View style={styles.iconLeft}>{icon}</View>}
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: RADIUS.xxl,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.sm,
  },
  fullWidth: { width: '100%' },
  content: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.bold,
  },
  iconLeft: { marginRight: 8 },
  iconRight: { marginLeft: 8 },
});
