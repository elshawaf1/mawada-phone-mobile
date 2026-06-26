import React, { useEffect, useRef, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
  SafeAreaView,
} from 'react-native';
import { ChevronLeft } from 'lucide-react-native';
import { useTranslation } from '../../context/AppSettingsContext';
import { useDirection } from '../../hooks/useDirection';
import Button from '../../components/Button';

export default function OtpVerificationScreen({ navigation, route, completeAuth }) {
  const [code, setCode] = useState(['', '', '', '']);
  const { t } = useTranslation();
  const dir = useDirection();
  const authPayload = route?.params?.authPayload || {};
  const inputs = [useRef(null), useRef(null), useRef(null), useRef(null)];

  useEffect(() => {
    const firstInput = inputs[0].current;
    if (firstInput) {
      firstInput.focus();
    }
  }, []);

  const handleChange = (value, index) => {
    const trimmed = value.replace(/[^0-9]/g, '');
    const next = [...code];
    next[index] = trimmed.slice(-1);
    setCode(next);

    if (trimmed && index < inputs.length - 1) {
      inputs[index + 1].current?.focus();
    }

    if (!trimmed && index > 0) {
      inputs[index - 1].current?.focus();
    }
  };

  const handleSubmit = () => {
    if (code.every((digit) => digit.length === 1)) {
      if (completeAuth) {
        completeAuth({
          userName: authPayload.name || 'علي',
          email: authPayload.email || '',
          phone: authPayload.phone || '',
        });
      } else {
        navigation.reset({ index: 0, routes: [{ name: 'Home' }] });
      }
      return;
    }

    Alert.alert(t('auth.verifyPhone'), t('auth.enterOtp'));
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.inner}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={20}
      >
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={navigation.goBack}>
            <ChevronLeft size={20} color="#0F172A" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('auth.verifyPhone')}</Text>
          <View style={styles.headerPlaceholder} />
        </View>

        <Text style={styles.infoText}>
          {t('auth.otpSent', { phone: authPayload.phone || '' })}
        </Text>

        <View style={styles.codeRow}>
          {code.map((value, index) => (
            <TextInput
              key={index}
              ref={(element) => {
                inputs[index].current = element;
              }}
              style={styles.codeInput}
              keyboardType="number-pad"
              maxLength={1}
              value={value}
              onChangeText={(text) => handleChange(text, index)}
              textAlign="center"
              selectionColor="#0F172A"
            />
          ))}
        </View>

        <Text style={styles.subText}>{t('auth.otpInstruction')}</Text>

        <Button title={t('auth.confirmOtp')} onPress={handleSubmit} fullWidth />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  inner: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'flex-start',
  },
  header: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 18,
    marginBottom: 30,
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
  headerPlaceholder: {
    width: 44,
  },
  infoText: {
    color: '#64748B',
    fontSize: 15,
    textAlign: 'right',
    lineHeight: 22,
    marginBottom: 28,
  },
  codeRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  codeInput: {
    width: 64,
    height: 64,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    fontSize: 24,
    color: '#0F172A',
    backgroundColor: '#F8FAFC',
  },
  subText: {
    color: '#64748B',
    fontSize: 14,
    textAlign: 'right',
    marginBottom: 24,
  },

});
