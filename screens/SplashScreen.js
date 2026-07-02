import React, { useEffect, useRef } from 'react';
import { StyleSheet, View, Animated, StatusBar, ImageBackground } from 'react-native';
import { useDirection } from '../hooks/useDirection';
import { useAuth } from '../context/AuthContext';

export default function SplashScreen({ navigation }) {
  const dir = useDirection();
  const { user, loading } = useAuth();
  const scaleAnim = useRef(new Animated.Value(0.3)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const navigated = useRef(false);

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 4,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  useEffect(() => {
    if (loading) return;
    if (navigated.current) return;

    const timer = setTimeout(() => {
      if (navigated.current) return;
      navigated.current = true;
      if (user) {
        navigation.replace('Home');
      } else {
        navigation.replace('Welcome');
      }
    }, 800);
    return () => clearTimeout(timer);
  }, [user, loading, navigation]);

  return (
    <ImageBackground
      source={require('../assets/Vector 3.jpg')}
      style={styles.container}
      resizeMode="cover"
    >
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
      <View style={styles.overlay}>
        <Animated.Image
          source={require('../assets/image 4.png')}
          style={[
            styles.logo,
            {
              transform: [{ scale: scaleAnim }],
              opacity: opacityAnim,
            },
          ]}
          resizeMode="contain"
        />
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.42)',
  },
  logo: {
    width: 480,
    height: 480,
  },
});
