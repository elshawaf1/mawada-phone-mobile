import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, StatusBar } from 'react-native';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, FONT_SIZES, FONT_WEIGHTS, RADIUS } from '../constants';
import { useDirection } from '../hooks/useDirection';
import { hapticTap } from '../utils/haptics';

export default function ScreenHeader({
  title,
  subtitle,
  onBack,
  rightAction,
  onRightPress,
  variant = 'default', // 'default' | 'large'
  translucent = false,
  topInset = true,
}) {
  const insets = useSafeAreaInsets();
  const dir = useDirection();
  const BackIcon = dir.isRTL ? ChevronRight : ChevronLeft;

  const handleBack = () => {
    hapticTap();
    onBack?.();
  };

  const handleRight = () => {
    hapticTap();
    onRightPress?.();
  };

  const content = (
    <>
      <View style={[styles.headerContent, { flexDirection: dir.row }]}>
        {onBack ? (
          <TouchableOpacity style={styles.backButton} onPress={handleBack} activeOpacity={0.7}>
            <BackIcon color={COLORS.text} size={24} />
          </TouchableOpacity>
        ) : (
          <View style={styles.spacer} />
        )}

        {typeof title === 'string' ? (
          <Text style={[styles.headerTitle, { textAlign: dir.textAlign }]} numberOfLines={1}>{title}</Text>
        ) : (
          <View style={styles.headerTitleWrap}>{title}</View>
        )}

        {rightAction && onRightPress ? (
          <TouchableOpacity onPress={handleRight} style={styles.rightActionBtn} activeOpacity={0.7}>
            {rightAction}
          </TouchableOpacity>
        ) : rightAction ? (
          <View style={styles.rightActionWrap}>
            {rightAction}
          </View>
        ) : (
          <View style={styles.spacer} />
        )}
      </View>
      {variant === 'large' && typeof title === 'string' && (
        <Text style={[styles.largeTitle, { textAlign: dir.textAlign }]} numberOfLines={2}>
          {title}
        </Text>
      )}
      {subtitle ? (
        <Text style={[styles.subtitle, { textAlign: dir.textAlign }]} numberOfLines={1}>
          {subtitle}
        </Text>
      ) : null}
    </>
  );

  const containerStyle = [
    translucent ? styles.blurContainer : styles.headerContainer,
    topInset && { paddingTop: insets.top + 10 },
  ];

  if (translucent) {
    return (
      <BlurView intensity={80} tint="light" style={containerStyle}>
        <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
        {content}
      </BlurView>
    );
  }

  return (
    <View style={containerStyle}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      {content}
    </View>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    backgroundColor: COLORS.white,
    paddingBottom: 12,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  blurContainer: {
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    height: 44,
  },
  headerTitle: {
    fontSize: FONT_SIZES.xl,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.text,
    textAlign: 'center',
    flex: 1,
  },
  largeTitle: {
    fontSize: FONT_SIZES.title,
    fontWeight: FONT_WEIGHTS.extrabold,
    color: COLORS.text,
    paddingHorizontal: 16,
    paddingTop: 4,
  },
  subtitle: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.regular,
    color: COLORS.textSecondary,
    paddingHorizontal: 16,
    paddingTop: 2,
  },
  headerTitleWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.gray50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rightActionBtn: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.gray50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rightActionWrap: {
    minWidth: 40,
    minHeight: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  spacer: {
    width: 40,
  },
});
