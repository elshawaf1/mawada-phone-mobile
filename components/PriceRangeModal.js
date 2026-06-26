import React, { useState } from 'react';
import {
  StyleSheet, Text, View, Modal, TouchableOpacity, TextInput,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { COLORS, RADIUS, FONT_SIZES, FONT_WEIGHTS, SHADOWS } from '../constants';
import { Ionicons } from '@expo/vector-icons';

export default function PriceRangeModal({ visible, onClose, onApply, initialMin, initialMax, t }) {
  const [min, setMin] = useState(initialMin || '');
  const [max, setMax] = useState(initialMax || '');

  const handleApply = () => {
    onApply(min.trim(), max.trim());
    onClose();
  };

  const handleReset = () => {
    setMin('');
    setMax('');
    onApply('', '');
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <TouchableOpacity style={styles.backdrop} onPress={onClose} activeOpacity={1} />
        <View style={styles.sheet}>
          <View style={styles.handleRow}>
            <View style={styles.handle} />
          </View>
          <View style={styles.headerRow}>
            <TouchableOpacity onPress={handleReset}>
              <Text style={styles.resetText}>{t('search.reset')}</Text>
            </TouchableOpacity>
            <Text style={styles.title}>{t('search.priceRange')}</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={22} color={COLORS.gray600} />
            </TouchableOpacity>
          </View>

          <View style={styles.inputRow}>
            <View style={styles.inputWrap}>
              <Text style={styles.inputLabel}>{t('search.minPriceShort')}</Text>
              <TextInput
                style={styles.input}
                value={min}
                onChangeText={setMin}
                keyboardType="number-pad"
                placeholder="0"
                placeholderTextColor={COLORS.gray300}
              />
            </View>
            <View style={styles.separator}>
              <Text style={styles.separatorText}>—</Text>
            </View>
            <View style={styles.inputWrap}>
              <Text style={styles.inputLabel}>{t('search.maxPriceShort')}</Text>
              <TextInput
                style={styles.input}
                value={max}
                onChangeText={setMax}
                keyboardType="number-pad"
                placeholder="99999"
                placeholderTextColor={COLORS.gray300}
              />
            </View>
          </View>

          <TouchableOpacity style={styles.applyBtn} onPress={handleApply} activeOpacity={0.85}>
            <Text style={styles.applyText}>{t('search.apply')}</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1, justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingBottom: 40,
    ...SHADOWS.xl,
  },
  handleRow: {
    alignItems: 'center', paddingVertical: 12,
  },
  handle: {
    width: 40, height: 4, borderRadius: 2, backgroundColor: COLORS.gray300,
  },
  headerRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 24,
  },
  resetText: {
    fontSize: FONT_SIZES.md, color: COLORS.gray500, fontWeight: FONT_WEIGHTS.semibold,
  },
  title: {
    fontSize: FONT_SIZES.xl, fontWeight: FONT_WEIGHTS.bold, color: COLORS.text,
  },
  inputRow: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 12, marginBottom: 28,
  },
  inputWrap: { flex: 1 },
  inputLabel: {
    fontSize: FONT_SIZES.sm, color: COLORS.gray500, fontWeight: FONT_WEIGHTS.semibold,
    marginBottom: 6,
  },
  input: {
    height: 48, borderRadius: RADIUS.lg, borderWidth: 1.5, borderColor: COLORS.gray200,
    paddingHorizontal: 14, fontSize: FONT_SIZES.lg, color: COLORS.text,
  },
  separator: { justifyContent: 'center', paddingBottom: 14 },
  separatorText: { fontSize: FONT_SIZES.xl, color: COLORS.gray400 },
  applyBtn: {
    height: 52, borderRadius: RADIUS.xxl, backgroundColor: COLORS.primary,
    justifyContent: 'center', alignItems: 'center',
  },
  applyText: {
    fontSize: FONT_SIZES.lg, fontWeight: FONT_WEIGHTS.bold, color: COLORS.white,
  },
});
