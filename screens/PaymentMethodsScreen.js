import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from '../context/AppSettingsContext';
import ScreenHeader from '../components/ScreenHeader';
import { useDirection } from '../hooks/useDirection';

export default function PaymentMethodsScreen({ navigation }) {
  const { t } = useTranslation();
  const dir = useDirection();

  return (
    <View style={styles.container}>
      <ScreenHeader title={t('payment.savedCards')} onBack={() => navigation.goBack()} />

      <View style={styles.content}>
        <View style={styles.card}>
          <View style={styles.iconWrap}>
            <Ionicons name="lock-closed-outline" size={36} color="#94A3B8" />
          </View>
          <Text style={styles.title}>{t('payment.savedCards')}</Text>
          <Text style={styles.subtitle}>{t('settings.comingSoon')}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  card: {
    backgroundColor: '#fff', borderRadius: 24, padding: 40, alignItems: 'center',
    shadowColor: '#000', shadowOpacity: 0.04, shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8, elevation: 2, width: '100%',
  },
  iconWrap: {
    width: 72, height: 72, borderRadius: 36, backgroundColor: '#F8FAFC',
    justifyContent: 'center', alignItems: 'center', marginBottom: 16,
    borderWidth: 1, borderColor: '#F1F5F9',
  },
  title: { fontSize: 18, fontWeight: '700', color: '#0F172A', marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#94A3B8', textAlign: 'center', lineHeight: 20 },
});
