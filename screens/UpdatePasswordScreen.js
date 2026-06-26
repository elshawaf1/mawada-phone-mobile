import React, { useState } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, ScrollView, Alert, StatusBar } from 'react-native';
import { Lock, Eye, EyeOff } from 'lucide-react-native';
import { supabase } from '../services/supabase';
import { useTranslation } from '../context/AppSettingsContext';
import Button from '../components/Button';
import ScreenHeader from '../components/ScreenHeader';
import { useDirection } from '../hooks/useDirection';

export default function UpdatePasswordScreen({ navigation }) {
  const { t } = useTranslation();
  const dir = useDirection();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleChange = async () => {
    if (!currentPassword || !newPassword) {
      Alert.alert(t('common.error'), t('auth.fillAllFields'));
      return;
    }
    if (newPassword.length < 8) {
      Alert.alert(t('common.error'), t('auth.passwordMin'));
      return;
    }
    if (!/[A-Z]/.test(newPassword)) {
      Alert.alert(t('common.error'), t('auth.passwordUpper'));
      return;
    }
    if (!/[0-9]/.test(newPassword)) {
      Alert.alert(t('common.error'), t('auth.passwordDigit'));
      return;
    }
    setLoading(true);
    try {
      const { error: reAuthError } = await supabase.auth.reauthenticate(currentPassword);
      if (reAuthError) {
        Alert.alert(t('common.error'), t('auth.currentPasswordWrong'));
        return;
      }
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      Alert.alert(t('common.done'), t('auth.passwordChanged'));
      navigation.goBack();
    } catch (err) {
      Alert.alert(t('common.error'), err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <ScreenHeader title={t('auth.changePassword')} onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.inputWrapper}>
          <Text style={[styles.label, { textAlign: dir.textAlign }]}>{t('auth.currentPassword')}</Text>
          <View style={styles.inputRow}>
            <TouchableOpacity onPress={() => setShowCurrent(!showCurrent)}>
              {showCurrent ? <EyeOff size={20} color="#94A3B8" /> : <Eye size={20} color="#94A3B8" />}
            </TouchableOpacity>
            <TextInput style={styles.input} value={currentPassword} onChangeText={setCurrentPassword} secureTextEntry={!showCurrent} textAlign={dir.textAlign} placeholder="••••••••" placeholderTextColor="#94A3B8" />
            <Lock size={20} color="#94A3B8" />
          </View>
        </View>

        <View style={styles.inputWrapper}>
          <Text style={[styles.label, { textAlign: dir.textAlign }]}>{t('auth.newPassword')}</Text>
          <View style={styles.inputRow}>
            <TouchableOpacity onPress={() => setShowNew(!showNew)}>
              {showNew ? <EyeOff size={20} color="#94A3B8" /> : <Eye size={20} color="#94A3B8" />}
            </TouchableOpacity>
            <TextInput style={styles.input} value={newPassword} onChangeText={setNewPassword} secureTextEntry={!showNew} textAlign={dir.textAlign} placeholder="••••••••" placeholderTextColor="#94A3B8" />
            <Lock size={20} color="#94A3B8" />
          </View>
        </View>

        <Button title={t('auth.changePassword')} onPress={handleChange} loading={loading} disabled={loading} fullWidth />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  content: { padding: 24 },
  inputWrapper: { marginBottom: 22 },
  label: { textAlign: 'right', color: '#64748B', marginBottom: 8, fontSize: 13, fontWeight: '600' },
  inputRow: { flexDirection: 'row-reverse', alignItems: 'center', backgroundColor: '#fff', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, borderWidth: 1, borderColor: '#F1F5F9' },
  input: { flex: 1, paddingHorizontal: 10, fontSize: 15, color: '#0F172A', textAlign: 'right' },
});
