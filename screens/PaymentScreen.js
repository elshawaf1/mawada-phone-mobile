import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  Animated,
  AppState,
} from 'react-native';
import { ChevronLeft, MapPin, CreditCard, Wallet, Banknote, Check, Shield, CheckCircle2, XCircle, Clock, Smartphone, Loader } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Paymob, { PaymentStatus } from 'paymob-reactnative';
import Button from '../components/Button';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { useTranslation } from '../context/AppSettingsContext';
import { db } from '../services/api';
import { COLORS } from '../constants';
import { supabase, supabaseUrl } from '../services/supabase';

const PAYMOB_PUBLIC_KEY = process.env.EXPO_PUBLIC_PAYMOB_PUBLIC_KEY || '';
const POLL_INTERVAL = 2000;
const POLL_MAX_ATTEMPTS = 8;

const PAYMENT_METHODS = [
  {
    id: 'cod',
    type: 'COD',
    labelKey: 'payment.cod',
    hintKey: 'payment.codHint',
    Icon: Banknote,
    color: '#16A34A',
    bgColor: '#F0FDF4',
  },
  {
    id: 'card',
    type: 'VISA',
    labelKey: 'payment.card',
    hintKey: 'payment.cardHint',
    Icon: CreditCard,
    color: '#2563EB',
    bgColor: '#EFF6FF',
    integrationIdKey: 'EXPO_PUBLIC_PAYMOB_CARD_INTEGRATION_ID',
  },
  {
    id: 'wallet',
    type: 'WALLET',
    labelKey: 'payment.wallet',
    hintKey: 'payment.codHint',
    Icon: Wallet,
    color: '#7C3AED',
    bgColor: '#F5F3FF',
    integrationIdKey: 'EXPO_PUBLIC_PAYMOB_WALLET_INTEGRATION_ID',
  },
];

const StepIndicator = ({ step, total }) => (
  <View style={styles.stepRow}>
    {Array.from({ length: total }, (_, i) => (
      <React.Fragment key={i}>
        <View style={[styles.stepDot, i < step && styles.stepDotActive, i === step && styles.stepDotCurrent]}>
          {i < step ? <Check size={10} color="#fff" /> : <Text style={[styles.stepNum, i === step && styles.stepNumActive]}>{i + 1}</Text>}
        </View>
        {i < total - 1 && <View style={[styles.stepLine, i < step && styles.stepLineActive]} />}
      </React.Fragment>
    ))}
  </View>
);

