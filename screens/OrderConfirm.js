import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Animated,
  Share,
  Linking,
  Alert,
} from 'react-native';
import { CheckCircle, AlertCircle, Banknote, CreditCard, Wallet, Truck, MapPin, Check, Camera } from 'lucide-react-native';
import { Ionicons } from '@expo/vector-icons';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import Button from '../components/Button';
import ConfettiOverlay from '../components/ConfettiOverlay';
import { supabase } from '../services/supabase';
import { useTranslation } from '../context/AppSettingsContext';
import { useDirection } from '../hooks/useDirection';

const formatPrice = (n) => Number(n || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');

function PaymentIcon({ method }) {
  if (method === 'VISA') return <CreditCard size={14} color="#22C55E" strokeWidth={2.25} />;
  if (method === 'WALLET') return <Wallet size={14} color="#22C55E" strokeWidth={2.25} />;
  return <Banknote size={14} color="#22C55E" strokeWidth={2.25} />;
}

const STATUS_ORDER = ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED'];

export default function OrderConfirmScreen({ navigation, route }) {
  const { t, weekdays, months } = useTranslation();
  const dir = useDirection();
  const order = route?.params?.order;
  const viewShotRef = useRef(null);

  const getDeliveryEstimate = () => {
    const d = new Date();
    d.setDate(d.getDate() + 3);
    return `${weekdays[d.getDay()]} ${d.getDate()} ${months[d.getMonth()]}`;
  };

  const orderId = order?.id || '—';
  const displayId = order?.orderNumber || orderId || 'MW-' + Math.floor(100000 + Math.random() * 900000);
  const items = order?.order_items || order?.items || [];
  const subtotal = order?.subtotal || items.reduce((s, i) => s + (Number(i.unitPrice) * i.quantity), 0);
  const delivery = order?.shippingCost || 90;
  const total = order?.total || subtotal + delivery;
  const address = order?.addresses || order?.address;
  const discount = order?.discount || 0;

  const fawryCode = order?.fawryCode;
  const [paymentStatus, setPaymentStatus] = useState(order?.paymentStatus || 'PENDING');
  const [heroSize, setHeroSize] = useState(null);
  const [capturing, setCapturing] = useState(false);
  const paymentMethod = order?.paymentMethod || 'COD';
  const isOnlinePayment = ['VISA', 'WALLET'].includes(paymentMethod);

  const animValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(animValue, {
      toValue: 1,
      friction: 4,
      tension: 40,
      useNativeDriver: true,
    }).start();
  }, []);

  useEffect(() => {
    if (!order?.id) return;
    const channel = supabase
      .channel(`order-${order.id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'orders', filter: `id=eq.${order.id}` },
        (payload) => {
          if (payload.new?.paymentStatus) setPaymentStatus(payload.new.paymentStatus);
        },
      )
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [order?.id]);

  const scale = animValue.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] });

  const timelineSteps = [
    { key: 'CONFIRMED', label: t('orders.stepConfirmed'), done: true },
    { key: 'PROCESSING', label: t('orders.stepPreparing'), done: paymentStatus === 'PAID', current: paymentStatus !== 'FAILED' && paymentStatus !== 'PAID' },
    { key: 'SHIPPED', label: t('orders.stepShipped'), done: false },
    { key: 'DELIVERED', label: t('orders.stepDelivered'), done: false },
  ];

  const paymentMethodLabels = {
    VISA: t('orders.methodVisa'),
    WALLET: t('orders.methodWallet'),
    COD: t('orders.methodCod'),
  };

  const handleShareOrder = () => {
    Share.share({ message: `${t('orders.orderNumber')}: ${displayId}\nMawada` });
  };

  const handleScreenshot = async () => {
    if (!viewShotRef.current) return;
    try {
      setCapturing(true);
      const uri = await captureRef(viewShotRef, { format: 'png', quality: 1 });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri);
      } else {
        await Share.share({ url: uri });
      }
    } catch (err) {
      Alert.alert(t('common.error'), t('orderConfirm.screenshotFailed'));
    } finally {
      setCapturing(false);
    }
  };

  const handleNavigateOrders = () => {
    navigation.reset({ index: 0, routes: [{ name: 'MyOrders' }] });
  };

  const handleRetry = () => {
    navigation.reset({
      index: 0,
      routes: [{ name: 'ResumePayment', params: { orderId: order?.id } }],
    });
  };

  const productImage = (item) => {
    const imgs = item.products?.product_images;
    if (!imgs || imgs.length === 0) return null;
    return imgs.find(i => i.isPrimary)?.url || imgs[0]?.url || null;
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />

      {/* ── Hero ── */}
      <View style={styles.hero} onLayout={(e) => { if (!heroSize) setHeroSize(e.nativeEvent.layout); }}>
        {paymentStatus !== 'FAILED' && heroSize && (
          <ConfettiOverlay width={heroSize.width} height={heroSize.height} />
        )}
        <View style={styles.heroOrb1} />
        <View style={styles.heroOrb2} />

        <Animated.View style={[styles.heroIconWrap, { opacity: animValue, transform: [{ scale }] }]}>
          {paymentStatus === 'FAILED' ? (
            <AlertCircle size={48} color="#EF4444" strokeWidth={1.5} />
          ) : (
            <CheckCircle size={48} color="#22C55E" strokeWidth={1.5} />
          )}
        </Animated.View>

        <Text style={styles.heroTitle}>
          {paymentStatus === 'FAILED' ? t('orders.confirmFailedTitle') : t('orders.confirmSuccessTitle')}
        </Text>
        <Text style={styles.heroSubtitle}>
          {paymentStatus === 'FAILED'
            ? t('orders.confirmFailedSub')
            : paymentMethod === 'COD'
              ? t('orders.confirmCodSub')
              : paymentStatus === 'PAID'
                ? t('orders.confirmPaidSub')
                : t('orders.confirmPendingSub')}
        </Text>

        <TouchableOpacity style={styles.orderIdPill} onPress={handleShareOrder} activeOpacity={0.8}>
          <Ionicons name="copy-outline" size={13} color="#38BDF8" />
          <Text style={styles.orderIdText} selectable>{displayId}</Text>
        </TouchableOpacity>

        <View style={styles.heroMeta}>
          <View style={styles.heroTag}>
            <PaymentIcon method={paymentMethod} />
            <Text style={styles.heroTagText}>{paymentMethodLabels[paymentMethod] || paymentMethod}</Text>
          </View>
          <View style={styles.heroDotSep} />
          <View style={styles.heroTag}>
            <Truck size={12} color="rgba(255,255,255,0.5)" strokeWidth={2} />
            <Text style={styles.heroTagText}>{t('orders.confirmEstimate', { date: getDeliveryEstimate() })}</Text>
          </View>
        </View>

        {fawryCode && (
          <View style={styles.fawryCard}>
            <Text style={styles.fawryLabel}>{t('orderConfirm.fawryBanner')}</Text>
            <Text style={styles.fawryCode}>{fawryCode}</Text>
            <Text style={styles.fawryHint}>{t('orderConfirm.fawryHint')}</Text>
          </View>
        )}
      </View>

      {/* ── Scrollable Content ── */}
      <ScrollView
        ref={viewShotRef}
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Timeline */}
        <View style={styles.timelineWrap}>
          <View style={styles.stepper}>
            {timelineSteps.map((step, idx) => {
              const isLast = idx === timelineSteps.length - 1;
              return (
                <React.Fragment key={step.key}>
                  <View style={styles.stepCol}>
                    <View style={[
                      styles.stepCircle,
                      step.done && styles.stepCircleDone,
                      step.current && styles.stepCircleActive,
                    ]}>
                      {step.done ? <Check size={13} color="#FFF" strokeWidth={3} /> : step.current ? <View style={styles.stepInnerDot} /> : null}
                    </View>
                    <Text style={[
                      styles.stepLabel,
                      step.done && styles.stepLabelDone,
                      step.current && styles.stepLabelActive,
                    ]} numberOfLines={1}>{step.label}</Text>
                  </View>
                  {!isLast && <View style={[styles.stepLine, step.done && styles.stepLineDone]} />}
                </React.Fragment>
              );
            })}
          </View>
        </View>

        {/* Unified Card */}
        <View style={styles.card}>
          {/* Items */}
          <Text style={styles.cardSectionTitle}>{t('orders.detail')}</Text>
          {items.map((item, index) => {
            const img = productImage(item);
            return (
              <View key={item.id || index}>
                <View style={styles.itemRow}>
                  <View style={styles.itemThumb}>
                    {img ? (
                      <View />
                    ) : (
                      <Ionicons name="bag-outline" size={16} color="#CBD5E1" />
                    )}
                  </View>
                  <View style={styles.itemInfo}>
                    <Text style={styles.itemName} numberOfLines={1}>{item.nameAr || item.products?.nameAr || t('orderConfirm.itemFallback')}</Text>
                    <Text style={styles.itemMeta}>×{item.quantity}</Text>
                  </View>
                  <Text style={styles.itemPrice}>{formatPrice(item.unitPrice)} {t('common.egp')}</Text>
                </View>
                {index < items.length - 1 && <View style={styles.itemDivider} />}
              </View>
            );
          })}

          {/* Payment Status */}
          <View style={styles.payStatusRow}>
            <Text style={styles.payStatusLabel}>{t('orders.paymentStatus')}</Text>
            <View style={[
              styles.payStatusPill,
              paymentStatus === 'PAID' && styles.payStatusPillPaid,
              paymentStatus === 'FAILED' && styles.payStatusPillFailed,
            ]}>
              <Text style={[
                styles.payStatusText,
                paymentStatus === 'PAID' && styles.payStatusTextPaid,
                paymentStatus === 'FAILED' && styles.payStatusTextFailed,
              ]}>
                {paymentStatus === 'PAID' ? t('orders.confirmPaymentPaid') : paymentStatus === 'FAILED' ? t('orders.confirmPaymentFailed') : t('orders.confirmPaymentPending')}
              </Text>
            </View>
          </View>

          <View style={styles.costDivider} />

          {/* Costs */}
          <View style={styles.costRow}>
            <Text style={styles.costLabel}>{t('orders.itemsPrice')}</Text>
            <Text style={styles.costValue}>{formatPrice(subtotal)} {t('common.egp')}</Text>
          </View>
          {discount > 0 && (
            <View style={styles.costRow}>
              <Text style={styles.costLabelGreen}>{t('common.discount')}</Text>
              <Text style={styles.costValueGreen}>-{formatPrice(discount)} {t('common.egp')}</Text>
            </View>
          )}
          <View style={styles.costRow}>
            <Text style={styles.costLabel}>{t('orders.delivery')}</Text>
            <Text style={styles.costValue}>{delivery > 0 ? `${formatPrice(delivery)} ${t('common.egp')}` : t('common.free')}</Text>
          </View>
          <View style={styles.costDivider} />
          <View style={styles.costRow}>
            <Text style={styles.totalLabel}>{t('common.total')}</Text>
            <Text style={styles.totalValue}>{formatPrice(total)} {t('common.egp')}</Text>
          </View>
        </View>

        {/* Address */}
        {address && (
          <View style={styles.card}>
            <Text style={styles.cardSectionTitle}>{t('orders.address')}</Text>
            <View style={styles.addrRow}>
              <View style={styles.addrIcon}>
                <MapPin size={16} color="#0F172A" strokeWidth={2} />
              </View>
              <View style={styles.addrInfo}>
                <Text style={styles.addrLabel}>{address.label || t('orders.addressFallback')}</Text>
                <Text style={styles.addrDetail}>{address.street}{address.region ? ` - ${address.region}` : ''}</Text>
                {address.phone && (
                  <TouchableOpacity style={styles.addrPhone} onPress={() => Linking.openURL(`tel:${address.phone}`).catch(() => {})} activeOpacity={0.7}>
                    <Ionicons name="call-outline" size={12} color="#22C55E" />
                    <Text style={styles.addrPhoneText}>+20 {address.phone}</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>
        )}

        {/* Actions */}
        {paymentStatus === 'FAILED' ? (
          <>
            <TouchableOpacity style={styles.ctaPrimary} onPress={handleRetry} activeOpacity={0.85}>
              <Text style={styles.ctaPrimaryText}>{t('orders.confirmRetry')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.textLink} onPress={() => navigation.navigate('Chat')} activeOpacity={0.7}>
              <Text style={styles.textLinkText}>{t('orders.confirmSupport')}</Text>
            </TouchableOpacity>
            <Button title={t('orders.confirmHome')} onPress={() => navigation.reset({ index: 0, routes: [{ name: 'Home' }] })} fullWidth style={styles.btnMargin} />
          </>
        ) : (
          <>
            <TouchableOpacity style={styles.ctaPrimary} onPress={handleNavigateOrders} activeOpacity={0.85}>
              <Ionicons name="location-outline" size={18} color="#FFF" />
              <Text style={styles.ctaPrimaryText}>{t('orders.track')}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.ctaScreenshot} onPress={handleScreenshot} activeOpacity={0.85} disabled={capturing}>
              <Camera size={18} color="#0F172A" strokeWidth={2} />
              <Text style={styles.ctaScreenshotText}>{t('orderConfirm.screenshotShare')}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.textLink} onPress={() => navigation.reset({ index: 0, routes: [{ name: 'Home' }] })} activeOpacity={0.7}>
              <Text style={styles.textLinkText}>{t('orders.confirmHome')}</Text>
            </TouchableOpacity>
          </>
        )}

        <View style={{ height: 20 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F8FAFC' },

  /* ── Hero ── */
  hero: {
    backgroundColor: '#0F172A',
    paddingTop: 56,
    paddingBottom: 24,
    paddingHorizontal: 24,
    alignItems: 'center',
    overflow: 'hidden',
  },
  heroOrb1: {
    position: 'absolute', top: -60, right: -40,
    width: 180, height: 180, borderRadius: 90,
    backgroundColor: 'rgba(34,197,94,0.06)',
  },
  heroOrb2: {
    position: 'absolute', bottom: -40, left: -30,
    width: 140, height: 140, borderRadius: 70,
    backgroundColor: 'rgba(56,189,248,0.05)',
  },
  heroIconWrap: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: 'rgba(34,197,94,0.1)',
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 12,
  },
  heroTitle: {
    color: '#FFF', fontSize: 22, fontWeight: '800',
    textAlign: 'center', marginBottom: 4, letterSpacing: -0.3,
  },
  heroSubtitle: {
    color: 'rgba(255,255,255,0.5)', fontSize: 13,
    textAlign: 'center', marginBottom: 16, lineHeight: 18,
  },
  orderIdPill: {
    flexDirection: 'row-reverse', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 20, paddingVertical: 7, paddingHorizontal: 14,
    marginBottom: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  orderIdText: {
    color: '#38BDF8', fontSize: 14, fontWeight: '700',
    fontFamily: 'monospace', letterSpacing: 0.5,
  },
  heroMeta: {
    flexDirection: 'row-reverse', alignItems: 'center', gap: 8,
  },
  heroTag: {
    flexDirection: 'row-reverse', alignItems: 'center', gap: 5,
  },
  heroTagText: {
    color: 'rgba(255,255,255,0.45)', fontSize: 11, fontWeight: '500',
  },
  heroDotSep: {
    width: 3, height: 3, borderRadius: 1.5,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  fawryCard: {
    backgroundColor: 'rgba(56,189,248,0.08)',
    borderRadius: 14, padding: 14, marginTop: 14,
    alignItems: 'center', width: '100%',
    borderWidth: 1, borderColor: 'rgba(56,189,248,0.2)',
  },
  fawryLabel: { color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: '600', marginBottom: 4 },
  fawryCode: { color: '#38BDF8', fontSize: 22, fontWeight: '800', letterSpacing: 2, marginBottom: 2 },
  fawryHint: { color: 'rgba(255,255,255,0.35)', fontSize: 10, textAlign: 'center' },

  /* ── Scroll ── */
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 40 },

  /* ── Timeline ── */
  timelineWrap: {
    backgroundColor: '#FFF', borderRadius: 20, padding: 18, marginBottom: 12,
    shadowColor: '#000', shadowOpacity: 0.03, shadowOffset: { width: 0, height: 2 }, shadowRadius: 8, elevation: 1,
  },
  stepper: {
    flexDirection: 'row-reverse', alignItems: 'flex-start', justifyContent: 'space-between',
  },
  stepCol: { alignItems: 'center', flex: 1, maxWidth: 72 },
  stepCircle: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: '#E2E8F0', justifyContent: 'center', alignItems: 'center',
    marginBottom: 6,
  },
  stepCircleDone: {
    backgroundColor: '#22C55E',
    shadowColor: '#22C55E', shadowOpacity: 0.25, shadowOffset: { width: 0, height: 2 }, shadowRadius: 5, elevation: 2,
  },
  stepCircleActive: {
    backgroundColor: '#FFF', borderWidth: 2.5, borderColor: '#F59E0B',
    shadowColor: '#F59E0B', shadowOpacity: 0.25, shadowOffset: { width: 0, height: 2 }, shadowRadius: 5, elevation: 2,
  },
  stepInnerDot: { width: 9, height: 9, borderRadius: 4.5, backgroundColor: '#F59E0B' },
  stepLine: { flex: 1, height: 2, backgroundColor: '#E2E8F0', marginTop: 14, marginHorizontal: -2, borderRadius: 1 },
  stepLineDone: { backgroundColor: '#22C55E' },
  stepLabel: { fontSize: 9, fontWeight: '600', color: '#94A3B8', textAlign: 'center' },
  stepLabelDone: { color: '#22C55E' },
  stepLabelActive: { color: '#F59E0B', fontWeight: '700' },

  /* ── Unified Card ── */
  card: {
    backgroundColor: '#FFF', borderRadius: 20, padding: 18, marginBottom: 12,
    shadowColor: '#000', shadowOpacity: 0.03, shadowOffset: { width: 0, height: 2 }, shadowRadius: 8, elevation: 1,
  },
  cardSectionTitle: {
    fontSize: 14, fontWeight: '700', color: '#0F172A', textAlign: 'right', marginBottom: 12,
  },

  /* Items */
  itemRow: {
    flexDirection: 'row-reverse', alignItems: 'center', paddingVertical: 10,
  },
  itemThumb: {
    width: 44, height: 44, borderRadius: 10, backgroundColor: '#F1F5F9',
    justifyContent: 'center', alignItems: 'center', marginLeft: 10, overflow: 'hidden',
  },
  itemInfo: { flex: 1, alignItems: 'flex-end' },
  itemName: { fontSize: 13, fontWeight: '600', color: '#334155', textAlign: 'right' },
  itemMeta: { fontSize: 11, color: '#94A3B8', marginTop: 1 },
  itemPrice: { fontSize: 13, fontWeight: '700', color: '#0F172A' },
  itemDivider: { height: StyleSheet.hairlineWidth, backgroundColor: '#F1F5F9' },

  /* Payment Status */
  payStatusRow: {
    flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center',
    marginTop: 12, paddingTop: 12,
  },
  payStatusLabel: { fontSize: 12, fontWeight: '600', color: '#64748B' },
  payStatusPill: {
    backgroundColor: '#FEF3C7', borderRadius: 8, paddingVertical: 3, paddingHorizontal: 10,
  },
  payStatusPillPaid: { backgroundColor: '#DCFCE7' },
  payStatusPillFailed: { backgroundColor: '#FEE2E2' },
  payStatusText: { fontSize: 11, fontWeight: '700', color: '#92400E' },
  payStatusTextPaid: { color: '#166534' },
  payStatusTextFailed: { color: '#991B1B' },

  /* Costs */
  costDivider: { height: StyleSheet.hairlineWidth, backgroundColor: '#F1F5F9', marginVertical: 10 },
  costRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginVertical: 3 },
  costLabel: { fontSize: 13, color: '#64748B' },
  costValue: { fontSize: 13, color: '#334155', fontWeight: '600' },
  costLabelGreen: { fontSize: 13, color: '#22C55E', fontWeight: '600' },
  costValueGreen: { fontSize: 13, color: '#22C55E', fontWeight: '700' },
  totalLabel: { fontSize: 15, fontWeight: '700', color: '#0F172A' },
  totalValue: { fontSize: 18, fontWeight: '800', color: '#0F172A' },

  /* Address */
  addrRow: { flexDirection: 'row-reverse', alignItems: 'flex-start' },
  addrIcon: {
    width: 34, height: 34, borderRadius: 10, backgroundColor: '#F1F5F9',
    justifyContent: 'center', alignItems: 'center', marginLeft: 10,
  },
  addrInfo: { flex: 1, alignItems: 'flex-end' },
  addrLabel: { fontSize: 14, fontWeight: '700', color: '#0F172A', marginBottom: 2 },
  addrDetail: { fontSize: 12, color: '#64748B', lineHeight: 17 },
  addrPhone: {
    flexDirection: 'row-reverse', alignItems: 'center', gap: 4,
    marginTop: 6, backgroundColor: '#F0FDF4', borderRadius: 8,
    paddingVertical: 4, paddingHorizontal: 10, alignSelf: 'flex-start',
  },
  addrPhoneText: { fontSize: 11, color: '#22C55E', fontWeight: '600' },

  /* ── Actions ── */
  ctaPrimary: {
    flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#0F172A', borderRadius: 16, paddingVertical: 14, marginBottom: 10,
  },
  ctaPrimaryText: { color: '#FFF', fontSize: 15, fontWeight: '700' },
  ctaScreenshot: {
    flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#FFFFFF', borderRadius: 16, paddingVertical: 13, marginBottom: 10,
    borderWidth: 1.5, borderColor: '#E2E8F0',
  },
  ctaScreenshotText: { color: '#0F172A', fontSize: 14, fontWeight: '600' },
  textLink: { alignItems: 'center', paddingVertical: 12 },
  textLinkText: { fontSize: 14, color: '#64748B', fontWeight: '600' },
  btnMargin: { marginBottom: 0 },
});
