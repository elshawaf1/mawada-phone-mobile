import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Dimensions,
  StatusBar,
  FlatList,
  Image,
  ScrollView,
  Animated,
  RefreshControl,
} from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';
import { Heart, Clock, Tag } from 'lucide-react-native';
import MainLayout from '../components/MainLayout';
import ProductCard, { ProductCardHorizontal } from '../components/ProductCard';
import BundleCard from '../components/BundleCard';
import RelatedProductsGrid from '../components/RelatedProductsGrid';
import ProductMatchLabel from '../components/ProductMatchLabel';
import { ProductGridSkeleton, BannerSkeleton } from '../components/Skeleton';
import { COLORS, SPACING, SHADOWS, RADIUS, FONT_SIZES, FONT_WEIGHTS } from '../constants';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../services/supabase';
import { db } from '../services/api';
import { useTranslation } from '../context/AppSettingsContext';
import { useDirection } from '../hooks/useDirection';

const { width } = Dimensions.get('window');
const BANNER_W = width - 32;

function SearchBar({ onPress, t }) {
  return (
    <TouchableOpacity style={styles.searchBar} activeOpacity={0.8} onPress={onPress}>
      <Feather name="search" size={18} color={COLORS.gray400} style={{ marginRight: 10 }} />
      <Text style={styles.searchPlaceholder}>{t('home.searchPlaceholder')}</Text>
    </TouchableOpacity>
  );
}

function HeroCarousel({ banners, navigation, t }) {
  const [activeIndex, setActiveIndex] = useState(0);

  if (!banners || banners.length === 0) return null;

  const handleScrollEnd = (e) => {
    const index = Math.round(e.nativeEvent.contentOffset.x / BANNER_W);
    setActiveIndex(index);
  };

  return (
    <View style={styles.carouselContainer}>
      <FlatList
        data={banners}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScrollEnd}
        scrollEventThrottle={16}
        decelerationRate="fast"
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.bannerCard}
            activeOpacity={0.9}
            onPress={() => {
              if (item.linkType === 'product' && item.linkId) {
                navigation.navigate('Item', { productId: item.linkId });
              } else if (item.linkUrl) {
              } else {
                navigation.navigate('Search');
              }
            }}
          >
            {item.imageUrl ? (
              <Image source={{ uri: item.imageUrl }} style={StyleSheet.absoluteFill} resizeMode="cover" />
            ) : (
              <View style={[styles.bannerAccent, { backgroundColor: '#3B82F615' }]} />
            )}
            <View style={styles.bannerOverlay} />
            <View style={styles.bannerContent}>
              <Text style={styles.bannerTitle}>{item.titleAr || item.title}</Text>
              <View style={styles.bannerBtn}>
                <Text style={styles.bannerBtnText}>{t('home.shopNow')}</Text>
                <Ionicons name="arrow-forward" size={14} color="#FFF" />
              </View>
            </View>
          </TouchableOpacity>
        )}
        keyExtractor={(item) => item.id}
      />

      <View style={styles.paginationContainer}>
        {banners.map((_, i) => (
          <View
            key={i}
            style={[
              styles.paginationDot,
              activeIndex === i && styles.paginationDotActive,
            ]}
          />
        ))}
      </View>
    </View>
  );
}

function BrandSegmentedControl({ brands, activeBrand, setActiveBrand, t }) {
  const allBrands = [{ id: 'all', nameAr: t('home.all'), name: 'All' }, ...(brands || [])];

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={[styles.brandScroll, { transform: [{ scaleX: -1 }] }]} contentContainerStyle={styles.brandContainer}>
      {allBrands.map((brand) => {
        const isActive = activeBrand === brand.id;
        return (
          <View key={brand.id} style={{ transform: [{ scaleX: -1 }] }}>
            <TouchableOpacity
              style={[styles.brandItem, isActive && styles.brandItemActive]}
              onPress={() => setActiveBrand(brand.id)}
              activeOpacity={0.7}
            >
              <Text style={[styles.brandText, isActive && styles.brandTextActive]}>
                {brand.nameAr || brand.name}
              </Text>
            </TouchableOpacity>
          </View>
        );
      })}
    </ScrollView>
  );
}

