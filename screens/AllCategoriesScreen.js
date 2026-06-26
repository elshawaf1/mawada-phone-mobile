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

const BGS = ['#0F172A', '#1E293B', '#3B82F6', '#334155', '#1a1a2e', '#16213e'];

export default function AllCategoriesScreen({ navigation }) {
  const { t } = useTranslation();
  const dir = useDirection();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchCategories = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('isActive', true)
        .order('sortOrder');
      if (error) throw error;
      setCategories(data || []);
    } catch (err) {
      console.error('Error fetching categories:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchCategories();
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ScreenHeader title={t('home.categories')} onBack={() => navigation.goBack()} />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScreenHeader title={t('home.categories')} onBack={() => navigation.goBack()} />

      <FlatList
        data={categories}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} tintColor={COLORS.primary} />
        }
        renderItem={({ item, index }) => (
          <TouchableOpacity
            style={styles.card}
            activeOpacity={0.85}
            onPress={() => navigation.navigate('CategoryProducts', { categoryId: item.id, categoryName: item.nameAr })}
          >
            <View style={styles.cardRow}>
              <View style={styles.imageWrap}>
                {item.homeImageUrl || item.imageUrl ? (
                  <Image source={{ uri: item.homeImageUrl || item.imageUrl }} style={styles.cardImage} resizeMode="cover" />
                ) : (
                  <View style={[styles.imageFallback, { backgroundColor: BGS[index % BGS.length] }]}>
                    <Ionicons name="grid-outline" size={24} color="rgba(255,255,255,0.5)" />
                  </View>
                )}
              </View>

              <View style={styles.cardInfo}>
                <Text style={[styles.catName, { textAlign: dir.textAlign }]} numberOfLines={1}>
                  {item.nameAr || item.name}
                </Text>
                {item.descriptionAr ? (
                  <Text style={[styles.catDesc, { textAlign: dir.textAlign }]} numberOfLines={1}>
                    {item.descriptionAr}
                  </Text>
                ) : null}
              </View>

              <Ionicons name={dir.leftChevron} size={20} color="#CBD5E1" />
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="grid-outline" size={48} color="#CBD5E1" />
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
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 2,
    overflow: 'hidden',
  },
  cardRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    padding: 12,
  },

  imageWrap: {
    width: 70,
    height: 70,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#F1F5F9',
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  imageFallback: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },

  cardInfo: {
    flex: 1,
    marginHorizontal: 14,
  },
  catName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  catDesc: {
    fontSize: 12,
    fontWeight: '400',
    color: '#94A3B8',
    marginTop: 3,
  },

  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyText: {
    fontSize: 14,
    color: '#94A3B8',
    marginTop: 12,
  },
});
