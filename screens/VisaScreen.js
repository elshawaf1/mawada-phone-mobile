import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ImageBackground,
} from 'react-native';
import { ChevronLeft, Lock } from 'lucide-react-native';

export default function CardDetailsScreen({ navigation }) {
  // Input states to live-update the credit card mockup
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [cardName, setCardName] = useState('');

  // Formatter helper to space out card numbers: 0000 0000 0000 0000
  const handleCardNumberChange = (text) => {
    const cleaned = text.replace(/\s?/g, '').replace(/[^0-9]/g, '');
    const groups = cleaned.match(/.{1,4}/g);
    setCardNumber(groups ? groups.join(' ') : cleaned);
  };

  // Formatter helper for expiry: MM/YY
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
      
      {/* Header Layout */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <ChevronLeft color="#1E293B" size={20} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>اضافة بيانات البطاقة</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Dynamic Credit Card Mockup Container */}
        <View style={styles.cardPreviewWrapper}>
          {/* Replace this placeholder URI with your actual figma blue card PNG graphic */}
          <ImageBackground
            source={{ uri: 'https://images.unsplash.com/photo-1614028674026-a65e31bfd27c?q=80&w=500' }}
            style={styles.cardBackground}
            imageStyle={{ borderRadius: 16 }}
            resizeMode="cover"
          >
            {/* Contactless / Chip Layer */}
            <View style={styles.cardTopRow}>
              <View style={styles.chipAndWireless}>
                <View style={styles.cardChip} />
                {/* Simulated wireless bars or icon */}
                <Text style={styles.wirelessText}>☤</Text> 
              </View>
            </View>

            {/* Live-updating Card Number text */}
            <Text style={styles.previewCardNumber}>
              {cardNumber || '0000 0000 0000 0000'}
            </Text>

            {/* Expiry and Brand Row */}
            <View style={styles.cardBottomRow}>
              <View style={styles.expiryContainer}>
                <Text style={styles.previewExpiryLabel}>MONTH/YEAR</Text>
                <Text style={styles.previewExpiryValue}>{expiry || '00/00'}</Text>
              </View>
              
              {/* Replace with a standard static Visa PNG asset if needed */}
              <Text style={styles.visaBrandText}>VISA</Text>
            </View>
          </ImageBackground>
        </View>

        {/* Input Interactive Fields Area */}
        <View style={styles.formCard}>
          
          {/* 1. Card Number Field */}
          <View style={styles.inputWrapper}>
            <Text style={styles.fieldLabel}>Card number</Text>
            <TextInput
              style={styles.textInput}
              keyboardType="numeric"
              placeholder="0000 0000 0000 0000"
              placeholderTextColor="#94A3B8"
              maxLength={19}
              value={cardNumber}
              onChangeText={handleCardNumberChange}
            />
          </View>

          {/* 2. Expiry and CVV (Side-by-side) */}
          <View style={styles.rowInputs}>
            <View style={[styles.inputWrapper, { flex: 1, marginLeft: 16 }]}>
              <Text style={styles.fieldLabel}>CVV</Text>
              <TextInput
                style={styles.textInput}
                keyboardType="numeric"
                secureTextEntry
                placeholder="000"
                placeholderTextColor="#94A3B8"
                maxLength={4}
                value={cvv}
                onChangeText={setCvv}
              />
            </View>

            <View style={[styles.inputWrapper, { flex: 1 }]}>
              <Text style={styles.fieldLabel}>Expiry(MM/YY)</Text>
              <TextInput
                style={styles.textInput}
                keyboardType="numeric"
                placeholder="MM/YY"
                placeholderTextColor="#94A3B8"
                maxLength={5}
                value={expiry}
                onChangeText={handleExpiryChange}
              />
            </View>
          </View>

          {/* 3. Optional Nickname Field */}
          <View style={styles.inputWrapper}>
            <Text style={styles.fieldLabel}>Save card as (optional)</Text>
            <TextInput
              style={styles.textInput}
              placeholder="e.g. My Personal Card"
              placeholderTextColor="#94A3B8"
              value={cardName}
              onChangeText={setCardName}
            />
          </View>

          {/* Safe/Secure Card Disclaimer Block */}
          <View style={styles.disclaimerRow}>
            <Text style={styles.disclaimerText}>
              We save your card securely. We never store your CVV.
            </Text>
            <Lock color="#64748B" size={14} style={{ marginRight: 6 }} />
          </View>

        </View>

        {/* Primary Call-to-Action Submit Button */}
        <TouchableOpacity style={styles.submitButton}>
          <Text style={styles.submitButtonText}>إضافة البطاقة</Text>
        </TouchableOpacity>

      </ScrollView>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
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
    color: '#0F172A',
  },
  backButton: {
    padding: 8,
    borderRadius: 50,
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  cardPreviewWrapper: {
    borderWidth: 2,
    borderColor: '#38BDF8', // Vivid bright blue border outlining the card preview
    borderRadius: 18,
    padding: 4,
    marginVertical: 12,
  },
  cardBackground: {
    height: 200,
    borderRadius: 16,
    padding: 20,
    justifyContent: 'space-between',
    backgroundColor: '#1E3A8A', // Deep blue card base tint fallback
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
    opacity: 0.8,
    borderRadius: 6,
  },
  wirelessText: {
    color: '#FFF',
    fontSize: 18,
    opacity: 0.8,
  },
  previewCardNumber: {
    fontSize: 21,
    color: '#FFFFFF',
    fontWeight: '500',
    letterSpacing: 2,
    textAlign: 'center',
    marginVertical: 14,
    fontFamily: 'Courier', // Gives standard card font texture appearance
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
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 16,
    marginTop: 8,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 2,
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
    borderBottomColor: '#CBD5E1', // Underline text fields matching UI
    fontSize: 15,
    color: '#0F172A',
    paddingBottom: 4,
  },
  rowInputs: {
    flexDirection: 'row-reverse', // Arranged gracefully
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
    backgroundColor: '#0F172A',
    borderRadius: 24,
    height: 54,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 6,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  bottomTabBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 65,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row-reverse',
    justifyContent: 'space-around',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingBottom: 12,
  },
  tabItem: {
    padding: 8,
  },
});