function AnimatedCatCard({ cat, cardW, isTall, bgIdx, onPress }) {
  const lift = useRef(new Animated.Value(0)).current
  const zoom = useRef(new Animated.Value(1)).current

  const animateIn = () => {
    Animated.parallel([
      Animated.spring(lift, { toValue: 1, useNativeDriver: true, friction: 8, tension: 40 }),
      Animated.spring(zoom, { toValue: 1.06, useNativeDriver: true, friction: 8, tension: 40 }),
    ]).start()
  }

  const animateOut = () => {
    Animated.parallel([
      Animated.spring(lift, { toValue: 0, useNativeDriver: true, friction: 8, tension: 40 }),
      Animated.spring(zoom, { toValue: 1, useNativeDriver: true, friction: 8, tension: 40 }),
    ]).start()
  }

  const translateY = lift.interpolate({ inputRange: [0, 1], outputRange: [0, -8] })
  const imgH = isTall ? cardW * 1.3 : cardW * 0.8
  const cardH = imgH
  const BGS = ['#0F172A', '#1E293B', '#3B82F6', '#334155']

  return (
    <TouchableOpacity
      activeOpacity={1}
      onPressIn={animateIn}
      onPressOut={animateOut}
      onPress={onPress}
    >
      <Animated.View style={{ transform: [{ translateY }] }}>
        <View style={[styles.catCard, { width: cardW, height: cardH }]}>
          <Animated.View style={[styles.catImageArea, { backgroundColor: BGS[bgIdx], transform: [{ scale: zoom }] }]}>
            {cat.homeImageUrl || cat.imageUrl ? (
              <Image source={{ uri: cat.homeImageUrl || cat.imageUrl }} style={StyleSheet.absoluteFill} resizeMode="cover" />
            ) : null}
          </Animated.View>
          <View style={styles.catBadge}>
            <Text style={styles.catBadgeText}>{cat.nameAr}</Text>
          </View>
        </View>
      </Animated.View>
    </TouchableOpacity>
  )
}

function CategoryGrid({ categories, navigation, t }) {
  if (!categories || categories.length < 2) return null
  const cats = categories.slice(0, 4)
  while (cats.length < 4) {
    cats.push({ id: `ph-${cats.length}`, nameAr: 'قسم', name: 'Category' })
  }

  const GAP = 24
  const CARD_W = (width - 32 - GAP) / 2

  return (
    <View style={styles.categorySection}>
      <View style={styles.catSectionHeader}>
        <Text style={styles.catSectionTitle}>{t('home.categories')}</Text>
      </View>
      <View style={styles.catGrid}>
        <View style={styles.catCol}>
          <AnimatedCatCard cat={cats[0]} cardW={CARD_W} isTall bgIdx={0} onPress={() => navigation.navigate('CategoryProducts', { categoryId: cats[0].id, categoryName: cats[0].nameAr })} />
          <View style={{ height: GAP }} />
          <AnimatedCatCard cat={cats[2]} cardW={CARD_W} isTall={false} bgIdx={2} onPress={() => navigation.navigate('CategoryProducts', { categoryId: cats[2].id, categoryName: cats[2].nameAr })} />
        </View>
        <View style={{ width: GAP }} />
        <View style={styles.catCol}>
          <AnimatedCatCard cat={cats[1]} cardW={CARD_W} isTall={false} bgIdx={1} onPress={() => navigation.navigate('CategoryProducts', { categoryId: cats[1].id, categoryName: cats[1].nameAr })} />
          <View style={{ height: GAP }} />
          <AnimatedCatCard cat={cats[3]} cardW={CARD_W} isTall bgIdx={3} onPress={() => navigation.navigate('CategoryProducts', { categoryId: cats[3].id, categoryName: cats[3].nameAr })} />
        </View>
      </View>
    </View>
  )
}

