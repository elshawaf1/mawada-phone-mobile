import React, { useEffect, useRef, useMemo } from 'react';
import { Animated, StyleSheet, View } from 'react-native';

const COLORS = ['#0F172A', '#22C55E', '#F59E0B', '#38BDF8', '#FFFFFF'];

function ConfettiParticle({ config, originX, originY, index }) {
  const translateX = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const delay = config.delay + index * 50;
    Animated.sequence([
      Animated.delay(delay),
      Animated.parallel([
        Animated.timing(translateX, { toValue: config.x, duration: 600, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: config.y + 200, duration: 600, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 100, useNativeDriver: true }),
        Animated.spring(scale, { toValue: 1, friction: 8, tension: 80, useNativeDriver: true }),
      ]),
      Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <Animated.View
      style={[
        styles.particle,
        {
          left: originX - config.size / 2,
          top: originY - config.size / 2,
          width: config.size,
          height: config.size,
          borderRadius: config.size / 2,
          backgroundColor: config.color,
          opacity,
          transform: [{ translateX }, { translateY }, { scale }],
        },
      ]}
    />
  );
}

export default function ConfettiOverlay({ width, height }) {
  const particles = useMemo(() => {
    const items = [];
    for (let i = 0; i < 16; i++) {
      const angle = (Math.PI * 2 * i) / 16 + (Math.random() - 0.5) * 0.5;
      const dist = 60 + Math.random() * 120;
      items.push({
        x: Math.cos(angle) * dist,
        y: Math.sin(angle) * dist - 60,
        size: 6 + Math.random() * 8,
        color: COLORS[i % COLORS.length],
        delay: Math.random() * 150,
      });
    }
    return items;
  }, []);

  const originX = width / 2;
  const originY = height * 0.28;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {particles.map((p, i) => (
        <ConfettiParticle key={i} config={p} originX={originX} originY={originY} index={i} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  particle: { position: 'absolute' },
});
