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
} from 'react-native';
import { Mail, Lock, Eye, EyeOff, Phone, User } from 'lucide-react-native';
import { useTranslation } from '../../context/AppSettingsContext';
import { useDirection } from '../../hooks/useDirection';
import { useAuth } from '../../context/AuthContext';
import Button from '../../components/Button';

export default function RegisterScreen({ navigation }) {
  const { register } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isConfirmVisible, setIsConfirmVisible] = useState(false);
  const [error, setError] = useState('');
  const { t } = useTranslation();
  const dir = useDirection();

  const handleRegister = async () => {
    setError('');

    if (!name || !email || !phone || !password || !confirmPassword) {
      setError(t('auth.fillAllFields'));
      return;
    }

    if (password !== confirmPassword) {
      setError(t('auth.passwordsNoMatch'));
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError(t('auth.invalidEmail'));
      return;
    }

    const phoneDigits = phone.replace(/\D/g, '');
    const phoneRegex = /^01[0-9]{9}$/;
    if (!phoneRegex.test(phoneDigits)) {
      setError(t('auth.phoneError'));
      return;
    }

    if (password.length < 8) {
      setError(t('auth.passwordMin'));
      return;
    }

    if (!/[A-Z]/.test(password)) {
      setError(t('auth.passwordUpper'));
      return;
    }

    if (!/[0-9]/.test(password)) {
      setError(t('auth.passwordDigit'));
      return;
    }

    setIsLoading(true);
    try {
      const result = await register(name, email, phone, password);
      if (result?.emailConfirmed === false) {
        navigation.navigate('EmailConfirmation', { email });
      } else if (result) {
        navigation.reset({ index: 0, routes: [{ name: 'Home' }] });
      }
    } catch (err) {
      setError(err.message || t('auth.registerFailed'));
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
        <Text style={styles.title}>{t('auth.createAccount')}</Text>

        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <View style={styles.inputWrapper}>
          <Text style={styles.label}>{t('auth.fullName')}</Text>
          <View style={styles.inputRow}>
            <User size={18} color="#94A3B8" />
            <TextInput
              style={styles.input}
              placeholder="أحمد محمد"
              placeholderTextColor="#94A3B8"
              textAlign="right"
              value={name}
              onChangeText={setName}
            />
          </View>
        </View>

        <View style={styles.inputWrapper}>
          <Text style={styles.label}>{t('auth.email')}</Text>
          <View style={styles.inputRow}>
            <Mail size={18} color="#94A3B8" />
            <TextInput
              style={styles.input}
              placeholder="example@mail.com"
              placeholderTextColor="#94A3B8"
              textAlign="right"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
            />
          </View>
        </View>

        <View style={styles.inputWrapper}>
          <Text style={styles.label}>{t('auth.phone')}</Text>
          <View style={styles.inputRow}>
            <Phone size={18} color="#94A3B8" />
            <TextInput
              style={styles.input}
              placeholder="+20 000-000-0000"
              placeholderTextColor="#94A3B8"
              textAlign="right"
              keyboardType="phone-pad"
              value={phone}
              onChangeText={setPhone}
            />
          </View>
        </View>

        <View style={styles.inputWrapper}>
          <Text style={styles.label}>{t('auth.password')}</Text>
          <View style={styles.inputRow}>
            <TouchableOpacity onPress={() => setIsPasswordVisible((prev) => !prev)}>
              {isPasswordVisible ? <EyeOff size={18} color="#94A3B8" /> : <Eye size={18} color="#94A3B8" />}
            </TouchableOpacity>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!isPasswordVisible}
              placeholder="••••••••"
              placeholderTextColor="#94A3B8"
              textAlign="right"
            />
            <Lock size={18} color="#94A3B8" />
          </View>
        </View>

        <View style={styles.inputWrapper}>
          <Text style={styles.label}>{t('auth.confirmPassword')}</Text>
          <View style={styles.inputRow}>
            <TouchableOpacity onPress={() => setIsConfirmVisible((prev) => !prev)}>
              {isConfirmVisible ? <EyeOff size={18} color="#94A3B8" /> : <Eye size={18} color="#94A3B8" />}
            </TouchableOpacity>
            <TextInput
              style={styles.input}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!isConfirmVisible}
              placeholder="••••••••"
              placeholderTextColor="#94A3B8"
              textAlign="right"
            />
            <Lock size={18} color="#94A3B8" />
          </View>
        </View>

        <Button
          title={isLoading ? t('auth.creatingAccount') : t('auth.proceedToVerify')}
          loading={isLoading}
          onPress={handleRegister}
          fullWidth
        />

        <TouchableOpacity style={styles.footerLink} onPress={() => navigation.navigate('Login')}>
          <Text style={styles.linkHighlight}>{t('auth.login')}</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
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
    paddingTop: 42,
    paddingHorizontal: 28,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 42,
    borderTopRightRadius: 42,
    marginTop: -44,
    paddingBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'right',
    marginBottom: 28,
  },
  errorBox: {
    backgroundColor: '#fee2e2',
    borderRadius: 12,
    padding: 14,
    marginBottom: 18,
    borderLeftWidth: 4,
    borderLeftColor: '#ef4444',
  },
  errorText: {
    color: '#991B1B',
    fontSize: 14,
    textAlign: 'right',
  },
  inputWrapper: {
    marginBottom: 20,
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
    borderBottomColor: '#E2E8F0',
    paddingBottom: 12,
  },
  input: {
    flex: 1,
    paddingHorizontal: 12,
    fontSize: 15,
    color: '#0F172A',
    ...Platform.select({ ios: { paddingVertical: 4 }, android: { paddingVertical: 0 } }),
  },
  registerButton: {
    height: 54,
    borderRadius: 24,
    backgroundColor: '#0F172A',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  registerButtonDisabled: {
    opacity: 0.65,
  },
  registerButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  footerLink: {
    marginTop: 24,
    alignItems: 'center',
  },
  linkHighlight: {
    color: '#0F172A',
    fontWeight: '800',
  },
});
