import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  ScrollView,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import { ChevronRight, Lock, CreditCard } from 'lucide-react-native';
import { StatusBar } from 'expo-status-bar';

export default function CardDetailsScreen({ navigation }) {
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [cardName, setCardName] = useState('');

  const handleCardNumberChange = (text) => {
    const cleaned = text.replace(/\s?/g, '').replace(/[^0-9]/g, '');
    const groups = cleaned.match(/.{1,4}/g);
    setCardNumber(groups ? groups.join(' ') : cleaned);
  };

  const handleExpiryChange = (text) => {
    const cleaned = text.replace(/[^0-9]/g, '');
    if (cleaned.length >= 2) {
      setExpiry(`${cleaned.slice(0, 2)}/${cleaned.slice(2, 4)}`);
    } else {
      setExpiry(cleaned);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <ChevronRight color="#FFFFFF" size={22} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>اضافة بيانات البطاقة</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* Credit Card Preview */}
        <View style={styles.cardPreviewWrapper}>
          <View style={styles.cardBackground}>
            {/* Top row: chip + wireless */}
            <View style={styles.cardTopRow}>
              <View style={styles.chipAndWireless}>
                <View style={styles.cardChip} />
                <CreditCard size={20} color="rgba(255,255,255,0.6)" />
              </View>
            </View>

            {/* Card number */}
            <Text style={styles.previewCardNumber}>
              {cardNumber || '•••• •••• •••• ••••'}
            </Text>

            {/* Bottom row: expiry + VISA */}
            <View style={styles.cardBottomRow}>
              <View style={styles.expiryContainer}>
                <Text style={styles.previewExpiryLabel}>MONTH/YEAR</Text>
                <Text style={styles.previewExpiryValue}>{expiry || '00/00'}</Text>
              </View>
              <Text style={styles.visaBrandText}>VISA</Text>
            </View>
          </View>
        </View>

        {/* Form */}
        <View style={styles.formCard}>

          <View style={styles.inputWrapper}>
            <Text style={styles.fieldLabel}>رقم البطاقة</Text>
            <TextInput
              style={styles.textInput}
              keyboardType="numeric"
              placeholder="0000 0000 0000 0000"
              placeholderTextColor="#475569"
              maxLength={19}
              value={cardNumber}
              onChangeText={handleCardNumberChange}
            />
          </View>

          <View style={styles.rowInputs}>
            <View style={[styles.inputWrapper, { flex: 1, marginLeft: 16 }]}>
              <Text style={styles.fieldLabel}>CVV</Text>
              <TextInput
                style={styles.textInput}
                keyboardType="numeric"
                secureTextEntry
                placeholder="000"
                placeholderTextColor="#475569"
                maxLength={4}
                value={cvv}
                onChangeText={setCvv}
              />
            </View>

            <View style={[styles.inputWrapper, { flex: 1 }]}>
              <Text style={styles.fieldLabel}>تاريخ الانتهاء (MM/YY)</Text>
              <TextInput
                style={styles.textInput}
                keyboardType="numeric"
                placeholder="MM/YY"
                placeholderTextColor="#475569"
                maxLength={5}
                value={expiry}
                onChangeText={handleExpiryChange}
              />
            </View>
          </View>

          <View style={styles.inputWrapper}>
            <Text style={styles.fieldLabel}>اسم البطاقة (اختياري)</Text>
            <TextInput
              style={styles.textInput}
              placeholder="مثال: بطاقي الشخصية"
              placeholderTextColor="#475569"
              value={cardName}
              onChangeText={setCardName}
            />
          </View>

          <View style={styles.disclaimerRow}>
            <Lock color="#64748B" size={14} style={{ marginLeft: 6 }} />
            <Text style={styles.disclaimerText}>
              نحفظ بيانات بطاقتك بشكل آمن. لا نخزّن أبداً رمز CVV.
            </Text>
          </View>
        </View>

        {/* Submit Button */}
        <TouchableOpacity style={styles.submitButton} activeOpacity={0.8}>
          <Text style={styles.submitButtonText}>إضافة البطاقة</Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  header: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  backButton: {
    padding: 8,
    borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  cardPreviewWrapper: {
    borderRadius: 18,
    padding: 2,
    marginVertical: 12,
    borderWidth: 1,
    borderColor: 'rgba(59,130,246,0.3)',
  },
  cardBackground: {
    height: 200,
    borderRadius: 16,
    padding: 20,
    justifyContent: 'space-between',
    backgroundColor: '#1E3A8A',
    overflow: 'hidden',
  },
  cardTopRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  chipAndWireless: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
  },
  cardChip: {
    width: 40,
    height: 30,
    backgroundColor: '#E2E8F0',
    opacity: 0.7,
    borderRadius: 6,
  },
  previewCardNumber: {
    fontSize: 21,
    color: '#FFFFFF',
    fontWeight: '500',
    letterSpacing: 2,
    textAlign: 'center',
    marginVertical: 14,
    fontFamily: 'Courier',
  },
  cardBottomRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  expiryContainer: {
    alignItems: 'center',
  },
  previewExpiryLabel: {
    fontSize: 7,
    color: '#94A3B8',
    fontWeight: '600',
  },
  previewExpiryValue: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '500',
    marginTop: 2,
  },
  visaBrandText: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '900',
    fontStyle: 'italic',
  },
  formCard: {
    backgroundColor: '#1E293B',
    borderRadius: 24,
    padding: 16,
    marginTop: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  inputWrapper: {
    marginBottom: 20,
  },
  fieldLabel: {
    fontSize: 12,
    color: '#94A3B8',
    marginBottom: 4,
    textAlign: 'right',
  },
  textInput: {
    height: 40,
    borderBottomWidth: 1.5,
    borderBottomColor: '#334155',
    fontSize: 15,
    color: '#F1F5F9',
    paddingBottom: 4,
  },
  rowInputs: {
    flexDirection: 'row-reverse',
  },
  disclaimerRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  disclaimerText: {
    fontSize: 11,
    color: '#64748B',
    textAlign: 'center',
  },
  submitButton: {
    backgroundColor: '#3B82F6',
    borderRadius: 24,
    height: 54,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 20,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
