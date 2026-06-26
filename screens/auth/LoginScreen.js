import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  TextInput,
  TouchableOpacity,
  Text,
  ImageBackground,
  SafeAreaView,
  ScrollView,
  Platform,
  Alert,
} from 'react-native';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react-native';
import { useTranslation } from '../../context/AppSettingsContext';
import { useDirection } from '../../hooks/useDirection';
import { useAuth } from '../../context/AuthContext';
import Button from '../../components/Button';

export default function LoginScreen({ navigation }) {
  const { login } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [phoneOrEmail, setPhoneOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [error, setError] = useState('');
  const { t } = useTranslation();
  const dir = useDirection();

  const handleLogin = async () => {
    setError('');
    if (!phoneOrEmail || !password) {
      setError(t('auth.enterEmailAndPassword'));
      return;
    }
    const trimmed = phoneOrEmail.trim();
    if (trimmed.includes('@')) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(trimmed)) {
        setError(t('auth.invalidEmail'));
        return;
      }
    } else {
      const digitsOnly = trimmed.replace(/\D/g, '');
      const egyptPhoneRegex = /^(?:20)?(10|11|12|15)\d{8}$/;
      if (!egyptPhoneRegex.test(digitsOnly)) {
        setError(t('auth.phoneError'));
        return;
      }
    }

    setIsLoading(true);
    try {
      const profile = await login(phoneOrEmail, password);
      if (profile) {
        navigation.reset({ index: 0, routes: [{ name: 'Home' }] });
      }
    } catch (err) {
      setError(err.message || t('auth.loginFailed'));
    } finally {
      setIsLoading(false);
    }
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
        <Text style={[styles.title, { textAlign: dir.textAlign }]}>{t('auth.login')}</Text>

        {error ? (
          <View style={styles.errorBox}>
            <Text style={[styles.errorText, { textAlign: dir.textAlign }]}>{error}</Text>
          </View>
        ) : null}

        <View style={styles.inputWrapper}>
          <Text style={[styles.label, { textAlign: dir.textAlign }]}>{t('auth.emailOrPhone')}</Text>
          <View style={styles.inputRow}>
            <Mail size={20} color="#94A3B8" />
            <TextInput
              style={styles.input}
              placeholder={t('auth.emailOrPhone')}
              placeholderTextColor="#94A3B8"
              keyboardType="email-address"
              textAlign={dir.textAlign}
              value={phoneOrEmail}
              onChangeText={setPhoneOrEmail}
            />
          </View>
        </View>

        <View style={styles.inputWrapper}>
          <Text style={[styles.label, { textAlign: dir.textAlign }]}>{t('auth.password')}</Text>
          <View style={styles.inputRow}>
            <TouchableOpacity onPress={() => setIsPasswordVisible((prev) => !prev)}>
              {isPasswordVisible ? (
                <EyeOff size={20} color="#94A3B8" />
              ) : (
                <Eye size={20} color="#94A3B8" />
              )}
            </TouchableOpacity>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!isPasswordVisible}
              placeholder="••••••••"
              placeholderTextColor="#94A3B8"
              textAlign={dir.textAlign}
            />
            <Lock size={20} color="#94A3B8" />
          </View>
        </View>

        <TouchableOpacity style={styles.forgotLink} onPress={() => navigation.navigate('ForgotPassword')}>
          <Text style={styles.forgotText}>{t('auth.forgotPassword')}</Text>
        </TouchableOpacity>

        <Button
          title={t('auth.loginNow')}
          onPress={handleLogin}
          loading={isLoading}
          disabled={isLoading}
          fullWidth
        />

        <TouchableOpacity style={styles.footerLink} onPress={() => navigation.navigate('Register')}>
          <Text style={styles.footerText}>
            {t('auth.noAccount')} <Text style={styles.linkHighlight}>{t('auth.createNew')}</Text>
          </Text>
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
    paddingTop: 36,
    paddingHorizontal: 26,
    minHeight: 620,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'right',
    marginBottom: 32,
  },
  errorBox: {
    backgroundColor: '#fee2e2',
    borderRadius: 14,
    padding: 14,
    marginBottom: 22,
    borderLeftWidth: 4,
    borderLeftColor: '#ef4444',
  },
  errorText: {
    color: '#991B1B',
    fontSize: 14,
    textAlign: 'right',
  },
  inputWrapper: {
    marginBottom: 22,
  },
  label: {
    textAlign: 'right',
    color: '#64748B',
    marginBottom: 10,
    fontSize: 14,
    fontWeight: '600',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1.5,
    borderBottomColor: '#CBD5E1',
    paddingBottom: 10,
  },
  input: {
    flex: 1,
    paddingHorizontal: 14,
    fontSize: 16,
    color: '#0F172A',
    ...Platform.select({ ios: { paddingBottom: 0 }, android: { paddingVertical: 0 } }),
  },
  footerLink: {
    marginTop: 24,
    alignItems: 'center',
  },
  footerText: {
    color: '#64748B',
    fontSize: 14,
  },
  linkHighlight: {
    color: '#0F172A',
    fontWeight: '800',
  },
  forgotLink: {
    alignSelf: 'flex-end',
    marginTop: 12,
    marginBottom: 4,
  },
  forgotText: {
    color: '#3B82F6',
    fontSize: 13,
    fontWeight: '600',
  },
});
