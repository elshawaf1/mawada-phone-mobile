import React, { useRef, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ImageBackground,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Animated,
} from 'react-native';
import { useTranslation } from '../../context/AppSettingsContext';
import { useDirection } from '../../hooks/useDirection';
import { useFonts } from 'expo-font';
import Cairo_400Regular from '@expo-google-fonts/cairo/400Regular/Cairo_400Regular.ttf';
import Cairo_600SemiBold from '@expo-google-fonts/cairo/600SemiBold/Cairo_600SemiBold.ttf';
import Cairo_700Bold from '@expo-google-fonts/cairo/700Bold/Cairo_700Bold.ttf';
import Cairo_800ExtraBold from '@expo-google-fonts/cairo/800ExtraBold/Cairo_800ExtraBold.ttf';

export default function WelcomeScreen({ navigation }) {
  const { t } = useTranslation();
  const dir = useDirection();
  const [fontsLoaded] = useFonts({
    'Cairo_400Regular': Cairo_400Regular,
    'Cairo_600SemiBold': Cairo_600SemiBold,
    'Cairo_700Bold': Cairo_700Bold,
    'Cairo_800ExtraBold': Cairo_800ExtraBold,
  });

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 900,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 900,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  if (!fontsLoaded) {
    return <View style={styles.loadingContainer} />;
  }

  return (
    <ScrollView style={styles.container} bounces={false} showsVerticalScrollIndicator={false}>
      <ImageBackground
        source={require('../../assets/Vector 3.jpg')}
        style={styles.headerBackground}
        resizeMode="cover"
      >
        <View style={styles.headerOverlay}>
          <SafeAreaView style={styles.safeArea} />
        </View>
      </ImageBackground>

      <Animated.View
        style={[
          styles.card,
          { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
        ]}
      >
        <Text style={styles.title}>{t('auth.welcome')}</Text>
        <Text style={styles.desc}>
          {t('auth.welcomeDesc')}
        </Text>

        <TouchableOpacity
          style={styles.glassPrimary}
          onPress={() => navigation.navigate('Login')}
          activeOpacity={0.85}
        >
          <Text style={styles.glassPrimaryText}>{t('auth.login')}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.glassSecondary}
          onPress={() => navigation.navigate('Register')}
          activeOpacity={0.85}
        >
          <Text style={styles.glassSecondaryText}>{t('auth.register')}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.skipBtn}
          onPress={() => navigation.reset({ index: 0, routes: [{ name: 'Home' }] })}
          activeOpacity={0.7}
        >
          <Text style={styles.skipBtnText}>{t('auth.guest')}</Text>
        </TouchableOpacity>
      </Animated.View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0B1220',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerBackground: {
    width: '100%',
    height: 440,
  },
  headerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(11, 18, 32, 0.55)',
  },
  safeArea: {
    flex: 1,
  },

  card: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
    marginTop: -30,
    paddingTop: 32,
    paddingHorizontal: 26,
    paddingBottom: 32,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    fontFamily: 'Cairo_800ExtraBold',
    color: '#0F172A',
    textAlign: 'center',
    marginBottom: 10,
  },
  desc: {
    fontSize: 14,
    fontFamily: 'Cairo_400Regular',
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
    paddingHorizontal: 10,
  },

  glassPrimary: {
    width: '100%',
    height: 54,
    borderRadius: 16,
    backgroundColor: '#0F172A',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  glassPrimaryText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Cairo_700Bold',
  },

  glassSecondary: {
    width: '100%',
    height: 54,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  glassSecondaryText: {
    color: '#0F172A',
    fontSize: 16,
    fontFamily: 'Cairo_600SemiBold',
  },

  skipBtn: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  skipBtnText: {
    color: '#94A3B8',
    fontSize: 14,
    fontFamily: 'Cairo_400Regular',
    textDecorationLine: 'underline',
  },
});
