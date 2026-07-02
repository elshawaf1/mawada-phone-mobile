import React from 'react';
import {
  StyleSheet, Text, View, Modal, TouchableOpacity, ScrollView,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { COLORS, RADIUS, FONT_SIZES, FONT_WEIGHTS, SHADOWS } from '../constants';
import { Ionicons } from '@expo/vector-icons';

const SORT_OPTIONS = ['latest', 'priceLow', 'priceHigh', 'name'];

export default function FilterSheet({
  visible, onClose, sortBy, onSortChange, brands, selectedBrandId, onBrandChange,
  selectedCondition, onConditionChange, t, onOpenPrice,
}) {
  const activePrice = false;

  const sortLabel = (key) => {
    const labels = {
      latest: t('search.latest'),
      priceLow: t('search.priceLow'),
      priceHigh: t('search.priceHigh'),
      name: t('search.name'),
    };
    return labels[key] || key;
  };

  const brandName = (brand) => brand?.nameAr || brand?.name || '';

  const SORT_ICONS = {
    latest: 'time-outline',
    priceLow: 'arrow-up-outline',
    priceHigh: 'arrow-down-outline',
    name: 'text-outline',
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
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.doneText}>{t('common.done')}</Text>
            </TouchableOpacity>
            <Text style={styles.title}>{t('search.filter')}</Text>
            <View style={{ width: 50 }} />
          </View>

          <ScrollView showsVerticalScrollIndicator={false} style={styles.scroll}>
            {/* Sort */}
            <Text style={styles.sectionLabel}>{t('search.sortBy')}</Text>
            <View style={styles.chipRow}>
              {SORT_OPTIONS.map((key) => {
                const active = sortBy === key;
                return (
                  <TouchableOpacity
                    key={key}
                    style={[styles.chip, active && styles.chipActive]}
                    onPress={() => { onSortChange(key); onClose(); }}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={SORT_ICONS[key]}
                      size={14}
                      color={active ? COLORS.white : COLORS.gray500}
                      style={{ marginLeft: 4 }}
                    />
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>
                      {sortLabel(key)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Price Range */}
            <Text style={styles.sectionLabel}>{t('search.priceRange')}</Text>
            <TouchableOpacity style={styles.priceRow} onPress={() => { onClose(); onOpenPrice(); }} activeOpacity={0.7}>
              <Ionicons name="pricetag-outline" size={18} color={COLORS.gray500} />
              <Text style={styles.priceText}>{t('search.priceRange')}</Text>
              <Ionicons name="chevron-forward-outline" size={18} color={COLORS.gray400} />
            </TouchableOpacity>

            {/* Condition */}
            <Text style={styles.sectionLabel}>{t('search.condition')}</Text>
            <View style={styles.chipRow}>
              <TouchableOpacity
                style={[styles.chip, !selectedCondition && styles.chipActive]}
                onPress={() => { onConditionChange(null); onClose(); }}
                activeOpacity={0.7}
              >
                <Text style={[styles.chipText, !selectedCondition && styles.chipTextActive]}>
                  {t('search.allProducts')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.chip, selectedCondition === 'new' && styles.chipActive]}
                onPress={() => { onConditionChange('new'); onClose(); }}
                activeOpacity={0.7}
              >
                <Ionicons
                  name="sparkles-outline"
                  size={14}
                  color={selectedCondition === 'new' ? COLORS.white : COLORS.gray500}
                  style={{ marginLeft: 4 }}
                />
                <Text style={[styles.chipText, selectedCondition === 'new' && styles.chipTextActive]}>
                  {t('search.conditionNew')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.chip, selectedCondition === 'used' && styles.chipActive]}
                onPress={() => { onConditionChange('used'); onClose(); }}
                activeOpacity={0.7}
              >
                <Ionicons
                  name="refresh-outline"
                  size={14}
                  color={selectedCondition === 'used' ? COLORS.white : COLORS.gray500}
                  style={{ marginLeft: 4 }}
                />
                <Text style={[styles.chipText, selectedCondition === 'used' && styles.chipTextActive]}>
                  {t('search.conditionUsed')}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Brands */}
            {brands.length > 0 && (
              <>
                <Text style={styles.sectionLabel}>{t('search.filterByBrand')}</Text>
                <View style={styles.chipRow}>
                  <TouchableOpacity
                    style={[styles.chip, !selectedBrandId && styles.chipActive]}
                    onPress={() => { onBrandChange(null); onClose(); }}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.chipText, !selectedBrandId && styles.chipTextActive]}>
                      {t('search.allProducts')}
                    </Text>
                  </TouchableOpacity>
                  {brands.map((brand) => {
                    const active = selectedBrandId === brand.id;
                    return (
                      <TouchableOpacity
                        key={brand.id}
                        style={[styles.chip, active && styles.chipActive]}
                        onPress={() => { onBrandChange(active ? null : brand.id); onClose(); }}
                        activeOpacity={0.7}
                      >
                        <Text style={[styles.chipText, active && styles.chipTextActive]}>
                          {brandName(brand)}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </>
            )}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingBottom: 40,
    maxHeight: '70%',
    ...SHADOWS.xl,
  },
  handleRow: { alignItems: 'center', paddingVertical: 12 },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: COLORS.gray300 },
  headerRow: {
    flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 20,
  },
  doneText: { fontSize: FONT_SIZES.md, color: COLORS.primary, fontWeight: FONT_WEIGHTS.bold },
  title: { fontSize: FONT_SIZES.xl, fontWeight: FONT_WEIGHTS.bold, color: COLORS.text },
  scroll: { flexGrow: 0 },
  sectionLabel: {
    fontSize: FONT_SIZES.sm, fontWeight: FONT_WEIGHTS.bold, color: COLORS.gray500,
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10, marginTop: 18,
  },
  chipRow: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8 },
  chip: {
    flexDirection: 'row-reverse', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 9, borderRadius: 20,
    backgroundColor: COLORS.gray50, borderWidth: 1, borderColor: COLORS.gray200,
  },
  chipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipText: { fontSize: FONT_SIZES.sm, fontWeight: FONT_WEIGHTS.semibold, color: COLORS.gray500 },
  chipTextActive: { color: COLORS.white },
  priceRow: {
    flexDirection: 'row-reverse', alignItems: 'center', gap: 10,
    paddingVertical: 14, paddingHorizontal: 16,
    borderRadius: RADIUS.lg, backgroundColor: COLORS.gray50,
    borderWidth: 1, borderColor: COLORS.gray200,
  },
  priceText: { flex: 1, fontSize: FONT_SIZES.md, color: COLORS.text, fontWeight: FONT_WEIGHTS.medium },
});
