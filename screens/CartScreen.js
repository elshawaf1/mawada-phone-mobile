import React, { useRef, useEffect, useState } from 'react';
import {
  StyleSheet, Text, View, ScrollView, TouchableOpacity, Dimensions, StatusBar,
  Image, TextInput, Animated, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ChevronLeft, Check, Plus, Minus, Trash2, ShoppingBag, Tag, Gift, Truck, ChevronDown, ChevronUp, Clock, FileText } from 'lucide-react-native';
import ScreenHeader from '../components/ScreenHeader';
import LottieView from 'lottie-react-native';
import { COLORS, SPACING, RADIUS, FONT_SIZES, FONT_WEIGHTS } from '../constants';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../services/supabase';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from '../context/AppSettingsContext';
import { useDirection } from '../hooks/useDirection';
import { fetchSettings } from '../services/settings';

const { width } = Dimensions.get('window');

const fmt = (n) => {
  const num = typeof n === 'string' ? parseInt(n.replace(/,/g, '')) : n;
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
};

function CartItem({ item, listType, onToggle, onUpdateQty, onRemove, onMoveToSaved, onMoveToCart, isLast, t }) {
  const dir = useDirection();
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const [removing, setRemoving] = useState(false);

  const price = typeof item.price === 'string' ? parseInt(item.price.replace(/,/g, '')) : item.price;

  const handleRemove = () => {
    setRemoving(true);
    Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => { onRemove(item.id); });
  };

  return (
    <Animated.View style={{ opacity: fadeAnim }}>
      <View style={styles.itemRow}>
        {onToggle && (
          <TouchableOpacity style={[styles.checkbox, item.selected && styles.checkboxActive]} onPress={() => onToggle(item.id)}>
            {item.selected && <Check size={12} color="#fff" strokeWidth={3} />}
          </TouchableOpacity>
        )}
        <View style={styles.itemImageBg}>
          {item.image ? <Image source={{ uri: item.image }} style={styles.itemImage} resizeMode="contain" /> : <Ionicons name="phone-portrait-outline" size={28} color={COLORS.gray300} />}
        </View>
        <View style={styles.itemDetails}>
          <Text style={styles.itemTitle} numberOfLines={2}>{item.title}</Text>
          {item.variant && (
            <Text style={styles.itemVariant}>
              {[item.variant.storage, item.variant.ram, item.variant.color].filter(Boolean).join(' / ')}
              {item.variant.batteryHealth != null ? ` | ${t('item.battery', { health: item.variant.batteryHealth })}` : ''}
            </Text>
          )}
          <Text style={styles.itemPrice}>{fmt(price)} {t('common.egp')}</Text>
          <View style={styles.itemFooter}>
            {listType === 'cart' ? (
              <>
                <View style={styles.stepper}>
                  <TouchableOpacity style={styles.stepBtn} onPress={() => onUpdateQty(item.id, -1)}><Minus size={12} color={COLORS.text} /></TouchableOpacity>
                  <Text style={styles.stepVal}>{item.quantity}</Text>
                  <TouchableOpacity style={styles.stepBtn} onPress={() => onUpdateQty(item.id, 1)}><Plus size={12} color={COLORS.text} /></TouchableOpacity>
                </View>
                <View style={styles.actionBtns}>
                  <TouchableOpacity style={styles.actionBtn} onPress={handleRemove}><Trash2 size={14} color={COLORS.error} /></TouchableOpacity>
                  <TouchableOpacity style={styles.actionBtn} onPress={() => onMoveToSaved(item.id)}><Tag size={14} color={COLORS.textSecondary} /></TouchableOpacity>
                </View>
              </>
            ) : (
              <TouchableOpacity style={styles.moveToCartBtn} onPress={() => onMoveToCart(item.id)}>
                <ShoppingBag size={12} color={COLORS.text} />
                <Text style={styles.moveToCartText}>{t('cart.moveToCart')}</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
      {!isLast && <View style={styles.divider} />}
    </Animated.View>
  );
}

export default function CartScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { t } = useTranslation();
  const dir = useDirection();
  const {
    cart, cartCount, savedForLater, coupon,
    removeFromCart, updateCartQty, toggleCartSelect, toggleAllCartSelect,
    moveToSaved, moveToCart, removeSaved, applyCoupon, removeCoupon,
  } = useApp();

  const [couponCode, setCouponCode] = useState('');
  const [couponMsg, setCouponMsg] = useState('');
  const [showCoupon, setShowCoupon] = useState(false);
  const [orderNotes, setOrderNotes] = useState('');
  const [deliveryFee, setDeliveryFee] = useState(90);
  const [freeShipThreshold, setFreeShipThreshold] = useState(50000);
  const [estimatedDays, setEstimatedDays] = useState(3);
  const lottieRef = useRef(null);

  const isEmpty = cart.length === 0 && savedForLater.length === 0;

  useEffect(() => {
    if (!isEmpty) return;
    const interval = setInterval(() => {
      lottieRef.current?.reset();
      lottieRef.current?.play();
    }, 3000);
    return () => clearInterval(interval);
  }, [isEmpty]);

  const selected = cart.filter((i) => i.selected);
  const subtotal = selected.reduce((s, i) => {
    const p = typeof i.price === 'string' ? parseInt(i.price.replace(/,/g, '')) : i.price;
    return s + p * i.quantity;
  }, 0);
  const discount = coupon?.discount ? Math.round(subtotal * (coupon.discount / 100)) : 0;
  const freeShip = subtotal > freeShipThreshold;
  const shipCost = selected.length > 0 && !freeShip ? deliveryFee : 0;
  const total = subtotal - discount + shipCost;
  const allSelected = cart.length > 0 && cart.every((i) => i.selected);
  const shipProgress = Math.min((subtotal / freeShipThreshold) * 100, 100);

  const animateOpacity = useRef(new Animated.Value(0)).current;
  const animateSlide = useRef(new Animated.Value(50)).current;

  useEffect(() => {
    fetchSettings().then((s) => {
      setDeliveryFee(s.delivery_fee);
      setFreeShipThreshold(s.free_shipping_threshold);
      setEstimatedDays(s.estimated_delivery_days);
    });
    Animated.parallel([
      Animated.timing(animateOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.timing(animateSlide, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start();
  }, []);

  const handleApplyCoupon = () => {
    const result = applyCoupon(couponCode);
    if (result.success) {
      setCouponMsg(t('cart.couponApplied', { percent: result.discount }));
    } else {
      setCouponMsg(t('cart.couponInvalid'));
    }
  };

  const handleCheckout = async () => {
    if (!user?.id) return;
    const selectedItems = cart.filter((i) => i.selected);
    if (selectedItems.length === 0) return;
    try {
      for (const item of selectedItems) {
        const { error } = await supabase.from('cart_items').upsert(
          { userId: user.id, productId: item.productId, variantId: item.variantId, quantity: item.quantity },
          { onConflict: 'userId,productId,variantId' }
        );
        if (error) throw error;
      }
    } catch (error) {
      console.error('Cart sync error:', error);
      Alert.alert(t('common.error'), t('cart.syncError'));
      return;
    }
    navigation.navigate('Payment', {
      selectedItems: selectedItems.map(i => ({
        productId: i.productId, variantId: i.variantId || null, quantity: i.quantity,
        unitPrice: typeof i.price === 'string' ? parseInt(i.price.replace(/,/g, '')) : i.price,
        name: i.title || i.name || 'Product',
        image: i.image || null,
      })),
      notes: orderNotes,
    });
  };

  return (
    <View style={styles.root}>
      <ScreenHeader
        onBack={() => navigation.navigate('Home')}
        title={
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitleText}>{t('cart.title')}</Text>
            {cart.length > 0 && (
              <View style={styles.headerCountBadge}><Text style={styles.headerCountText}>{cartCount}</Text></View>
            )}
          </View>
        }
        rightAction={
          cart.length > 0 ? (
            <TouchableOpacity style={styles.selectAllBtn} onPress={toggleAllCartSelect}>
              <View style={[styles.checkbox, allSelected && styles.checkboxActive]}>
                {allSelected && <Check size={12} color={COLORS.white} strokeWidth={3} />}
              </View>
              <Text style={styles.selectAllText}>{t('cart.selectAll')}</Text>
            </TouchableOpacity>
          ) : null
        }
      />

      {isEmpty ? (
        <View style={styles.emptyContent}>
          <LottieView
            ref={lottieRef}
            source={require('../assets/wired-lineal-146-trolley-hover-jump.json')}
            style={styles.emptyLottie}
            autoPlay
            loop={false}
            resizeMode="contain"
          />
          <Text style={styles.emptyTitle}>{t('cart.empty')}</Text>
          <Text style={styles.emptySubtitle}>{t('cart.emptySub')}</Text>
          <TouchableOpacity style={styles.ctaButton} onPress={() => navigation.navigate('Home')} activeOpacity={0.8}>
            <Text style={styles.ctaText}>{t('cart.browse')}</Text>
            <ShoppingBag size={18} color="#1E293B" style={styles.ctaIcon} />
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <TouchableOpacity style={styles.couponToggle} onPress={() => setShowCoupon(!showCoupon)}>
              <Tag size={16} color={COLORS.textSecondary} />
              <Text style={styles.couponToggleText}>
                {coupon ? t('cart.couponApplied', { percent: coupon.discount || '‏' }) : t('cart.haveCoupon')}
              </Text>
              {showCoupon ? <ChevronUp size={16} color={COLORS.gray400} /> : <ChevronDown size={16} color={COLORS.gray400} />}
            </TouchableOpacity>

            {showCoupon && (
              <View style={styles.couponSection}>
                <View style={styles.couponRow}>
                  <TextInput
                    style={styles.couponInput} placeholder={t('cart.couponPlaceholder')}
                    placeholderTextColor={COLORS.gray400} value={couponCode}
                    onChangeText={(t) => { setCouponCode(t); setCouponMsg(''); }} textAlign={dir.textAlign}
                  />
                  <TouchableOpacity style={[styles.applyBtn, couponCode.trim() === '' && styles.applyBtnDisabled]} onPress={handleApplyCoupon} disabled={couponCode.trim() === ''}>
                    <Text style={styles.applyBtnText}>{t('cart.apply')}</Text>
                  </TouchableOpacity>
                </View>
                {couponMsg ? <Text style={[styles.couponMsg, !couponMsg.includes(t('cart.couponInvalid')) && styles.couponMsgSuccess]}>{couponMsg}</Text> : null}
                {coupon && (
                  <TouchableOpacity style={styles.removeCouponBtn} onPress={() => { removeCoupon(); setCouponMsg(''); }}>
                    <Text style={styles.removeCouponText}>{t('cart.removeCoupon')}</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            <View style={styles.itemsCard}>
              {cart.length > 0 && (
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>{t('cart.items', { count: cart.length })}</Text>
                </View>
              )}
              {cart.map((item, idx) => (
                <CartItem key={item.id} item={item} listType="cart" onToggle={toggleCartSelect} onUpdateQty={updateCartQty} onRemove={removeFromCart} onMoveToSaved={moveToSaved} isLast={idx === cart.length - 1 && savedForLater.length === 0} t={t} />
              ))}

              {savedForLater.length > 0 && (
                <View style={styles.savedSection}>
                  <View style={styles.sectionHeader}>
                    <Gift size={16} color={COLORS.textSecondary} />
                    <Text style={styles.sectionTitle}>{t('cart.savedForLater', { count: savedForLater.length })}</Text>
                  </View>
                  {savedForLater.map((item, idx) => (
                    <CartItem key={item.id} item={item} listType="saved" onMoveToCart={moveToCart} isLast={idx === savedForLater.length - 1} t={t} />
                  ))}
                </View>
              )}
            </View>

            {selected.length > 0 && !freeShip && (
              <View style={styles.shipCard}>
                <View style={styles.shipHeader}>
                  <Truck size={16} color={COLORS.success} />
                  <Text style={styles.shipTitle}>{t('cart.freeShippingProgress', { amount: fmt(freeShipThreshold - subtotal) })}</Text>
                </View>
                <View style={styles.progressBg}><View style={[styles.progressFill, { width: `${shipProgress}%` }]} /></View>
                <Text style={styles.shipSubtext}>{t('cart.freeShippingPercent', { percent: Math.round(shipProgress) })}</Text>
              </View>
            )}

            {freeShip && selected.length > 0 && (
              <View style={[styles.shipCard, styles.shipCardFree]}>
                <Truck size={16} color={COLORS.success} />
                <Text style={styles.freeShipText}>{t('cart.freeShippingAchieved')}</Text>
              </View>
            )}

            {selected.length > 0 && (
              <>
                <View style={styles.deliveryEstimateCard}>
                  <Clock size={16} color={COLORS.textSecondary} />
                  <Text style={styles.deliveryEstimateText}>{t('cart.deliveryEstimate', { days: estimatedDays })}</Text>
                </View>

                <View style={styles.orderNotesCard}>
                  <View style={styles.orderNotesHeader}>
                    <FileText size={16} color={COLORS.textSecondary} />
                    <Text style={styles.orderNotesTitle}>{t('cart.orderNotes')}</Text>
                  </View>
                  <TextInput
                    style={styles.orderNotesInput}
                    placeholder={t('cart.orderNotesPlaceholder')}
                    placeholderTextColor={COLORS.gray400}
                    value={orderNotes}
                    onChangeText={setOrderNotes}
                    multiline
                    textAlignVertical="top"
                    textAlign={dir.textAlign}
                  />
                </View>
              </>
            )}

            {selected.length > 0 && (
              <Animated.View style={[styles.summaryCard, { opacity: animateOpacity, transform: [{ translateY: animateSlide }] }]}>
                <Text style={styles.summaryTitle}>{t('cart.summary')}</Text>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryVal}>{fmt(subtotal)} {t('common.egp')}</Text>
                  <Text style={styles.summaryLabel}>{t('common.subtotal')}</Text>
                </View>
                {coupon && (
                  <View style={styles.summaryRow}>
                    <Text style={[styles.summaryVal, { color: COLORS.success }]}>-{fmt(discount)} {t('common.egp')}</Text>
                    <Text style={styles.summaryLabel}>{t('common.discount')} ({coupon.code})</Text>
                  </View>
                )}
                <View style={styles.summaryRow}>
                  <Text style={[styles.summaryVal, { color: freeShip ? COLORS.success : COLORS.text }]}>
                    {freeShip ? t('common.free') : `${deliveryFee} ${t('common.egp')}`}
                  </Text>
                  <Text style={styles.summaryLabel}>{t('common.shipping')}</Text>
                </View>
                <View style={styles.totalLine} />
                <View style={styles.summaryRow}>
                  <Text style={styles.totalVal}>{fmt(total)} {t('common.egp')}</Text>
                  <Text style={styles.totalLabel}>{t('common.total')}</Text>
                </View>
              </Animated.View>
            )}

            <View style={{ height: 100 }} />
          </ScrollView>

          <Animated.View style={[styles.bottomBar, { paddingBottom: 12 + insets.bottom, opacity: animateOpacity, transform: [{ translateY: animateSlide }] }]}>
            <View style={styles.bottomLeft}>
              <Text style={styles.bottomLabel}>{t('common.total')}</Text>
              <Text style={styles.bottomTotal}>{fmt(total)} {t('common.egp')}</Text>
            </View>
            <TouchableOpacity style={[styles.checkoutBtn, selected.length === 0 && styles.checkoutBtnDisabled]} onPress={handleCheckout} disabled={selected.length === 0} activeOpacity={0.85}>
              <Text style={styles.checkoutBtnText}>{t('cart.checkout', { count: selected.length })}</Text>
              <ChevronLeft size={18} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.continueBtn} onPress={() => navigation.navigate('Home')}>
              <Ionicons name="storefront-outline" size={20} color={COLORS.text} />
            </TouchableOpacity>
          </Animated.View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.white },
  headerCenter: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8 },
  headerTitleText: { fontSize: 18, fontWeight: '600', color: COLORS.text, textAlign: 'center' },
  headerCountBadge: { backgroundColor: COLORS.error, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
  headerCountText: { color: COLORS.white, fontSize: 12, fontWeight: '700' },
  selectAllBtn: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6 },
  selectAllText: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary },

  emptyContent: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, paddingBottom: 56 },
  emptyLottie: { width: 160, height: 160, marginBottom: 24 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: '#0F172A', marginBottom: 8, textAlign: 'center' },
  emptySubtitle: { fontSize: 14, color: '#94A3B8', textAlign: 'center', marginBottom: 32, lineHeight: 20 },
  ctaButton: { flexDirection: 'row-reverse', backgroundColor: COLORS.gray100, paddingVertical: 14, paddingHorizontal: 28, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  ctaText: { fontSize: 15, fontWeight: '600', color: '#1E293B' },
  ctaIcon: { marginRight: 8 },

  scroll: { paddingHorizontal: 14, paddingTop: 6, paddingBottom: 20 },

  couponToggle: { flexDirection: 'row-reverse', alignItems: 'center', backgroundColor: COLORS.gray50, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 10, gap: 8 },
  couponToggleText: { flex: 1, fontSize: 13, color: COLORS.textSecondary, textAlign: 'right' },

  couponSection: { backgroundColor: '#fff', borderRadius: 16, padding: 14, marginBottom: 10 },
  couponRow: { flexDirection: 'row-reverse', gap: 10 },
  couponInput: { flex: 1, height: 44, backgroundColor: COLORS.gray50, borderRadius: 12, paddingHorizontal: 14, fontSize: 14, color: COLORS.text, borderWidth: 1, borderColor: COLORS.gray200, textAlign: 'right' },
  applyBtn: { height: 44, paddingHorizontal: 20, backgroundColor: COLORS.primary, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  applyBtnDisabled: { backgroundColor: COLORS.gray300 },
  applyBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  couponMsg: { textAlign: 'right', fontSize: 12, color: COLORS.error, marginTop: 6 },
  couponMsgSuccess: { color: COLORS.success },
  removeCouponBtn: { marginTop: 8, alignItems: 'center' },
  removeCouponText: { fontSize: 12, color: COLORS.error, fontWeight: '600' },

  itemsCard: { backgroundColor: '#fff', borderRadius: 20, padding: 14, marginBottom: 10, shadowColor: '#000', shadowOpacity: 0.06, shadowOffset: { width: 0, height: 4 }, shadowRadius: 12, elevation: 3 },
  sectionHeader: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6, marginBottom: 6 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: COLORS.primary },
  checkbox: { width: 22, height: 22, borderRadius: 7, borderWidth: 2, borderColor: COLORS.gray300, justifyContent: 'center', alignItems: 'center' },
  checkboxActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },

  itemRow: { flexDirection: 'row-reverse', alignItems: 'flex-start', paddingVertical: 10, gap: 10 },
  itemImageBg: { width: 80, height: 80, borderRadius: 16, backgroundColor: COLORS.gray50, justifyContent: 'center', alignItems: 'center', overflow: 'hidden', borderWidth: 1, borderColor: COLORS.gray100 },
  itemImage: { width: '80%', height: '80%' },
  itemDetails: { flex: 1, alignItems: 'flex-end' },
  itemTitle: { fontSize: 14, fontWeight: '600', color: COLORS.primary, textAlign: 'right', lineHeight: 20, marginBottom: 2 },
  itemVariant: { fontSize: 11, color: COLORS.gray400, textAlign: 'right', marginBottom: 4 },
  itemPrice: { fontSize: 16, fontWeight: '800', color: COLORS.error, marginBottom: 8 },
  itemFooter: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', width: '100%' },
  stepper: { flexDirection: 'row-reverse', alignItems: 'center', backgroundColor: COLORS.gray50, borderRadius: 10, borderWidth: 1, borderColor: COLORS.gray200 },
  stepBtn: { paddingHorizontal: 12, paddingVertical: 6 },
  stepVal: { color: COLORS.text, fontWeight: '700', fontSize: 14, paddingHorizontal: 8, minWidth: 28, textAlign: 'center' },
  actionBtns: { flexDirection: 'row-reverse', gap: 6 },
  actionBtn: { width: 32, height: 32, borderRadius: 10, backgroundColor: '#FEF2F2', justifyContent: 'center', alignItems: 'center' },
  divider: { height: 1, backgroundColor: COLORS.gray100, marginVertical: 2 },

  savedSection: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: COLORS.gray100 },
  moveToCartBtn: { flexDirection: 'row-reverse', alignItems: 'center', gap: 4, backgroundColor: COLORS.gray50, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6 },
  moveToCartText: { fontSize: 11, fontWeight: '600', color: COLORS.primary },

  shipCard: { backgroundColor: '#fff', borderRadius: 16, padding: 14, marginBottom: 10, shadowColor: '#000', shadowOpacity: 0.06, shadowOffset: { width: 0, height: 4 }, shadowRadius: 12, elevation: 3 },
  shipCardFree: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8, backgroundColor: '#F0FDF4' },
  shipHeader: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6, marginBottom: 10 },
  shipTitle: { flex: 1, fontSize: 12, color: COLORS.textSecondary, textAlign: 'right' },
  progressBg: { height: 6, backgroundColor: COLORS.gray100, borderRadius: 3, overflow: 'hidden', marginBottom: 6 },
  progressFill: { height: '100%', backgroundColor: COLORS.success, borderRadius: 3 },
  shipSubtext: { fontSize: 11, color: COLORS.gray400, textAlign: 'right' },
  freeShipText: { fontSize: 13, fontWeight: '700', color: COLORS.success, textAlign: 'right' },

  deliveryEstimateCard: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8, backgroundColor: '#EFF6FF', borderRadius: 14, padding: 14, marginBottom: 10 },
  deliveryEstimateText: { flex: 1, fontSize: 13, fontWeight: '600', color: '#1D4ED8', textAlign: 'right' },

  orderNotesCard: { backgroundColor: '#fff', borderRadius: 16, padding: 14, marginBottom: 10, shadowColor: '#000', shadowOpacity: 0.06, shadowOffset: { width: 0, height: 4 }, shadowRadius: 12, elevation: 3 },
  orderNotesHeader: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6, marginBottom: 10 },
  orderNotesTitle: { fontSize: 13, fontWeight: '700', color: COLORS.text },
  orderNotesInput: { backgroundColor: COLORS.gray50, borderRadius: 12, padding: 14, fontSize: 14, color: COLORS.text, minHeight: 80, borderWidth: 1, borderColor: COLORS.gray200, textAlign: 'right' },

  summaryCard: { backgroundColor: '#fff', borderRadius: 20, padding: 16, marginBottom: 10, shadowColor: '#000', shadowOpacity: 0.06, shadowOffset: { width: 0, height: 4 }, shadowRadius: 12, elevation: 3 },
  summaryTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text, textAlign: 'right', marginBottom: 14 },
  summaryRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginVertical: 5 },
  summaryLabel: { fontSize: 14, color: COLORS.textSecondary },
  summaryVal: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  totalLine: { height: 1, backgroundColor: COLORS.gray100, marginVertical: 10 },
  totalLabel: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  totalVal: { fontSize: 20, fontWeight: '900', color: COLORS.error },

  bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row-reverse', alignItems: 'center', backgroundColor: '#fff', paddingHorizontal: 14, paddingVertical: 12, borderTopWidth: 1, borderTopColor: COLORS.gray100, shadowColor: '#000', shadowOpacity: 0.1, shadowOffset: { width: 0, height: -4 }, shadowRadius: 12, elevation: 8 },
  bottomLeft: { alignItems: 'flex-end', marginRight: 10 },
  bottomLabel: { fontSize: 11, color: COLORS.textSecondary },
  bottomTotal: { fontSize: 18, fontWeight: '900', color: COLORS.error },
  checkoutBtn: { flex: 1, height: 50, backgroundColor: COLORS.primary, borderRadius: 14, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 6, shadowColor: COLORS.primary, shadowOpacity: 0.15, shadowOffset: { width: 0, height: 4 }, shadowRadius: 8, elevation: 4 },
  checkoutBtnDisabled: { opacity: 0.4 },
  checkoutBtnText: { color: '#fff', fontSize: 15, fontWeight: '800' },
  continueBtn: { width: 50, height: 50, borderRadius: 14, backgroundColor: COLORS.gray50, justifyContent: 'center', alignItems: 'center', marginRight: 8 },
});
