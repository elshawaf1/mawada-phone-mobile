import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, StatusBar } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../constants';
import { useDirection } from '../hooks/useDirection';

export default function ScreenHeader({ title, onBack, rightAction, onRightPress }) {
  const insets = useSafeAreaInsets();
  const dir = useDirection();

  return (
    <View style={[styles.headerContainer, { paddingTop: insets.top + 10 }]}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <View style={[styles.headerContent, { flexDirection: dir.row }]}>
        {onBack ? (
          <TouchableOpacity style={styles.backButton} onPress={onBack} activeOpacity={0.7}>
            <ChevronRight color={COLORS.text} size={24} />
          </TouchableOpacity>
        ) : (
          <View style={styles.spacer} />
        )}

        {typeof title === 'string' ? (
          <Text style={styles.headerTitle} numberOfLines={1}>{title}</Text>
        ) : (
          <View style={styles.headerTitleWrap}>{title}</View>
        )}

        {rightAction && onRightPress ? (
          <TouchableOpacity onPress={onRightPress} style={styles.rightActionBtn} activeOpacity={0.7}>
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
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    height: 44,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    textAlign: 'center',
  },
  headerTitleWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.gray50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rightActionBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
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