function QuickActions({ navigation, t }) {
  const actions = [
    { key: 'wishlist', icon: Heart, label: t('wishlist.title') || 'المفضلة', screen: 'Wishlist' },
    { key: 'recent', icon: Clock, label: t('recentlyViewed.title') || 'تم العرض مؤخراً', screen: 'RecentlyViewed' },
    { key: 'offers', icon: Tag, label: t('offers.title') || 'العروض', screen: 'Offers' },
  ];
  const iconColor = '#0F172A';

  return (
    <View style={styles.quickActionsSection}>
      <View style={styles.quickActionsGrid}>
        {actions.map((action, i) => (
          <TouchableOpacity
            key={action.key}
            style={styles.quickActionCard}
            onPress={() => navigation.navigate(action.screen)}
            activeOpacity={0.7}
          >
            <View style={styles.quickActionIconWrap}>
              <action.icon size={18} color={iconColor} />
            </View>
            <Text style={styles.quickActionLabel}>{action.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

function FeaturedSection({ products, navigation, onAddToCart, inCartMap, addedMap, t }) {
  const featured = products.filter(p => p.isFeatured);
  if (featured.length === 0) return null;

  return (
    <View style={styles.featuredSection}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{t('home.featured')}</Text>
        <TouchableOpacity onPress={() => navigation.navigate('Search')}>
          <Text style={styles.sectionSeeAll}>{t('home.seeAll')}</Text>
        </TouchableOpacity>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ height: 280, transform: [{ scaleX: -1 }] }}
        contentContainerStyle={styles.featuredScroll}
      >
        {featured.map((item) => (
          <View key={item.id} style={{ transform: [{ scaleX: -1 }] }}>
            <ProductCardHorizontal
            key={item.id}
            item={item}
            onPress={() => navigation.navigate('Item', { productId: item.id })}
            onAddToCart={() => onAddToCart(item)}
            inCart={inCartMap[item.id]}
            justAdded={addedMap[item.id]}
            />
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const FLOATING_ICONS = [
  { icon: 'phone-portrait-outline', top: 45, left: 8, size: 34, duration: 3000 },
  { icon: 'phone-portrait-outline', top: 50, left: width * 0.2, size: 30, duration: 3400 },
  { icon: 'phone-portrait-outline', top: 50, right: 8, size: 34, duration: 3200 },
  { icon: 'phone-portrait-outline', top: 48, left: width * 0.65, size: 30, duration: 3600 },
  { icon: 'laptop-outline', top: 70, left: width * 0.42, size: 34, duration: 3700 },
];

function AnimatedFloatingIcon({ item }) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: item.duration, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration: item.duration, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [0, -20] });

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          top: item.top,
          left: item.left,
          right: item.right,
          transform: [{ translateY }, { rotate: '-12deg' }],
        },
        item.right && { left: undefined, right: item.right },
      ]}
    >
      <Ionicons name={item.icon} size={item.size} color="rgba(0,0,0,0.05)" />
    </Animated.View>
  );
}

function AnimatedFloatingIcons() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {FLOATING_ICONS.map((item, i) => (
        <AnimatedFloatingIcon key={i} item={item} />
      ))}
    </View>
  );
}

function AnimatedBadge({ count }) {
  const scale = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(scale, {
      toValue: 1,
      friction: 4,
      tension: 200,
      useNativeDriver: true,
    }).start();
  }, [count]);

  return (
    <Animated.View style={[styles.notifBadge, { transform: [{ scale }] }]}>
      <Text style={styles.notifBadgeText}>{count > 9 ? '9+' : count}</Text>
    </Animated.View>
  );
}

