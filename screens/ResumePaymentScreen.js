import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StatusBar,
  Animated,
  AppState,
} from 'react-native';
import { ChevronLeft, Lock, Banknote, CheckCircle2, XCircle, Clock, CreditCard, Smartphone, Loader } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Paymob, { PaymentStatus } from 'paymob-reactnative';
import { useTranslation } from '../context/AppSettingsContext';
import { useAuth } from '../context/AuthContext';
import { db } from '../services/api';
import { supabase, supabaseUrl } from '../services/supabase';
import { COLORS } from '../constants';
import { useDirection } from '../hooks/useDirection';

const PAYMOB_PUBLIC_KEY = process.env.EXPO_PUBLIC_PAYMOB_PUBLIC_KEY || '';
const POLL_INTERVAL = 2000;
const POLL_MAX_ATTEMPTS = 8;

const formatPrice = (n) => Number(n || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');

const isPayable = (order) =>
  order.paymentMethod !== 'COD' &&
  ['PENDING', 'UNPAID', 'FAILED'].includes(order.paymentStatus) &&
  order.status === 'PENDING';

export default function ResumePaymentScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { t } = useTranslation();
  const orderId = route?.params?.orderId;
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const dir = useDirection();

  const [sdkPhase, setSdkPhase] = useState(null);
  const [sdkPollCount, setSdkPollCount] = useState(0);
  const sdkCallbackFired = useRef(false);
  const pollTimer = useRef(null);
  const navigatedRef = useRef(false);
  const appStateRef = useRef(AppState.currentState);
  const mountedRef = useRef(true);
  const orderDataRef = useRef(null);
  const listenerSet = useRef(false);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    if (sdkPhase === 'processing') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 0.3, duration: 900, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [sdkPhase]);

  useEffect(() => {
    return () => {
      if (pollTimer.current) clearTimeout(pollTimer.current);
      Paymob.removeSdkListener();
    };
  }, []);

  const handleAppStateChange = useCallback((nextState) => {
    const prev = appStateRef.current;
    appStateRef.current = nextState;
    if (prev.match(/background|inactive/) && nextState === 'active') {
      if (!sdkCallbackFired.current && !navigatedRef.current) {
        startPolling();
      }
    }
  }, []);

  useEffect(() => {
    const sub = AppState.addEventListener('change', handleAppStateChange);
    return () => sub?.remove?.();
  }, [handleAppStateChange]);

  const navigateToSuccess = useCallback(() => {
    if (navigatedRef.current) return;
    navigatedRef.current = true;
    const od = orderDataRef.current;
    if (!od) return;
    setTimeout(() => {
      navigation.reset({
        index: 0,
        routes: [{ name: 'OrderConfirm', params: { order: { ...od, paymentStatus: 'PAID' } } }],
      });
    }, 2000);
  }, [navigation]);

  const checkOrderStatus = useCallback(async () => {
    const od = orderDataRef.current;
    if (!od?.orderId || navigatedRef.current) return false;
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('paymentStatus')
        .eq('id', od.orderId)
        .single();
      if (error) return false;
      if (data?.paymentStatus === 'PAID') {
        setSdkPhase('success');
        navigateToSuccess();
        return true;
      }
      if (data?.paymentStatus === 'FAILED') {
        setSdkPhase('error');
        return true;
      }
      return false;
    } catch { return false; }
  }, [navigateToSuccess]);

  const startPolling = useCallback(() => {
    setSdkPollCount(0);
    const doPoll = async (attempt) => {
      if (!mountedRef.current || navigatedRef.current) return;
      if (attempt >= POLL_MAX_ATTEMPTS) {
        setSdkPhase('pending_final');
        return;
      }
      setSdkPollCount(attempt + 1);
      const found = await checkOrderStatus();
      if (!found && mountedRef.current && !navigatedRef.current) {
        pollTimer.current = setTimeout(() => doPoll(attempt + 1), POLL_INTERVAL);
      }
    };
    pollTimer.current = setTimeout(() => doPoll(0), 1500);
  }, [checkOrderStatus]);

  const PAYMENT_METHOD_LABELS = useMemo(() => ({
    VISA: t('orders.methodVisa'),
    WALLET: t('orders.methodWallet'),
    COD: t('orders.methodCod'),
    BRANCH: t('orders.methodBranch'),
  }), [t]);

  const PAYMENT_STATUS_LABELS = useMemo(() => ({
    PENDING: t('orders.payPending'),
    UNPAID: t('orders.payUnpaid'),
    PAID: t('orders.payPaid'),
    FAILED: t('orders.payFailed'),
    REFUNDED: t('orders.payRefunded'),
  }), [t]);

  const fetchOrder = async () => {
    if (!orderId) return;
    try {
      const data = await db.getOrder(orderId, user?.id);
      setOrder(data);
    } catch (error) {
      console.error('Error fetching order:', error);
      Alert.alert(t('common.error'), t('resumePayment.fetchFailed'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrder();
  }, [orderId]);

  useEffect(() => {
    if (!orderId) return;
    const channel = supabase
      .channel(`resume-order-${orderId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'orders', filter: `id=eq.${orderId}` },
        (payload) => {
          setOrder((prev) => (prev ? { ...prev, ...payload.new } : prev));
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [orderId]);

  const handlePay = async () => {
    if (!order) {
      Alert.alert(t('common.error'), t('resumePayment.noOrder'));
      return;
    }
    if (!user?.id) {
      Alert.alert(t('auth.login'), t('auth.mustLogin'));
      return;
    }

    setProcessing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || '';

      const isOnline = order.paymentMethod !== 'COD';

      const integrationIdKey = order.paymentMethod === 'VISA'
        ? 'EXPO_PUBLIC_PAYMOB_CARD_INTEGRATION_ID'
        : order.paymentMethod === 'WALLET'
          ? 'EXPO_PUBLIC_PAYMOB_WALLET_INTEGRATION_ID'
          : order.paymentMethod === 'VALU'
            ? 'EXPO_PUBLIC_PAYMOB_VALU_INTEGRATION_ID'
            : null;

      const paymentMethodIds = isOnline && integrationIdKey
        ? [parseInt(process.env[integrationIdKey])]
        : [];

      const edgeBody = {
        existingOrderNumber: order?.orderNumber || null,
        existingOrderId: orderId,
        paymentMethod: isOnline ? order.paymentMethod : 'COD',
        paymentMethodIds,
        userId: user.id,
      };

      const res = await fetch(`${supabaseUrl}/functions/v1/paymob-intent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(edgeBody),
      });

      const data = await res.json();
      if (!res.ok || data?.error) {
        setProcessing(false);
        Alert.alert(t('common.error'), data?.error || data?.message || t('resumePayment.codConfirmFailed'));
        return;
      }

      setProcessing(false);

      if (isOnline && data?.clientSecret) {
        const od = {
          clientSecret: data.clientSecret,
          orderId: order.id,
          orderNumber: order.orderNumber,
          paymentMethod: order.paymentMethod,
          subtotal: order.subtotal,
          shippingCost: order.shippingCost,
          discount: order.discount,
          total: order.total,
          order_items: order.order_items || [],
        };
        orderDataRef.current = od;
        sdkCallbackFired.current = false;
        navigatedRef.current = false;
        setSdkPhase('processing');

        Paymob.setAppName('Mawada Phone');
        Paymob.setShowSaveCard(true);
        Paymob.setSaveCardDefault(false);

        if (!listenerSet.current) {
          listenerSet.current = true;
          Paymob.setSdkListener((response) => {
            sdkCallbackFired.current = true;
            const status = response?.status || response;
            if (status === PaymentStatus.SUCCESS) {
              setSdkPhase('success');
              navigateToSuccess();
            } else if (status === PaymentStatus.PENDING) {
              setSdkPhase('pending_checking');
              startPolling();
            } else if (status === PaymentStatus.FAIL) {
              setSdkPhase('error');
            } else {
              setSdkPhase('pending_checking');
              startPolling();
            }
          });
        }

        setTimeout(() => {
          if (mountedRef.current && !sdkCallbackFired.current) {
            try { Paymob.presentPayVC(data.clientSecret, PAYMOB_PUBLIC_KEY); }
            catch (err) { setSdkPhase('error'); }
          }
        }, 500);
      } else {
        const refetched = await db.getOrder(orderId).catch(() => null);
        const orderForConfirm = refetched || {
          ...order,
          paymentMethod: 'COD',
          paymentStatus: 'UNPAID',
        };
        navigation.reset({
          index: 0,
          routes: [{ name: 'OrderConfirm', params: { order: orderForConfirm } }],
        });
      }
    } catch (error) {
      setProcessing(false);
      console.error('Resume payment error:', error);
      Alert.alert(t('common.error'), t('resumePayment.codConfirmError'));
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />
        <Header onBack={() => navigation.goBack()} insets={insets} t={t} />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#0F172A" />
        </View>
      </View>
    );
  }

  if (!order) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />
        <Header onBack={() => navigation.goBack()} insets={insets} t={t} />
        <View style={styles.centered}>
          <Text style={styles.errorText}>{t('resumePayment.notFound')}</Text>
        </View>
      </View>
    );
  }

  const payable = isPayable(order);
  const isCancelled = order.status === 'CANCELLED';
  const items = order.order_items || [];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <Header onBack={() => navigation.goBack()} insets={insets} t={t} />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>{t('orders.orderNumber')}</Text>
          <Text style={[styles.orderNumber, { textAlign: dir.textAlign }]}>{order.orderNumber}</Text>
          <View style={styles.divider} />
          <View style={[styles.row, { flexDirection: dir.row }]}>
            <Text style={styles.totalValue}>{formatPrice(order.total)} {t('common.egp')}</Text>
            <Text style={styles.summaryLabel}>{t('resumePayment.totalDue')}</Text>
          </View>
          <View style={[styles.row, { flexDirection: dir.row }]}>
            <Text style={styles.metaValue}>{PAYMENT_METHOD_LABELS[order.paymentMethod] || order.paymentMethod}</Text>
            <Text style={styles.summaryLabel}>{t('resumePayment.previousMethod')}</Text>
          </View>
          <View style={[styles.row, { flexDirection: dir.row }]}>
            <View style={[styles.badge, styles.paymentBadge]}>
              <Text style={styles.badgeText}>{PAYMENT_STATUS_LABELS[order.paymentStatus] || order.paymentStatus}</Text>
            </View>
            <Text style={styles.summaryLabel}>{t('orders.paymentStatus')}</Text>
          </View>
          {items.length > 0 && (
            <Text style={[styles.itemsHint, { textAlign: dir.textAlign }]}>{t('resumePayment.itemsHint', { count: items.length })}</Text>
          )}
        </View>

        {isCancelled && (
          <View style={styles.cancelledBanner}>
            <Text style={styles.cancelledText}>{t('resumePayment.cancelledBanner')}</Text>
          </View>
        )}

        {!isCancelled && !payable && (
          <View style={styles.infoBanner}>
            <Text style={styles.infoText}>{t('resumePayment.infoBanner')}</Text>
          </View>
        )}

        {processing && (
          <View style={styles.processingOverlay}>
            <ActivityIndicator size="large" color="#0F172A" />
            <Text style={styles.processingText}>{t('resumePayment.processing')}</Text>
          </View>
        )}
      </ScrollView>

      {payable && !isCancelled && (
        <View style={[styles.bottomCta, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          <TouchableOpacity
            style={[styles.payButton, { flexDirection: dir.row }, processing && styles.payButtonDisabled]}
            activeOpacity={0.85}
            onPress={handlePay}
            disabled={processing}
          >
            <Lock size={18} color="#fff" style={{ marginRight: 8 }} />
            <Text style={styles.payButtonText}>{t('resumePayment.payButton')}</Text>
          </TouchableOpacity>
        </View>
      )}

      {sdkPhase && (
        <View style={styles.sdkOverlay}>
          <View style={styles.sdkCard}>
            {sdkPhase === 'processing' && (
              <View style={styles.sdkSC}>
                <View style={styles.sdkRing}>
                  <Animated.View style={[styles.sdkPulse, { opacity: pulseAnim }]} />
                  <View style={styles.sdkIcon}><Smartphone size={28} color="#0F172A" /></View>
                </View>
                <Text style={styles.sdkTitle}>{t('payment.processing')}</Text>
                <Text style={styles.sdkSub}>Paymob SDK</Text>
              </View>
            )}
            {sdkPhase === 'pending_checking' && (
              <View style={styles.sdkSC}>
                <View style={styles.sdkPRing}>
                  <View style={styles.sdkPCirc}>
                    <Animated.View style={{ transform: [{ rotate: pulseAnim.interpolate({ inputRange: [0.3, 1], outputRange: ['0deg', '360deg'] }) }] }}>
                      <Loader size={36} color="#F59E0B" />
                    </Animated.View>
                  </View>
                </View>
                <Text style={styles.sdkPendT}>جَارِي التَّحْقِيق مِن الدَّفْع...</Text>
                <Text style={styles.sdkSub}>({sdkPollCount}/{POLL_MAX_ATTEMPTS})</Text>
              </View>
            )}
            {sdkPhase === 'pending_final' && (
              <View style={styles.sdkSC}>
                <View style={styles.sdkPRing}><View style={styles.sdkPCirc}><Clock size={36} color="#F59E0B" /></View></View>
                <Text style={styles.sdkPendT}>{t('payment.paymentPending')}</Text>
                <TouchableOpacity style={styles.sdkDismissBtn} onPress={() => { navigatedRef.current = false; sdkCallbackFired.current = false; setSdkPhase(null); }} activeOpacity={0.7}>
                  <Text style={styles.sdkDismissText}>تم</Text>
                </TouchableOpacity>
              </View>
            )}
            {sdkPhase === 'success' && (
              <View style={styles.sdkSC}>
                <View style={styles.sdkSRing}><View style={styles.sdkSCirc}><CheckCircle2 size={40} color="#16A34A" /></View></View>
                <Text style={styles.sdkSuccT}>{t('payment.paymentSuccess')}</Text>
              </View>
            )}
            {sdkPhase === 'error' && (
              <View style={styles.sdkSC}>
                <View style={styles.sdkERing}><View style={styles.sdkECirc}><XCircle size={40} color="#DC2626" /></View></View>
                <Text style={styles.sdkErrT}>{t('payment.paymentFailed')}</Text>
                <View style={{ flexDirection: 'row-reverse', gap: 10, marginTop: 8 }}>
                  <TouchableOpacity style={styles.sdkRetryBtn} onPress={() => {
                    navigatedRef.current = false; sdkCallbackFired.current = false;
                    setSdkPollCount(0); setSdkPhase('processing');
                    setTimeout(() => { try { Paymob.presentPayVC(orderDataRef.current?.clientSecret, PAYMOB_PUBLIC_KEY); } catch {} }, 600);
                  }} activeOpacity={0.7}>
                    <CreditCard size={16} color="#fff" /><Text style={styles.sdkRetryT}>{t('payment.retryPayment')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={{ paddingVertical: 10, paddingHorizontal: 16, justifyContent: 'center' }} onPress={() => { navigatedRef.current = false; sdkCallbackFired.current = false; setSdkPhase(null); }} activeOpacity={0.7}>
                    <Text style={{ color: '#64748B', fontSize: 14, fontWeight: '600' }}>{t('common.cancel')}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        </View>
      )}
    </View>
  );
}

function Header({ onBack, insets, t }) {
  const dir = useDirection();
  return (
    <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <View style={[styles.headerContent, { flexDirection: dir.row }]}>
        <TouchableOpacity style={styles.backButton} onPress={onBack} activeOpacity={0.7}>
          <ChevronLeft color={COLORS.text} size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('resumePayment.title')}</Text>
        <View style={styles.spacer} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { fontSize: 14, color: '#94A3B8' },
  header: {
    backgroundColor: '#fff',
    paddingBottom: 12,
    shadowColor: '#000', shadowOpacity: 0.05, shadowOffset: { width: 0, height: 2 }, shadowRadius: 8, elevation: 3,
  },
  headerContent: {
    flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, height: 44,
  },
  backButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '600', color: '#0F172A' },
  spacer: { width: 40 },
  scrollContent: { padding: 16, paddingBottom: 120 },
  summaryCard: {
    backgroundColor: '#fff', borderRadius: 20, padding: 18, marginBottom: 16,
    shadowColor: '#000', shadowOpacity: 0.04, shadowOffset: { width: 0, height: 4 }, shadowRadius: 10, elevation: 2,
  },
  summaryLabel: { fontSize: 13, color: '#64748B' },
  orderNumber: { fontSize: 16, fontWeight: '800', color: '#0F172A', fontFamily: 'monospace', textAlign: 'right', marginTop: 4 },
  row: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 },
  metaValue: { fontSize: 13, fontWeight: '600', color: '#0F172A' },
  totalValue: { fontSize: 20, fontWeight: '800', color: '#0F172A' },
  divider: { height: 1, backgroundColor: '#F1F5F9', marginVertical: 12 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  paymentBadge: { backgroundColor: '#FEF3C7' },
  badgeText: { fontSize: 11, fontWeight: '700', color: '#92400E' },
  itemsHint: { fontSize: 12, color: '#94A3B8', textAlign: 'right', marginTop: 12 },
  cancelledBanner: {
    backgroundColor: '#FEE2E2', borderRadius: 16, padding: 14, marginBottom: 16, alignItems: 'center',
  },
  cancelledText: { color: '#991B1B', fontSize: 14, fontWeight: '700' },
  infoBanner: {
    backgroundColor: '#DBEAFE', borderRadius: 16, padding: 14, marginBottom: 16, alignItems: 'center',
  },
  infoText: { color: '#1E40AF', fontSize: 13, fontWeight: '600', textAlign: 'center' },
  processingOverlay: { alignItems: 'center', paddingVertical: 16, gap: 8 },
  processingText: { fontSize: 14, color: '#64748B', fontWeight: '600' },
  bottomCta: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#F1F5F9',
    padding: 16, paddingTop: 12,
    shadowColor: '#000', shadowOpacity: 0.08, shadowOffset: { width: 0, height: -2 }, shadowRadius: 8, elevation: 4,
  },
  payButton: {
    flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#0F172A', borderRadius: 16, paddingVertical: 14,
  },
  payButtonDisabled: { opacity: 0.5 },
  payButtonText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  sdkOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', zIndex: 100 },
  sdkCard: { backgroundColor: '#fff', borderRadius: 24, padding: 28, marginHorizontal: 24, width: '100%', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.15, shadowOffset: { width: 0, height: 8 }, shadowRadius: 24, elevation: 8 },
  sdkSC: { alignItems: 'center', gap: 12, width: '100%' },
  sdkRing: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' },
  sdkPulse: { ...StyleSheet.absoluteFillObject, borderRadius: 50, backgroundColor: '#E2E8F0' },
  sdkIcon: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  sdkTitle: { fontSize: 17, fontWeight: '700', color: '#0F172A', textAlign: 'center' },
  sdkSub: { fontSize: 12, color: '#94A3B8' },
  sdkPRing: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#FEF3C7', alignItems: 'center', justifyContent: 'center' },
  sdkPCirc: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  sdkPendT: { fontSize: 17, fontWeight: '700', color: '#F59E0B', textAlign: 'center' },
  sdkDismissBtn: { backgroundColor: '#FEF3C7', borderRadius: 20, paddingHorizontal: 20, paddingVertical: 8, marginTop: 4 },
  sdkDismissText: { fontSize: 13, fontWeight: '700', color: '#F59E0B' },
  sdkSRing: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#DCFCE7', alignItems: 'center', justifyContent: 'center' },
  sdkSCirc: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  sdkSuccT: { fontSize: 18, fontWeight: '800', color: '#16A34A', textAlign: 'center' },
  sdkERing: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#FEE2E2', alignItems: 'center', justifyContent: 'center' },
  sdkECirc: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  sdkErrT: { fontSize: 18, fontWeight: '800', color: '#DC2626', textAlign: 'center' },
  sdkRetryBtn: { flexDirection: 'row-reverse', alignItems: 'center', backgroundColor: '#0F172A', borderRadius: 12, paddingVertical: 10, paddingHorizontal: 20, gap: 6 },
  sdkRetryT: { color: '#fff', fontSize: 14, fontWeight: '700' },
});
