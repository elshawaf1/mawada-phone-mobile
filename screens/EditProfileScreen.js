import React, { useState } from 'react';
import { StyleSheet, View, Text, TextInput, ScrollView, Alert, StatusBar } from 'react-native';
import { User, Mail, Phone } from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../services/supabase';
import { useTranslation } from '../context/AppSettingsContext';
import Button from '../components/Button';
import ScreenHeader from '../components/ScreenHeader';
import { useDirection } from '../hooks/useDirection';

export default function EditProfileScreen({ navigation }) {
  const { t } = useTranslation();
  const dir = useDirection();
  const { user, profile } = useAuth();
  const [name, setName] = useState(profile?.name || user?.user_metadata?.name || '');
  const [email] = useState(user?.email || '');
  const [phone, setPhone] = useState(profile?.phone || user?.phone || '');
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!name.trim() || name.trim().length < 2) {
      Alert.alert(t('common.error'), t('auth.fillAllFields'));
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .upsert({ id: user.id, name: name.trim(), phone: phone.trim(), updatedAt: new Date().toISOString() });
      if (error) throw error;
      Alert.alert(t('common.done'), t('settings.editProfile'));
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
      <ScreenHeader title={t('settings.editProfile')} onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.inputWrapper}>
          <Text style={[styles.label, { textAlign: dir.textAlign }]}>{t('auth.fullName')}</Text>
          <View style={[styles.inputRow, { flexDirection: dir.row }]}>
            <User size={20} color="#94A3B8" />
            <TextInput style={styles.input} value={name} onChangeText={setName} textAlign={dir.textAlign} placeholderTextColor="#94A3B8" />
          </View>
        </View>

        <View style={styles.inputWrapper}>
          <Text style={[styles.label, { textAlign: dir.textAlign }]}>{t('auth.email')}</Text>
          <View style={[styles.inputRow, styles.inputDisabled, { flexDirection: dir.row }]}>
            <Mail size={20} color="#CBD5E1" />
            <TextInput style={[styles.input, { color: '#94A3B8' }]} value={email} editable={false} textAlign={dir.textAlign} />
          </View>
        </View>

        <View style={styles.inputWrapper}>
          <Text style={[styles.label, { textAlign: dir.textAlign }]}>{t('auth.phone')}</Text>
          <View style={[styles.inputRow, { flexDirection: dir.row }]}>
            <Phone size={20} color="#94A3B8" />
            <TextInput style={styles.input} value={phone} onChangeText={setPhone} keyboardType="phone-pad" textAlign={dir.textAlign} placeholderTextColor="#94A3B8" />
          </View>
        </View>

        <Button title={t('common.save')} onPress={handleSave} loading={loading} disabled={loading} fullWidth style={{ marginTop: 12 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  content: { padding: 24 },
  inputWrapper: { width: '100%', marginBottom: 20 },
  label: { textAlign: 'left', color: '#64748B', marginBottom: 8, fontSize: 13, fontWeight: '600' },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  inputDisabled: { backgroundColor: '#F8FAFC', borderColor: '#F1F5F9' },
  input: { flex: 1, paddingHorizontal: 10, fontSize: 15, color: '#0F172A', textAlign: 'left' },
});
