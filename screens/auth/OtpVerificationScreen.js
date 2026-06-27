import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Animated,
  StatusBar,
} from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from '../../context/AppSettingsContext';
import Button from '../../components/Button';

const RESEND_COOLDOWN = 60;

export default function OtpVerificationScreen({ navigation, route }) {
  const { t } = useTranslation();
  const { verifyEmailOtp } = useAuth();
  const { email, type = 'signup', name, phone } = route?.params || {};

  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN);
  const [success, setSuccess] = useState(false);

  const shakeAnim = useRef(new Animated.Value(0)).current;
  const inputs = useRef([]);

  useEffect(() => {
    if (inputs.current[0]) {
      setTimeout(() => inputs.current[0]?.focus(), 400);
    }
  }, []);

  useEffect(() => {
    if (cooldown <= 0) return;
    const interval = setInterval(() => setCooldown((c) => c - 1), 1000);
    return () => clearInterval(interval);
  }, [cooldown]);

  const shake = useCallback(() => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 8, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  }, [shakeAnim]);

  const handleChange = (text, index) => {
    const trimmed = text.replace(/[^0-9]/g, '');
    setError('');

    if (trimmed.length > 1) {
      const digits = trimmed.slice(0, 6).split('');
      const next = [...code];
      digits.forEach((d, i) => {
        if (index + i < 6) next[index + i] = d;
      });
      setCode(next);
      const focusIdx = Math.min(index + digits.length, 5);
      setTimeout(() => inputs.current[focusIdx]?.focus(), 50);
      return;
    }

    const next = [...code];
    next[index] = trimmed;
    setCode(next);

    if (trimmed && index < 5) {
      setTimeout(() => inputs.current[index + 1]?.focus(), 50);
    }
  };

  const handleKeyPress = (e, index) => {
    if (e.nativeEvent.key === 'Backspace' && !code[index] && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  };

  const handleSubmit = async () => {
    const token = code.join('');
    if (token.length !== 6) {
      setError(t('auth.enterSixDigits'));
      shake();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    setLoading(true);
    setError('');
    try {
      await verifyEmailOtp(email, token, type, { name, phone });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setSuccess(true);

      setTimeout(() => {
        if (type === 'signup') {
          navigation.reset({ index: 0, routes: [{ name: 'Home' }] });
        } else if (type === 'recovery') {
          navigation.replace('ResetPassword');
        }
      }, 1200);
    } catch (err) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      shake();

      if (err.message === 'otpExpired') {
        setError(t('auth.otpExpired'));
      } else if (err.message === 'otpInvalid') {
        setError(t('auth.otpInvalid'));
      } else {
        setError(err.message || t('auth.otpInvalid'));
      }
      setCode(['', '', '', '', '', '']);
      setTimeout(() => inputs.current[0]?.focus(), 100);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0) return;
    try {
      if (type === 'signup') {
        await supabase.auth.signInWithOtp({ email });
      } else {
        await supabase.auth.resetPasswordForEmail(email);
      }
      setCooldown(RESEND_COOLDOWN);
      setCode(['', '', '', '', '', '']);
      setError('');
      setTimeout(() => inputs.current[0]?.focus(), 100);
    } catch (err) {
      setError(err.message);
    }
  };

  const isSignup = type === 'signup';

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={20}
    >
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      <View style={styles.inner}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <ChevronRight size={22} color="#0F172A" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {isSignup ? t('auth.otpTitle') : t('auth.resetPassword')}
          </Text>
          <View style={styles.headerPlaceholder} />
        </View>

        <Text style={styles.infoText}>
          {isSignup ? t('auth.otpSubtitle') : t('auth.resetPasswordDesc')}
        </Text>

        <View style={styles.emailBox}>
          <Text style={styles.emailText}>{email}</Text>
        </View>

        <Animated.View style={[styles.codeRow, { transform: [{ translateX: shakeAnim }] }]}>
          {code.map((value, index) => (
            <TextInput
              key={index}
              ref={(el) => { inputs.current[index] = el; }}
              style={[
                styles.codeInput,
                error ? styles.codeInputError : null,
                value ? styles.codeInputFilled : null,
              ]}
              keyboardType="number-pad"
              maxLength={1}
              value={value}
              onChangeText={(text) => handleChange(text, index)}
              onKeyPress={(e) => handleKeyPress(e, index)}
              textAlign="center"
              selectionColor="#0F172A"
              textContentType={Platform.OS === 'ios' ? 'oneTimeCode' : 'none'}
              autoFocus={index === 0}
              selectTextOnFocus
            />
          ))}
        </Animated.View>

        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {success ? (
          <View style={styles.successBox}>
            <Text style={styles.successText}>{t('auth.otpSuccess')}</Text>
          </View>
        ) : null}

        <Button
          title={loading ? '' : t('auth.confirmOtp')}
          onPress={handleSubmit}
          loading={loading}
          disabled={loading || success}
          fullWidth
          style={styles.submitBtn}
        />

        <View style={styles.resendRow}>
          {cooldown > 0 ? (
            <Text style={styles.cooldownText}>
              {t('auth.resendIn', { seconds: cooldown })}
            </Text>
          ) : (
            <TouchableOpacity onPress={handleResend} style={styles.resendBtn}>
              <Text style={styles.resendText}>{t('auth.resendOtp')}</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  inner: { flex: 1, paddingHorizontal: 24, justifyContent: 'flex-start' },
  header: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 18,
    marginBottom: 24,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },
  headerTitle: {
    color: '#0F172A',
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'right',
  },
  headerPlaceholder: { width: 44 },
  infoText: {
    color: '#64748B',
    fontSize: 15,
    textAlign: 'right',
    lineHeight: 22,
    marginBottom: 12,
  },
  emailBox: {
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    padding: 14,
    marginBottom: 32,
    alignItems: 'center',
  },
  emailText: {
    fontSize: 15,
    color: '#0F172A',
    fontWeight: '700',
    writingDirection: 'ltr',
  },
  codeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  codeInput: {
    width: 50,
    height: 56,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    fontSize: 22,
    fontWeight: '700',
    color: '#0F172A',
    backgroundColor: '#F8FAFC',
    textAlign: 'center',
    writingDirection: 'ltr',
  },
  codeInputError: {
    borderColor: '#EF4444',
    backgroundColor: '#FEF2F2',
  },
  codeInputFilled: {
    borderColor: '#0F172A',
    backgroundColor: '#F1F5F9',
  },
  errorBox: {
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderLeftWidth: 3,
    borderLeftColor: '#EF4444',
  },
  errorText: {
    color: '#991B1B',
    fontSize: 13,
    textAlign: 'right',
  },
  successBox: {
    backgroundColor: '#F0FDF4',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderLeftWidth: 3,
    borderLeftColor: '#22C55E',
  },
  successText: {
    color: '#166534',
    fontSize: 13,
    textAlign: 'center',
    fontWeight: '700',
  },
  submitBtn: {
    marginTop: 8,
  },
  resendRow: {
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 24,
  },
  cooldownText: {
    color: '#94A3B8',
    fontSize: 14,
    fontWeight: '600',
  },
  resendBtn: {
    padding: 12,
  },
  resendText: {
    color: '#0F172A',
    fontSize: 14,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
});
