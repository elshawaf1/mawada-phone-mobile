import React from 'react';
import {
  StyleSheet,
  View,
  TouchableOpacity,
  Text,
  ImageBackground,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native';
import { Mail, CheckCircle } from 'lucide-react-native';
import { useTranslation } from '../../context/AppSettingsContext';
import { useDirection } from '../../hooks/useDirection';
import Button from '../../components/Button';

export default function EmailConfirmationScreen({ navigation, route }) {
  const { t } = useTranslation();
  const dir = useDirection();
  const { email, name } = route?.params || { email: '', name: '' };

  const handleGoToHome = () => {
    navigation.reset({ index: 0, routes: [{ name: 'Home' }] });
  };

  const handleResendEmail = () => {
  };

  return (
    <ScrollView style={styles.container} bounces={false} showsVerticalScrollIndicator={false}>
      <ImageBackground
        source={require('../../assets/Vector 3-1.jpg')}
        style={styles.headerBackground}
        resizeMode="cover"
      >
        <SafeAreaView style={styles.safeArea} />
      </ImageBackground>

      <View style={styles.formContainer}>
        <View style={styles.iconContainer}>
          <CheckCircle size={64} color="#10B981" />
        </View>

        <Text style={styles.title}>{t('auth.emailConfirmTitle')}</Text>
        <Text style={styles.subtitle}>
          {t('auth.emailConfirmSubtitle', { name })}
        </Text>

        <View style={styles.emailBox}>
          <Mail size={20} color="#64748B" />
          <Text style={styles.emailText}>{email}</Text>
        </View>

        <Text style={styles.infoText}>
          {t('auth.emailConfirmDesc')}
        </Text>

        <Button title={t('auth.startShopping')} onPress={handleGoToHome} fullWidth style={styles.homeButton} />

        <TouchableOpacity style={styles.resendButton} onPress={handleResendEmail}>
          <Text style={styles.resendText}>{t('auth.resendEmail')}</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  headerBackground: {
    width: '100%',
    height: 220,
  },
  safeArea: {
    flex: 1,
  },
  formContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
    marginTop: -30,
    paddingTop: 40,
    paddingHorizontal: 26,
    alignItems: 'center',
    minHeight: 620,
  },
  iconContainer: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 28,
    lineHeight: 24,
  },
  emailBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 14,
    padding: 16,
    gap: 12,
    marginBottom: 24,
    width: '100%',
  },
  emailText: {
    fontSize: 15,
    color: '#0F172A',
    fontWeight: '600',
  },
  infoText: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
    paddingHorizontal: 8,
  },
  homeButton: {},
  homeButtonText: { color: '#FFFFFF', fontSize: 17, fontWeight: '700' },
  resendButton: {
    marginTop: 20,
    padding: 12,
  },
  resendText: {
    color: '#0F172A',
    fontSize: 14,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});
