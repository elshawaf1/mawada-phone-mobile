import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Image,
  StatusBar,
  Alert,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Trash2 } from 'lucide-react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from '../context/AppSettingsContext';
import { supabase } from '../services/supabase';
import ScreenHeader from '../components/ScreenHeader';
import { useDirection } from '../hooks/useDirection';

const RATING_COLORS = {
  5: '#22C55E',
  4: '#3B82F6',
  3: '#F59E0B',
  2: '#F97316',
  1: '#EF4444',
};

const TABS = [
  { key: 'all', label: 'الكل', rating: null },
  { key: '5', label: '5 نجوم', rating: 5 },
  { key: '4', label: '4 نجوم', rating: 4 },
  { key: '3', label: '3 نجوم', rating: 3 },
  { key: '2', label: '2 نجوم', rating: 2 },
  { key: '1', label: '1 نجمة', rating: 1 },
];

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

const StarRating = ({ rating, size = 16 }) => {
  const stars = [];
  for (let i = 1; i <= 5; i++) {
    stars.push(
      <Ionicons
        key={i}
        name={i <= rating ? 'star' : 'star-outline'}
        size={size}
        color={i <= rating ? '#F59E0B' : '#E2E8F0'}
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
  const [activeTab, setActiveTab] = useState('all');
  const animValues = useRef(new Map()).current;

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

  useEffect(() => {
    reviews.forEach((review) => {
      if (!animValues.has(review.id)) {
        animValues.set(review.id, new Animated.Value(0));
      }
    });
    const timer = setTimeout(() => {
      reviews.forEach((review, index) => {
        const val = animValues.get(review.id);
        if (val) {
          Animated.timing(val, {
            toValue: 1,
            duration: 450,
            delay: index * 60,
            useNativeDriver: true,
          }).start();
        }
      });
    }, 50);
    return () => clearTimeout(timer);
  }, [reviews, activeTab]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    animValues.forEach((val) => val.setValue(0));
    fetchReviews();
  }, [fetchReviews, animValues]);

  const handleDelete = useCallback((review) => {
    Alert.alert(
      t('common.delete'),
      t('common.confirmDelete') || 'هل تريد حذف هذا التقييم؟',
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase.from('reviews').delete().eq('id', review.id);
              if (error) throw error;
              setReviews((prev) => prev.filter((r) => r.id !== review.id));
              animValues.delete(review.id);
            } catch (err) {
              console.error('Error deleting review:', err);
            }
          },
        },
      ]
    );
  }, [t, animValues]);

  const filtered = useMemo(() => {
    if (activeTab === 'all') return reviews;
    const tab = TABS.find((t) => t.key === activeTab);
    if (!tab || !tab.rating) return reviews;
    return reviews.filter((r) => r.rating === tab.rating);
  }, [reviews, activeTab]);

  const primaryImage = (product) => {
    if (!product) return null;
    const images = product.product_images || [];
    return images.find((img) => img.isPrimary)?.url || images[0]?.url || null;
  };

  const renderDeleteAction = (review) => (
    <TouchableOpacity
      style={styles.deleteAction}
      activeOpacity={0.85}
      onPress={() => handleDelete(review)}
    >
      <Trash2 size={20} color="#FFF" strokeWidth={2} />
      <Text style={styles.deleteActionText}>{t('common.delete')}</Text>
    </TouchableOpacity>
  );

  const renderCard = (review) => {
    const img = primaryImage(review.products);
    const accentColor = RATING_COLORS[Math.round(review.rating)] || '#CBD5E1';
    const anim = animValues.get(review.id);
    const cardAnim = anim
      ? {
          opacity: anim.interpolate({ inputRange: [0, 1], outputRange: [0, 1] }),
          transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) }],
        }
      : {};

    const cardContent = (
      <TouchableOpacity
        activeOpacity={0.92}
        onPress={() => navigation.navigate('Item', { productId: review.productId })}
        style={styles.cardTouchable}
      >
        <View style={styles.cardInner}>
          <View style={[styles.accentBar, { backgroundColor: accentColor }]} />
          <View style={styles.cardBody}>
            <View style={[styles.cardTopRow, { flexDirection: dir.row }]}>
              <TouchableOpacity
                style={styles.deleteIconBtn}
                activeOpacity={0.7}
                onPress={() => handleDelete(review)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Trash2 size={14} color="#CBD5E1" strokeWidth={2} />
              </TouchableOpacity>
              <View style={[styles.cardInfo, { alignItems: dir.alignItems }]}>
                <Text style={styles.productName} numberOfLines={1}>
                  {review.products?.nameAr || t('common.product')}
                </Text>
                <StarRating rating={review.rating} size={15} />
              </View>
              <View style={styles.imageWrap}>
                {img ? (
                  <Image source={{ uri: img }} style={styles.thumb} resizeMode="cover" />
                ) : (
                  <View style={styles.imagePlaceholder}>
                    <Ionicons name="image-outline" size={20} color="#CBD5E1" />
                  </View>
                )}
              </View>
            </View>

            {review.comment ? (
              <Text style={[styles.comment, { textAlign: dir.textAlign }]} numberOfLines={4}>
                {review.comment}
              </Text>
            ) : null}

            <View style={[styles.cardBottom, { flexDirection: dir.row }]}>
              <View style={[styles.ratingPill, { backgroundColor: `${accentColor}18` }]}>
                <Star size={11} color={accentColor} fill={accentColor} strokeWidth={0} />
                <Text style={[styles.ratingPillText, { color: accentColor }]}>
                  {Number(review.rating).toFixed(1)}
                </Text>
              </View>
              <Text style={styles.dateText}>{getRelativeTime(review.createdAt, t)}</Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );

    return (
      <Swipeable
        key={review.id}
        renderRightActions={() => renderDeleteAction(review)}
        overshootRight={false}
      >
        {anim ? (
          <Animated.View style={cardAnim}>{cardContent}</Animated.View>
        ) : (
          cardContent
        )}
      </Swipeable>
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />
        <ScreenHeader title={t('profile.menuMyReviews')} onBack={() => navigation.goBack()} />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#0F172A" />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />
      <ScreenHeader title={t('profile.menuMyReviews')} onBack={() => navigation.goBack()} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0F172A" colors={['#0F172A']} />
        }
      >
        {/* Filter Tabs */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={[styles.tabsRow, { flexDirection: dir.row }]}
        >
          {TABS.map((tab) => {
            const isActive = activeTab === tab.key;
            const count = tab.rating
              ? reviews.filter((r) => r.rating === tab.rating).length
              : reviews.length;
            return (
              <TouchableOpacity
                key={tab.key}
                activeOpacity={0.7}
                onPress={() => setActiveTab(tab.key)}
                style={[styles.tab, isActive && styles.tabActive]}
              >
                <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
                  {tab.label} {count > 0 ? `(${count})` : ''}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Review List */}
        {reviews.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconWrap}>
              <Ionicons name="star-outline" size={48} color="#CBD5E1" />
            </View>
            <Text style={styles.emptyTitle}>{t('profile.menuMyReviews')}</Text>
            <Text style={styles.emptySubtitle}>لم تقم بتقييم أي منتج بعد</Text>
            <TouchableOpacity
              style={styles.shopButton}
              activeOpacity={0.85}
              onPress={() => navigation.navigate('Home')}
            >
              <Text style={styles.shopButtonText}>تسوّق الآن</Text>
            </TouchableOpacity>
          </View>
        ) : filtered.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconWrap}>
              <Ionicons name="search-outline" size={36} color="#CBD5E1" />
            </View>
            <Text style={styles.emptySubtitle}>لا توجد تقييمات بهذه النجوم</Text>
          </View>
        ) : (
          filtered.map(renderCard)
        )}

        <View style={{ height: 20 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  scrollContent: { padding: 16 },

  /* Tabs */
  tabsRow: {
    paddingHorizontal: 2,
    paddingBottom: 14,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
  },
  tabActive: {
    backgroundColor: '#0F172A',
    shadowColor: '#0F172A',
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 8,
    elevation: 4,
  },
  tabText: { fontSize: 13, fontWeight: '600', color: '#64748B' },
  tabTextActive: { color: '#fff' },

  /* Cards */
  cardTouchable: {
    borderRadius: 24,
    overflow: 'hidden',
  },
  cardInner: {
    backgroundColor: '#fff',
    borderRadius: 24,
    flexDirection: 'row-reverse',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 16,
    elevation: 3,
    marginBottom: 14,
    overflow: 'hidden',
  },
  accentBar: {
    width: 5,
    borderTopRightRadius: 24,
    borderBottomRightRadius: 24,
  },
  cardBody: {
    flex: 1,
    padding: 14,
    paddingLeft: 12,
  },
  cardTopRow: {
    flexDirection: 'row-reverse',
    alignItems: 'flex-start',
    gap: 10,
  },
  deleteIconBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 4,
  },
  cardInfo: {
    flex: 1,
    alignItems: 'flex-end',
    gap: 4,
  },
  productName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    textAlign: 'right',
  },
  starsRow: {
    flexDirection: 'row-reverse',
    gap: 1,
  },

  imageWrap: {
    width: 56,
    height: 56,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#F1F5F9',
  },
  thumb: { width: 56, height: 56 },
  imagePlaceholder: {
    width: 56,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
  },

  comment: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 19,
    marginTop: 10,
    textAlign: 'right',
  },

  cardBottom: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  ratingPill: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  ratingPillText: {
    fontSize: 12,
    fontWeight: '700',
  },
  dateText: {
    fontSize: 11,
    color: '#94A3B8',
  },

  /* Swipeable Delete */
  deleteAction: {
    backgroundColor: '#EF4444',
    borderRadius: 24,
    marginBottom: 14,
    marginLeft: 8,
    justifyContent: 'center',
    alignItems: 'center',
    width: 72,
  },
  deleteActionText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 4,
  },

  /* Empty State */
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 24,
  },
  emptyIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
    marginBottom: 24,
  },
  shopButton: {
    backgroundColor: '#0F172A',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 14,
  },
  shopButtonText: { color: '#fff', fontSize: 14, fontWeight: '700' },
});
