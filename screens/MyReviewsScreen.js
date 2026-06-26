import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet, Text, View, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl, Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from '../context/AppSettingsContext';
import { supabase } from '../services/supabase';
import { COLORS } from '../constants';
import ScreenHeader from '../components/ScreenHeader';
import { useDirection } from '../hooks/useDirection';

const getRelativeTime = (iso, t) => {
  if (!iso) return '';
  const now = new Date();
  const date = new Date(iso);
  const diff = Math.floor((now - date) / 1000);
  if (diff < 60) return t('time.justNow');
  const mins = Math.floor(diff / 60);
  if (mins < 60) return t('time.minutesAgo', { n: mins });
  const hours = Math.floor(mins / 60);
  if (hours < 24) return t('time.hoursAgo', { n: hours });
  const days = Math.floor(hours / 24);
  return t('time.daysAgo', { n: days });
};

const StarRating = ({ rating }) => {
  const stars = [];
  for (let i = 1; i <= 5; i++) {
    stars.push(
      <Ionicons
        key={i}
        name={i <= rating ? 'star' : 'star-outline'}
        size={16}
        color={i <= rating ? '#F59E0B' : '#CBD5E1'}
        style={{ marginRight: 2 }}
      />
    );
  }
  return <View style={styles.starsRow}>{stars}</View>;
};

export default function MyReviewsScreen({ navigation }) {
  const { user } = useAuth();
  const { t } = useTranslation();
  const dir = useDirection();
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchReviews = useCallback(async () => {
    if (!user?.id) return;
    try {
      const { data, error } = await supabase
        .from('reviews')
        .select('*, products(nameAr, product_images(id, url, "isPrimary"))')
        .eq('userId', user.id)
        .order('createdAt', { ascending: false });
      if (error) throw error;
      setReviews(data || []);
    } catch (err) {
      console.error('Error fetching reviews:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchReviews();
  };

  const primaryImage = (product) => {
    if (!product) return null;
    const images = product.product_images || [];
    return images.find((img) => img.isPrimary)?.url || images[0]?.url || null;
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ScreenHeader title={t('profile.menuMyReviews')} onBack={() => navigation.goBack()} />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScreenHeader title={t('profile.menuMyReviews')} onBack={() => navigation.goBack()} />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} tintColor={COLORS.primary} />
        }
      >
        {reviews.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconWrap}>
              <Ionicons name="star-outline" size={48} color="#CBD5E1" />
            </View>
            <Text style={styles.emptyTitle}>{t('profile.menuMyReviews')}</Text>
            <Text style={styles.emptySubtitle}>لا توجد تقييمات</Text>
          </View>
        ) : (
          reviews.map((review) => {
            const img = primaryImage(review.products);
            return (
              <TouchableOpacity
                key={review.id}
                style={styles.card}
                activeOpacity={0.9}
                onPress={() => navigation.navigate('Item', { productId: review.productId })}
              >
                <View style={styles.cardRow}>
                  <View style={styles.imageWrap}>
                    {img ? (
                      <Image source={{ uri: img }} style={styles.thumb} resizeMode="contain" />
                    ) : (
                      <Ionicons name="image-outline" size={24} color="#CBD5E1" />
                    )}
                  </View>
                  <View style={styles.cardContent}>
                    <Text style={styles.productName} numberOfLines={1}>
                      {review.products?.nameAr || t('common.product')}
                    </Text>
                    <StarRating rating={review.rating} />
                    {review.comment ? (
                      <Text style={[styles.comment, { textAlign: dir.textAlign }]} numberOfLines={3}>{review.comment}</Text>
                    ) : null}
                    <Text style={styles.date}>{getRelativeTime(review.createdAt, t)}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { padding: 16, paddingBottom: 40 },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 80, paddingHorizontal: 24 },
  emptyIconWrap: {
    width: 80, height: 80, borderRadius: 40, backgroundColor: '#F8FAFC',
    justifyContent: 'center', alignItems: 'center', marginBottom: 16,
    borderWidth: 1, borderColor: '#F1F5F9',
  },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#0F172A', marginBottom: 6 },
  emptySubtitle: { fontSize: 14, color: '#94A3B8', textAlign: 'center' },
  card: {
    backgroundColor: '#fff', borderRadius: 20, marginBottom: 12,
    shadowColor: '#000', shadowOpacity: 0.04, shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8, elevation: 2, overflow: 'hidden',
  },
  cardRow: { flexDirection: 'row-reverse', padding: 12, alignItems: 'center' },
  imageWrap: {
    width: 64, height: 64, borderRadius: 14, backgroundColor: '#F8FAFC',
    justifyContent: 'center', alignItems: 'center', overflow: 'hidden',
    borderWidth: 1, borderColor: '#F1F5F9',
  },
  thumb: { width: '100%', height: '100%' },
  cardContent: { flex: 1, marginLeft: 12, alignItems: 'flex-end' },
  productName: { fontSize: 15, fontWeight: '700', color: '#0F172A', marginBottom: 4 },
  starsRow: { flexDirection: 'row-reverse', marginBottom: 4 },
  comment: { fontSize: 13, color: '#64748B', lineHeight: 18, marginBottom: 4, textAlign: 'right' },
  date: { fontSize: 11, color: '#94A3B8' },
});
