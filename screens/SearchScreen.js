import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  StyleSheet, Text, View, TextInput, TouchableOpacity, FlatList,
  ActivityIndicator, StatusBar, RefreshControl,
  Keyboard, Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import MainLayout from '../components/MainLayout';
import ProductCard from '../components/ProductCard';
import { SearchSkeleton } from '../components/SearchSkeleton';
import FilterSheet from '../components/FilterSheet';
import PriceRangeModal from '../components/PriceRangeModal';
import { COLORS, RADIUS, FONT_SIZES, FONT_WEIGHTS, SHADOWS, SCREEN } from '../constants';
import { useTranslation } from '../context/AppSettingsContext';
import { useDirection } from '../hooks/useDirection';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../services/supabase';

const ITEM_WIDTH = (SCREEN.width - 48) / 2;
const PAGE_SIZE = 20;
const RECENT_KEY = 'recentSearches';
const MAX_RECENT = 10;

const POPULAR_SEARCHES = ['iPhone', 'Samsung', 'شاومي', 'Oppo', 'Huawei', 'Realme'];

const CATEGORY_ICONS = {
  هاتف: 'phone-portrait-outline',
  تابلت: 'tablet-portrait-outline',
  لابتوب: 'laptop-outline',
  سماعة: 'headset-outline',
  ساعة: 'watch-outline',
  اكسسوار: 'watch-outline',
  شاحن: 'flash-outline',
  default: 'grid-outline',
};

function getCategoryIcon(name) {
  if (!name) return CATEGORY_ICONS.default;
  const n = name.toLowerCase();
  for (const key of Object.keys(CATEGORY_ICONS)) {
    if (n.includes(key)) return CATEGORY_ICONS[key];
  }
  return CATEGORY_ICONS.default;
}

function getCategoryImageUrl(cat) {
  if (cat.searchImageUrl) return cat.searchImageUrl;
  if (cat.imageUrl) return cat.imageUrl;
  if (cat.icon) {
    const iconName = getCategoryIcon(cat.icon);
    return `https://api.iconify.design/${iconName}.svg?color=%230F172A&height=40`;
  }
  const iconName = getCategoryIcon(cat.nameAr || cat.name);
  return `https://api.iconify.design/${iconName}.svg?color=%230F172A&height=40`;
}

