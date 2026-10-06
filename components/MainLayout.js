import React from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, StatusBar } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../constants';
import BottomNav from './BottomNav';

const DOCK_HIDE_OFFSET = 140;
const DOCK_HIDE_THRESHOLD = 60;

export default function MainLayout({
  navigation,
  activeRoute,
  children,
  style,
  showBottomNav = true,
  scrollable = false,
  autoHideDock = true,
  header,
}) {
  const insets = useSafeAreaInsets();
  const dockY = useSharedValue(0);
  const lastY = useSharedValue(0);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (e) => {
      const y = e.contentOffset.y;
      const dy = y - lastY.value;
      lastY.value = y;
      if (y < DOCK_HIDE_THRESHOLD) {
        dockY.value = withTiming(0, { duration: 200 });
      } else if (dy > 2) {
        dockY.value = withTiming(DOCK_HIDE_OFFSET, { duration: 200 });
      } else if (dy < -2) {
        dockY.value = withTiming(0, { duration: 200 });
      }
    },
  });

  const dockStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: autoHideDock ? dockY.value : 0 }],
  }));

  const dock = showBottomNav
    ? <BottomNav navigation={navigation} activeRoute={activeRoute} style={dockStyle} />
    : null;

  const content = (
    <View style={[styles.container, style, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      {header}
      <View style={styles.content}>{children}</View>
      {dock}
    </View>
  );

  if (scrollable) {
    return (
      <KeyboardAvoidingView
        style={[styles.container, style]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
        <Animated.ScrollView
          onScroll={scrollHandler}
          scrollEventThrottle={16}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ flexGrow: 1, paddingTop: insets.top, paddingBottom: insets.bottom + (showBottomNav ? 90 : 20) }}
        >
          {header}
          <View style={styles.content}>{children}</View>
        </Animated.ScrollView>
        {dock}
      </KeyboardAvoidingView>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, style]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={0}
    >
      {content}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  content: { flex: 1 },
});
