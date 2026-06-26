import React, { useRef, useEffect } from 'react';
import { View, Animated, StyleSheet } from 'react-native';
import { COLORS, RADIUS } from '../constants';

function SkeletonBox({ width, height, borderRadius = RADIUS.md, style }) {
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
        Animated.timing(shimmerAnim, { toValue: 0, duration: 1000, useNativeDriver: true }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, []);

  return (
    <View style={[{ width, height, borderRadius, backgroundColor: COLORS.gray100, overflow: 'hidden' }]}>
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          {
            backgroundColor: COLORS.gray200,
            borderRadius,
            opacity: shimmerAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [0.3, 0.7],
            }),
          },
        ]}
      />
    </View>
  );
}

export function ProductCardSkeleton({ index }) {
  const marginRight = index % 2 === 0 ? 0 : 6;
  return (
    <View style={[styles.productCard, { marginRight }]}>
      <SkeletonBox width="100%" height={150} borderRadius={RADIUS.xl} />
      <View style={styles.productInfo}>
        <SkeletonBox width="80%" height={14} borderRadius={RADIUS.sm} />
        <SkeletonBox width="50%" height={12} borderRadius={RADIUS.sm} />
        <SkeletonBox width="40%" height={18} borderRadius={RADIUS.sm} />
      </View>
    </View>
  );
}

export function ProductGridSkeleton({ count = 4 }) {
  return (
    <View style={styles.grid}>
      {Array.from({ length: count }, (_, i) => (
        <ProductCardSkeleton key={i} index={i} />
      ))}
    </View>
  );
}

export function HorizontalCardSkeleton({ count = 3 }) {
  return (
    <View style={styles.horizontalScroll}>
      {Array.from({ length: count }, (_, i) => (
        <View key={i} style={styles.horizontalCard}>
          <SkeletonBox width="100%" height={130} borderRadius={RADIUS.xl} />
          <View style={styles.horizontalInfo}>
            <SkeletonBox width="70%" height={12} borderRadius={RADIUS.sm} />
            <SkeletonBox width="40%" height={16} borderRadius={RADIUS.sm} />
          </View>
        </View>
      ))}
    </View>
  );
}

export function BannerSkeleton() {
  return (
    <View style={styles.bannerContainer}>
      <SkeletonBox width="100%" height={150} borderRadius={RADIUS.xl} />
    </View>
  );
}

export function ListSkeleton({ rows = 4 }) {
  return (
    <View style={styles.list}>
      {Array.from({ length: rows }, (_, i) => (
        <View key={i} style={styles.listRow}>
          <SkeletonBox width={44} height={44} borderRadius={RADIUS.full} />
          <View style={styles.listContent}>
            <SkeletonBox width="70%" height={14} borderRadius={RADIUS.sm} />
            <SkeletonBox width="40%" height={12} borderRadius={RADIUS.sm} />
          </View>
        </View>
      ))}
    </View>
  );
}

export default SkeletonBox;

const styles = StyleSheet.create({
  productCard: {
    width: '48%',
    marginBottom: 12,
    gap: 8,
  },
  productInfo: { gap: 6, padding: 4 },
  grid: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingTop: 8,
  },
  horizontalScroll: {
    flexDirection: 'row-reverse',
    paddingHorizontal: 16,
    gap: 12,
  },
  horizontalCard: {
    width: 160,
    gap: 8,
  },
  horizontalInfo: { gap: 6, padding: 4 },
  bannerContainer: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  list: {
    paddingHorizontal: 16,
    gap: 16,
    paddingTop: 8,
  },
  listRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 12,
  },
  listContent: {
    flex: 1,
    gap: 6,
  },
});