export default function SearchScreen({ navigation, route }) {
  const { t } = useTranslation();
  const dir = useDirection();
  const { addToCart, removeFromCart, isInCart, isFavorite, toggleFavorite } = useApp();
  const { user } = useAuth();
  const inputRef = useRef(null);
  const initialQuery = route?.params?.q ?? '';
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState(null);
  const [addedMap, setAddedMap] = useState({});
  const [sortBy, setSortBy] = useState('latest');
  const [selectedBrandId, setSelectedBrandId] = useState(null);
  const [priceMin, setPriceMin] = useState('');
  const [priceMax, setPriceMax] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [recentSearches, setRecentSearches] = useState([]);
  const [filterVisible, setFilterVisible] = useState(false);
  const [priceVisible, setPriceVisible] = useState(false);

  const hasActiveFilters = selectedBrandId || priceMin || priceMax;
  const dirRow = dir.row;

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    fetchCategories();
    fetchBrands();
    loadRecentSearches();
  }, []);

  useEffect(() => {
    if (initialQuery) {
      performSearch(initialQuery, 1);
    }
  }, []);

  useEffect(() => {
    if (hasSearched && searchQuery.trim()) {
      setPage(1);
      setResults([]);
      performSearch(searchQuery, 1);
    }
  }, [sortBy, selectedBrandId, priceMin, priceMax]);

  const fetchCategories = async () => {
    try {
      const { data } = await supabase
        .from('categories')
        .select('id, nameAr, name, icon, "imageUrl", "homeImageUrl", "searchImageUrl"')
        .eq('isActive', true)
        .order('sortOrder');
      setCategories(data || []);
    } catch (err) {
    }
  };

  const fetchBrands = async () => {
    try {
      const { data } = await supabase
        .from('brands')
        .select('id, name, nameAr')
        .eq('isActive', true)
        .order('sortOrder');
      setBrands(data || []);
    } catch (err) {
    }
  };

  const loadRecentSearches = async () => {
    try {
      const raw = await AsyncStorage.getItem(RECENT_KEY);
      if (raw) setRecentSearches(JSON.parse(raw));
    } catch {}
  };

  const saveRecentSearch = async (query) => {
    if (!query.trim()) return;
    try {
      const raw = await AsyncStorage.getItem(RECENT_KEY);
      let list = raw ? JSON.parse(raw) : [];
      list = list.filter((s) => s.toLowerCase() !== query.toLowerCase());
      list.unshift(query);
      if (list.length > MAX_RECENT) list = list.slice(0, MAX_RECENT);
      await AsyncStorage.setItem(RECENT_KEY, JSON.stringify(list));
      setRecentSearches(list);
    } catch {}
  };

  const clearRecentSearches = async () => {
    try {
      await AsyncStorage.removeItem(RECENT_KEY);
      setRecentSearches([]);
    } catch {}
  };

  const buildSortOrder = (sort) => {
    switch (sort) {
      case 'priceLow': return { column: 'basePrice', asc: true };
      case 'priceHigh': return { column: 'basePrice', asc: false };
      case 'name': return { column: 'nameAr', asc: true };
      default: return { column: 'createdAt', asc: false };
    }
  };

  const performSearch = async (query, pageNum, append = false) => {
    const q = query.trim();
    if (!q) return;
    if (!append) setLoading(true);
    else setLoadingMore(true);
    setError(null);
    setHasSearched(true);
    try {
      const sanitized = q.replace(/[%_]/g, '');
      let dbQuery = supabase
        .from('products')
        .select('*, product_images(id, url, "isPrimary"), brands(name, "nameAr")', { count: 'exact' })
        .eq('isActive', true)
        .or(`nameAr.ilike.%${sanitized}%,name.ilike.%${sanitized}%,descriptionAr.ilike.%${sanitized}%`);

      if (selectedBrandId) {
        dbQuery = dbQuery.eq('brandId', selectedBrandId);
      }
      if (priceMin) {
        dbQuery = dbQuery.gte('basePrice', Number(priceMin));
      }
      if (priceMax) {
        dbQuery = dbQuery.lte('basePrice', Number(priceMax));
      }

      const s = buildSortOrder(sortBy);
      dbQuery = dbQuery.order(s.column, { ascending: s.asc });

      const from = (pageNum - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      dbQuery = dbQuery.range(from, to);

      const { data, error: err, count } = await dbQuery;
      if (err) throw err;

      if (append) {
        setResults((prev) => [...prev, ...(data || [])]);
      } else {
        setResults(data || []);
      }
      setHasMore((data || []).length >= PAGE_SIZE);
      saveRecentSearch(query);
    } catch (err) {
      setError(err.message || 'Search failed');
      setResults([]);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const handleSearch = () => {
    if (!searchQuery.trim()) return;
    Keyboard.dismiss();
    setPage(1);
    setResults([]);
    performSearch(searchQuery, 1);
  };

  const handleLoadMore = () => {
    if (loadingMore || !hasMore || !searchQuery.trim()) return;
    const nextPage = page + 1;
    setPage(nextPage);
    performSearch(searchQuery, nextPage, true);
  };

  const handleRecentTap = (term) => {
    setSearchQuery(term);
    Keyboard.dismiss();
    setPage(1);
    setResults([]);
    performSearch(term, 1);
  };

  const handlePopularTap = (term) => {
    setSearchQuery(term);
    Keyboard.dismiss();
    setPage(1);
    setResults([]);
    performSearch(term, 1);
  };

  const handleCategoryTap = (cat) => {
    navigation.navigate('CategoryProducts', { categoryId: cat.id, categoryName: cat.nameAr || cat.name });
  };

  const handleAddToCart = (product) => {
    if (isInCart(product.id)) {
      removeFromCart(product.id);
    } else {
      addToCart({
        id: product.id, productId: product.id, title: product.nameAr,
        price: product.usePriceRange ? (product.minPrice || product.basePrice) : (product.isOnSale && product.salePrice ? product.salePrice : product.basePrice),
        image: product.product_images?.find((img) => img.isPrimary)?.url || product.product_images?.[0]?.url || null, variantId: null,
      });
      setAddedMap((prev) => ({ ...prev, [product.id]: true }));
      setTimeout(() => setAddedMap((prev) => ({ ...prev, [product.id]: false })), 1200);
    }
  };

  const handleRefresh = async () => {
    if (!searchQuery.trim()) return;
    setRefreshing(true);
    setPage(1);
    setResults([]);
    try {
      await performSearch(searchQuery, 1);
    } finally {
      setRefreshing(false);
    }
  };

  const handlePriceApply = (min, max) => {
    setPriceMin(min);
    setPriceMax(max);
  };

  const clearSearch = () => {
    setSearchQuery('');
    setResults([]);
    setHasSearched(false);
    setPage(1);
    setHasMore(true);
    setError(null);
    inputRef.current?.focus();
  };

  const brandName = (brand) => brand?.nameAr || brand?.name || '';
  const sortLabel = (key) => t(`search.${key}`);
  const activePriceLabel = priceMin || priceMax
    ? `${priceMin || '0'} - ${priceMax || '∞'}`
    : null;

  const renderProduct = useCallback(({ item }) => (
    <View style={styles.productWrap}>
      <ProductCard
        item={item}
        onPress={() => navigation.navigate('Item', { productId: item.id })}
        onAddToCart={() => handleAddToCart(item)}
        inCart={isInCart(item.id)}
        justAdded={addedMap[item.id]}
        isFavorite={isFavorite(item.id)}
        onToggleFavorite={() => toggleFavorite(item, user?.id)}
      />
    </View>
  ), [addedMap, isInCart, isFavorite, user]);

  const renderFooter = () => {
    if (!hasSearched || !searchQuery.trim()) return null;
    if (loadingMore) {
      return (
        <View style={styles.loadingMore}>
          <ActivityIndicator size="small" color={COLORS.primary} />
        </View>
      );
    }
    if (!hasMore && results.length > 0) {
      return (
        <View style={styles.noMoreWrap}>
          <View style={styles.noMoreLine} />
          <Text style={styles.noMoreText}>{t('search.noMore')}</Text>
          <View style={styles.noMoreLine} />
        </View>
      );
    }
    return null;
  };

  const EmptyState = () => (
    <View style={styles.emptyState}>
      {/* Recent Searches */}
      {recentSearches.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t('search.recentSearches')}</Text>
            <TouchableOpacity onPress={clearRecentSearches} activeOpacity={0.7}>
              <Text style={styles.sectionAction}>{t('search.clearRecent')}</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.chipRow}>
            {recentSearches.map((term, i) => (
              <TouchableOpacity
                key={`r-${i}`}
                style={styles.recentChip}
                onPress={() => handleRecentTap(term)}
                activeOpacity={0.7}
              >
                <Ionicons name="time-outline" size={14} color={COLORS.gray500} style={{ marginLeft: 4 }} />
                <Text style={styles.recentChipText} numberOfLines={1}>{term}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Popular */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('search.popular')}</Text>
        <View style={styles.chipRow}>
          {POPULAR_SEARCHES.map((term, i) => (
            <TouchableOpacity
              key={`p-${i}`}
              style={styles.popularChip}
              onPress={() => handlePopularTap(term)}
              activeOpacity={0.7}
            >
              <Text style={styles.popularChipText}>{term}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Categories */}
      {categories.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('search.browseCategories')}</Text>
          <View style={styles.catGrid}>
            {categories.map((cat) => (
              <TouchableOpacity
                key={cat.id}
                style={styles.catCard}
                onPress={() => handleCategoryTap(cat)}
                activeOpacity={0.8}
              >
                <View style={styles.catIconWrap}>
                  <Image
                    source={{ uri: getCategoryImageUrl(cat) }}
                    style={styles.catIcon}
                    resizeMode="contain"
                  />
                </View>
                <Text style={styles.catName} numberOfLines={1}>{cat.nameAr || cat.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      <View style={styles.helperWrap}>
        <Ionicons name="search-outline" size={14} color={COLORS.gray400} style={{ marginLeft: 4 }} />
        <Text style={styles.helperText}>{t('search.helper')}</Text>
      </View>
    </View>
  );

  return (
    <MainLayout navigation={navigation} activeRoute="Search" style={styles.container}>
      <View style={styles.header}>
        <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
        <View style={[styles.headerRow, { flexDirection: dirRow }]}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
            <Ionicons name="chevron-back" size={20} color={COLORS.text} />
          </TouchableOpacity>
          <View style={[styles.searchField, { flexDirection: dirRow }]}>
            <Ionicons name="search-outline" size={18} color={COLORS.gray500} />
            <TextInput
              ref={inputRef}
              style={[styles.searchInput, { textAlign: dir.textAlign }]}
              placeholder={t('search.placeholder')}
              placeholderTextColor={COLORS.gray400}
              value={searchQuery}
              onChangeText={setSearchQuery}
              returnKeyType="search"
              onSubmitEditing={handleSearch}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name="close-circle" size={18} color={COLORS.gray400} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Filter bar — only when results are shown */}
        {hasSearched && !loading && !error && (
          <View style={styles.filterBar}>
            <TouchableOpacity
              style={[styles.filterChip, hasActiveFilters && styles.filterChipActive]}
              onPress={() => setFilterVisible(true)}
              activeOpacity={0.7}
            >
              <Ionicons
                name="options-outline"
                size={14}
                color={hasActiveFilters ? COLORS.white : COLORS.gray600}
                style={{ marginLeft: 4 }}
              />
              <Text style={[styles.filterChipText, hasActiveFilters && styles.filterChipTextActive]}>
                {t('search.filter')}
              </Text>
              {hasActiveFilters && <View style={styles.filterDot} />}
            </TouchableOpacity>

            <View style={styles.sortChips}>
              {['latest', 'priceLow', 'priceHigh', 'name'].map((key) => {
                const active = sortBy === key;
                return (
                  <TouchableOpacity
                    key={key}
                    style={[styles.sortChip, active && styles.sortChipActive]}
                    onPress={() => setSortBy(key)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.sortChipText, active && styles.sortChipTextActive]}>
                      {sortLabel(key)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}
      </View>

      {/* Main content */}
      {loading && !results.length ? (
        <SearchSkeleton />
      ) : error ? (
        <View style={styles.emptyWrap}>
          <Ionicons name="cloud-offline-outline" size={56} color={COLORS.gray300} />
          <Text style={styles.emptyTitle}>{t('search.searchError')}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={handleSearch} activeOpacity={0.85}>
            <Text style={styles.retryText}>{t('common.retry')}</Text>
          </TouchableOpacity>
        </View>
      ) : hasSearched && results.length > 0 ? (
        <>
          <View style={styles.resultCountRow}>
            <Text style={styles.resultCountText}>
              {t('search.resultsCount', { count: results.length })}
            </Text>
            {hasActiveFilters && (
              <TouchableOpacity
                onPress={() => { setSelectedBrandId(null); setPriceMin(''); setPriceMax(''); }}
                activeOpacity={0.7}
              >
                <Text style={styles.clearFilterText}>{t('common.reset')}</Text>
              </TouchableOpacity>
            )}
          </View>
          <FlatList
            data={results}
            renderItem={renderProduct}
            keyExtractor={(item) => item.id}
            numColumns={2}
            columnWrapperStyle={styles.columnWrap}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            onEndReached={handleLoadMore}
            onEndReachedThreshold={0.5}
            keyboardShouldPersistTaps="handled"
            ListFooterComponent={renderFooter}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={COLORS.primary} />
            }
          />
        </>
      ) : hasSearched && results.length === 0 && !loading ? (
        <View style={styles.emptyWrap}>
          <Ionicons name="search-outline" size={56} color={COLORS.gray300} />
          <Text style={styles.emptyTitle}>{t('search.notFound')}</Text>
          <Text style={styles.emptySub}>{t('search.tryDifferent')}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={clearSearch} activeOpacity={0.85}>
            <Text style={styles.retryText}>{t('search.clearSearch')}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={[]}
          renderItem={null}
          ListEmptyComponent={EmptyState}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        />
      )}

      <FilterSheet
        visible={filterVisible}
        onClose={() => setFilterVisible(false)}
        sortBy={sortBy}
        onSortChange={setSortBy}
        brands={brands}
        selectedBrandId={selectedBrandId}
        onBrandChange={setSelectedBrandId}
        t={t}
        onOpenPrice={() => setPriceVisible(true)}
      />
      <PriceRangeModal
        visible={priceVisible}
        onClose={() => setPriceVisible(false)}
        onApply={handlePriceApply}
        initialMin={priceMin}
        initialMax={priceMax}
        t={t}
      />
    </MainLayout>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.surface },

  /* Header */
  header: {
    backgroundColor: COLORS.white,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray100,
  },
  headerRow: {
    flexDirection: 'row-reverse', alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 6, gap: 10,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: COLORS.gray50, alignItems: 'center', justifyContent: 'center',
  },
  searchField: {
    flex: 1, flexDirection: 'row-reverse', alignItems: 'center',
    height: 42, borderRadius: RADIUS.xxl,
    backgroundColor: COLORS.gray50, paddingHorizontal: 14,
    borderWidth: 1, borderColor: COLORS.gray200,
  },
  searchInput: {
    flex: 1, fontSize: FONT_SIZES.md, color: COLORS.text,
    marginRight: 8, marginLeft: 4,
  },

  /* Filter bar */
  filterBar: {
    flexDirection: 'row-reverse', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 6, gap: 8,
  },
  filterChip: {
    flexDirection: 'row-reverse', alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: RADIUS.full, borderWidth: 1, borderColor: COLORS.gray200,
    backgroundColor: COLORS.white, position: 'relative',
  },
  filterChipActive: {
    backgroundColor: COLORS.primary, borderColor: COLORS.primary,
  },
  filterChipText: {
    fontSize: FONT_SIZES.sm, fontWeight: FONT_WEIGHTS.semibold, color: COLORS.gray600,
  },
  filterChipTextActive: { color: COLORS.white },
  filterDot: {
    width: 6, height: 6, borderRadius: 3,
    backgroundColor: COLORS.success,
    position: 'absolute', top: 3, left: 3,
  },
  sortChips: { flexDirection: 'row-reverse', gap: 6 },
  sortChip: {
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: RADIUS.full, backgroundColor: COLORS.gray50,
    borderWidth: 1, borderColor: COLORS.gray200,
  },
  sortChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  sortChipText: { fontSize: FONT_SIZES.xs, fontWeight: FONT_WEIGHTS.semibold, color: COLORS.gray500 },
  sortChipTextActive: { color: COLORS.white },

  /* Results */
  resultCountRow: {
    flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 12, paddingBottom: 4,
  },
  resultCountText: {
    fontSize: FONT_SIZES.sm, fontWeight: FONT_WEIGHTS.semibold, color: COLORS.gray500,
  },
  clearFilterText: {
    fontSize: FONT_SIZES.sm, fontWeight: FONT_WEIGHTS.bold, color: COLORS.primary,
  },
  listContent: { paddingHorizontal: 16, paddingBottom: 100 },
  columnWrap: { justifyContent: 'space-between', marginBottom: 12 },

  /* Product card wrapper */
  productWrap: { width: ITEM_WIDTH, position: 'relative' },

  /* Loading more */
  loadingMore: { paddingVertical: 20, alignItems: 'center' },
  noMoreWrap: {
    flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 24, gap: 12,
  },
  noMoreLine: { height: 1, flex: 1, backgroundColor: COLORS.gray200 },
  noMoreText: { fontSize: FONT_SIZES.sm, color: COLORS.gray400 },

  /* Empty / Error states */
  emptyWrap: {
    alignItems: 'center', justifyContent: 'center',
    paddingTop: 80, gap: 10, paddingHorizontal: 40,
  },
  emptyTitle: { fontSize: FONT_SIZES.lg, fontWeight: FONT_WEIGHTS.bold, color: COLORS.text, textAlign: 'center' },
  emptySub: { fontSize: FONT_SIZES.md, color: COLORS.gray400, textAlign: 'center' },
  retryBtn: {
    marginTop: 12, paddingHorizontal: 28, paddingVertical: 12,
    borderRadius: RADIUS.xxl, backgroundColor: COLORS.primary,
  },
  retryText: { color: COLORS.white, fontWeight: FONT_WEIGHTS.bold, fontSize: FONT_SIZES.md },

  /* Empty state (initial) */
  emptyState: { paddingTop: 20, paddingBottom: 40 },
  section: { marginBottom: 24 },
  sectionHeader: {
    flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.lg, fontWeight: FONT_WEIGHTS.bold, color: COLORS.text,
    marginBottom: 10,
  },
  sectionAction: {
    fontSize: FONT_SIZES.sm, fontWeight: FONT_WEIGHTS.semibold, color: COLORS.gray500,
  },
  chipRow: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8 },
  recentChip: {
    flexDirection: 'row-reverse', alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: RADIUS.full, backgroundColor: COLORS.white,
    borderWidth: 1, borderColor: COLORS.gray200,
    maxWidth: SCREEN.width * 0.7,
  },
  recentChipText: { fontSize: FONT_SIZES.sm, color: COLORS.gray600, fontWeight: FONT_WEIGHTS.medium },
  popularChip: {
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: RADIUS.full, backgroundColor: COLORS.gray50,
    borderWidth: 1, borderColor: COLORS.gray200,
  },
  popularChipText: { fontSize: FONT_SIZES.sm, color: COLORS.primary, fontWeight: FONT_WEIGHTS.semibold },

  /* Category grid */
  catGrid: {
    flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 10,
  },
  catCard: {
    width: (SCREEN.width - 52) / 3,
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.xl,
    paddingVertical: 14, paddingHorizontal: 8,
    alignItems: 'center',
    borderWidth: 1, borderColor: COLORS.gray100,
    gap: 8,
  },
  catIconWrap: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: COLORS.gray50, justifyContent: 'center', alignItems: 'center',
  },
  catIcon: {
    width: 28, height: 28,
  },
  catName: {
    fontSize: FONT_SIZES.sm, fontWeight: FONT_WEIGHTS.semibold, color: COLORS.text,
    textAlign: 'center',
  },

  /* Helper */
  helperWrap: {
    flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center',
    marginTop: 8,
  },
  helperText: { fontSize: FONT_SIZES.sm, color: COLORS.gray400 },
});
