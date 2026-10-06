import React, { useState } from 'react';
import { StyleSheet, View, Text, TextInput, ScrollView, StatusBar, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { User, Mail, Phone, X } from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../services/supabase';
import { useTranslation } from '../context/AppSettingsContext';
import Button from '../components/Button';
import ScreenHeader from '../components/ScreenHeader';
import { useDirection } from '../hooks/useDirection';
import { useMessageBox } from '../context/MessageBoxContext';
import { hapticTap } from '../utils/haptics';

export default function EditProfileScreen({ navigation }) {
  const { t } = useTranslation();
  const dir = useDirection();
  const { showMessageBox } = useMessageBox();
  const { user, profile } = useAuth();
  const [name, setName] = useState(profile?.name || user?.user_metadata?.name || '');
  const [email] = useState(user?.email || '');
  const [phone, setPhone] = useState(profile?.phone || user?.phone || '');
  const [focused, setFocused] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!name.trim() || name.trim().length < 2) {
      showMessageBox({ type: 'error', title: t('common.error'), message: t('auth.fillAllFields') });
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .upsert({ id: user.id, name: name.trim(), phone: phone.trim(), updatedAt: new Date().toISOString() });
      if (error) throw error;
      showMessageBox({ type: 'success', title: t('common.done'), message: t('settings.editProfile') });
      navigation.goBack();
    } catch (err) {
      showMessageBox({ type: 'error', title: t('common.error'), message: err.message });
    } finally {
      setLoading(false);
    }
  };

  const renderField = ({ id, label, value, onChange, icon: Icon, editable = true, keyboardType = 'default', placeholder }) => {
    const isFocused = focused === id;
    return (
      <View style={styles.inputWrapper}>
        <Text style={[styles.label, { textAlign: dir.textAlign }]}>{label}</Text>
        <View style={[styles.inputRow, isFocused && styles.inputRowFocused]}>
          <Icon size={20} color={isFocused ? '#0F172A' : '#94A3B8'} />
          <TextInput
            style={[styles.input, !editable && styles.inputDisabledText]}
            value={value}
            onChangeText={onChange}
            onFocus={() => setFocused(id)}
            onBlur={() => setFocused(null)}
            editable={editable}
            keyboardType={keyboardType}
            autoCapitalize="none"
            placeholder={placeholder}
            placeholderTextColor="#94A3B8"
            textAlign={dir.textAlign}
          />
          {editable && value ? (
            <TouchableOpacity
              onPress={() => { hapticTap(); onChange(''); }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <X size={16} color="#94A3B8" />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <ScreenHeader title={t('settings.editProfile')} onBack={() => navigation.goBack()} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {renderField({
            id: 'name', label: t('auth.fullName'), value: name, onChange: setName,
            icon: User, placeholder: t('auth.fullName'),
          })}
          {renderField({
            id: 'email', label: t('auth.email'), value: email, onChange: () => {},
            icon: Mail, editable: false,
          })}
          {renderField({
            id: 'phone', label: t('auth.phone'), value: phone, onChange: setPhone,
            icon: Phone, keyboardType: 'phone-pad', placeholder: '01xxxxxxxxx',
          })}

          <Button title={t('common.save')} onPress={handleSave} loading={loading} disabled={loading} fullWidth style={{ marginTop: 12 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 26, paddingTop: 12 },
  inputWrapper: { marginBottom: 22 },
  label: { textAlign: 'left', color: '#64748B', marginBottom: 10, fontSize: 14, fontWeight: '600' },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1.5,
    borderBottomColor: '#CBD5E1',
    paddingBottom: 10,
    gap: 4,
  },
  inputRowFocused: { borderBottomColor: '#0F172A' },
  input: {
    flex: 1,
    paddingHorizontal: 14,
    fontSize: 16,
    color: '#0F172A',
    ...Platform.select({ ios: { paddingBottom: 0 }, android: { paddingVertical: 0 } }),
  },
  inputDisabledText: { color: '#94A3B8' },
});
