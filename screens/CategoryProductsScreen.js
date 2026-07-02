import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet, Text, View, FlatList, RefreshControl, TouchableOpacity,
  TextInput, ScrollView, Modal, Animated, Dimensions, useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SlidersHorizontal, Check, X } from 'lucide-react-native';
import ScreenHeader from '../components/ScreenHeader';
import ProductCard from '../components/ProductCard';
import { ProductGridSkeleton } from '../components/Skeleton';
import { COLORS, SPACING, FONT_SIZES, FONT_WEIGHTS, RADIUS } from '../constants';
import { useApp } from '../context/AppContext';
import { supabase } from '../services/supabase';
import { useTranslation } from '../context/AppSettingsContext';
import { useDirection } from '../hooks/useDirection';
import { useResponsive } from '../hooks/useResponsive';

export default function CategoryProductsScreen({ navigation, route }) {
  const { categoryId, categoryName } = route?.params || {};
  const { addToCart, removeFromCart, isInCart } = useApp();
  const { t } = useTranslation();
  const dir = useDirection();
  const { width: SCREEN_WIDTH, height: SCREEN_H, numColumns, contentMaxWidth } = useResponsive();
  const [products, setProducts] = useState([]);
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [addedMap, setAddedMap] = useState({});

  const [sortBy, setSortBy] = useState('newest');
  const [filterBrandId, setFilterBrandId] = useState(null);
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [showFilter, setShowFilter] = useState(false);

  const sheetAnim = useState(new Animated.Value(SCREEN_H))[0];

  useEffect(() => {
    if (categoryId) { fetchProducts(); fetchBrands(); }
  }, [categoryId]);

  useEffect(() => {
    if (categoryId) fetchProducts();
  }, [sortBy, filterBrandId, minPrice, maxPrice]);

  const fetchBrands = async () => {
    try {
      const { data, error } = await supabase.from('brands').select('*').eq('isActive', true).order('sortOrder');
      if (error) throw error;
      setBrands(data || []);
    } catch (err) { console.error('Error fetching brands:', err); }
  };

  const fetchProducts = async (isRefresh = false) => {
    try {
      if (!isRefresh) setLoading(true);
      let query = supabase
        .from('products')
        .select(`*, product_images(id, url, "isPrimary", "sortOrder"), brands(id, name, nameAr)`)
        .eq('isActive', true)
        .eq('categoryId', categoryId);
      if (filterBrandId) query = query.eq('brandId', filterBrandId);
      if (minPrice) query = query.gte('basePrice', parseFloat(minPrice));
      if (maxPrice) query = query.lte('basePrice', parseFloat(maxPrice));
      switch (sortBy) {
        case 'price_asc': query = query.order('basePrice', { ascending: true }); break;
        case 'price_desc': query = query.order('basePrice', { ascending: false }); break;
        case 'name': query = query.order('nameAr'); break;
        default: query = query.order('createdAt', { ascending: false });
      }
      const { data, error } = await query;
      if (error) throw error;
      setProducts(data || []);
    } catch (err) { console.error('Error fetching category products:', err); }
    finally { setLoading(false); setRefreshing(false); }
  };

  const onRefresh = () => { setRefreshing(true); fetchProducts(true); };

  const handleAddToCart = (product) => {
    if (isInCart(product.id)) {
      removeFromCart(product.id);
    } else {
      addToCart({
        id: product.id, productId: product.id, title: product.nameAr,
        price: product.usePriceRange ? (product.minPrice || product.basePrice) : (product.isOnSale && product.salePrice ? product.salePrice : product.basePrice),
        image: product.product_images?.find(img => img.isPrimary)?.url || product.product_images?.[0]?.url || null, variantId: null,
      });
      setAddedMap((prev) => ({ ...prev, [product.id]: true }));
      setTimeout(() => setAddedMap((prev) => ({ ...prev, [product.id]: false })), 1200);
    }
  };

  const openFilter = () => {
    setShowFilter(true);
    Animated.spring(sheetAnim, { toValue: 0, damping: 20, stiffness: 200, useNativeDriver: true }).start();
  };

  const closeFilter = () => {
    Animated.timing(sheetAnim, { toValue: SCREEN_H, duration: 250, useNativeDriver: true }).start(() => setShowFilter(false));
  };

  const resetFilters = () => { setSortBy('newest'); setFilterBrandId(null); setMinPrice(''); setMaxPrice(''); closeFilter(); };

  const SORT_OPTIONS = [
    { key: 'newest', label: t('search.latest') },
    { key: 'price_asc', label: t('search.priceLow') },
    { key: 'price_desc', label: t('search.priceHigh') },
    { key: 'name', label: t('search.name') },
  ];

  const activeFilterCount = (filterBrandId ? 1 : 0) + (minPrice || maxPrice ? 1 : 0) + (sortBy !== 'newest' ? 1 : 0);

  return (
    <View style={styles.root}>
      <ScreenHeader
        title={categoryName || t('home.products')}
        onBack={() => navigation.goBack()}
        rightAction={
          <TouchableOpacity style={[styles.filterBtn, activeFilterCount > 0 && styles.filterBtnActive]} onPress={openFilter} activeOpacity={0.7}>
            <SlidersHorizontal size={16} color={activeFilterCount > 0 ? COLORS.white : COLORS.textSecondary} />
            {activeFilterCount > 0 && (
              <View style={styles.filterBadge}><Text style={styles.filterBadgeText}>{activeFilterCount}</Text></View>
            )}
          </TouchableOpacity>
        }
      />

      {loading ? (
        <ProductGridSkeleton count={6} />
      ) : products.length === 0 ? (
        <View style={styles.centered}>
          <Ionicons name="cube-outline" size={48} color={COLORS.gray300} />
          <Text style={styles.emptyText}>{t('home.noProducts')}</Text>
        </View>
      ) : (
        <FlatList
          data={products}
          keyExtractor={(item) => item.id}
          numColumns={numColumns}
          columnWrapperStyle={styles.columnWrapper}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.listContent, { maxWidth: contentMaxWidth, alignSelf: 'center' }]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} tintColor={COLORS.primary} />}
          renderItem={({ item }) => (
            <ProductCard
              item={item}
              numColumns={numColumns}
              onPress={() => navigation.navigate('Item', { productId: item.id })}
              onAddToCart={() => handleAddToCart(item)}
              inCart={isInCart(item.id)}
              justAdded={addedMap[item.id]}
            />
          )}
        />
      )}

      {showFilter && (
        <Modal transparent visible={showFilter} animationType="none" onRequestClose={closeFilter}>
          <View style={styles.overlay}>
            <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={closeFilter} />
            <Animated.View style={[styles.sheet, { transform: [{ translateY: sheetAnim }], maxHeight: SCREEN_H * 0.8 }]}>
              <View style={styles.sheetHandle}><View style={styles.sheetHandleBar} /></View>

              <View style={[styles.sheetFilterHeader, { flexDirection: dir.row }]}>
                <Text style={[styles.sheetTitle, { textAlign: dir.textAlign }]}>{t('search.sortBy')} / {t('settings.title')}</Text>
                <TouchableOpacity onPress={resetFilters}>
                  <Text style={styles.resetText}>{t('common.reset')}</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.sheetDivider} />

              <ScrollView style={styles.filterScroll} showsVerticalScrollIndicator={false}>
                <Text style={[styles.filterSectionLabel, { textAlign: dir.textAlign }]}>{t('search.sortBy')}</Text>
                {SORT_OPTIONS.map((opt) => {
                  const active = sortBy === opt.key;
                  return (
                    <TouchableOpacity key={opt.key} style={[styles.sortOption, { flexDirection: dir.row }]} onPress={() => setSortBy(opt.key)} activeOpacity={0.7}>
                      <View style={[styles.radio, active && styles.radioActive]}>
                        {active && <View style={styles.radioDot} />}
                      </View>
                      <Text style={[styles.sortOptionText, active && styles.sortOptionTextActive]}>{opt.label}</Text>
                    </TouchableOpacity>
                  );
                })}

                <View style={styles.sheetDivider} />
                <Text style={[styles.filterSectionLabel, { textAlign: dir.textAlign }]}>{t('search.filterByBrand')}</Text>
                <TouchableOpacity style={[styles.sortOption, { flexDirection: dir.row }]} onPress={() => setFilterBrandId(null)} activeOpacity={0.7}>
                  <View style={[styles.radio, filterBrandId === null && styles.radioActive]}>
                    {filterBrandId === null && <View style={styles.radioDot} />}
                  </View>
                  <Text style={[styles.sortOptionText, filterBrandId === null && styles.sortOptionTextActive]}>{t('home.all')}</Text>
                </TouchableOpacity>
                {brands.map((brand) => {
                  const active = filterBrandId === brand.id;
                  return (
                    <TouchableOpacity key={brand.id} style={[styles.sortOption, { flexDirection: dir.row }]} onPress={() => setFilterBrandId(brand.id)} activeOpacity={0.7}>
                      <View style={[styles.radio, active && styles.radioActive]}>
                        {active && <View style={styles.radioDot} />}
                      </View>
                      <Text style={styles.sortOptionText}>{brand.nameAr || brand.name}</Text>
                    </TouchableOpacity>
                  );
                })}

                <View style={styles.sheetDivider} />
                <Text style={[styles.filterSectionLabel, { textAlign: dir.textAlign }]}>{t('search.priceRange')}</Text>
                <View style={styles.priceRangeRow}>
                  <View style={styles.priceInput}>
                    <Text style={[styles.priceInputLabel, { textAlign: dir.textAlign }]}>{t('search.minPrice')}</Text>
                    <TextInput
                      style={styles.priceField}
                      keyboardType="numeric"
                      placeholder="0"
                      placeholderTextColor={COLORS.gray400}
                      value={minPrice}
                      onChangeText={setMinPrice}
                      textAlign={dir.textAlign}
                    />
                  </View>
                  <Text style={styles.priceDash}>-</Text>
                  <View style={styles.priceInput}>
                    <Text style={[styles.priceInputLabel, { textAlign: dir.textAlign }]}>{t('search.maxPrice')}</Text>
                    <TextInput
                      style={styles.priceField}
                      keyboardType="numeric"
                      placeholder="99999"
                      placeholderTextColor={COLORS.gray400}
                      value={maxPrice}
                      onChangeText={setMaxPrice}
                      textAlign={dir.textAlign}
                    />
                  </View>
                </View>
              </ScrollView>

              <TouchableOpacity style={styles.applyBtn} onPress={closeFilter} activeOpacity={0.85}>
                <Text style={styles.applyBtnText}>{t('common.apply')}</Text>
              </TouchableOpacity>
            </Animated.View>
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.white },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { fontSize: FONT_SIZES.lg, color: COLORS.textTertiary, marginTop: 12 },
  listContent: { padding: SPACING.xl, paddingBottom: 100 },
  columnWrapper: { justifyContent: 'space-between', marginBottom: 12 },

  filterBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.gray50, justifyContent: 'center', alignItems: 'center', marginRight: 8 },
  filterBtnActive: { backgroundColor: COLORS.primary },
  filterBadge: { width: 16, height: 16, borderRadius: 8, backgroundColor: COLORS.error, justifyContent: 'center', alignItems: 'center', position: 'absolute', top: -4, right: -4 },
  filterBadgeText: { color: COLORS.white, fontSize: 9, fontWeight: '800' },

  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: { backgroundColor: COLORS.white, borderTopLeftRadius: RADIUS.xxl, borderTopRightRadius: RADIUS.xxl, paddingBottom: 40 },
  sheetHandle: { alignItems: 'center', paddingVertical: 12 },
  sheetHandleBar: { width: 40, height: 4, borderRadius: 2, backgroundColor: COLORS.gray300 },
  sheetTitle: { fontSize: FONT_SIZES.xl, fontWeight: FONT_WEIGHTS.bold, color: COLORS.text, textAlign: 'right', paddingHorizontal: SPACING.xl, marginBottom: 8 },
  sheetFilterHeader: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', paddingRight: SPACING.xl },
  resetText: { fontSize: FONT_SIZES.sm, fontWeight: FONT_WEIGHTS.semibold, color: COLORS.error },
  sheetDivider: { height: 1, backgroundColor: COLORS.gray100, marginHorizontal: SPACING.xl, marginBottom: 8 },
  filterScroll: { maxHeight: 400, marginBottom: 12 },
  filterSectionLabel: { fontSize: FONT_SIZES.md, fontWeight: FONT_WEIGHTS.bold, color: COLORS.textSecondary, textAlign: 'right', paddingHorizontal: SPACING.xl, marginBottom: 4, marginTop: 8 },
  sortOption: { flexDirection: 'row-reverse', alignItems: 'center', gap: 12, paddingVertical: 14, paddingHorizontal: SPACING.xl },
  sortOptionText: { fontSize: FONT_SIZES.lg, fontWeight: FONT_WEIGHTS.medium, color: COLORS.textSecondary },
  sortOptionTextActive: { color: COLORS.text, fontWeight: FONT_WEIGHTS.bold },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: COLORS.gray300, justifyContent: 'center', alignItems: 'center' },
  radioActive: { borderColor: COLORS.primary },
  radioDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: COLORS.primary },
  priceRangeRow: { flexDirection: 'row-reverse', alignItems: 'center', paddingHorizontal: SPACING.xl, gap: 8, marginTop: 8 },
  priceInput: { flex: 1 },
  priceInputLabel: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary, textAlign: 'right', marginBottom: 4 },
  priceField: { height: 44, borderWidth: 1, borderColor: COLORS.gray200, borderRadius: RADIUS.md, paddingHorizontal: 12, fontSize: FONT_SIZES.lg, color: COLORS.text, backgroundColor: COLORS.gray50 },
  priceDash: { fontSize: 20, color: COLORS.textSecondary, marginTop: 20 },
  applyBtn: { marginHorizontal: SPACING.xl, height: 48, borderRadius: RADIUS.lg, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center', marginTop: 8 },
  applyBtnText: { color: COLORS.white, fontSize: FONT_SIZES.lg, fontWeight: FONT_WEIGHTS.bold },
});
