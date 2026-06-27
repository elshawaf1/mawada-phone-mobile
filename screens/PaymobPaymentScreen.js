import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StatusBar,
} from 'react-native';
import { ChevronLeft } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Paymob, { PaymentStatus } from 'paymob-reactnative';
import { useTranslation } from '../context/AppSettingsContext';
import { COLORS } from '../constants';

const PAYMOB_PUBLIC_KEY = process.env.EXPO_PUBLIC_PAYMOB_PUBLIC_KEY || '';

export default function PaymobPaymentScreen({ navigation, route }) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  const { clientSecret, orderId, orderNumber, paymentMethod, order } = route.params || {};

  const [status, setStatus] = useState('processing');
  const [statusMessage, setStatusMessage] = useState('');
  const listenerSet = useRef(false);

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
    }, 800);

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
    }, 1500);
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
    setTimeout(() => presentPayment(), 500);
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

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" translucent={false} />

      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <View style={styles.headerContent}>
          <TouchableOpacity style={styles.backButton} onPress={handleGoBack} activeOpacity={0.7}>
            <ChevronLeft color={COLORS.white} size={24} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('payment.title')}</Text>
          <View style={styles.spacer} />
        </View>
      </View>

      <View style={styles.body}>
        {status === 'processing' && (
          <View style={styles.statusContainer}>
            <ActivityIndicator size="large" color="#0F172A" />
            <Text style={styles.statusText}>{t('payment.processing')}</Text>
            <Text style={styles.statusSubtext}>{t('payment.chooseMethod')}</Text>
          </View>
        )}

        {status === 'success' && (
          <View style={styles.statusContainer}>
            <View style={styles.successCircle}>
              <Text style={styles.successCheck}>✓</Text>
            </View>
            <Text style={[styles.statusText, { color: '#16A34A' }]}>{t('payment.paymentSuccess')}</Text>
            <Text style={styles.statusSubtext}>{t('common.done')}</Text>
          </View>
        )}

        {status === 'error' && (
          <View style={styles.statusContainer}>
            <View style={styles.errorCircle}>
              <Text style={styles.errorX}>✕</Text>
            </View>
            <Text style={[styles.statusText, { color: '#DC2626' }]}>{statusMessage}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={handleRetry} activeOpacity={0.7}>
              <Text style={styles.retryText}>{t('payment.retryPayment')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelButton} onPress={() => navigation.goBack()} activeOpacity={0.7}>
              <Text style={styles.cancelText}>{t('common.cancel')}</Text>
            </TouchableOpacity>
          </View>
        )}

        {status === 'pending' && (
          <View style={styles.statusContainer}>
            <ActivityIndicator size="large" color="#F59E0B" />
            <Text style={[styles.statusText, { color: '#F59E0B' }]}>{t('payment.paymentPending')}</Text>
            <Text style={styles.statusSubtext}>{t('common.done')}</Text>
          </View>
        )}
      </View>

      {order && (
        <View style={styles.orderSummary}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>{t('orders.orderNumber')}</Text>
            <Text style={styles.summaryValue}>#{orderNumber}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>{t('common.total')}</Text>
            <Text style={styles.summaryValue}>{order.total?.toLocaleString()} {t('common.egp')}</Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.white },
  header: {
    backgroundColor: '#0F172A',
    paddingBottom: 16,
  },
  headerContent: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    height: 44,
  },
  backButton: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: 18, fontWeight: '600', color: COLORS.white, textAlign: 'center' },
  spacer: { width: 40 },
  body: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  statusContainer: {
    alignItems: 'center',
    gap: 16,
  },
  statusText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
    textAlign: 'center',
  },
  statusSubtext: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
  },
  successCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#DCFCE7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  successCheck: {
    fontSize: 36,
    color: '#16A34A',
    fontWeight: '700',
  },
  errorCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorX: {
    fontSize: 36,
    color: '#DC2626',
    fontWeight: '700',
  },
  retryButton: {
    backgroundColor: '#0F172A',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 48,
    marginTop: 8,
  },
  retryText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  cancelButton: {
    paddingVertical: 12,
  },
  cancelText: {
    color: '#64748B',
    fontSize: 14,
    fontWeight: '600',
  },
  orderSummary: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 32,
    gap: 8,
  },
  summaryRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 14,
    color: '#64748B',
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
});
