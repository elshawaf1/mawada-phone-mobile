import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Share,
  Linking,
  Alert,
  Modal,
} from 'react-native';
import { CheckCircle, AlertCircle, Banknote, CreditCard, Wallet, Truck, MapPin, Check, Camera } from 'lucide-react-native';
import { Ionicons } from '@expo/vector-icons';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import Button from '../components/Button';
import { supabase, supabaseUrl } from '../services/supabase';
import { useTranslation } from '../context/AppSettingsContext';

const formatPrice = (n) => Number(n || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');

function PaymentIcon({ method }) {
  if (method === 'VISA') return <CreditCard size={14} color="#22C55E" strokeWidth={2.25} />;
  if (method === 'WALLET') return <Wallet size={14} color="#22C55E" strokeWidth={2.25} />;
  return <Banknote size={14} color="#22C55E" strokeWidth={2.25} />;
}

export default function OrderConfirmScreen({ navigation, route }) {
  const { t, weekdays, months } = useTranslation();
  const order = route?.params?.order;
  const captureRef2 = useRef(null);

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
  const [capturing, setCapturing] = useState(false);
  const paymentMethod = order?.paymentMethod || 'COD';

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

  // Safety net: verify payment with Paymob API if status is not yet PAID
  useEffect(() => {
    if (!order?.id || paymentMethod === 'COD') return;
    if (paymentStatus === 'PAID' || paymentStatus === 'FAILED') return;

    const verifyPayment = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token || '';
        const res = await fetch(`${supabaseUrl}/functions/v1/paymob-verify`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ orderId: order.id }),
        });
        const data = await res.json();
        console.log('[OrderConfirm] verify result:', data?.status);
        if (data?.status === 'PAID') {
          setPaymentStatus('PAID');
        } else if (data?.status === 'FAILED') {
          setPaymentStatus('FAILED');
        }
      } catch (err) {
        console.error('[OrderConfirm] verify error:', err);
      }
    };

    verifyPayment();
  }, [order?.id, paymentMethod, paymentStatus]);

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
    setCapturing(true);
  };

  const doCapture = async () => {
    await new Promise((r) => setTimeout(r, 400));
    if (!captureRef2.current) { setCapturing(false); return; }
    try {
      const uri = await captureRef(captureRef2, { format: 'png', quality: 1, result: 'tmpfile' });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri);
      } else {
        await Share.share({ url: uri });
      }
    } catch (err) {
      console.warn('Screenshot error:', err);
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

  const renderContent = () => (
    <>
      {/* Header */}
      <View style={styles.header}>
        {paymentStatus === 'FAILED' ? (
          <View style={[styles.iconWrap, styles.iconWrapFailed]}>
            <AlertCircle size={40} color="#EF4444" strokeWidth={1.5} />
          </View>
        ) : (
          <View style={[styles.iconWrap, styles.iconWrapSuccess]}>
            <CheckCircle size={40} color="#22C55E" strokeWidth={1.5} />
          </View>
        )}
        <Text style={styles.headerTitle}>
          {paymentStatus === 'FAILED' ? t('orders.confirmFailedTitle') : t('orders.confirmSuccessTitle')}
        </Text>
        <Text style={styles.headerSubtitle}>
          {paymentStatus === 'FAILED'
            ? t('orders.confirmFailedSub')
            : paymentMethod === 'COD'
              ? t('orders.confirmCodSub')
              : paymentStatus === 'PAID'
                ? t('orders.confirmPaidSub')
                : t('orders.confirmPendingSub')}
        </Text>

        <TouchableOpacity style={styles.orderIdRow} onPress={handleShareOrder} activeOpacity={0.8}>
          <Ionicons name="copy-outline" size={13} color="#38BDF8" />
          <Text style={styles.orderIdText} selectable>{displayId}</Text>
        </TouchableOpacity>

        <View style={styles.metaRow}>
          <View style={styles.metaTag}>
            <PaymentIcon method={paymentMethod} />
            <Text style={styles.metaTagText}>{paymentMethodLabels[paymentMethod] || paymentMethod}</Text>
          </View>
          <View style={styles.metaDot} />
          <View style={styles.metaTag}>
            <Truck size={12} color="#94A3B8" strokeWidth={2} />
            <Text style={styles.metaTagText}>{t('orders.confirmEstimate', { date: getDeliveryEstimate() })}</Text>
          </View>
        </View>
      </View>

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

      {/* Fawry */}
      {fawryCode && (
        <View style={styles.fawryCard}>
          <Text style={styles.fawryLabel}>{t('orderConfirm.fawryBanner')}</Text>
          <Text style={styles.fawryCode}>{fawryCode}</Text>
          <Text style={styles.fawryHint}>{t('orderConfirm.fawryHint')}</Text>
        </View>
      )}

      {/* Unified Card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t('orders.detail')}</Text>
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

        <View style={styles.costDivider} />

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
          <Text style={styles.cardTitle}>{t('orders.address')}</Text>
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
    </>
  );

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {renderContent()}
      </ScrollView>

      {/* Capture Modal - renders outside normal layout, unconstrained */}
      <Modal visible={capturing} transparent={false} animationType="none" statusBarTranslucent>
        <View style={styles.captureModal}>
          <View ref={captureRef2} style={styles.captureView} onLayout={() => doCapture()}>
            {renderContent()}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F8FAFC' },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 40 },

  captureModal: { flex: 1, backgroundColor: '#F8FAFC' },
  captureView: { backgroundColor: '#F8FAFC', padding: 16 },

  /* ── Header ── */
  header: { alignItems: 'center', paddingTop: 12, paddingBottom: 18 },
  iconWrap: {
    width: 72, height: 72, borderRadius: 36,
    justifyContent: 'center', alignItems: 'center', marginBottom: 12,
  },
  iconWrapSuccess: { backgroundColor: '#DCFCE7' },
  iconWrapFailed: { backgroundColor: '#FEE2E2' },
  headerTitle: {
    color: '#0F172A', fontSize: 22, fontWeight: '800',
    textAlign: 'center', marginBottom: 4, letterSpacing: -0.3,
  },
  headerSubtitle: {
    color: '#64748B', fontSize: 13,
    textAlign: 'center', marginBottom: 16, lineHeight: 18,
  },
  orderIdRow: {
    flexDirection: 'row-reverse', alignItems: 'center', gap: 6,
    backgroundColor: '#F1F5F9',
    borderRadius: 20, paddingVertical: 7, paddingHorizontal: 14,
    marginBottom: 12,
  },
  orderIdText: {
    color: '#38BDF8', fontSize: 14, fontWeight: '700',
    fontFamily: 'monospace', letterSpacing: 0.5,
  },
  metaRow: {
    flexDirection: 'row-reverse', alignItems: 'center', gap: 8,
  },
  metaTag: {
    flexDirection: 'row-reverse', alignItems: 'center', gap: 5,
  },
  metaTagText: { color: '#94A3B8', fontSize: 11, fontWeight: '500' },
  metaDot: {
    width: 3, height: 3, borderRadius: 1.5, backgroundColor: '#CBD5E1',
  },

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
  stepCircleDone: { backgroundColor: '#22C55E' },
  stepCircleActive: {
    backgroundColor: '#FFF', borderWidth: 2.5, borderColor: '#F59E0B',
  },
  stepInnerDot: { width: 9, height: 9, borderRadius: 4.5, backgroundColor: '#F59E0B' },
  stepLine: { flex: 1, height: 2, backgroundColor: '#E2E8F0', marginTop: 14, marginHorizontal: -2, borderRadius: 1 },
  stepLineDone: { backgroundColor: '#22C55E' },
  stepLabel: { fontSize: 9, fontWeight: '600', color: '#94A3B8', textAlign: 'center' },
  stepLabelDone: { color: '#22C55E' },
  stepLabelActive: { color: '#F59E0B', fontWeight: '700' },

  /* ── Fawry ── */
  fawryCard: {
    backgroundColor: '#EFF6FF', borderRadius: 14, padding: 14, marginBottom: 12,
    alignItems: 'center', borderWidth: 1, borderColor: '#BFDBFE',
  },
  fawryLabel: { color: '#64748B', fontSize: 11, fontWeight: '600', marginBottom: 4 },
  fawryCode: { color: '#2563EB', fontSize: 22, fontWeight: '800', letterSpacing: 2, marginBottom: 2 },
  fawryHint: { color: '#94A3B8', fontSize: 10, textAlign: 'center' },

  /* ── Card ── */
  card: {
    backgroundColor: '#FFF', borderRadius: 20, padding: 18, marginBottom: 12,
    shadowColor: '#000', shadowOpacity: 0.03, shadowOffset: { width: 0, height: 2 }, shadowRadius: 8, elevation: 1,
  },
  cardTitle: {
    fontSize: 14, fontWeight: '700', color: '#0F172A', textAlign: 'right', marginBottom: 12,
  },
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

  costDivider: { height: StyleSheet.hairlineWidth, backgroundColor: '#F1F5F9', marginVertical: 10 },
  costRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginVertical: 3 },
  costLabel: { fontSize: 13, color: '#64748B' },
  costValue: { fontSize: 13, color: '#334155', fontWeight: '600' },
  costLabelGreen: { fontSize: 13, color: '#22C55E', fontWeight: '600' },
  costValueGreen: { fontSize: 13, color: '#22C55E', fontWeight: '700' },
  totalLabel: { fontSize: 15, fontWeight: '700', color: '#0F172A' },
  totalValue: { fontSize: 18, fontWeight: '800', color: '#0F172A' },

  /* ── Address ── */
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