export default function PaymentScreen({ navigation, route }) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { clearCart: clearAppCart, coupon } = useApp();
  const [deliveryType, setDeliveryType] = useState('delivery');
  const [selectedMethod, setSelectedMethod] = useState('cod');
  const [deliveryAddress, setDeliveryAddress] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [branches, setBranches] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState(null);

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
    fetchAddresses();
    fetchBranches();
  }, [user?.id]);

  const fetchAddresses = async () => {
    if (!user?.id) return;
    try {
      const addresses = await db.getAddresses(user.id);
      const defaultAddr = addresses?.find(a => a.isDefault) || addresses?.[0];
      if (defaultAddr) setDeliveryAddress(defaultAddr);
    } catch (error) {
      console.error('Error fetching addresses:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchBranches = async () => {
    try {
      const data = await db.getBranches();
      setBranches(data || []);
      if (data?.length > 0) setSelectedBranch(data[0]);
    } catch (error) {
      console.error('Error fetching branches:', error);
    }
  };

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

  const navigateToSuccess = useCallback(() => {
    if (navigatedRef.current) return;
    navigatedRef.current = true;
    const od = orderDataRef.current;
    if (!od) return;
    setTimeout(() => {
      navigation.navigate('OrderConfirm', {
        order: { ...od, paymentMethod: od.paymentMethod, paymentStatus: 'PAID' },
      });
    }, 2000);
  }, [navigation]);

  const navigateToPending = useCallback(() => {
    if (navigatedRef.current) return;
    setSdkPhase('pending_final');
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
      if (error) { console.warn('[Paymob] Poll error:', error.message); return false; }
      console.log(`[Paymob] Poll — paymentStatus: ${data?.paymentStatus}`);
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
    } catch (err) {
      console.warn('[Paymob] Poll exception:', err.message);
      return false;
    }
  }, [navigateToSuccess]);

  const startPolling = useCallback(() => {
    console.log('[Paymob] Starting order status polling');
    setSdkPollCount(0);
    const doPoll = async (attempt) => {
      if (!mountedRef.current || navigatedRef.current) return;
      if (attempt >= POLL_MAX_ATTEMPTS) {
        console.log('[Paymob] Polling exhausted — showing pending');
        navigateToPending();
        return;
      }
      setSdkPollCount(attempt + 1);
      const found = await checkOrderStatus();
      if (!found && mountedRef.current && !navigatedRef.current) {
        pollTimer.current = setTimeout(() => doPoll(attempt + 1), POLL_INTERVAL);
      }
    };
    pollTimer.current = setTimeout(() => doPoll(0), 1500);
  }, [checkOrderStatus, navigateToPending]);

  const handleAppStateChange = useCallback((nextState) => {
    console.log('[Paymob] AppState:', appStateRef.current, '→', nextState);
    const prev = appStateRef.current;
    appStateRef.current = nextState;
    if (prev.match(/background|inactive/) && nextState === 'active') {
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

  useEffect(() => {
    return () => {
      if (pollTimer.current) clearTimeout(pollTimer.current);
      Paymob.removeSdkListener();
    };
  }, []);

  const openSDK = useCallback((clientSecret, orderData) => {
    orderDataRef.current = orderData;
    sdkCallbackFired.current = false;
    navigatedRef.current = false;
    setSdkPhase('processing');

    Paymob.setAppName('Mawada Phone');
    Paymob.setShowSaveCard(true);
    Paymob.setSaveCardDefault(false);

    if (!listenerSet.current) {
      listenerSet.current = true;
      Paymob.setSdkListener((response) => {
        console.log('[Paymob] SDK callback:', JSON.stringify(response));
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
        try {
          Paymob.presentPayVC(clientSecret, PAYMOB_PUBLIC_KEY);
        } catch (err) {
          console.error('[Paymob] presentPayVC error:', err);
          setSdkPhase('error');
        }
      }
    }, 500);
  }, [navigateToSuccess, startPolling]);

  const handleSdkRetry = () => {
    navigatedRef.current = false;
    sdkCallbackFired.current = false;
    setSdkPollCount(0);
    const od = orderDataRef.current;
    if (!od?.clientSecret) { setSdkPhase(null); return; }
    setSdkPhase('processing');
    setTimeout(() => {
      try { Paymob.presentPayVC(od.clientSecret, PAYMOB_PUBLIC_KEY); }
      catch (err) { setSdkPhase('error'); }
    }, 600);
  };

  const handleSdkDismiss = () => {
    navigatedRef.current = false;
    sdkCallbackFired.current = false;
    setSdkPhase(null);
    setSdkPollCount(0);
  };

  const routeParams = route?.params;
  const items = routeParams?.selectedItems || [];
  const orderNotes = routeParams?.notes || '';
  const subtotal = items.reduce((sum, item) => sum + (Number(item.unitPrice) || 0) * (item.quantity || 1), 0);
  const shippingCost = deliveryType === 'delivery' ? 90 : 0;
  const discount = coupon?.discount ? Math.round(subtotal * (coupon.discount / 100)) : 0;
  const total = subtotal - discount + shippingCost;

  const handleCheckout = async () => {
    if (!user?.id) {
      Alert.alert(t('auth.login'), t('auth.mustLogin'));
      return;
    }

    if (!items || items.length === 0) {
      Alert.alert(t('payment.cartEmpty'), t('payment.addProductsFirst'));
      return;
    }

    if (deliveryType === 'delivery' && !deliveryAddress) {
      Alert.alert(t('common.error'), t('payment.addAddress'));
      return;
    }

    if (deliveryType === 'branch' && !selectedBranch) {
      Alert.alert(t('common.error'), t('payment.changeBranch'));
      return;
    }

    const method = PAYMENT_METHODS.find(m => m.id === selectedMethod);
    if (!method) {
      Alert.alert(t('common.error'), t('payment.choosePayment'));
      return;
    }

    const isOnline = method.type !== 'COD';
    if (isOnline) {
      const integrationId = process.env[method.integrationIdKey];
      if (!integrationId) {
        Alert.alert(t('common.error'), t('payment.methodUnavailable'));
        return;
      }
    }

    setProcessing(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || '';
      const idempotencyKey = Date.now().toString(36) + Math.random().toString(36).slice(2);

      const paymentMethodIds = isOnline ? [parseInt(process.env[method.integrationIdKey])] : [];

      const edgeBody = {
        idempotencyKey,
        paymentMethod: method.type,
        paymentMethodIds,
        cartItems: items,
        userEmail: user.email || '',
        userFirstName: user.name?.split(' ')[0] || user.email?.split('@')[0] || 'عميل',
        userLastName: user.name?.split(' ')[1] || '',
        userPhone: user.phone || '+201000000000',
        couponCode: coupon?.code || null,
        notes: orderNotes,
        addressId: deliveryType === 'delivery' ? deliveryAddress?.id : null,
        branchId: deliveryType === 'branch' ? selectedBranch?.id : null,
        deliveryType,
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
        Alert.alert(t('common.error'), data?.error || t('payment.serverError', { code: res.status }));
        return;
      }

      if (isOnline) {
        setProcessing(false);
        await db.clearCart(user.id);
        clearAppCart();
        const orderData = {
          clientSecret: data.clientSecret,
          orderId: data.orderId,
          orderNumber: data.orderNumber,
          paymentMethod: method.type,
          subtotal,
          shippingCost,
          discount,
          total,
          order_items: items.map((item) => ({
            ...item,
            nameAr: item.name || t('common.product'),
            unitPrice: item.unitPrice,
          })),
        };
        openSDK(data.clientSecret, orderData);
      } else {
        await db.clearCart(user.id);
        clearAppCart();
        setProcessing(false);
        navigation.navigate('OrderConfirm', {
          order: {
            id: data.orderId,
            orderNumber: data.orderNumber,
            paymentMethod: 'COD',
            paymentStatus: 'UNPAID',
            subtotal,
            shippingCost,
            discount,
            total,
            order_items: items.map((item) => ({
              ...item,
              nameAr: item.name || t('common.product'),
              unitPrice: item.unitPrice,
            })),
          },
        });
      }
    } catch (error) {
      setProcessing(false);
      console.error('Checkout error:', error);
      Alert.alert(t('common.error'), t('payment.orderError'));
    }
  };

  const formatPrice = (n) => Number(n || 0).toLocaleString();

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={[styles.headerContainer, { paddingTop: insets.top + 10 }]}>
        <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
        <View style={styles.headerContent}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()} activeOpacity={0.7}>
            <ChevronLeft color={COLORS.text} size={22} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('payment.title')}</Text>
          <View style={styles.spacer} />
        </View>
        <StepIndicator step={2} total={3} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* Delivery Type */}
        <View style={styles.sectionLabel}>
          <Text style={styles.sectionLabelText}>{t('payment.chooseMethod')}</Text>
        </View>

        <View style={styles.segmentedControl}>
          <TouchableOpacity
            style={[styles.segmentTab, deliveryType === 'delivery' && styles.segmentTabActive]}
            onPress={() => setDeliveryType('delivery')}
            activeOpacity={0.7}
          >
            <MapPin size={16} color={deliveryType === 'delivery' ? '#fff' : '#64748B'} />
            <Text style={[styles.segmentText, deliveryType === 'delivery' && styles.segmentTextActive]}>
              {t('payment.delivery')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.segmentTab, deliveryType === 'branch' && styles.segmentTabActive]}
            onPress={() => setDeliveryType('branch')}
            activeOpacity={0.7}
          >
            <MapPin size={16} color={deliveryType === 'branch' ? '#fff' : '#64748B'} />
            <Text style={[styles.segmentText, deliveryType === 'branch' && styles.segmentTextActive]}>
              {t('payment.pickup')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Address / Branch */}
        {deliveryType === 'delivery' && (
          <View style={styles.card}>
            {loading ? (
              <View style={styles.cardLoading}>
                <ActivityIndicator size="small" color="#94A3B8" />
              </View>
            ) : deliveryAddress ? (
              <View style={styles.addressContent}>
                <View style={styles.addressRow}>
                  <View style={styles.addressIconWrap}>
                    <MapPin size={18} color="#fff" />
                  </View>
                  <View style={styles.addressTextWrap}>
                    <Text style={styles.addressLabel}>{deliveryAddress.label || deliveryAddress.city}</Text>
                    <Text style={styles.addressDetail}>{deliveryAddress.street}{deliveryAddress.region ? ` - ${deliveryAddress.region}` : ''}</Text>
                    <Text style={styles.addressPhone}>+20 {deliveryAddress.phone}</Text>
                  </View>
                </View>
                <TouchableOpacity style={styles.editBtn} onPress={() => navigation.navigate('DeliveryLocations', { onReturn: setDeliveryAddress })} activeOpacity={0.7}>
                  <Text style={styles.editBtnText}>{t('payment.editAddress')}</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity style={styles.addAddressBtn} onPress={() => navigation.navigate('DeliveryLocations', { onReturn: setDeliveryAddress })} activeOpacity={0.7}>
                <View style={styles.addIconWrap}>
                  <MapPin size={20} color="#3B82F6" />
                </View>
                <Text style={styles.addAddressText}>{t('payment.addAddress')}</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {deliveryType === 'branch' && (
          <View style={styles.card}>
            <View style={styles.branchContent}>
              <View style={styles.branchIconWrap}>
                <MapPin size={22} color="#3B82F6" />
              </View>
              <View style={styles.branchTextWrap}>
                <Text style={styles.branchName}>{selectedBranch?.nameAr || selectedBranch?.name || 'الفرع'}</Text>
                <Text style={styles.branchAddr}>{selectedBranch?.address || selectedBranch?.addressAr || ''}</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.changeBtn} onPress={() => navigation.navigate('Locations', { onReturn: setSelectedBranch })} activeOpacity={0.7}>
              <Text style={styles.changeBtnText}>{t('payment.changeBranch')}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Payment Methods */}
        <View style={styles.sectionLabel}>
          <Text style={styles.sectionLabelText}>{t('payment.supportedMethods')}</Text>
        </View>

        <View style={styles.methodsWrap}>
          {PAYMENT_METHODS.map((method) => {
            const isSelected = selectedMethod === method.id;
            const { Icon, color, bgColor } = method;
            return (
              <TouchableOpacity
                key={method.id}
                style={[styles.methodCard, isSelected && { borderColor: color, backgroundColor: bgColor }]}
                onPress={() => setSelectedMethod(method.id)}
                activeOpacity={0.7}
              >
                <View style={[styles.methodIconWrap, { backgroundColor: isSelected ? color : '#F1F5F9' }]}>
                  <Icon size={22} color={isSelected ? '#fff' : '#64748B'} />
                </View>
                <View style={styles.methodInfo}>
                  <Text style={[styles.methodLabel, isSelected && { color }]}>{t(method.labelKey)}</Text>
                  <Text style={styles.methodHint}>{t(method.hintKey)}</Text>
                </View>
                <View style={[styles.radio, isSelected && { borderColor: color }]}>
                  {isSelected && <View style={[styles.radioFill, { backgroundColor: color }]} />}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Order Summary */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>{t('orders.total')}</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryValue}>{formatPrice(subtotal)} {t('common.egp')}</Text>
            <Text style={styles.summaryLabel}>{t('common.subtotal')}</Text>
          </View>
          {discount > 0 && (
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryValue, { color: '#16A34A' }]}>-{formatPrice(discount)} {t('common.egp')}</Text>
              <Text style={styles.summaryLabel}>{t('common.discount')}</Text>
            </View>
          )}
          <View style={styles.summaryRow}>
            <Text style={styles.summaryValue}>{shippingCost > 0 ? `${formatPrice(shippingCost)} ${t('common.egp')}` : t('common.free')}</Text>
            <Text style={styles.summaryLabel}>{t('common.shipping')}</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryRow}>
            <Text style={styles.totalValue}>{formatPrice(total)} {t('common.egp')}</Text>
            <Text style={styles.totalLabel}>{t('common.total')}</Text>
          </View>
        </View>

        {/* Security Badge */}
        <View style={styles.securityBadge}>
          <Shield size={14} color="#94A3B8" />
          <Text style={styles.securityText}>{t('payment.codHint')}</Text>
        </View>

        {processing && (
          <View style={styles.processingOverlay}>
            <ActivityIndicator size="large" color="#0F172A" />
            <Text style={styles.processingText}>{t('payment.processing')}</Text>
          </View>
        )}

        <Button
          title={t('payment.completeOrder')}
          onPress={handleCheckout}
          fullWidth
          style={styles.checkoutButton}
          disabled={processing}
        />

      </ScrollView>

      {sdkPhase && (
        <View style={styles.sdkOverlay}>
          <View style={styles.sdkCard}>
            {sdkPhase === 'processing' && (
              <View style={styles.sdkStatusContainer}>
                <View style={styles.sdkRing}>
                  <Animated.View style={[styles.sdkPulse, { opacity: pulseAnim }]} />
                  <View style={styles.sdkIcon}>
                    <Smartphone size={28} color="#0F172A" />
                  </View>
                </View>
                <Text style={styles.sdkTitle}>{t('payment.processing')}</Text>
                <Text style={styles.sdkSubtext}>أَكْمِل الدَّفْع فِي النَّافِذَة الْمَنفَذَة</Text>
                <View style={styles.sdkTag}>
                  <View style={[styles.sdkTagDot, { backgroundColor: '#2563EB' }]} />
                  <Text style={styles.sdkTagText}>Paymob SDK</Text>
                </View>
              </View>
            )}

            {sdkPhase === 'pending_checking' && (
              <View style={styles.sdkStatusContainer}>
                <View style={styles.sdkPendingRing}>
                  <View style={styles.sdkPendingCircle}>
                    <Animated.View style={{ transform: [{ rotate: pulseAnim.interpolate({
                      inputRange: [0.3, 1], outputRange: ['0deg', '360deg'],
                    }) }] }}>
                      <Loader size={36} color="#F59E0B" />
                    </Animated.View>
                  </View>
                </View>
                <Text style={styles.sdkPendingTitle}>جَارِي التَّحْقِيق مِن الدَّفْع...</Text>
                <Text style={styles.sdkPollText}>جَارِي الْفَحْص ({sdkPollCount}/{POLL_MAX_ATTEMPTS})</Text>
              </View>
            )}

            {sdkPhase === 'pending_final' && (
              <View style={styles.sdkStatusContainer}>
                <View style={styles.sdkPendingRing}>
                  <View style={styles.sdkPendingCircle}>
                    <Clock size={36} color="#F59E0B" />
                  </View>
                </View>
                <Text style={styles.sdkPendingTitle}>{t('payment.paymentPending')}</Text>
                <Text style={styles.sdkSubtext}>رَقَم الْطَّلَب: #{orderDataRef.current?.orderNumber}</Text>
                <TouchableOpacity style={styles.sdkDismissBtn} onPress={handleSdkDismiss} activeOpacity={0.7}>
                  <Text style={styles.sdkDismissText}>تم</Text>
                </TouchableOpacity>
              </View>
            )}

            {sdkPhase === 'success' && (
              <View style={styles.sdkStatusContainer}>
                <View style={styles.sdkSuccessRing}>
                  <View style={styles.sdkSuccessCircle}>
                    <CheckCircle2 size={40} color="#16A34A" />
                  </View>
                </View>
                <Text style={styles.sdkSuccessTitle}>{t('payment.paymentSuccess')}</Text>
                <Text style={styles.sdkSubtext}>رَقَم الْطَّلَب: #{orderDataRef.current?.orderNumber}</Text>
              </View>
            )}

            {sdkPhase === 'error' && (
              <View style={styles.sdkStatusContainer}>
                <View style={styles.sdkErrorRing}>
                  <View style={styles.sdkErrorCircle}>
                    <XCircle size={40} color="#DC2626" />
                  </View>
                </View>
                <Text style={styles.sdkErrorTitle}>{t('payment.paymentFailed')}</Text>
                <Text style={styles.sdkSubtext}>عُد واحْتَرِك مَرَّة أُخْرَى</Text>
                <View style={styles.sdkErrorActions}>
                  <TouchableOpacity style={styles.sdkRetryBtn} onPress={handleSdkRetry} activeOpacity={0.7}>
                    <CreditCard size={16} color="#fff" />
                    <Text style={styles.sdkRetryText}>{t('payment.retryPayment')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.sdkCancelBtn} onPress={handleSdkDismiss} activeOpacity={0.7}>
                    <Text style={styles.sdkCancelText}>{t('common.cancel')}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  headerContainer: {
    backgroundColor: '#fff',
    paddingBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
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
    backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#0F172A', textAlign: 'center' },
  spacer: { width: 38 },

  stepRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 0,
  },
  stepDot: {
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: '#E2E8F0',
    alignItems: 'center', justifyContent: 'center',
  },
  stepDotActive: { backgroundColor: '#0F172A' },
  stepDotCurrent: { backgroundColor: '#0F172A', shadowColor: '#0F172A', shadowOpacity: 0.3, shadowOffset: { width: 0, height: 2 }, shadowRadius: 4, elevation: 3 },
  stepNum: { fontSize: 11, fontWeight: '700', color: '#94A3B8' },
  stepNumActive: { color: '#fff' },
  stepLine: { width: 40, height: 2, backgroundColor: '#E2E8F0', marginHorizontal: 4 },
  stepLineActive: { backgroundColor: '#0F172A' },

  scrollContent: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 40 },

  sectionLabel: { marginBottom: 10, marginTop: 4 },
  sectionLabelText: { fontSize: 14, fontWeight: '700', color: '#0F172A', textAlign: 'right' },

  segmentedControl: {
    flexDirection: 'row-reverse',
    backgroundColor: '#E2E8F0',
    borderRadius: 14,
    padding: 3,
    marginBottom: 16,
  },
  segmentTab: {
    flex: 1, paddingVertical: 10,
    flexDirection: 'row-reverse',
    justifyContent: 'center', alignItems: 'center',
    borderRadius: 11, gap: 6,
  },
  segmentTabActive: {
    backgroundColor: '#0F172A',
  },
  segmentText: { fontSize: 13, fontWeight: '600', color: '#64748B' },
  segmentTextActive: { color: '#fff' },

  card: {
    backgroundColor: '#fff', borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 1,
  },
  cardLoading: { padding: 24, alignItems: 'center' },

  addressContent: {},
  addressRow: { flexDirection: 'row-reverse', padding: 16, alignItems: 'flex-start', gap: 12 },
  addressIconWrap: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: '#0F172A', alignItems: 'center', justifyContent: 'center',
    marginTop: 2,
  },
  addressTextWrap: { flex: 1, alignItems: 'flex-end' },
  addressLabel: { fontSize: 15, fontWeight: '700', color: '#0F172A', textAlign: 'right', marginBottom: 4 },
  addressDetail: { fontSize: 13, color: '#64748B', textAlign: 'right', lineHeight: 18 },
  addressPhone: { fontSize: 13, color: '#94A3B8', textAlign: 'right', marginTop: 4 },
  editBtn: {
    backgroundColor: '#F8FAFC', paddingVertical: 12,
    justifyContent: 'center', alignItems: 'center',
    borderTopWidth: 1, borderTopColor: '#F1F5F9',
  },
  editBtnText: { color: '#0F172A', fontSize: 14, fontWeight: '600' },

  addAddressBtn: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', padding: 24, gap: 10 },
  addIconWrap: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: '#EFF6FF', alignItems: 'center', justifyContent: 'center',
  },
  addAddressText: { color: '#3B82F6', fontSize: 15, fontWeight: '600' },

  branchContent: { flexDirection: 'row-reverse', padding: 16, alignItems: 'center', gap: 12 },
  branchIconWrap: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: '#EFF6FF', alignItems: 'center', justifyContent: 'center',
  },
  branchTextWrap: { flex: 1, alignItems: 'flex-end' },
  branchName: { fontSize: 15, fontWeight: '700', color: '#0F172A', textAlign: 'right', marginBottom: 2 },
  branchAddr: { fontSize: 13, color: '#64748B', textAlign: 'right' },
  changeBtn: {
    backgroundColor: '#F8FAFC', paddingVertical: 12,
    justifyContent: 'center', alignItems: 'center',
    borderTopWidth: 1, borderTopColor: '#F1F5F9',
  },
  changeBtnText: { color: '#3B82F6', fontSize: 14, fontWeight: '600' },

  methodsWrap: { gap: 10, marginBottom: 20 },
  methodCard: {
    flexDirection: 'row-reverse', alignItems: 'center',
    backgroundColor: '#fff', borderRadius: 16,
    padding: 14, gap: 12,
    borderWidth: 1.5, borderColor: '#E2E8F0',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 4, elevation: 1,
  },
  methodIconWrap: {
    width: 44, height: 44, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  methodInfo: { flex: 1, alignItems: 'flex-end' },
  methodLabel: { fontSize: 15, fontWeight: '700', color: '#0F172A', textAlign: 'right' },
  methodHint: { fontSize: 12, color: '#94A3B8', textAlign: 'right', marginTop: 2 },
  radio: {
    width: 20, height: 20, borderRadius: 10,
    borderWidth: 2, borderColor: '#CBD5E1',
    alignItems: 'center', justifyContent: 'center',
  },
  radioFill: { width: 10, height: 10, borderRadius: 5 },

  summaryCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 4, elevation: 1,
  },
  summaryTitle: { fontSize: 15, fontWeight: '700', color: '#0F172A', textAlign: 'right', marginBottom: 12 },
  summaryRow: {
    flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 6,
  },
  summaryLabel: { fontSize: 13, color: '#64748B' },
  summaryValue: { fontSize: 13, fontWeight: '600', color: '#0F172A' },
  summaryDivider: { height: 1, backgroundColor: '#F1F5F9', marginVertical: 8 },
  totalLabel: { fontSize: 14, fontWeight: '700', color: '#0F172A' },
  totalValue: { fontSize: 18, fontWeight: '800', color: '#0F172A' },

  securityBadge: {
    flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center',
    gap: 6, marginBottom: 12, paddingVertical: 8,
  },
  securityText: { fontSize: 12, color: '#94A3B8' },

  checkoutButton: { marginBottom: 20 },
  processingOverlay: { alignItems: 'center', paddingVertical: 16, gap: 8 },
  processingText: { fontSize: 14, color: '#64748B', fontWeight: '600' },

  sdkOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  sdkCard: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 28,
    marginHorizontal: 24,
    width: '100%',
    alignItems: 'center',
    shadowColor: '#000', shadowOpacity: 0.15, shadowOffset: { width: 0, height: 8 }, shadowRadius: 24, elevation: 8,
  },
  sdkStatusContainer: { alignItems: 'center', gap: 12, width: '100%' },
  sdkRing: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' },
  sdkPulse: { ...StyleSheet.absoluteFillObject, borderRadius: 50, backgroundColor: '#E2E8F0' },
  sdkIcon: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.06, shadowOffset: { width: 0, height: 2 }, shadowRadius: 8, elevation: 2 },
  sdkTitle: { fontSize: 17, fontWeight: '700', color: '#0F172A', textAlign: 'center' },
  sdkSubtext: { fontSize: 13, color: '#94A3B8', textAlign: 'center' },
  sdkTag: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6, backgroundColor: '#EFF6FF', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 5, marginTop: 2 },
  sdkTagDot: { width: 7, height: 7, borderRadius: 4 },
  sdkTagText: { fontSize: 11, fontWeight: '600', color: '#2563EB' },
  sdkPendingRing: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#FEF3C7', alignItems: 'center', justifyContent: 'center' },
  sdkPendingCircle: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  sdkPendingTitle: { fontSize: 17, fontWeight: '700', color: '#F59E0B', textAlign: 'center' },
  sdkPollText: { fontSize: 12, color: '#94A3B8' },
  sdkDismissBtn: { backgroundColor: '#FEF3C7', borderRadius: 20, paddingHorizontal: 20, paddingVertical: 8, marginTop: 4 },
  sdkDismissText: { fontSize: 13, fontWeight: '700', color: '#F59E0B' },
  sdkSuccessRing: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#DCFCE7', alignItems: 'center', justifyContent: 'center' },
  sdkSuccessCircle: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  sdkSuccessTitle: { fontSize: 18, fontWeight: '800', color: '#16A34A', textAlign: 'center' },
  sdkErrorRing: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#FEE2E2', alignItems: 'center', justifyContent: 'center' },
  sdkErrorCircle: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  sdkErrorTitle: { fontSize: 18, fontWeight: '800', color: '#DC2626', textAlign: 'center' },
  sdkErrorActions: { flexDirection: 'row-reverse', gap: 10, marginTop: 8 },
  sdkRetryBtn: { flexDirection: 'row-reverse', alignItems: 'center', backgroundColor: '#0F172A', borderRadius: 12, paddingVertical: 10, paddingHorizontal: 20, gap: 6 },
  sdkRetryText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  sdkCancelBtn: { paddingVertical: 10, paddingHorizontal: 16, justifyContent: 'center' },
  sdkCancelText: { color: '#64748B', fontSize: 14, fontWeight: '600' },
});
