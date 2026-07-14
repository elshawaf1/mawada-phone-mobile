import React, { useState } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import ScreenHeader from '../../components/ScreenHeader';
import { Lock, Eye, EyeOff, CheckCircle } from 'lucide-react-native';
import { supabase } from '../../services/supabase';
import { useTranslation } from '../../context/AppSettingsContext';
import { useMessageBox } from '../../context/MessageBoxContext';
import { useDirection } from '../../hooks/useDirection';
import Button from '../../components/Button';

export default function ResetPasswordScreen({ navigation }) {
  const { t } = useTranslation();
  const dir = useDirection();
  const { showMessageBox } = useMessageBox();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleReset = async () => {
    if (!newPassword || !confirmPassword) {
      showMessageBox({ type: 'error', title: t('common.error'), message: t('auth.fillAllFields') });
      return;
    }
    if (newPassword.length < 8) {
      showMessageBox({ type: 'error', title: t('common.error'), message: t('auth.passwordMin') });
      return;
    }
    if (!/[A-Z]/.test(newPassword)) {
      showMessageBox({ type: 'error', title: t('common.error'), message: t('auth.passwordUpper') });
      return;
    }
    if (!/[0-9]/.test(newPassword)) {
      showMessageBox({ type: 'error', title: t('common.error'), message: t('auth.passwordDigit') });
      return;
    }
    if (newPassword !== confirmPassword) {
      showMessageBox({ type: 'error', title: t('common.error'), message: t('auth.passwordsNotMatch') });
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setSuccess(true);
      setTimeout(() => {
        supabase.auth.signOut();
        navigation.replace('Login');
      }, 2000);
    } catch (err) {
      showMessageBox({ type: 'error', title: t('common.error'), message: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
        <ScreenHeader
          title={t('auth.setNewPassword')}
          onBack={() => navigation.goBack()}
        />

        <View style={styles.content}>
          {success ? (
            <View style={styles.successContainer}>
              <CheckCircle size={64} color="#22C55E" />
              <Text style={[styles.title, { textAlign: dir.textAlign, marginTop: 20 }]}>{t('auth.passwordChanged')}</Text>
              <Text style={[styles.desc, { textAlign: dir.textAlign }]}>{t('auth.redirectingToLogin')}</Text>
            </View>
          ) : (
            <>
              <Text style={[styles.title, { textAlign: dir.textAlign }]}>{t('auth.setNewPassword')}</Text>
              <Text style={[styles.desc, { textAlign: dir.textAlign }]}>{t('auth.setNewPasswordDesc')}</Text>

              <View style={styles.inputWrapper}>
                <Text style={[styles.label, { textAlign: dir.textAlign }]}>{t('auth.newPassword')}</Text>
                <View style={styles.inputRow}>
                  <Lock size={20} color="#94A3B8" />
                  <TextInput
                    style={styles.input}
                    placeholder="••••••••"
                    placeholderTextColor="#94A3B8"
                    secureTextEntry={!showNew}
                    textAlign={dir.textAlign}
                    value={newPassword}
                    onChangeText={setNewPassword}
                  />
                  <TouchableOpacity onPress={() => setShowNew(!showNew)}>
                    {showNew ? <EyeOff size={20} color="#94A3B8" /> : <Eye size={20} color="#94A3B8" />}
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.inputWrapper}>
                <Text style={[styles.label, { textAlign: dir.textAlign }]}>{t('auth.confirmNewPassword')}</Text>
                <View style={styles.inputRow}>
                  <Lock size={20} color="#94A3B8" />
                  <TextInput
                    style={styles.input}
                    placeholder="••••••••"
                    placeholderTextColor="#94A3B8"
                    secureTextEntry={!showConfirm}
                    textAlign={dir.textAlign}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                  />
                  <TouchableOpacity onPress={() => setShowConfirm(!showConfirm)}>
                    {showConfirm ? <EyeOff size={20} color="#94A3B8" /> : <Eye size={20} color="#94A3B8" />}
                  </TouchableOpacity>
                </View>
              </View>

              <Button
                title={t('auth.resetPassword')}
                onPress={handleReset}
                loading={loading}
                disabled={loading}
                fullWidth
              />
            </>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  content: { paddingHorizontal: 26, paddingTop: 20 },
  title: { fontSize: 28, fontWeight: '800', color: '#0F172A', textAlign: 'left', marginBottom: 12 },
  desc: { fontSize: 14, color: '#64748B', textAlign: 'left', lineHeight: 22, marginBottom: 32 },
  inputWrapper: { marginBottom: 22 },
  label: { textAlign: 'left', color: '#64748B', marginBottom: 10, fontSize: 14, fontWeight: '600' },
  inputRow: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1.5, borderBottomColor: '#CBD5E1', paddingBottom: 10, gap: 10 },
  input: { flex: 1, paddingHorizontal: 10, fontSize: 16, color: '#0F172A', textAlign: 'left' },
  successContainer: { alignItems: 'center', paddingTop: 60 },
});
