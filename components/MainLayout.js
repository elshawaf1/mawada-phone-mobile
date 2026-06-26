import React from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../constants';
import BottomNav from './BottomNav';

export default function MainLayout({
  navigation,
  activeRoute,
  children,
  style,
  showBottomNav = true,
  scrollable = false,
  header,
}) {
  const insets = useSafeAreaInsets();

  const content = (
    <View style={[styles.container, style, { paddingTop: insets.top }]}>
      {header}
      <View style={styles.content}>{children}</View>
      {showBottomNav && <BottomNav navigation={navigation} activeRoute={activeRoute} />}
    </View>
  );

  if (scrollable) {
    return (
      <KeyboardAvoidingView
        style={[styles.container, style]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ flexGrow: 1, paddingTop: insets.top, paddingBottom: insets.bottom + (showBottomNav ? 90 : 20) }}
        >
          {header}
          <View style={styles.content}>{children}</View>
        </ScrollView>
        {showBottomNav && <BottomNav navigation={navigation} activeRoute={activeRoute} />}
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
