import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  FlatList,
  Dimensions,
  StatusBar,
  ActivityIndicator,
  Image,
  TextInput,
  Alert,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ShoppingCart, Star } from 'lucide-react-native';
import ScreenHeader from '../components/ScreenHeader';
import Button from '../components/Button';
import BundleCard from '../components/BundleCard';
import RelatedProductsGrid from '../components/RelatedProductsGrid';
import SkeletonBox, { ListSkeleton } from '../components/Skeleton';
import { COLORS, SPACING, RADIUS, FONT_SIZES, FONT_WEIGHTS, SHADOWS } from '../constants';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../services/supabase';
import { db } from '../services/api';
import { useTranslation } from '../context/AppSettingsContext';
import { useDirection } from '../hooks/useDirection';

const { width } = Dimensions.get('window');

function StarRating({ rating, size = 14, spacing = 2 }) {
  return (
    <View style={{ flexDirection: 'row-reverse', gap: spacing }}>
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          size={size}
          color={s <= rating ? COLORS.amber : COLORS.gray300}
          fill={s <= rating ? COLORS.amber : 'transparent'}
        />
      ))}
    </View>
  );
}

function StarSelector({ value, onChange, size = 28 }) {
  return (
    <View style={{ flexDirection: 'row-reverse', gap: 4 }}>
      {[1, 2, 3, 4, 5].map((s) => (
        <TouchableOpacity key={s} onPress={() => onChange(s)} activeOpacity={0.7}>
          <Star
            size={size}
          color={s <= value ? COLORS.amber : COLORS.gray300}
          fill={s <= value ? COLORS.amber : 'transparent'}
          />
        </TouchableOpacity>
      ))}
    </View>
  );
}

