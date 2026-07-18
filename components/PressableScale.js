import React, { useRef } from 'react';
import { Pressable, Animated, StyleSheet } from 'react-native';

export default function PressableScale({
  children,
  onPress,
  onLongPress,
  scaleTo = 0.96,
  disabled = false,
  style,
  activeOpacity = 1,
}) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const onPressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: scaleTo,
      useNativeDriver: true,
      friction: 8,
      tension: 200,
    }).start();
  };

  const onPressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      friction: 8,
      tension: 200,
    }).start();
  };

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      disabled={disabled}
      style={({ pressed }) => [
        style,
        pressed && styles.pressed,
      ]}
    >
      <Animated.View style={{ transform: [{ scale: scaleAnim }], opacity: disabled ? 0.5 : 1 }}>
        {children}
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressed: {},
});
