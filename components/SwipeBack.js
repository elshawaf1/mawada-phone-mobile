import React, { useCallback, useRef } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';

const EDGE_WIDTH = 25;
const THRESHOLD = 80;

export default function SwipeBack({ children, navigation, canGoBack = true, disabled = false, isNavigatingRef }) {
  const { width: SCREEN_WIDTH } = useWindowDimensions();
  const translateX = useSharedValue(0);
  const goBackRef = useRef(navigation.goBack);
  goBackRef.current = navigation.goBack;

  const onSwipeComplete = useCallback(() => {
    if (isNavigatingRef?.current) {
      translateX.value = 0;
      return;
    }
    isNavigatingRef.current = true;
    setTimeout(() => { isNavigatingRef.current = false; }, 500);
    translateX.value = 0;
    goBackRef.current();
  }, []);

  const pan = Gesture.Pan()
    .enabled(canGoBack && !disabled)
    .failOffsetY([-40, 40])
    .activeOffsetX(-15)
    .onStart((e) => {
      if (e.absoluteX < SCREEN_WIDTH - EDGE_WIDTH) {
        translateX.value = -999;
      }
    })
    .onUpdate((e) => {
      if (translateX.value === -999) return;
      if (e.absoluteX < SCREEN_WIDTH - EDGE_WIDTH && translateX.value === 0) return;
      const value = Math.min(0, e.translationX);
      translateX.value = value;
    })
    .onEnd(() => {
      if (translateX.value < -THRESHOLD) {
        translateX.value = withTiming(-SCREEN_WIDTH, { duration: 250 }, (finished) => {
          if (finished) {
            runOnJS(onSwipeComplete)();
          }
        });
      } else if (translateX.value !== -999) {
        translateX.value = withTiming(0, { duration: 200 });
      } else {
        translateX.value = 0;
      }
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  return (
    <View style={styles.container}>
      <GestureDetector gesture={pan}>
        <Animated.View style={[styles.content, animatedStyle]}>
          {children}
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, overflow: 'hidden' },
  content: { flex: 1 },
});