function formatTime(dateStr, t, locale) {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now - date;
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffMin < 1) return t('time.justNow');
  if (diffMin < 60) return t('time.minutesAgo', { n: diffMin });
  if (diffHr < 24) return t('time.hoursAgo', { n: diffHr });
  if (diffDay < 7) return t('time.daysAgo', { n: diffDay });
  return date.toLocaleDateString(locale === 'ar' ? 'ar-EG' : 'en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function ItemScreen({ navigation, route }) {
  const { addToCart, removeFromCart, isFavorite, toggleFavorite, isInCart } = useApp();
  const { user } = useAuth();
  const { t, locale } = useTranslation();
  const dir = useDirection();
  const lastImageTap = useRef(0);
  const productId = route?.params?.productId;
  const [product, setProduct] = useState(null);
  const [specs, setSpecs] = useState({});
  const [variants, setVariants] = useState([]);
  const [images, setImages] = useState([]);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [newRating, setNewRating] = useState(5);
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [bundle, setBundle] = useState(null);
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [addedMap, setAddedMap] = useState({});

  const handleImageDoubleTap = () => {
    const now = Date.now();
    if (now - lastImageTap.current < 300) {
      toggleFavorite(product, user?.id);
    }
    lastImageTap.current = now;
  };

  useEffect(() => {
    if (productId) {
      fetchProduct();
      fetchReviews();
    }
  }, [productId]);

  useEffect(() => {
    if (product) {
      fetchBundleAndRelated();
    }
  }, [product?.id]);

  const fetchProduct = async () => {
    try {
      setLoading(true);

      const [productRes, specsRes, variantsRes] = await Promise.all([
        supabase
          .from('products')
          .select(`
            *,
            brands(name, "nameAr"),
            categories(name, "nameAr"),
            product_images(id, url, "isPrimary", "sortOrder")
          `)
          .eq('id', productId)
          .single(),
        supabase
          .from('specifications')
          .select('*')
          .eq('productId', productId)
          .order('sortOrder'),
        supabase
          .from('product_variants')
          .select('*')
          .eq('productId', productId)
          .eq('isActive', true),
      ]);

      if (productRes.data) {
        setProduct(productRes.data);
        setImages(productRes.data.product_images || []);
        setSelectedImageIndex(0);
      }

      if (specsRes.data) {
        const grouped = {};
        specsRes.data.forEach(spec => {
          const group = spec.groupName || t('item.general');
          if (!grouped[group]) grouped[group] = [];
          grouped[group].push({ key: spec.key, value: spec.value });
        });
        setSpecs(grouped);
      }

      if (variantsRes.data) {
        setVariants(variantsRes.data);
        if (variantsRes.data.length > 0) {
          setSelectedVariant(variantsRes.data[0]);
        }
      }
    } catch (error) {
      console.error('Error fetching product:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchReviews = async () => {
    try {
      setReviewsLoading(true);
      const { data, error } = await supabase
        .from('reviews')
        .select('*, profiles!reviews_userId_fkey(name)')
        .eq('productId', productId)
        .eq('isVisible', true)
        .order('createdAt', { ascending: false });

      if (error) throw error;
      setReviews(data || []);
    } catch (error) {
      console.error('Error fetching reviews:', error);
    } finally {
      setReviewsLoading(false);
    }
  };

  const fetchBundleAndRelated = async () => {
    try {
      const [bundleData, relatedData] = await Promise.all([
        db.getBundleByProduct(product.id),
        db.getRelatedProducts(product.categoryId, product.id, 6),
      ]);
      setBundle(bundleData);
      setRelatedProducts(relatedData);
    } catch (error) {
      console.error('Error fetching bundle/related:', error);
    }
  };

  const handleAddToCart = () => {
    if (!product) return;

    const price = selectedVariant
      ? Number(selectedVariant.price) || Number(product.basePrice)
      : isPriceRange ? Number(product.minPrice) : Number(product.basePrice);

    addToCart({
      id: product.id,
      productId: product.id,
      title: product.nameAr,
      price,
      image: images.find(img => img.isPrimary)?.url || images[0]?.url || null,
      variantId: selectedVariant?.id || null,
      variant: selectedVariant ? {
        color: selectedVariant.color,
        storage: selectedVariant.storage,
        ram: selectedVariant.ram,
      } : null,
    });

    navigation.navigate('Cart');
  };

  const handleSubmitReview = async () => {
    if (!user) {
      Alert.alert(t('auth.login'), t('item.mustLoginToReview'));
      return;
    }

    if (!newComment.trim()) {
      Alert.alert(t('common.error'), t('item.writeComment'));
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.from('reviews').insert({
        userId: user.id,
        productId,
        rating: newRating,
        comment: newComment.trim(),
        isVisible: true,
      });

      if (error) throw error;

      const newReview = {
        id: 'temp_' + Date.now(),
        userId: user.id,
        productId,
        rating: newRating,
        comment: newComment.trim(),
        isVisible: true,
        createdAt: new Date().toISOString(),
        profiles: { name: user.name || '' },
      };
      setReviews((prev) => [newReview, ...prev]);
      setShowReviewForm(false);
      setNewRating(5);
      setNewComment('');
    } catch (error) {
      Alert.alert(t('common.error'), error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const avgRating = reviews.length > 0
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : '0.0';

  const ratingDistribution = [0, 0, 0, 0, 0];
  reviews.forEach((r) => {
    if (r.rating >= 1 && r.rating <= 5) ratingDistribution[r.rating - 1]++;
  });
  const maxCount = Math.max(...ratingDistribution, 1);

  if (loading) {
    return (
      <View style={styles.root}>
        <StatusBar barStyle="dark-content" backgroundColor={COLORS.bg} />
        <ScrollView style={styles.root}>
          <SkeletonBox width="100%" height={300} borderRadius={0} />
          <View style={{ padding: 16, gap: 12 }}>
            <SkeletonBox width="60%" height={24} borderRadius={8} />
            <SkeletonBox width="40%" height={20} borderRadius={8} />
            <SkeletonBox width="100%" height={80} borderRadius={8} />
            <View style={{ flexDirection: 'row-reverse', gap: 8 }}>
              <SkeletonBox width={80} height={36} borderRadius={18} />
              <SkeletonBox width={80} height={36} borderRadius={18} />
              <SkeletonBox width={80} height={36} borderRadius={18} />
            </View>
            <SkeletonBox width="30%" height={32} borderRadius={8} />
            <SkeletonBox width="100%" height={48} borderRadius={12} />
          </View>
        </ScrollView>
      </View>
    );
  }

  if (!product) {
    return (
      <View style={styles.root}>
        <StatusBar barStyle="dark-content" backgroundColor={COLORS.bg} />
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={COLORS.gray400} />
          <Text style={styles.errorText}>{t('item.notFound')}</Text>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.backBtnText}>{t('common.back')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const isPriceRange = product.usePriceRange && product.minPrice != null && product.maxPrice != null;

  const displayPrice = selectedVariant
    ? Number(selectedVariant.price) || Number(product.basePrice)
    : isPriceRange ? Number(product.minPrice) : Number(product.basePrice);

  const hasUserReviewed = user && reviews.some(r => r.userId === user.id);

  return (
    <View style={styles.root}>

      <ScreenHeader
        title={t('item.title')}
        onBack={() => navigation.goBack()}
        rightAction={
          <View style={{ flexDirection: dir.row, gap: 6, alignItems: 'center' }}>
            <TouchableOpacity
              onPress={() => toggleFavorite(product, user?.id)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons
                name={isFavorite(product?.id) ? 'heart' : 'heart-outline'}
                size={22}
                color={isFavorite(product?.id) ? COLORS.error : COLORS.text}
              />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => navigation.navigate('Cart')}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <ShoppingCart color={COLORS.primary} size={20} />
            </TouchableOpacity>
          </View>
        }
      />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.imageCard}>
          {images.length > 0 ? (
            <View>
              <FlatList
                data={images}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onMomentumScrollEnd={(e) => {
                  const index = Math.round(e.nativeEvent.contentOffset.x / width);
                  setSelectedImageIndex(index);
                }}
                scrollEventThrottle={16}
                decelerationRate="fast"
                keyExtractor={(item, i) => item.id || `img-${i}`}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    activeOpacity={1}
                    onPress={handleImageDoubleTap}
                    style={{ width }}
                  >
                    <Image
                      source={{ uri: item.url }}
                      style={styles.navMainImage}
                      resizeMode="contain"
                    />
                  </TouchableOpacity>
                )}
              />

              {images.length > 1 && (
                <View style={styles.navDots}>
                  {images.map((_, i) => (
                    <View
                      key={i}
                      style={[styles.navDot, selectedImageIndex === i && styles.navDotActive]}
                    />
                  ))}
                </View>
              )}
            </View>
          ) : (
            <View style={styles.navEmpty}>
              <Ionicons name="phone-portrait-outline" size={80} color={COLORS.gray200} />
            </View>
          )}
        </View>

        <View style={styles.infoSection}>
          <View style={styles.ratingRow}>
            <View style={styles.ratingBadge}>
              <Star size={12} color={COLORS.amber} fill={COLORS.amber} />
              <Text style={styles.ratingText}>{avgRating}</Text>
            </View>
            <Text style={styles.reviewsText}>({t('item.reviewsCount', { count: reviews.length })})</Text>
          </View>

          <Text style={styles.productTitle}>{product.nameAr}</Text>
          {product.name && <Text style={styles.productNameEn}>{product.name}</Text>}

          {variants.length > 0 && (
            <>
              <Text style={styles.sectionLabel}>{t('item.variants')}</Text>
              <View style={styles.variantsContainer}>
                {variants.map((v, i) => {
                  const label = [v.storage, v.ram, v.color].filter(Boolean).join(' / ');
                  const variantPrice = Number(v.price) || Number(product.basePrice);
                  const isSelected = selectedVariant?.id === v.id;
                  return (
                    <TouchableOpacity
                      key={i}
                      style={[styles.variantChip, isSelected && styles.variantChipActive]}
                      onPress={() => setSelectedVariant(v)}
                    >
                      <View style={styles.variantChipContent}>
                        <Text style={[styles.variantChipLabel, isSelected && styles.variantChipLabelActive]}>{label}</Text>
                        <View style={styles.variantChipPriceWrap}>
                          <Text style={[styles.variantChipPrice, isSelected && styles.variantChipPriceActive]}>
                            {variantPrice.toLocaleString()} {t('common.egp')}
                          </Text>
                          {v.batteryHealth != null && (
                            <Text style={styles.variantChipBattery}>
                              🔋 {v.batteryHealth}%
                            </Text>
                          )}
                          {v.taxRate != null && v.taxRate > 0 && (
                            <Text style={styles.variantChipTax}>
                              ضريبة : {Number(v.taxRate).toLocaleString()}
                            </Text>
                          )}
                        </View>
                      </View>
                      {isSelected && <View style={styles.variantChipSelectedIndicator} />}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </>
          )}

          {product.descriptionAr && (
            <>
              <Text style={styles.descriptionTitle}>{t('item.description')}</Text>
              <Text style={styles.descriptionText}>{product.descriptionAr}</Text>
            </>
          )}

          {Object.keys(specs).length > 0 && (
            <>
              <Text style={styles.specsTitle}>{t('item.specifications')}</Text>
              {Object.entries(specs).map(([group, items]) => {
                const filtered = items.filter(s => s.value && s.value !== '-');
                if (filtered.length === 0) return null;
                return (
                  <View key={group} style={styles.specGroup}>
                    <Text style={styles.specGroupTitle}>{group}</Text>
                    <View style={styles.specsTable}>
                      {filtered.map((spec, index) => (
                        <View
                          key={spec.key}
                          style={[
                            styles.specRow,
                            index % 2 === 1 && styles.specRowAlt,
                            index < filtered.length - 1 && styles.specDivider,
                          ]}
                        >
                          <Text style={styles.specLabel}>{spec.key}</Text>
                          <Text style={styles.specValue}>{spec.value}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                );
              })}
            </>
          )}

          {/* Bundle Section */}
          {bundle && (
            <View style={styles.bundleSection}>
              <BundleCard
                bundle={bundle}
                onAddBundle={() => {
                  if (bundle.addon_products) {
                    bundle.addon_products.forEach((addon) => {
                      const addonPrice = addon.isOnSale && addon.salePrice ? addon.salePrice : addon.basePrice;
                      addToCart({
                        id: addon.id,
                        productId: addon.id,
                        title: addon.nameAr,
                        price: addonPrice * (1 - (bundle.discount_percent || 0) / 100),
                        image: addon.product_images?.find(i => i.isPrimary)?.url || addon.product_images?.[0]?.url || null,
                        variantId: null,
                      });
                    });
                  }
                }}
              />
            </View>
          )}

          {/* Related Products Section */}
          {relatedProducts.length > 0 && (
            <View style={styles.relatedSection}>
              <RelatedProductsGrid
                products={relatedProducts}
                onProductPress={(item) => navigation.navigate('Item', { productId: item.id })}
                onAddToCart={(item) => {
                  const price = item.usePriceRange ? (item.minPrice || item.basePrice) : (item.isOnSale && item.salePrice ? item.salePrice : item.basePrice);
                  addToCart({
                    id: item.id,
                    productId: item.id,
                    title: item.nameAr,
                    price,
                    image: item.product_images?.find(i => i.isPrimary)?.url || item.product_images?.[0]?.url || null,
                    variantId: null,
                  });
                  setAddedMap((prev) => ({ ...prev, [item.id]: true }));
                  setTimeout(() => setAddedMap((prev) => ({ ...prev, [item.id]: false })), 1200);
                }}
                onRemoveFromCart={(item) => {
                  removeFromCart(item.id);
                }}
                inCartMap={relatedProducts.reduce((m, p) => ({ ...m, [p.id]: isInCart(p.id) }), {})}
                addedMap={addedMap}
              />
            </View>
          )}

          {/* Reviews Section */}
          <View style={styles.reviewsSection}>
            <View style={styles.reviewsHeader}>
              <Text style={styles.reviewsSectionTitle}>{t('item.reviews')}</Text>
              {!hasUserReviewed && (
                <TouchableOpacity
                  style={styles.writeReviewBtn}
                  onPress={() => {
                    if (!user) {
                      Alert.alert(t('auth.login'), t('item.mustLoginToReview'));
                      return;
                    }
                    setShowReviewForm(true);
                  }}
                >
                  <Ionicons name="add" size={16} color={COLORS.white} />
                  <Text style={styles.writeReviewText}>{t('item.addReview')}</Text>
                </TouchableOpacity>
              )}
            </View>

            {reviews.length > 0 && (
              <View style={styles.ratingSummary}>
                <View style={styles.ratingSummaryLeft}>
                  <Text style={styles.ratingSummaryScore}>{avgRating}</Text>
                  <StarRating rating={Math.round(Number(avgRating))} size={14} />
                  <Text style={styles.ratingSummaryCount}>{t('item.reviewsCount', { count: reviews.length })}</Text>
                </View>
                <View style={styles.ratingSummaryRight}>
                  {[5, 4, 3, 2, 1].map((s) => {
                    const count = ratingDistribution[s - 1];
                    return (
                      <View key={s} style={styles.distRow}>
                        <Text style={styles.distLabel}>{s}</Text>
                        <Star size={10} color={COLORS.amber} fill={COLORS.amber} />
                        <View style={styles.distBar}>
                          <View style={[styles.distFill, { width: `${(count / maxCount) * 100}%` }]} />
                        </View>
                        <Text style={styles.distCount}>{count}</Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            )}

            {/* Review Form */}
            {showReviewForm && (
              <View style={styles.reviewForm}>
                <Text style={styles.reviewFormTitle}>{t('item.yourReview')}</Text>
                <StarSelector value={newRating} onChange={setNewRating} size={32} />
                <TextInput
                  style={styles.reviewInput}
                  placeholder={t('item.reviewPlaceholder')}
                  placeholderTextColor={COLORS.gray400}
                  value={newComment}
                  onChangeText={setNewComment}
                  multiline
                  textAlignVertical="top"
                  textAlign={dir.textAlign}
                />
                <View style={styles.reviewFormActions}>
                  <TouchableOpacity
                    style={styles.cancelReviewBtn}
                    onPress={() => { setShowReviewForm(false); setNewRating(5); setNewComment(''); }}
                  >
                    <Text style={styles.cancelReviewText}>{t('common.cancel')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.submitReviewBtn, submitting && { opacity: 0.6 }]}
                    onPress={handleSubmitReview}
                    disabled={submitting}
                  >
                    {submitting ? (
                      <ActivityIndicator size="small" color={COLORS.white} />
                    ) : (
                      <Text style={styles.submitReviewText}>{t('item.submitReview')}</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Reviews List */}
            {reviewsLoading ? (
              <View style={styles.reviewsLoading}>
                <ListSkeleton rows={2} />
              </View>
            ) : reviews.length === 0 && !showReviewForm ? (
              <View style={styles.emptyReviews}>
                <Ionicons name="chatbubble-ellipses-outline" size={40} color={COLORS.gray300} />
                <Text style={styles.emptyReviewsText}>{t('item.noReviews')}</Text>
                <Text style={styles.emptyReviewsSub}>{t('item.beFirstReview')}</Text>
              </View>
            ) : (
              <View style={styles.reviewsList}>
                {reviews.map((review) => (
                  <View key={review.id} style={styles.reviewCard}>
                    <View style={styles.reviewTop}>
                      <View style={styles.reviewUser}>
                        <View style={styles.reviewAvatar}>
                          <Text style={styles.reviewAvatarText}>
                            {(review.profiles?.name || t('item.user'))[0]}
                          </Text>
                        </View>
                        <View>
                          <Text style={styles.reviewUserName}>{review.profiles?.name || t('item.user')}</Text>
                          <StarRating rating={review.rating} size={11} spacing={1} />
                        </View>
                      </View>
                      <Text style={styles.reviewTime}>{formatTime(review.createdAt, t, locale)}</Text>
                    </View>
                    {review.comment && (
                      <Text style={styles.reviewComment}>{review.comment}</Text>
                    )}
                  </View>
                ))}
              </View>
            )}
          </View>
        </View>
      </ScrollView>
      </KeyboardAvoidingView>

      <View style={styles.stickyBottom}>
        <View style={styles.priceBlock}>
          <Text style={styles.priceLabel}>{t('item.price')}</Text>
          {isPriceRange && !selectedVariant ? (
            <Text style={styles.priceValue}>{Number(product.minPrice).toLocaleString()} - {Number(product.maxPrice).toLocaleString()} {t('common.currency')}</Text>
          ) : (
            <Text style={styles.priceValue}>{displayPrice.toLocaleString()} {t('common.currency')}</Text>
          )}
          {selectedVariant?.taxRate != null && selectedVariant.taxRate > 0 && (
            <Text style={styles.taxInfo}>الجهاز علية ضريبة لا تضاف الي سعر البيع</Text>
          )}
        </View>
        <Button
          title={t('item.addToCart')}
          onPress={handleAddToCart}
          icon={<ShoppingCart size={18} color="#fff" />}
          iconPosition="left"
          style={styles.addToCartBtn}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.white },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { fontSize: FONT_SIZES.lg, color: COLORS.textSecondary, marginTop: 12, marginBottom: 20 },
  backBtn: { backgroundColor: COLORS.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: RADIUS.lg },
  backBtnText: { color: COLORS.white, fontWeight: FONT_WEIGHTS.bold },

  scroll: { paddingBottom: 120 },

  bundleSection: { paddingHorizontal: 16, marginTop: 16 },
  relatedSection: { marginTop: 24 },

  imageCard: {
    backgroundColor: COLORS.gray50, marginHorizontal: 16, marginTop: 16,
    borderRadius: 24, overflow: 'hidden',
  },
  navMainImage: { width: '100%', height: 360 },
  navDots: {
    position: 'absolute', bottom: 14, right: 0, left: 0,
    flexDirection: 'row-reverse', justifyContent: 'center', gap: 6,
  },
  navDot: {
    width: 7, height: 7, borderRadius: 3.5,
    backgroundColor: COLORS.gray300,
  },
  navDotActive: {
    backgroundColor: COLORS.black, width: 18, borderRadius: 3.5,
  },
  navEmpty: {
    height: 360, justifyContent: 'center', alignItems: 'center',
  },

  infoSection: { paddingHorizontal: 16, marginTop: 20 },
  ratingRow: { flexDirection: 'row-reverse', alignItems: 'center', marginBottom: 10 },
  ratingBadge: {
    flexDirection: 'row-reverse', alignItems: 'center', backgroundColor: '#FEF3C7',
    borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, marginRight: 8,
  },
  ratingText: { fontSize: 12, fontWeight: '700', color: '#92400E', marginRight: 4 },
  reviewsText: { fontSize: 12, color: COLORS.gray400 },
  productTitle: { fontSize: 17, fontWeight: '700', color: COLORS.black, textAlign: 'right', lineHeight: 26, marginBottom: 4 },
  productNameEn: { fontSize: 13, color: COLORS.gray500, textAlign: 'right', marginBottom: 14 },
  sectionLabel: { fontSize: 14, fontWeight: '700', color: COLORS.black, textAlign: 'right', marginBottom: 10 },
  storageRow: { flexDirection: 'row-reverse', marginBottom: 20, flexWrap: 'wrap' },
  storageChip: {
    borderWidth: 1.5, borderColor: COLORS.gray200, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 7, marginRight: 8, marginBottom: 8, backgroundColor: COLORS.white,
  },
  storageChipActive: { borderColor: COLORS.black, backgroundColor: COLORS.black },
  storageChipText: { fontSize: 13, fontWeight: '600', color: COLORS.gray500 },
  storageChipTextActive: { color: COLORS.white },

  variantsContainer: { flexDirection: 'column', gap: 8, marginBottom: 8 },
  variantChip: {
    borderWidth: 1.5, borderColor: COLORS.gray200, borderRadius: 14,
    paddingHorizontal: 14, paddingVertical: 12, backgroundColor: COLORS.white,
    flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between',
  },
  variantChipActive: { borderColor: COLORS.black, backgroundColor: '#FAFAFA', borderWidth: 2 },
  variantChipContent: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', flex: 1, gap: 8 },
  variantChipLabel: { fontSize: 13, fontWeight: '600', color: COLORS.gray500, textAlign: 'right' },
  variantChipLabelActive: { color: COLORS.black },
  variantChipPriceWrap: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6, flexShrink: 0 },
  variantChipPrice: { fontSize: 13, fontWeight: '700', color: COLORS.error },
  variantChipPriceActive: { color: COLORS.error },
  variantChipDiff: { fontSize: 11, fontWeight: '600' },
  variantChipDiffHigher: { color: COLORS.error },
  variantChipDiffLower: { color: COLORS.success },
  variantChipBattery: { fontSize: 10, color: COLORS.gray400 },
  variantChipTax: { fontSize: 10, color: '#64748B', fontWeight: '500', marginTop: 2 },
  variantChipSelectedIndicator: {
    position: 'absolute', top: -4, right: -4, width: 16, height: 16,
    backgroundColor: COLORS.black, borderRadius: 8, borderWidth: 2, borderColor: COLORS.white,
    justifyContent: 'center', alignItems: 'center',
  },

  descriptionTitle: { fontSize: 16, fontWeight: '700', color: COLORS.black, textAlign: 'right', marginBottom: 8 },
  descriptionText: { fontSize: 14, color: COLORS.gray500, textAlign: 'right', lineHeight: 22, marginBottom: 20 },

  specsTitle: { fontSize: 18, fontWeight: '700', color: '#1A1A1A', textAlign: 'right', marginBottom: 12, marginTop: 8 },
  specGroup: { marginBottom: 20 },
  specGroupTitle: { fontSize: 13, fontWeight: '600', color: '#64748B', textAlign: 'right', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  specsTable: {
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
  },
  specRow: { flexDirection: 'row-reverse', alignItems: 'center', paddingVertical: 13, paddingHorizontal: 16, backgroundColor: '#FFFFFF' },
  specRowAlt: { backgroundColor: '#FAFAFA' },
  specDivider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E8E8E8' },
  specLabel: { fontSize: 13, color: '#64748B', fontWeight: '500', textAlign: 'right', width: '35%' },
  specValue: { fontSize: 14, color: '#121212', fontWeight: '600', textAlign: 'right', flex: 1, paddingRight: 12 },

  // Reviews
  reviewsSection: { marginTop: 24, paddingTop: 20, borderTopWidth: 1, borderTopColor: COLORS.gray200 },
  reviewsHeader: {
    flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16,
  },
  reviewsSectionTitle: { fontSize: 17, fontWeight: '800', color: COLORS.black },
  writeReviewBtn: {
    flexDirection: 'row-reverse', alignItems: 'center', backgroundColor: COLORS.black,
    borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7, gap: 4,
  },
  writeReviewText: { fontSize: 13, fontWeight: '700', color: COLORS.white },

  ratingSummary: {
    flexDirection: 'row-reverse', backgroundColor: COLORS.gray50,
    borderRadius: 20, padding: 16, marginBottom: 20, gap: 20,
  },
  ratingSummaryLeft: { alignItems: 'center', justifyContent: 'center', gap: 6 },
  ratingSummaryScore: { fontSize: 36, fontWeight: '800', color: COLORS.black },
  ratingSummaryCount: { fontSize: 11, color: COLORS.gray500 },
  ratingSummaryRight: { flex: 1, gap: 5 },
  distRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 4 },
  distLabel: { fontSize: 12, fontWeight: '600', color: COLORS.black, width: 14, textAlign: 'center' },
  distBar: {
    flex: 1, height: 6, borderRadius: 3, backgroundColor: COLORS.gray200, overflow: 'hidden',
  },
  distFill: { height: '100%', backgroundColor: COLORS.amber, borderRadius: 3 },
  distCount: { fontSize: 11, color: COLORS.gray500, width: 22, textAlign: 'right' },

  reviewForm: {
    backgroundColor: COLORS.blueLight, borderRadius: 20, padding: 16, marginBottom: 20, gap: 12,
  },
  reviewFormTitle: { fontSize: 14, fontWeight: '700', color: COLORS.black, textAlign: 'right' },
  reviewInput: {
    backgroundColor: COLORS.white, borderRadius: 14, padding: 14,
    fontSize: 14, color: COLORS.black, minHeight: 90,
    borderWidth: 1, borderColor: COLORS.gray200,
  },
  reviewFormActions: { flexDirection: 'row-reverse', justifyContent: 'flex-start', gap: 10 },
  cancelReviewBtn: { backgroundColor: COLORS.black, paddingHorizontal: 22, paddingVertical: 10, borderRadius: 12, minWidth: 100, alignItems: 'center' },
  cancelReviewText: { fontSize: 14, fontWeight: '700', color: COLORS.white },
  submitReviewBtn: {
    backgroundColor: COLORS.black, paddingHorizontal: 22, paddingVertical: 10,
    borderRadius: 12, minWidth: 100, alignItems: 'center',
  },
  submitReviewText: { fontSize: 14, fontWeight: '700', color: COLORS.white },

  reviewsLoading: { paddingVertical: 30, alignItems: 'center' },
  emptyReviews: { alignItems: 'center', paddingVertical: 30, gap: 6 },
  emptyReviewsText: { fontSize: 14, fontWeight: '700', color: COLORS.gray400 },
  emptyReviewsSub: { fontSize: 12, color: COLORS.gray400 },

  reviewsList: { gap: 10 },
  reviewCard: {
    backgroundColor: COLORS.white, borderRadius: 16, padding: 14,
    borderWidth: 1, borderColor: COLORS.gray100, gap: 8,
  },
  reviewTop: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center' },
  reviewUser: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10 },
  reviewAvatar: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.gray100,
    justifyContent: 'center', alignItems: 'center',
  },
  reviewAvatarText: { fontSize: 14, fontWeight: '700', color: COLORS.gray500 },
  reviewUserName: { fontSize: 13, fontWeight: '700', color: COLORS.black, textAlign: 'right', marginBottom: 2 },
  reviewTime: { fontSize: 11, color: COLORS.gray400 },
  reviewComment: { fontSize: 13, color: COLORS.gray500, textAlign: 'right', lineHeight: 20 },

  stickyBottom: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: COLORS.white, borderTopWidth: 1, borderTopColor: COLORS.gray100,
    flexDirection: 'row-reverse', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14, paddingBottom: 20,
  },
  priceBlock: { flex: 1 },
  priceLabel: { fontSize: 12, color: COLORS.gray400, textAlign: 'right' },
  priceValue: { fontSize: 22, fontWeight: '800', color: COLORS.red, textAlign: 'right' },
  taxLabel: { fontSize: 12, color: '#64748B', textAlign: 'right', marginTop: 2 },
  taxInfo: { fontSize: 11, color: '#64748B', textAlign: 'right', marginTop: 4, fontStyle: 'italic' },
  addToCartBtn: { backgroundColor: COLORS.primary, borderRadius: 24, height: 52, paddingHorizontal: 28 },
});