export default function HomeScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { addToCart, removeFromCart, isInCart, cartCount } = useApp();
  const { t } = useTranslation();
  const dir = useDirection();
  const [banners, setBanners] = useState([]);
  const [brands, setBrands] = useState([]);
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [activeBrand, setActiveBrand] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [addedMap, setAddedMap] = useState({});
  const [unreadCount, setUnreadCount] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [bundles, setBundles] = useState([]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData(true);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    fetchData();
    if (user?.id) {
      fetchUnreadCount();
      const sub = supabase
        .channel('home-notifications')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `userId=eq.${user.id}` }, () => {
          setUnreadCount((prev) => prev + 1);
        })
        .subscribe();
      return () => { sub.unsubscribe(); };
    }
  }, [user?.id]);

  const fetchUnreadCount = async () => {
    if (!user?.id) return;
    const { count } = await supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('userId', user.id)
      .eq('isRead', false);
    setUnreadCount(count || 0);
  };

  const fetchData = async (isRefresh = false) => {
    try {
      if (!isRefresh) setLoading(true);
      setError(null);

      const [bannersRes, brandsRes, categoriesRes, productsRes, reviewsRes] = await Promise.all([
        supabase
          .from('banners')
          .select('*')
          .eq('isActive', true)
          .order('sortOrder'),
        supabase
          .from('brands')
          .select('*')
          .eq('isActive', true)
          .order('sortOrder'),
        supabase
          .from('categories')
          .select('*')
          .eq('isActive', true)
          .order('sortOrder'),
        supabase
          .from('products')
          .select(`
            *,
            product_images(id, url, "isPrimary", "sortOrder"),
            brands(name, "nameAr")
          `)
          .eq('isActive', true)
          .order('createdAt', { ascending: false })
          .limit(50),
        supabase
          .from('reviews')
          .select('productId, rating')
          .eq('isVisible', true),
      ]);

      const reviewMap = {};
      (reviewsRes.data || []).forEach((r) => {
        if (!reviewMap[r.productId]) reviewMap[r.productId] = { total: 0, count: 0 };
        reviewMap[r.productId].total += r.rating;
        reviewMap[r.productId].count += 1;
      });

      const productsWithRatings = (productsRes.data || []).map((p) => {
        const stats = reviewMap[p.id];
        return {
          ...p,
          rating: stats ? parseFloat((stats.total / stats.count).toFixed(1)) : null,
          reviewCount: stats ? stats.count : 0,
        };
      });

      setBanners(bannersRes.data || []);
      setBrands(brandsRes.data || []);
      setCategories(categoriesRes.data || []);
      setProducts(productsWithRatings);

      const bundlesData = await db.getActiveBundles().catch(() => []);
      setBundles(bundlesData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = useCallback((product) => {
    if (isInCart(product.id)) {
      removeFromCart(product.id);
    } else {
      addToCart({
        id: product.id,
        productId: product.id,
        title: product.nameAr,
        price: product.usePriceRange ? (product.minPrice || product.basePrice) : (product.isOnSale && product.salePrice ? product.salePrice : product.basePrice),
        image: product.product_images?.find(img => img.isPrimary)?.url || product.product_images?.[0]?.url || null,
        variantId: null,
      });
      setAddedMap((prev) => ({ ...prev, [product.id]: true }));
      setTimeout(() => setAddedMap((prev) => ({ ...prev, [product.id]: false })), 1200);
    }
  }, [addToCart, removeFromCart, isInCart]);

  const filteredProducts = activeBrand === 'all'
    ? products
    : products.filter(p => p.brandId === activeBrand);

  if (loading) {
    return (
      <MainLayout navigation={navigation} activeRoute="Home" style={styles.root}>
        <View style={styles.headerSection}>
          <View style={[styles.headerRow, { paddingTop: 60 }]}>
            <View style={styles.headerRight}>
              <Text style={styles.greetingText}>{t('home.greeting')}</Text>
            </View>
          </View>
        </View>
        <BannerSkeleton />
        <ProductGridSkeleton count={6} />
      </MainLayout>
    );
  }

  if (error) {
    return (
      <MainLayout navigation={navigation} activeRoute="Home" style={styles.root}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{t('home.errorLoading')}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={fetchData}>
            <Text style={styles.retryText}>{t('common.retry')}</Text>
          </TouchableOpacity>
        </View>
      </MainLayout>
    );
  }

  return (
    <MainLayout navigation={navigation} activeRoute="Home" style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.bg} />

      <FlatList
        data={filteredProducts}
        numColumns={2}
        columnWrapperStyle={styles.columnWrapper}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.listContent, { paddingBottom: 100 + insets.bottom }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#0F172A']} tintColor="#0F172A" />}
        ListHeaderComponent={
          <View style={styles.headerSection}>
            <View style={[styles.headerRow, { paddingTop: Math.max(insets.top, 8) + 8 }]}>
              <View style={styles.headerRight}>
                <Text style={styles.greetingText}>{user ? t('home.greetingUser', { name: user.name }) : t('home.greeting')}</Text>
              </View>
              <View style={styles.headerLeft}>
                <TouchableOpacity style={styles.headerIconBtn} onPress={() => navigation.navigate('Notifications')}>
                  <Ionicons name="notifications-outline" size={22} color={COLORS.text} />
                  {unreadCount > 0 && (
                    <AnimatedBadge count={unreadCount} />
                  )}
                </TouchableOpacity>
              </View>
            </View>

            <AnimatedFloatingIcons />

            <SearchBar onPress={() => navigation.navigate('Search')} t={t} />

            <HeroCarousel banners={banners} navigation={navigation} t={t} />

            <CategoryGrid categories={categories} navigation={navigation} t={t} />

            <QuickActions navigation={navigation} t={t} />

            <FeaturedSection
              products={products}
              navigation={navigation}
              onAddToCart={handleAddToCart}
              inCartMap={products.reduce((m, p) => ({ ...m, [p.id]: isInCart(p.id) }), {})}
              addedMap={addedMap}
              t={t}
            />

            {bundles.length > 0 && (
              <View style={styles.bundleSection}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>{t('home.completeYourSetup')}</Text>
                </View>
                {bundles.slice(0, 2).map((bundle) => (
                  <BundleCard
                    key={bundle.id}
                    bundle={bundle}
                    onAddBundle={() => {
                      if (bundle.addon_products) {
                        bundle.addon_products.forEach((addon) => {
                          const addonPrice = addon.isOnSale && addon.salePrice ? addon.salePrice : addon.basePrice;
                          handleAddToCart({
                            ...addon,
                            basePrice: addonPrice * (1 - (bundle.discount_percent || 0) / 100),
                          });
                        });
                      }
                    }}
                  />
                ))}
              </View>
            )}

            {products.length > 0 && (
              <View style={styles.recommendedSection}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>{t('home.recommendedForYou')}</Text>
                </View>
                <ProductMatchLabel text={t('home.perfectPair')} />
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={{ height: 280, transform: [{ scaleX: -1 }] }}
                  contentContainerStyle={styles.featuredScroll}
                >
                  {products.slice(0, 6).map((item) => (
                    <View key={item.id} style={{ transform: [{ scaleX: -1 }] }}>
                      <ProductCardHorizontal
                        item={item}
                        onPress={() => navigation.navigate('Item', { productId: item.id })}
                        onAddToCart={() => handleAddToCart(item)}
                        inCart={isInCart(item.id)}
                        justAdded={addedMap[item.id]}
                      />
                    </View>
                  ))}
                </ScrollView>
              </View>
            )}

            {brands.length > 0 && (
              <>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>{t('home.brands')}</Text>
                </View>
                <BrandSegmentedControl brands={brands} activeBrand={activeBrand} setActiveBrand={setActiveBrand} t={t} />
              </>
            )}

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{t('home.products')}</Text>
              <TouchableOpacity onPress={() => navigation.navigate('Search')}>
                <Text style={styles.sectionSeeAll}>{t('home.seeAll')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        }
        renderItem={({ item }) => (
          <ProductCard
            item={item}
            onPress={() => navigation.navigate('Item', { productId: item.id })}
            onAddToCart={() => handleAddToCart(item)}
            inCart={isInCart(item.id)}
            justAdded={addedMap[item.id]}
          />
        )}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="phone-portrait-outline" size={48} color={COLORS.gray300} />
            <Text style={styles.emptyText}>{t('home.noProducts')}</Text>
          </View>
        }
      />
    </MainLayout>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F8F9FA' },
  listContent: { backgroundColor: '#F8F9FA', paddingHorizontal: SPACING.md },
  columnWrapper: { justifyContent: 'space-between', marginBottom: 8 },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { fontSize: 16, color: COLORS.textSecondary, marginBottom: 16 },
  retryBtn: { backgroundColor: COLORS.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: RADIUS.lg },
  retryText: { color: COLORS.white, fontWeight: FONT_WEIGHTS.bold },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 60 },
  emptyText: { fontSize: 16, color: COLORS.textTertiary, marginTop: 12 },

  headerSection: { backgroundColor: '#F8F9FA' },
  headerRow: {
    flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 8, paddingBottom: 8,
  },
  headerRight: { alignItems: 'flex-end' },
  headerLeft: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10 },
  greetingText: { fontSize: 22, fontWeight: FONT_WEIGHTS.extrabold, color: COLORS.text, letterSpacing: -0.3 },
  headerIconBtn: {
    width: 40, height: 40, borderRadius: 20,
    justifyContent: 'center', alignItems: 'center',
  },

  searchBar: {
    flexDirection: 'row-reverse', alignItems: 'center', backgroundColor: COLORS.gray50,
    borderRadius: RADIUS.lg, height: 50, paddingHorizontal: 14, marginHorizontal: 8, marginBottom: 12,
    borderWidth: 1, borderColor: COLORS.gray200,
  },
  searchPlaceholder: { flex: 1, fontSize: 15, color: COLORS.textTertiary, textAlign: 'right', marginRight: 10 },

  carouselContainer: { marginBottom: 16 },
  bannerCard: {
    width: BANNER_W, height: 150, borderRadius: RADIUS.xl, backgroundColor: COLORS.gray50,
    marginHorizontal: 8, overflow: 'hidden', borderWidth: 1, borderColor: COLORS.gray200,
  },
  bannerOverlay: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.3)' },
  bannerContent: { flex: 1, alignItems: 'flex-end', zIndex: 2, justifyContent: 'center', padding: 20 },
  bannerAccent: { position: 'absolute', top: -30, right: -30, width: 120, height: 120, borderRadius: 60 },
  bannerTitle: { fontSize: 20, fontWeight: FONT_WEIGHTS.extrabold, color: COLORS.white, textAlign: 'right', marginBottom: 12 },
  bannerBtn: { borderRadius: RADIUS.lg, paddingHorizontal: 14, paddingVertical: 8, flexDirection: 'row-reverse', alignItems: 'center', gap: 6, alignSelf: 'flex-end', backgroundColor: COLORS.primary },
  bannerBtnText: { fontSize: 13, fontWeight: FONT_WEIGHTS.bold, color: COLORS.white },
  paginationContainer: { flexDirection: 'row-reverse', justifyContent: 'center', alignItems: 'center', marginTop: 12, gap: 6 },
  paginationDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.gray300 },
  paginationDotActive: { width: 16, height: 6, borderRadius: 3, backgroundColor: COLORS.primary },

  categorySection: { marginBottom: 8, paddingTop: 24, paddingBottom: 12 },
  catSectionHeader: { alignItems: 'center', paddingHorizontal: 8, marginBottom: 28 },
  catSectionTitle: {
    fontSize: 20,
    fontWeight: FONT_WEIGHTS.extrabold,
    color: COLORS.text,
    letterSpacing: -1,
  },

  catGrid: { flexDirection: 'row-reverse', paddingHorizontal: 8 },
  catCol: { flex: 1 },
  catCard: {
    overflow: 'hidden', backgroundColor: COLORS.white, borderRadius: 20,
    shadowColor: '#000', shadowOpacity: 0.04, shadowOffset: { width: 0, height: 8 }, shadowRadius: 24, elevation: 4,
  },
  catImageArea: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  catBadge: {
    position: 'absolute', bottom: 16, right: 16,
    backgroundColor: 'rgba(255,255,255,0.88)',
    borderRadius: 40,
    paddingVertical: 10, paddingHorizontal: 20,
  },
  catBadgeText: {
    fontSize: 12, fontWeight: FONT_WEIGHTS.medium,
    color: '#1A1A1A', letterSpacing: 1.2,
  },

  featuredSection: { marginBottom: 24 },
  featuredScroll: {
    flexDirection: 'row',
    paddingHorizontal: 8,
    gap: 12,
    paddingBottom: 4,
  },

  bundleSection: { marginBottom: 24, paddingHorizontal: 8 },
  recommendedSection: { marginBottom: 24 },

  sectionHeader: {
    flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 8, marginBottom: 8,
  },
  sectionTitle: { fontSize: 18, fontWeight: FONT_WEIGHTS.extrabold, color: COLORS.text },
  sectionSeeAll: { fontSize: 13, fontWeight: FONT_WEIGHTS.semibold, color: COLORS.textSecondary },

  brandScroll: {
    marginBottom: 16, paddingLeft: 8,
  },
  brandContainer: {
    flexDirection: 'row', paddingRight: 8, gap: 8,
  },
  brandItem: {
    height: 44, paddingHorizontal: 18, borderRadius: 22,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: COLORS.gray200, backgroundColor: COLORS.white,
  },
  brandItemActive: {
    backgroundColor: COLORS.primary, borderColor: COLORS.primary,
  },
  brandText: { fontSize: 13, fontWeight: FONT_WEIGHTS.semibold, color: COLORS.textSecondary },
  brandTextActive: { color: COLORS.white },

  notifBadge: {
    position: 'absolute', top: 4, right: 4,
    minWidth: 16, height: 16, borderRadius: 8,
    backgroundColor: COLORS.error,
    justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: 3,
  },
  notifBadgeText: {
    color: COLORS.white, fontSize: 9, fontWeight: FONT_WEIGHTS.extrabold,
  },

  quickActionsSection: { marginBottom: 16, paddingTop: 8 },
  quickActionsGrid: { flexDirection: 'row-reverse', justifyContent: 'space-around', paddingHorizontal: 16 },
  quickActionCard: { flexDirection: 'column', alignItems: 'center', gap: 6, paddingVertical: 12, paddingHorizontal: 16, borderRadius: 14, minWidth: 100, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: COLORS.gray100 },
  quickActionIconWrap: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.gray50, justifyContent: 'center', alignItems: 'center' },
  quickActionLabel: { fontSize: 12, fontWeight: FONT_WEIGHTS.semibold, color: COLORS.text, textAlign: 'center' },
});
