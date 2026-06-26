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
} from 'react-native';
import { CheckCircle, AlertCircle, Banknote, CreditCard, Wallet, Truck, MapPin, Check } from 'lucide-react-native';
import { Ionicons } from '@expo/vector-icons';
import Button from '../components/Button';
import ConfettiOverlay from '../components/ConfettiOverlay';
import { supabase } from '../services/supabase';
import { useTranslation } from '../context/AppSettingsContext';
import { useDirection } from '../hooks/useDirection';

const formatPrice = (n) => Number(n || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');

function PaymentIcon({ method }) {
  if (method === 'VISA') return <CreditCard size={16} color="#22C55E" strokeWidth={2.25} />;
  if (method === 'WALLET') return <Wallet size={16} color="#22C55E" strokeWidth={2.25} />;
  return <Banknote size={16} color="#22C55E" strokeWidth={2.25} />;
}

export default function OrderConfirmScreen({ navigation, route }) {
  const { t, weekdays, months } = useTranslation();
  const dir = useDirection();
  const order = route?.params?.order;

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
  const paymentMethod = order?.paymentMethod || 'COD';
  const isOnlinePayment = ['VISA', 'WALLET'].includes(paymentMethod);

  const animValue = useRef(new Animated.Value(0)).current;
  const pulseValue = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.spring(animValue, {
      toValue: 1,
      friction: 4,
      tension: 40,
      useNativeDriver: true,
    }).start();

    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseValue, { toValue: 0.3, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseValue, { toValue: 1, duration: 800, useNativeDriver: true }),
      ]),
    );
    pulse.start();
    return () => pulse.stop();
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
  const opacity = animValue;

  const timelineSteps = [
    {
      key: 'confirmed',
      label: t('orders.stepConfirmed'),
      done: true,
    },
    {
      key: 'preparing',
      label: t('orders.stepPreparing'),
      done: paymentStatus === 'PAID',
      current: paymentStatus !== 'FAILED' && !(paymentStatus === 'PAID' || paymentStatus === 'REFUNDED'),
    },
    {
      key: 'shipped',
      label: t('orders.stepShipped'),
      done: false,
    },
    {
      key: 'delivered',
      label: t('orders.stepDelivered'),
      done: false,
    },
  ];

  const paymentMethodLabels = {
    VISA: t('orders.methodVisa'),
    WALLET: t('orders.methodWallet'),
    COD: t('orders.methodCod'),
  };

  const handleShareOrder = () => {
    Share.share({ message: `${t('orders.orderNumber')}: ${displayId}\nMawada` });
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

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />

      <View style={styles.hero} onLayout={(e) => { if (!heroSize) setHeroSize(e.nativeEvent.layout); }}>
        {paymentStatus !== 'FAILED' && heroSize && (
          <ConfettiOverlay width={heroSize.width} height={heroSize.height} />
        )}
        <View style={styles.heroBgAccent} />

        <Animated.View style={[styles.heroIconWrap, { opacity, transform: [{ scale }] }]}>
          {paymentStatus === 'FAILED' ? (
            <AlertCircle size={56} color="#EF4444" strokeWidth={1.5} />
          ) : (
            <CheckCircle size={56} color="#22C55E" strokeWidth={1.5} />
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

        <TouchableOpacity style={styles.orderIdCard} onPress={handleShareOrder} activeOpacity={0.8}>
          <View style={styles.orderIdContent}>
            <Ionicons name="share-social-outline" size={14} color="#94A3B8" />
            <Text style={styles.orderIdLabel}>{t('orders.orderNumber')}</Text>
          </View>
          <Text style={styles.orderIdValue} selectable>{displayId}</Text>
        </TouchableOpacity>

        <View style={styles.metaRow}>
          <View style={[styles.paymentTag, isOnlinePayment && styles.paymentTagOnline]}>
            <PaymentIcon method={paymentMethod} />
            <Text style={styles.paymentTagText}>{paymentMethodLabels[paymentMethod] || paymentMethod}</Text>
          </View>
          <View style={[styles.statusTag, paymentStatus === 'PAID' && styles.statusTagPaid, paymentStatus === 'FAILED' && styles.statusTagFailed]}>
            <Text style={[styles.statusTagText, paymentStatus === 'PAID' && styles.statusTagTextPaid, paymentStatus === 'FAILED' && styles.statusTagTextFailed]}>
              {paymentStatus === 'PAID' ? t('orders.confirmPaymentPaid') : paymentStatus === 'FAILED' ? t('orders.confirmPaymentFailed') : paymentStatus === 'UNPAID' ? t('orders.confirmPaymentUnpaid') : t('orders.confirmPaymentPending')}
            </Text>
          </View>
        </View>

        <View style={styles.estimateRow}>
          <Truck size={14} color="rgba(255,255,255,0.5)" strokeWidth={2} />
          <Text style={styles.estimateText}>{t('orders.confirmEstimate', { date: getDeliveryEstimate() })}</Text>
        </View>

        {fawryCode && (
          <View style={styles.fawryBanner}>
            <Text style={styles.fawryBannerTitle}>{t('orderConfirm.fawryBanner')}</Text>
            <Text style={styles.fawryCodeText}>{fawryCode}</Text>
            <Text style={styles.fawryHint}>{t('orderConfirm.fawryHint')}</Text>
          </View>
        )}
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {items.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{t('orders.detail')}</Text>
            {items.map((item, index) => (
              <View key={item.id || index}>
                <View style={styles.itemRow}>
                  <View style={styles.itemQtyBadge}>
                    <Text style={styles.itemQtyText}>×{item.quantity}</Text>
                  </View>
                  <View style={styles.itemInfo}>
                    <Text style={styles.itemTitle} numberOfLines={1}>{item.nameAr || item.products?.nameAr || t('orderConfirm.itemFallback')}</Text>
                    <Text style={styles.itemPrice}>{formatPrice(item.unitPrice)} {t('common.egp')}</Text>
                  </View>
                </View>
                {index < items.length - 1 && <View style={styles.divider} />}
              </View>
            ))}
          </View>
        )}

        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t('orders.costSummary')}</Text>
          <View style={styles.costRow}>
            <Text style={styles.costLabel}>{t('orders.itemsPrice')}</Text>
            <Text style={styles.costValue}>{formatPrice(subtotal)} {t('common.egp')}</Text>
          </View>
          {discount > 0 && (
            <View style={[styles.costRow, styles.discountRow]}>
              <Text style={styles.discountLabel}>{t('common.discount')}</Text>
              <Text style={styles.discountValue}>-{formatPrice(discount)} {t('common.egp')}</Text>
            </View>
          )}
          <View style={styles.costRow}>
            <Text style={styles.costLabel}>{t('orders.delivery')}</Text>
            <Text style={styles.costValue}>{delivery > 0 ? `${formatPrice(delivery)} ${t('common.egp')}` : t('common.free')}</Text>
          </View>
          <View style={styles.totalDivider} />
          <View style={styles.costRow}>
            <Text style={styles.totalLabel}>{t('common.total')}</Text>
            <Text style={styles.totalValue}>{formatPrice(total)} {t('common.egp')}</Text>
          </View>
        </View>

        {address && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{t('orders.address')}</Text>
            <View style={styles.addressRow}>
              <View style={styles.addressIcon}>
                <MapPin size={18} color="#0F172A" strokeWidth={2} />
              </View>
              <View style={styles.addressInfo}>
                <Text style={styles.addressLabel}>{address.label || t('orders.addressFallback')}</Text>
                <Text style={styles.addressDetail}>{address.street}{address.region ? ` - ${address.region}` : ''}</Text>
                {address.phone && (
                  <TouchableOpacity
                    style={styles.phoneBtn}
                    onPress={() => Linking.openURL(`tel:${address.phone}`).catch(() => {})}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="call-outline" size={14} color="#22C55E" />
                    <Text style={styles.phoneText}>+20 {address.phone}</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>
        )}

        <View style={styles.timelineCard}>
          <Text style={styles.cardTitle}>{t('orders.status')}</Text>
          {timelineSteps.map((step, index) => {
            const isLast = index === timelineSteps.length - 1;
            return (
              <View key={step.key} style={styles.timelineStep}>
                <View style={styles.timelineContent}>
                  <Text style={[styles.timelineLabel, step.done && styles.timelineLabelDone, step.current && styles.timelineLabelCurrent]}>
                    {step.label}
                  </Text>
                  {step.done && <Check size={14} color="#22C55E" strokeWidth={3} style={{ marginRight: 6 }} />}
                </View>
                <View style={styles.timelineIndicator}>
                  <View style={[
                    styles.timelineDot,
                    step.done && styles.timelineDotDone,
                    step.current && styles.timelineDotCurrent,
                  ]}>
                    {step.done && <Check size={8} color="#FFFFFF" strokeWidth={4} />}
                  </View>
                  {!isLast && <View style={[
                    styles.timelineConnector,
                    step.done && styles.timelineConnectorDone,
                  ]} />}
                </View>
              </View>
            );
          })}
        </View>

        {paymentStatus === 'FAILED' ? (
          <>
            <TouchableOpacity style={styles.retryBtn} onPress={handleRetry} activeOpacity={0.85}>
              <Text style={styles.retryBtnText}>{t('orders.confirmRetry')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.supportLink} onPress={() => navigation.navigate('Chat')} activeOpacity={0.7}>
              <Text style={styles.supportLinkText}>{t('orders.confirmSupport')}</Text>
            </TouchableOpacity>
            <Button
              title={t('orders.confirmHome')}
              onPress={() => navigation.reset({ index: 0, routes: [{ name: 'Home' }] })}
              fullWidth
              style={styles.primaryBtn}
            />
          </>
        ) : (
          <>
            <Button
              title={t('orders.track')}
              onPress={handleNavigateOrders}
              fullWidth
              style={styles.primaryBtn}
            />
            <TouchableOpacity style={styles.outlineBtn} onPress={() => navigation.reset({ index: 0, routes: [{ name: 'Home' }] })} activeOpacity={0.85}>
              <Text style={styles.outlineBtnText}>{t('orders.confirmHome')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.shareLinkBtn} onPress={handleShareOrder} activeOpacity={0.7}>
              <Ionicons name="share-social-outline" size={16} color="#64748B" />
              <Text style={styles.shareLinkText}>{t('orders.confirmShare')}</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F8FAFC' },

  hero: {
    backgroundColor: '#0F172A',
    paddingTop: 60,
    paddingBottom: 28,
    paddingHorizontal: 24,
    alignItems: 'center',
    overflow: 'hidden',
  },
  heroBgAccent: {
    position: 'absolute',
    top: -80,
    right: -40,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  heroIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(34, 197, 94, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  heroTitle: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 6,
    letterSpacing: -0.2,
  },
  heroSubtitle: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  orderIdCard: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  orderIdContent: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
    marginLeft: 12,
  },
  orderIdLabel: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 12,
    fontWeight: '600',
  },
  orderIdValue: {
    color: '#38BDF8',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.5,
    fontFamily: 'monospace',
  },
  metaRow: {
    flexDirection: 'row-reverse',
    gap: 8,
    marginBottom: 12,
  },
  paymentTag: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(34, 197, 94, 0.12)',
    borderRadius: 10,
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
  paymentTagOnline: {
    backgroundColor: 'rgba(34, 197, 94, 0.12)',
  },
  paymentTagText: {
    color: '#22C55E',
    fontSize: 12,
    fontWeight: '700',
  },
  statusTag: {
    borderRadius: 10,
    paddingVertical: 5,
    paddingHorizontal: 10,
    backgroundColor: 'rgba(251, 191, 36, 0.15)',
  },
  statusTagPaid: {
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
  },
  statusTagFailed: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
  },
  statusTagText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#F59E0B',
  },
  statusTagTextPaid: {
    color: '#22C55E',
  },
  statusTagTextFailed: {
    color: '#EF4444',
  },
  estimateRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
  },
  estimateText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
    fontWeight: '500',
  },

  fawryBanner: {
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
    borderRadius: 16,
    padding: 16,
    marginTop: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)',
    width: '100%',
  },
  fawryBannerTitle: { color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: '600', marginBottom: 6 },
  fawryCodeText: { color: '#38BDF8', fontSize: 24, fontWeight: '800', letterSpacing: 2, marginBottom: 4 },
  fawryHint: { color: 'rgba(255,255,255,0.4)', fontSize: 11, textAlign: 'center' },

  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 40 },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    textAlign: 'right',
    marginBottom: 14,
  },

  itemRow: { flexDirection: 'row-reverse', alignItems: 'center', paddingVertical: 10 },
  itemInfo: { flex: 1, alignItems: 'flex-end' },
  itemTitle: { fontSize: 14, fontWeight: '600', color: '#334155', textAlign: 'right' },
  itemPrice: { fontSize: 13, color: '#EF4444', fontWeight: '700', marginTop: 2 },
  itemQtyBadge: {
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginLeft: 8,
    minWidth: 30,
    alignItems: 'center',
  },
  itemQtyText: { fontSize: 12, fontWeight: '700', color: '#64748B' },
  divider: { height: 1, backgroundColor: '#F1F5F9' },

  costRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginVertical: 5 },
  costLabel: { fontSize: 14, color: '#64748B' },
  costValue: { fontSize: 14, color: '#334155', fontWeight: '600' },
  discountRow: {},
  discountLabel: { fontSize: 14, color: '#22C55E', fontWeight: '600' },
  discountValue: { fontSize: 14, color: '#22C55E', fontWeight: '700' },
  totalDivider: { height: 1, backgroundColor: '#E2E8F0', marginVertical: 10 },
  totalLabel: { fontSize: 16, fontWeight: '700', color: '#0F172A' },
  totalValue: { fontSize: 20, fontWeight: '800', color: '#EF4444' },

  addressRow: { flexDirection: 'row-reverse', alignItems: 'flex-start' },
  addressIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  addressInfo: { flex: 1, alignItems: 'flex-end' },
  addressLabel: { fontSize: 15, fontWeight: '700', color: '#0F172A', textAlign: 'right', marginBottom: 2 },
  addressDetail: { fontSize: 13, color: '#64748B', textAlign: 'right', lineHeight: 18 },
  phoneBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
    backgroundColor: '#F0FDF4',
    borderRadius: 8,
    paddingVertical: 4,
    paddingHorizontal: 10,
    alignSelf: 'flex-start',
  },
  phoneText: { fontSize: 12, color: '#22C55E', fontWeight: '600' },

  timelineCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 2,
  },
  timelineStep: {
    flexDirection: 'row-reverse',
    alignItems: 'flex-start',
    minHeight: 56,
  },
  timelineIndicator: {
    width: 28,
    alignItems: 'center',
    marginRight: 12,
  },
  timelineDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#CBD5E1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  timelineDotDone: {
    backgroundColor: '#22C55E',
    shadowColor: '#22C55E',
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 3,
  },
  timelineDotCurrent: {
    backgroundColor: '#F59E0B',
    shadowColor: '#F59E0B',
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 3,
  },
  timelineConnector: {
    width: 2,
    flex: 1,
    minHeight: 32,
    backgroundColor: '#E2E8F0',
  },
  timelineConnectorDone: {
    backgroundColor: '#22C55E',
  },
  timelineContent: {
    flex: 1,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingTop: 2,
    minHeight: 20,
  },
  timelineLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#94A3B8',
    textAlign: 'right',
  },
  timelineLabelDone: {
    color: '#334155',
    fontWeight: '700',
  },
  timelineLabelCurrent: {
    color: '#0F172A',
    fontWeight: '700',
  },

  retryBtn: {
    backgroundColor: '#0F172A',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  retryBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  supportLink: {
    alignItems: 'center',
    paddingVertical: 12,
    marginBottom: 4,
  },
  supportLinkText: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '600',
  },
  primaryBtn: {
    marginBottom: 0,
  },
  outlineBtn: {
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  outlineBtnText: {
    color: '#0F172A',
    fontSize: 15,
    fontWeight: '700',
  },
  shareLinkBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    marginTop: 2,
  },
  shareLinkText: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '600',
  },
});
