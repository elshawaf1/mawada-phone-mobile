import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from '../context/AppSettingsContext';
import { useDirection } from '../hooks/useDirection';

export default function ProductMatchLabel({ text }) {
  const { t } = useTranslation();
  const dir = useDirection();
  const displayText = text || t('home.recommendedForYou');

  return (
    <View style={[styles.container, { flexDirection: dir.row }]}>
      <View style={styles.dot} />
      <Text style={styles.text}>{displayText}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    backgroundColor: 'rgba(16,185,129,0.08)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    gap: 6,
    marginBottom: 8,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  text: {
    color: '#059669',
    fontSize: 11,
    fontWeight: '700',
  },
});
