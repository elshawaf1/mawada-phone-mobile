import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet, Text, View, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl, Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from '../context/AppSettingsContext';
import { supabase } from '../services/supabase';
import { COLORS } from '../constants';
import ScreenHeader from '../components/ScreenHeader';
import { useDirection } from '../hooks/useDirection';

export default function BrandsScreen({ navigation }) {
  const { t } = useTranslation();
  const dir = useDirection();
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchBrands = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('brands')
        .select('*')
        .eq('isActive', true)
        .order('sortOrder');
      if (error) throw error;
      setBrands(data || []);
    } catch (err) {
      console.error('Error fetching brands:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchBrands();
  }, [fetchBrands]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchBrands();
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ScreenHeader title={t('home.brands')} onBack={() => navigation.goBack()} />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScreenHeader title={t('home.brands')} onBack={() => navigation.goBack()} />

      <FlatList
        data={brands}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} tintColor={COLORS.primary} />
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            activeOpacity={0.85}
            onPress={() => navigation.navigate('Search', { brandId: item.id, brandName: item.nameAr })}
          >
            <View style={styles.cardRow}>
              <View style={styles.logoWrap}>
                {item.logoUrl ? (
                  <Image source={{ uri: item.logoUrl }} style={styles.logo} resizeMode="contain" />
                ) : (
                  <View style={styles.logoFallback}>
                    <Ionicons name="phone-portrait-outline" size={22} color="#CBD5E1" />
                  </View>
                )}
              </View>
              <Text style={[styles.brandName, { textAlign: dir.textAlign }]} numberOfLines={1}>
                {item.nameAr || item.name}
              </Text>
              <Ionicons name={dir.leftChevron} size={18} color="#CBD5E1" />
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="cube-outline" size={48} color="#CBD5E1" />
            <Text style={styles.emptyText}>{t('common.noData')}</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: 16, paddingBottom: 40 },
  card: {
    backgroundColor: '#fff', borderRadius: 16, marginBottom: 10,
    shadowColor: '#000', shadowOpacity: 0.04, shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6, elevation: 2, overflow: 'hidden',
  },
  cardRow: {
    flexDirection: 'row', alignItems: 'center', padding: 14,
  },
  logoWrap: {
    width: 48, height: 48, borderRadius: 12, backgroundColor: '#F8FAFC',
    justifyContent: 'center', alignItems: 'center', overflow: 'hidden',
    borderWidth: 1, borderColor: '#F1F5F9',
  },
  logo: { width: '100%', height: '100%' },
  logoFallback: { width: 48, height: 48, borderRadius: 12, backgroundColor: '#F8FAFC', justifyContent: 'center', alignItems: 'center' },
  brandName: { flex: 1, fontSize: 15, fontWeight: '600', color: '#0F172A', marginHorizontal: 12, textAlign: 'left' },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 80 },
  emptyText: { fontSize: 14, color: '#94A3B8', marginTop: 12 },
});
