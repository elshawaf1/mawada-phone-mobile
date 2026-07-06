import React, { useState } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native';
import { Mail, ChevronRight } from 'lucide-react-native';
import { supabase } from '../../services/supabase';
import { useTranslation } from '../../context/AppSettingsContext';
import { useDirection } from '../../hooks/useDirection';
import Button from '../../components/Button';

export default function ForgotPasswordScreen({ navigation }) {
  const { t } = useTranslation();
  const dir = useDirection();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleReset = async () => {
    if (!email) {
      Alert.alert(t('common.error'), t('auth.enterEmailAndPassword'));
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert(t('common.error'), t('auth.invalidEmail'));
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      if (error) throw error;
      navigation.navigate('Otp', { email, type: 'recovery' });
    } catch (err) {
      Alert.alert(t('common.error'), err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
        <SafeAreaView>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <ChevronRight size={22} color="#0F172A" />
          </TouchableOpacity>
        </SafeAreaView>

        <View style={styles.content}>
          <Text style={[styles.title, { textAlign: dir.textAlign }]}>{t('auth.resetPassword')}</Text>
          <Text style={[styles.desc, { textAlign: dir.textAlign }]}>
            {t('auth.resetPasswordDesc')}
          </Text>

          <View style={styles.inputWrapper}>
            <Text style={[styles.label, { textAlign: dir.textAlign }]}>{t('auth.email')}</Text>
            <View style={styles.inputRow}>
              <Mail size={20} color="#94A3B8" />
              <TextInput
                style={styles.input}
                placeholder="example@mail.com"
                placeholderTextColor="#94A3B8"
                keyboardType="email-address"
                autoCapitalize="none"
                textAlign={dir.textAlign}
                value={email}
                onChangeText={setEmail}
              />
            </View>
          </View>

          <Button
            title={loading ? t('common.loading') : t('auth.sendResetCode')}
            onPress={handleReset}
            loading={loading}
            disabled={loading}
            fullWidth
          />

          <TouchableOpacity style={styles.backLink} onPress={() => navigation.goBack()}>
            <Text style={styles.backLinkText}>{t('common.back')}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center', margin: 16 },
  content: { paddingHorizontal: 26, paddingTop: 20 },
  title: { fontSize: 28, fontWeight: '800', color: '#0F172A', textAlign: 'left', marginBottom: 12 },
  desc: { fontSize: 14, color: '#64748B', textAlign: 'left', lineHeight: 22, marginBottom: 32 },
  inputWrapper: { marginBottom: 22 },
  label: { textAlign: 'left', color: '#64748B', marginBottom: 10, fontSize: 14, fontWeight: '600' },
  inputRow: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1.5, borderBottomColor: '#CBD5E1', paddingBottom: 10 },
  input: { flex: 1, paddingHorizontal: 14, fontSize: 16, color: '#0F172A', textAlign: 'left' },
  backLink: { marginTop: 24, alignItems: 'center' },
  backLinkText: { color: '#64748B', fontSize: 14, fontWeight: '600' },
});
