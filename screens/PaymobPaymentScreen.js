import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StatusBar,
  Animated,
} from 'react-native';
import { ChevronLeft, Shield, CheckCircle2, XCircle, Clock, CreditCard, Wallet, Banknote } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Paymob, { PaymentStatus } from 'paymob-reactnative';
import { useTranslation } from '../context/AppSettingsContext';
import { COLORS } from '../constants';

const PAYMOB_PUBLIC_KEY = process.env.EXPO_PUBLIC_PAYMOB_PUBLIC_KEY || '';

const MethodBadge = ({ type }) => {
  const config = {
    VISA: { icon: CreditCard, label: 'بطاقة ائتمان', color: '#2563EB', bg: '#EFF6FF' },
    WALLET: { icon: Wallet, label: 'محفظة إلكترونية', color: '#7C3AED', bg: '#F5F3FF' },
    COD: { icon: Banknote, label: 'الدفع عند الاستلام', color: '#16A34A', bg: '#F0FDF4' },
  }[type] || { icon: CreditCard, label: type, color: '#64748B', bg: '#F8FAFC' };

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

  const [status, setStatus] = useState('processing');
  const [statusMessage, setStatusMessage] = useState('');
  const listenerSet = useRef(false);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (status === 'processing') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 0.4, duration: 800, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [status]);

  useEffect(() => {
    if (!clientSecret || !PAYMOB_PUBLIC_KEY) {
      setStatus('error');
      setStatusMessage(t('payment.paymentInitFailed'));
      return;
    }

    configureSDK();
    setupListener();

    const timer = setTimeout(() => {
      if (status === 'processing') {
        presentPayment();
      }
    }, 1000);

    return () => {
      clearTimeout(timer);
      Paymob.removeSdkListener();
    };
  }, []);

  const configureSDK = () => {
    Paymob.setAppName('Mawada Phone');
    Paymob.setButtonTextColor('#FFFFFF');
    Paymob.setButtonBackgroundColor('#0F172A');
    Paymob.setShowSaveCard(true);
    Paymob.setSaveCardDefault(false);
    Paymob.setShowConfirmationPage(false);
    Paymob.setShowTransactionResult(false);
  };

  const setupListener = () => {
    if (listenerSet.current) return;
    listenerSet.current = true;

    Paymob.setSdkListener((response) => {
      const result = typeof response === 'string' ? response : response?.status || response;

      switch (result) {
        case PaymentStatus.SUCCESS:
          handlePaymentSuccess();
          break;
        case PaymentStatus.FAIL:
          handlePaymentFail();
          break;
        case PaymentStatus.PENDING:
          handlePaymentPending();
          break;
        default:
          handlePaymentFail();
          break;
      }
    });
  };

  const presentPayment = () => {
    try {
      Paymob.presentPayVC(clientSecret, PAYMOB_PUBLIC_KEY);
    } catch (error) {
      console.error('Paymob presentPayVC error:', error);
      setStatus('error');
      setStatusMessage(t('payment.paymentInitFailed'));
    }
  };

  const handlePaymentSuccess = () => {
    setStatus('success');
    setStatusMessage(t('payment.paymentSuccess'));

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
    }, 2200);
  };

  const handlePaymentFail = () => {
    setStatus('error');
    setStatusMessage(t('payment.paymentFailed'));
  };

  const handlePaymentPending = () => {
    setStatus('pending');
    setStatusMessage(t('payment.paymentPending'));
  };

  const handleRetry = () => {
    setStatus('processing');
    setStatusMessage('');
    setTimeout(() => presentPayment(), 600);
  };

  const handleGoBack = () => {
    Alert.alert(
      t('common.cancel'),
      t('payment.paymentFailed'),
      [
        { text: t('common.retry'), onPress: handleRetry },
        {
          text: t('common.cancel'),
          style: 'destructive',
          onPress: () => navigation.goBack(),
        },
      ]
    );
  };

  const formatPrice = (n) => Number(n || 0).toLocaleString();

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" translucent={false} />

      {/* Header */}
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

      {/* Body */}
      <View style={styles.body}>

        {/* Processing */}
        {status === 'processing' && (
          <View style={styles.statusContainer}>
            <View style={styles.processingRing}>
              <Animated.View style={[styles.processingPulse, { opacity: pulseAnim }]} />
              <View style={styles.processingIcon}>
                <CreditCard size={28} color="#0F172A" />
              </View>
            </View>
            <Text style={styles.statusText}>{t('payment.processing')}</Text>
            <Text style={styles.statusSubtext}>{t('payment.chooseMethod')}</Text>
            <View style={styles.dotsRow}>
              <View style={[styles.dot, styles.dotActive]} />
              <View style={[styles.dot, styles.dotActive]} />
              <View style={styles.dot} />
            </View>
          </View>
        )}

        {/* Success */}
        {status === 'success' && (
          <View style={styles.statusContainer}>
            <View style={styles.successRing}>
              <View style={styles.successCircle}>
                <CheckCircle2 size={44} color="#16A34A" />
              </View>
            </View>
            <Text style={styles.successTitle}>{t('payment.paymentSuccess')}</Text>
            <Text style={styles.statusSubtext}>{t('orders.orderNumber')} #{orderNumber}</Text>
            <View style={styles.successBadge}>
              <Text style={styles.successBadgeText}>{t('common.done')}</Text>
            </View>
          </View>
        )}

        {/* Error */}
        {status === 'error' && (
          <View style={styles.statusContainer}>
            <View style={styles.errorRing}>
              <View style={styles.errorCircle}>
                <XCircle size={44} color="#DC2626" />
              </View>
            </View>
            <Text style={styles.errorTitle}>{t('payment.paymentFailed')}</Text>
            <Text style={styles.statusSubtext}>{statusMessage}</Text>

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
        )}

        {/* Pending */}
        {status === 'pending' && (
          <View style={styles.statusContainer}>
            <View style={styles.pendingRing}>
              <View style={styles.pendingCircle}>
                <Clock size={44} color="#F59E0B" />
              </View>
            </View>
            <Text style={styles.pendingTitle}>{t('payment.paymentPending')}</Text>
            <Text style={styles.statusSubtext}>{t('orders.orderNumber')} #{orderNumber}</Text>
            <View style={styles.pendingBadge}>
              <Text style={styles.pendingBadgeText}>{t('common.done')}</Text>
            </View>
          </View>
        )}
      </View>

      {/* Bottom Info */}
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

  // Header
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

  // Body
  body: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  statusContainer: {
    alignItems: 'center',
    gap: 14,
  },

  // Processing
  processingRing: {
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: '#F1F5F9',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 4,
  },
  processingPulse: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 50,
    backgroundColor: '#E2E8F0',
  },
  processingIcon: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: '#fff',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.06, shadowOffset: { width: 0, height: 2 }, shadowRadius: 8, elevation: 2,
  },
  statusText: { fontSize: 18, fontWeight: '700', color: '#0F172A', textAlign: 'center' },
  statusSubtext: { fontSize: 13, color: '#94A3B8', textAlign: 'center' },
  dotsRow: { flexDirection: 'row', gap: 6, marginTop: 4 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#E2E8F0' },
  dotActive: { backgroundColor: '#0F172A' },

  // Success
  successRing: {
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: '#DCFCE7',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 4,
  },
  successCircle: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: '#fff',
    alignItems: 'center', justifyContent: 'center',
  },
  successTitle: { fontSize: 20, fontWeight: '800', color: '#16A34A', textAlign: 'center' },
  successBadge: {
    backgroundColor: '#DCFCE7', borderRadius: 20,
    paddingHorizontal: 20, paddingVertical: 8, marginTop: 4,
  },
  successBadgeText: { fontSize: 13, fontWeight: '700', color: '#16A34A' },

  // Error
  errorRing: {
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: '#FEE2E2',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 4,
  },
  errorCircle: {
    width: 72, height: 72, borderRadius: 36,
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

  // Pending
  pendingRing: {
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: '#FEF3C7',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 4,
  },
  pendingCircle: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: '#fff',
    alignItems: 'center', justifyContent: 'center',
  },
  pendingTitle: { fontSize: 20, fontWeight: '800', color: '#F59E0B', textAlign: 'center' },
  pendingBadge: {
    backgroundColor: '#FEF3C7', borderRadius: 20,
    paddingHorizontal: 20, paddingVertical: 8, marginTop: 4,
  },
  pendingBadgeText: { fontSize: 13, fontWeight: '700', color: '#F59E0B' },

  // Bottom
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
