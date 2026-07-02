import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Alert,
  StatusBar,
  Animated,
  AppState,
} from 'react-native';
import {
  ChevronLeft,
  Shield,
  CheckCircle2,
  XCircle,
  Clock,
  CreditCard,
  Wallet,
  Banknote,
  Smartphone,
  Loader,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Paymob, { PaymentStatus } from 'paymob-reactnative';
import { useTranslation } from '../context/AppSettingsContext';
import { supabase } from '../services/supabase';

const PAYMOB_PUBLIC_KEY = process.env.EXPO_PUBLIC_PAYMOB_PUBLIC_KEY || 'egy_pk_live_hTSIQc0VJKPmmhilZPcmhPzDwqnstTjJ';

const POLL_INTERVAL = 2000;
const POLL_MAX_ATTEMPTS = 8;

const MethodBadge = ({ type }) => {
  const config = {
    VISA: { icon: CreditCard, label: 'بطاقة ائتمان', color: '#2563EB', bg: '#EFF6FF' },
    WALLET: { icon: Wallet, label: 'مَحْفَظَة إِلِكْتُرُونِيَّة', color: '#7C3AED', bg: '#F5F3FF' },
    COD: { icon: Banknote, label: 'الدَّفْع عِنْدَ الْاسْتِلَام', color: '#16A34A', bg: '#F0FDF4' },
  }[type] || { icon: CreditCard, label: type || '', color: '#64748B', bg: '#F8FAFC' };

  const Icon = config.icon;
  return (
    <View style={[styles.badge, { backgroundColor: config.bg }]}>
      <Icon size={14} color={config.color} />
      <Text style={[styles.badgeText, { color: config.color }]}>{config.label}</Text>
    </View>
  );
};

const StepIndicator = ({ step, total }) => (
  <View style={styles.stepRow}>
    {Array.from({ length: total }, (_, i) => (
      <React.Fragment key={i}>
        <View style={[styles.stepDot, i < step && styles.stepDotActive, i === step && styles.stepDotCurrent]}>
          {i < step ? (
            <Text style={styles.stepCheck}>✓</Text>
          ) : (
            <Text style={[styles.stepNum, i === step && styles.stepNumActive]}>{i + 1}</Text>
          )}
        </View>
        {i < total - 1 && <View style={[styles.stepLine, i < step && styles.stepLineActive]} />}
      </React.Fragment>
    ))}
  </View>
);

export default function PaymobPaymentScreen({ navigation, route }) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { clientSecret, orderId, orderNumber, paymentMethod, order } = route.params || {};

  const [phase, setPhase] = useState('sdk_processing');
  const [result, setResult] = useState(null);
  const [pollCount, setPollCount] = useState(0);

  const listenerSet = useRef(false);
  const pollTimer = useRef(null);
  const sdkCallbackFired = useRef(false);
  const appState = useRef(AppState.currentState);
  const mountedRef = useRef(true);
  const navigatedRef = useRef(false);
  const lastForegroundVerifyRef = useRef(0);

  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    if (phase === 'sdk_processing') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 0.3, duration: 900, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [phase]);

  const navigateToSuccess = useCallback(() => {
    if (navigatedRef.current) return;
    navigatedRef.current = true;
    console.log('[Paymob] Navigating to OrderConfirm');
    setTimeout(() => {
      navigation.reset({
        index: 1,
        routes: [
          { name: 'Main' },
          {
            name: 'OrderConfirm',
            params: {
              order: {
                ...order,
                paymentMethod: paymentMethod || 'VISA',
                paymentStatus: 'PAID',
              },
            },
          },
        ],
      });
    }, 2000);
  }, [navigation, order, paymentMethod]);

  const navigateToError = useCallback(() => {
    if (navigatedRef.current) return;
    setPhase('error');
    setResult('failed');
  }, []);

  const navigateToPending = useCallback(() => {
    if (navigatedRef.current) return;
    setPhase('pending');
    setResult('pending');
  }, []);

  const checkOrderStatus = useCallback(async () => {
    if (!orderId || navigatedRef.current) return false;

    try {
      const { data, error } = await supabase
        .from('orders')
        .select('paymentStatus')
        .eq('id', orderId)
        .single();

      if (error) {
        console.warn('[Paymob] Poll error:', error.message);
        return false;
      }

      console.log(`[Paymob] Poll #${pollCount + 1} — paymentStatus: ${data?.paymentStatus}`);

      if (data?.paymentStatus === 'PAID') {
        setPhase('success');
        setResult('success');
        navigateToSuccess();
        return true;
      }

      if (data?.paymentStatus === 'FAILED') {
        setPhase('error');
        setResult('failed');
        return true;
      }

      return false;
    } catch (err) {
      console.warn('[Paymob] Poll exception:', err.message);
      return false;
    }
  }, [orderId, pollCount, navigateToSuccess]);

  const startPolling = useCallback(() => {
    console.log('[Paymob] Starting order status polling');
    setPollCount(0);

    const doPoll = async (attempt) => {
      if (!mountedRef.current || navigatedRef.current) return;
      if (attempt >= POLL_MAX_ATTEMPTS) {
        console.log('[Paymob] Polling exhausted — showing pending');
        navigateToPending();
        return;
      }

      setPollCount(attempt + 1);
      const found = await checkOrderStatus();
      if (!found && mountedRef.current && !navigatedRef.current) {
        pollTimer.current = setTimeout(() => doPoll(attempt + 1), POLL_INTERVAL);
      }
    };

    pollTimer.current = setTimeout(() => doPoll(0), 1500);
  }, [checkOrderStatus, navigateToPending]);

  useEffect(() => {
    if (!clientSecret || !PAYMOB_PUBLIC_KEY) {
      console.error('[Paymob] Missing clientSecret or publicKey');
      setPhase('error');
      setResult('init_failed');
      return;
    }

    console.log('[Paymob] Initializing — orderId:', orderId, 'method:', paymentMethod);

    Paymob.setAppName('Mawada Phone');
    Paymob.setShowSaveCard(true);
    Paymob.setSaveCardDefault(false);

    setupSDKListener();

    const timer = setTimeout(() => {
      if (phase === 'sdk_processing' && !sdkCallbackFired.current) {
        console.log('[Paymob] Calling presentPayVC');
        try {
          Paymob.presentPayVC(clientSecret, PAYMOB_PUBLIC_KEY);
        } catch (err) {
          console.error('[Paymob] presentPayVC error:', err);
          setPhase('error');
          setResult('init_failed');
          Alert.alert(t('common.error'), t('payment.sdkServiceDown'));
        }
      }
    }, 800);

    return () => {
      clearTimeout(timer);
      if (pollTimer.current) clearTimeout(pollTimer.current);
      Paymob.removeSdkListener();
    };
  }, []);

  const handleAppStateChange = useCallback((nextState) => {
    console.log('[Paymob] AppState:', appState.current, '→', nextState);
    const prev = appState.current;
    appState.current = nextState;

    if (prev === 'active' && nextState === 'background') return;
    if (prev.match(/background|inactive/) && nextState === 'active') {
      const now = Date.now();
      if (now - lastForegroundVerifyRef.current < 3000) return;
      lastForegroundVerifyRef.current = now;
      console.log('[Paymob] App returned to foreground — checking order status');
      if (!sdkCallbackFired.current && !navigatedRef.current) {
        startPolling();
      }
    }
  }, [startPolling]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', handleAppStateChange);
    return () => sub?.remove?.();
  }, [handleAppStateChange]);

  const setupSDKListener = () => {
    if (listenerSet.current) return;
    listenerSet.current = true;

    console.log('[Paymob] Setting SDK listener');
    Paymob.setSdkListener((response) => {
      console.log('[Paymob] SDK callback received:', JSON.stringify(response));
      sdkCallbackFired.current = true;

      const status = response?.status || response;
      console.log('[Paymob] Parsed status:', status);

      switch (status) {
        case PaymentStatus.SUCCESS:
          console.log('[Paymob] Payment SUCCESS — navigating');
          setPhase('success');
          setResult('success');
          navigateToSuccess();
          break;

        case PaymentStatus.PENDING:
          console.log('[Paymob] Payment PENDING — polling for confirmation');
          setPhase('pending_checking');
          setResult('pending');
          startPolling();
          break;

        case PaymentStatus.FAIL:
          console.log('[Paymob] Payment FAIL');
          setPhase('error');
          setResult('init_failed');
          Alert.alert(t('common.error'), t('payment.sdkServiceDown'));
          break;

        default:
          console.log('[Paymob] Unknown status:', status, '— falling back to poll');
          setPhase('pending_checking');
          startPolling();
          break;
      }
    });
  };

  const handleGoBack = () => {
    if (phase === 'sdk_processing') {
      Alert.alert(
        'إِلْغَاء الدَّفْع',
        'هل تُرِيد الإِلْغَاء؟ لن يُشَخَّص طَلَبِكَ حَتَّى يُكَوَّل الدَّفْع.',
        [
          { text: 'لا, عُد', style: 'cancel' },
          {
            text: 'إِلْغَاء',
            style: 'destructive',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } else {
      navigation.goBack();
    }
  };

  const handleRetry = () => {
    navigatedRef.current = false;
    sdkCallbackFired.current = false;
    setPollCount(0);
    setPhase('sdk_processing');
    setResult(null);

    setTimeout(() => {
      try {
        Paymob.presentPayVC(clientSecret, PAYMOB_PUBLIC_KEY);
      } catch (err) {
        console.error('[Paymob] Retry presentPayVC error:', err);
        setPhase('error');
        setResult('init_failed');
      }
    }, 600);
  };

  const formatPrice = (n) => Number(n || 0).toLocaleString('ar-EG');

  const renderPhaseContent = () => {
    switch (phase) {
      case 'sdk_processing':
        return (
          <View style={styles.statusContainer}>
            <View style={styles.processingRing}>
              <Animated.View style={[styles.processingPulse, { opacity: pulseAnim }]} />
              <View style={styles.processingIcon}>
                <Smartphone size={28} color="#0F172A" />
              </View>
            </View>
            <Text style={styles.statusText}>{t('payment.processing')}</Text>
            <Text style={styles.statusSubtext}>
              أَكْمِل الدَّفْع فِي النَّافِذَة الْمَنفَذَة
            </Text>
            <View style={styles.phaseTag}>
              <View style={[styles.phaseDot, { backgroundColor: '#2563EB' }]} />
              <Text style={styles.phaseTagText}>Paymob SDK</Text>
            </View>
            <View style={styles.dotsRow}>
              <View style={[styles.dot, styles.dotActive]} />
              <View style={[styles.dot, styles.dotActive]} />
              <View style={styles.dot} />
            </View>
          </View>
        );

      case 'success':
        return (
          <View style={styles.statusContainer}>
            <View style={styles.successRing}>
              <View style={styles.successCircle}>
                <CheckCircle2 size={44} color="#16A34A" />
              </View>
            </View>
            <Text style={styles.successTitle}>{t('payment.paymentSuccess')}</Text>
            <Text style={styles.statusSubtext}>{t('orders.orderNumber')} #{orderNumber}</Text>
            <View style={styles.successBadge}>
              <Text style={styles.successBadgeText}>تم</Text>
            </View>
          </View>
        );

      case 'pending':
      case 'pending_checking':
        return (
          <View style={styles.statusContainer}>
            <View style={styles.pendingRing}>
              <View style={styles.pendingCircle}>
                {phase === 'pending_checking' ? (
                  <Animated.View style={{ transform: [{ rotate: pulseAnim.interpolate({
                    inputRange: [0.3, 1], outputRange: ['0deg', '360deg'],
                  }) }] }}>
                    <Loader size={40} color="#F59E0B" />
                  </Animated.View>
                ) : (
                  <Clock size={44} color="#F59E0B" />
                )}
              </View>
            </View>
            <Text style={styles.pendingTitle}>
              {phase === 'pending_checking' ? 'جَارِي التَّحْقِيق مِن الدَّفْع...' : t('payment.paymentPending')}
            </Text>
            <Text style={styles.statusSubtext}>{t('orders.orderNumber')} #{orderNumber}</Text>
            {phase === 'pending_checking' && (
              <Text style={styles.pollText}>
                جَارِي الْفَحْص ({pollCount}/{POLL_MAX_ATTEMPTS})
              </Text>
            )}
            {phase === 'pending' && (
              <View style={styles.pendingBadge}>
                <Text style={styles.pendingBadgeText}>قَيْد الْمُعَالَجَة</Text>
              </View>
            )}
          </View>
        );

      case 'error':
        return (
          <View style={styles.statusContainer}>
            <View style={styles.errorRing}>
              <View style={styles.errorCircle}>
                <XCircle size={44} color="#DC2626" />
              </View>
            </View>
            <Text style={styles.errorTitle}>
              {t('common.error')}
            </Text>
            <Text style={styles.statusSubtext}>
              {t('payment.sdkServiceDown')}
            </Text>

            <View style={styles.orderMiniCard}>
              <View style={styles.miniRow}>
                <Text style={styles.miniValue}>#{orderNumber}</Text>
                <Text style={styles.miniLabel}>{t('orders.orderNumber')}</Text>
              </View>
              <View style={styles.miniDivider} />
              <View style={styles.miniRow}>
                <Text style={styles.miniValue}>{formatPrice(order?.total)} {t('common.egp')}</Text>
                <Text style={styles.miniLabel}>{t('common.total')}</Text>
              </View>
            </View>

            <TouchableOpacity style={styles.retryButton} onPress={handleRetry} activeOpacity={0.7}>
              <CreditCard size={18} color="#fff" />
              <Text style={styles.retryText}>{t('payment.retryPayment')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelButton} onPress={() => navigation.goBack()} activeOpacity={0.7}>
              <Text style={styles.cancelText}>{t('common.cancel')}</Text>
            </TouchableOpacity>
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" translucent={false} />

      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <View style={styles.headerContent}>
          <TouchableOpacity style={styles.backButton} onPress={handleGoBack} activeOpacity={0.7}>
            <ChevronLeft color="#fff" size={22} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('payment.title')}</Text>
          <View style={styles.spacer} />
        </View>
        <StepIndicator step={3} total={3} />
      </View>

      <View style={styles.body}>
        {renderPhaseContent()}
      </View>

      <View style={styles.bottomBar}>
        <MethodBadge type={paymentMethod} />
        {order && (
          <View style={styles.bottomSummary}>
            <Text style={styles.bottomTotal}>{formatPrice(order.total)} {t('common.egp')}</Text>
            <Text style={styles.bottomOrderNum}>#{orderNumber}</Text>
          </View>
        )}
        <View style={styles.secureRow}>
          <Shield size={12} color="#94A3B8" />
          <Text style={styles.secureText}>Paymob Secure Payment</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },

  header: {
    backgroundColor: '#0F172A',
    paddingBottom: 8,
  },
  headerContent: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    height: 44,
  },
  backButton: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#fff', textAlign: 'center' },
  spacer: { width: 38 },

  stepRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  stepDot: {
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  stepDotActive: { backgroundColor: '#fff' },
  stepDotCurrent: { backgroundColor: '#fff', shadowColor: '#fff', shadowOpacity: 0.4, shadowOffset: { width: 0, height: 2 }, shadowRadius: 6, elevation: 4 },
  stepNum: { fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.4)' },
  stepNumActive: { color: '#0F172A' },
  stepCheck: { fontSize: 12, color: '#0F172A', fontWeight: '700' },
  stepLine: { width: 40, height: 2, backgroundColor: 'rgba(255,255,255,0.15)', marginHorizontal: 4 },
  stepLineActive: { backgroundColor: '#fff' },

  body: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  statusContainer: {
    alignItems: 'center',
    gap: 14,
    width: '100%',
  },

  phaseTag: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 6,
    marginTop: 2,
  },
  phaseDot: {
    width: 8, height: 8, borderRadius: 4,
  },
  phaseTagText: {
    fontSize: 12, fontWeight: '600', color: '#2563EB',
  },

  processingRing: {
    width: 110, height: 110, borderRadius: 55,
    backgroundColor: '#F1F5F9',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 4,
  },
  processingPulse: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 55,
    backgroundColor: '#E2E8F0',
  },
  processingIcon: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: '#fff',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.06, shadowOffset: { width: 0, height: 2 }, shadowRadius: 8, elevation: 2,
  },
  statusText: { fontSize: 18, fontWeight: '700', color: '#0F172A', textAlign: 'center' },
  statusSubtext: { fontSize: 13, color: '#94A3B8', textAlign: 'center', lineHeight: 18 },
  dotsRow: { flexDirection: 'row', gap: 6, marginTop: 4 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#E2E8F0' },
  dotActive: { backgroundColor: '#0F172A' },

  successRing: {
    width: 110, height: 110, borderRadius: 55,
    backgroundColor: '#DCFCE7',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 4,
  },
  successCircle: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: '#fff',
    alignItems: 'center', justifyContent: 'center',
  },
  successTitle: { fontSize: 20, fontWeight: '800', color: '#16A34A', textAlign: 'center' },
  successBadge: {
    backgroundColor: '#DCFCE7', borderRadius: 20,
    paddingHorizontal: 20, paddingVertical: 8, marginTop: 4,
  },
  successBadgeText: { fontSize: 14, fontWeight: '700', color: '#16A34A' },

  errorRing: {
    width: 110, height: 110, borderRadius: 55,
    backgroundColor: '#FEE2E2',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 4,
  },
  errorCircle: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: '#fff',
    alignItems: 'center', justifyContent: 'center',
  },
  errorTitle: { fontSize: 20, fontWeight: '800', color: '#DC2626', textAlign: 'center' },
  retryButton: {
    flexDirection: 'row-reverse',
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#0F172A', borderRadius: 14,
    paddingVertical: 14, paddingHorizontal: 32,
    marginTop: 8, gap: 8,
    shadowColor: '#0F172A', shadowOpacity: 0.2, shadowOffset: { width: 0, height: 4 }, shadowRadius: 8, elevation: 3,
  },
  retryText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  cancelButton: { paddingVertical: 12 },
  cancelText: { color: '#64748B', fontSize: 14, fontWeight: '600' },

  orderMiniCard: {
    backgroundColor: '#fff', borderRadius: 14, padding: 14,
    width: '100%', marginTop: 4,
    shadowColor: '#000', shadowOpacity: 0.04, shadowOffset: { width: 0, height: 2 }, shadowRadius: 6, elevation: 1,
  },
  miniRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 },
  miniLabel: { fontSize: 13, color: '#94A3B8' },
  miniValue: { fontSize: 14, fontWeight: '700', color: '#0F172A' },
  miniDivider: { height: 1, backgroundColor: '#F1F5F9', marginVertical: 6 },

  pendingRing: {
    width: 110, height: 110, borderRadius: 55,
    backgroundColor: '#FEF3C7',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 4,
  },
  pendingCircle: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: '#fff',
    alignItems: 'center', justifyContent: 'center',
  },
  pendingTitle: { fontSize: 20, fontWeight: '800', color: '#F59E0B', textAlign: 'center' },
  pendingBadge: {
    backgroundColor: '#FEF3C7', borderRadius: 20,
    paddingHorizontal: 20, paddingVertical: 8, marginTop: 4,
  },
  pendingBadgeText: { fontSize: 13, fontWeight: '700', color: '#F59E0B' },
  pollText: { fontSize: 12, color: '#94A3B8', marginTop: 4 },

  bottomBar: {
    backgroundColor: '#fff',
    borderTopWidth: 1, borderTopColor: '#F1F5F9',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 28,
    alignItems: 'center', gap: 10,
  },
  badge: {
    flexDirection: 'row-reverse', alignItems: 'center',
    gap: 6, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6,
  },
  badgeText: { fontSize: 12, fontWeight: '600' },
  bottomSummary: {
    flexDirection: 'row-reverse', alignItems: 'center', gap: 12,
  },
  bottomTotal: { fontSize: 18, fontWeight: '800', color: '#0F172A' },
  bottomOrderNum: { fontSize: 13, color: '#94A3B8', fontFamily: 'monospace' },
  secureRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  secureText: { fontSize: 11, color: '#94A3B8' },
});
