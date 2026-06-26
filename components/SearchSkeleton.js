import React, { useEffect, useRef } from 'react';
import { StyleSheet, View, Animated, Dimensions } from 'react-native';
import { COLORS, RADIUS, SCREEN } from '../constants';

const CARD_W = (SCREEN.width - 48) / 2;

function ShimmerBlock({ style }) {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, []);

  return <Animated.View style={[style, { opacity, backgroundColor: COLORS.gray200 }]} />;
}

function SkeletonCard() {
  return (
    <View style={styles.card}>
      <ShimmerBlock style={styles.image} />
      <View style={styles.info}>
        <ShimmerBlock style={styles.brandLine} />
        <ShimmerBlock style={styles.titleLine} />
        <ShimmerBlock style={styles.priceLine} />
      </View>
    </View>
  );
}

export function ProductGridSkeleton({ count = 6 }) {
  const rows = [];
  for (let i = 0; i < count; i += 2) {
    rows.push(
      <View key={i} style={styles.row}>
        <SkeletonCard />
        {i + 1 < count && <SkeletonCard />}
      </View>
    );
  }
  return <View style={styles.grid}>{rows}</View>;
}

export function SearchSkeleton() {
  return (
    <View style={styles.container}>
      <ShimmerBlock style={styles.searchBar} />
      <View style={styles.pillRow}>
        {[1, 2, 3, 4].map((i) => (
          <ShimmerBlock key={i} style={styles.pill} />
        ))}
      </View>
      <ProductGridSkeleton count={6} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 16, paddingTop: 16 },
  searchBar: {
    height: 50, borderRadius: RADIUS.xxl, backgroundColor: COLORS.gray200,
    marginBottom: 16,
  },
  pillRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  pill: {
    height: 32, width: 80, borderRadius: 20, backgroundColor: COLORS.gray200,
  },
  grid: { gap: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  card: {
    width: CARD_W, borderRadius: 24, overflow: 'hidden',
    backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.gray100,
  },
  image: { height: 180, backgroundColor: COLORS.gray200 },
  info: { paddingHorizontal: 12, paddingTop: 10, paddingBottom: 14, gap: 6 },
  brandLine: { height: 10, width: '50%', borderRadius: 4 },
  titleLine: { height: 14, width: '80%', borderRadius: 4 },
  priceLine: { height: 18, width: '40%', borderRadius: 4 },
});
