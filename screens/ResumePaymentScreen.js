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
  AppState,
} from 'react-native';
import { ChevronLeft, Lock } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Paymob, { PaymentStatus } from 'paymob-reactnative';
import { useTranslation } from '../context/AppSettingsContext';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { db } from '../services/api';
import { supabase, supabaseUrl } from '../services/supabase';
import { COLORS } from '../constants';
import { useDirection } from '../hooks/useDirection';

const PAYMOB_PUBLIC_KEY = process.env.EXPO_PUBLIC_PAYMOB_PUBLIC_KEY || 'egy_pk_test_HSbekPvBcPJ9igAPXm0xJp0cVRvPa0pT';
const POLL_INTERVAL = 3000;
const POLL_MAX_ATTEMPTS = 20;
const CARD_INTEGRATION_ID = process.env.EXPO_PUBLIC_PAYMOB_CARD_INTEGRATION_ID || '5252066';
const WALLET_INTEGRATION_ID = process.env.EXPO_PUBLIC_PAYMOB_WALLET_INTEGRATION_ID || '5744962';

const formatPrice = (n) => Number(n || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');

const isPayable = (order) =>
  order.paymentMethod !== 'COD' &&
  ['PENDING', 'UNPAID', 'FAILED'].includes(order.paymentStatus) &&
  order.status === 'PENDING';

export default function ResumePaymentScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { t } = useTranslation();
  const { clearCart: clearAppCart } = useApp();
  const orderId = route?.params?.orderId;
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const dir = useDirection();
  const sdkCallbackFired = useRef(false);
  const pollTimer = useRef(null);
  const navigatedRef = useRef(false);
  const appStateRef = useRef(AppState.currentState);
  const mountedRef = useRef(true);
  const orderDataRef = useRef(null);
  const pollingStarted = useRef(false);
  const lastForegroundVerifyRef = useRef(0);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    return () => {
      if (pollTimer.current) clearTimeout(pollTimer.current);
      Paymob.removeSdkListener();
    };
  }, []);

  const handleAppStateChange = useCallback(async (nextState) => {
    const prev = appStateRef.current;
    appStateRef.current = nextState;
    if (prev.match(/background|inactive/) && nextState === 'active') {
      const now = Date.now();
      if (now - lastForegroundVerifyRef.current < 3000) return;
      lastForegroundVerifyRef.current = now;
      const od = orderDataRef.current;
      if (!navigatedRef.current && od?.orderId) {
        const serverStatus = await verifyWithServer(od.orderId);
        if (serverStatus === 'PAID' && !navigatedRef.current) {
          navigateToSuccess();
          return;
        }
        checkOrderStatus();
        if (!pollingStarted.current) {
          startPolling();
        }
      }
    }
  }, [checkOrderStatus, startPolling, verifyWithServer, navigateToSuccess]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', handleAppStateChange);
    return () => sub?.remove?.();
  }, [handleAppStateChange]);

  const navigateToSuccess = useCallback(async () => {
    if (navigatedRef.current) return;
    navigatedRef.current = true;
    const od = orderDataRef.current;
    if (!od) return;
    try {
      await db.clearCart(user.id);
      clearAppCart();
    } catch (e) {}
    navigation.reset({
      index: 0,
      routes: [{ name: 'OrderConfirm', params: { order: { ...od, paymentStatus: 'PAID' } } }],
    });
  }, [navigation, user]);

  const verifyWithServer = useCallback(async (orderIdToVerify) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || '';
      const res = await fetch(`${supabaseUrl}/functions/v1/paymob-verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ orderId: orderIdToVerify }),
      });
      const data = await res.json();
      console.log('[Paymob] Resume verifyWithServer result:', JSON.stringify(data));
      return data?.status || null;
    } catch (err) {
      console.error('[Paymob] Resume verifyWithServer error:', err);
      return null;
    }
  }, []);

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
        navigateToSuccess();
        return true;
      }
      if (data?.paymentStatus === 'FAILED') {
        Alert.alert(t('payment.paymentFailed'), t('payment.retryPayment'));
        return true;
      }
      return false;
    } catch { return false; }
  }, [navigateToSuccess, t]);

  const startPolling = useCallback(() => {
    if (pollingStarted.current && pollTimer.current) return;
    pollingStarted.current = true;
    const doPoll = async (attempt) => {
      if (!mountedRef.current || navigatedRef.current) return;
      if (attempt >= POLL_MAX_ATTEMPTS) {
        setProcessing(false);
        return;
      }
      const od = orderDataRef.current;
      if (!od?.orderId) return;

      // Actively ask server to verify with Paymob API (bypasses broken webhook)
      if (attempt % 2 === 0) {
        const serverStatus = await verifyWithServer(od.orderId);
        if (serverStatus === 'PAID') {
          navigateToSuccess();
          return;
        }
        if (serverStatus === 'FAILED') {
          Alert.alert(t('payment.paymentFailed'), t('payment.retryPayment'));
          return;
        }
      }

      const found = await checkOrderStatus();
      if (!found && mountedRef.current && !navigatedRef.current) {
        pollTimer.current = setTimeout(() => doPoll(attempt + 1), POLL_INTERVAL);
      }
    };
    pollTimer.current = setTimeout(() => doPoll(0), 2000);
  }, [checkOrderStatus, verifyWithServer, navigateToSuccess, t]);

  const PAYMENT_METHOD_LABELS = useMemo(() => ({
    VISA: t('orders.methodVisa'),
    WALLET: t('orders.methodWallet'),
    COD: t('orders.methodCod'),
    INSTAPAY: t('payment.instapay'),
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
          const newStatus = payload.new?.paymentStatus;
          if (newStatus === 'PAID' && !navigatedRef.current) {
            navigateToSuccess();
          }
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [orderId, navigateToSuccess]);

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

      const integrationId = order.paymentMethod === 'VISA'
        ? CARD_INTEGRATION_ID
        : order.paymentMethod === 'WALLET'
          ? WALLET_INTEGRATION_ID
          : null;

      const paymentMethodIds = isOnline && integrationId
        ? [parseInt(integrationId)]
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
        pollingStarted.current = false;

        if (pollTimer.current) { clearTimeout(pollTimer.current); pollTimer.current = null; }

        Paymob.setAppName('Mawada Phone');
        Paymob.setShowSaveCard(true);
        Paymob.setSaveCardDefault(false);
        Paymob.setShowConfirmationPage(false);
        Paymob.setShowTransactionResult(false);

        Paymob.setSdkListener(async (response) => {
          console.log('[Paymob] Resume SDK callback:', JSON.stringify(response));
          sdkCallbackFired.current = true;
          const status = response?.status || response;
          console.log('[Paymob] Resume status:', status);

          if (status === PaymentStatus.SUCCESS) {
            console.log('[Paymob] Resume SDK SUCCESS — verifying with Paymob API');
            const serverStatus = await verifyWithServer(order.id);
            if (serverStatus === 'PAID') {
              navigateToSuccess();
            } else {
              console.log('[Paymob] After Resume SUCCESS verify, status:', serverStatus, '— polling');
              if (!pollingStarted.current) {
                pollingStarted.current = true;
                startPolling();
              }
            }
          } else {
            console.log('[Paymob] Resume SDK not SUCCESS — verifying via server');
            const serverStatus = await verifyWithServer(order.id);
            if (serverStatus === 'PAID') {
              navigateToSuccess();
            } else if (serverStatus === 'FAILED') {
              Alert.alert(t('payment.paymentFailed'), t('payment.retryPayment'));
            } else {
              if (!pollingStarted.current) {
                pollingStarted.current = true;
                startPolling();
              }
            }
          }
        });

        try {
          Paymob.presentPayVC(data.clientSecret, PAYMOB_PUBLIC_KEY);
          if (!pollingStarted.current) {
            pollingStarted.current = true;
            console.log('[Paymob] Resume: starting immediate polling fallback');
            pollTimer.current = setTimeout(() => {
              if (mountedRef.current && !navigatedRef.current) {
                startPolling();
              }
            }, 5000);
          }
        } catch (err) {
          console.error('[Paymob] Resume presentPayVC error:', err);
          setProcessing(false);
          Alert.alert(t('common.error'), t('payment.paymentInitFailed'));
        }
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
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, height: 44,
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
  orderNumber: { fontSize: 16, fontWeight: '800', color: '#0F172A', fontFamily: 'monospace', textAlign: 'left', marginTop: 4 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 },
  metaValue: { fontSize: 13, fontWeight: '600', color: '#0F172A' },
  totalValue: { fontSize: 20, fontWeight: '800', color: '#0F172A' },
  divider: { height: 1, backgroundColor: '#F1F5F9', marginVertical: 12 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  paymentBadge: { backgroundColor: '#FEF3C7' },
  badgeText: { fontSize: 11, fontWeight: '700', color: '#92400E' },
  itemsHint: { fontSize: 12, color: '#94A3B8', textAlign: 'left', marginTop: 12 },
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
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#0F172A', borderRadius: 16, paddingVertical: 14,
  },
  payButtonDisabled: { opacity: 0.5 },
  payButtonText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
