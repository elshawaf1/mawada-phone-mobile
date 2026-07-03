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
  AppState,
  Animated,
  LayoutAnimation,
  UIManager,
  Image,
  BackHandler,
} from 'react-native';
import { ChevronLeft, MapPin, CreditCard, Wallet, Banknote, Check, ChevronDown, Zap, Edit3, Smartphone, Copy, CheckCheck } from 'lucide-react-native';
import * as Clipboard from 'expo-clipboard';
import * as ImagePicker from 'expo-image-picker';
import LottieView from 'lottie-react-native';

if (Platform.OS === 'android') UIManager.setLayoutAnimationEnabledExperimental?.(true);
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Paymob, { PaymentStatus } from 'paymob-reactnative';
import Button from '../components/Button';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { useTranslation } from '../context/AppSettingsContext';
import { db } from '../services/api';
import { COLORS } from '../constants';
import { supabase, supabaseUrl } from '../services/supabase';

const PAYMOB_PUBLIC_KEY = process.env.EXPO_PUBLIC_PAYMOB_PUBLIC_KEY || 'egy_pk_test_HSbekPvBcPJ9igAPXm0xJp0cVRvPa0pT';
const POLL_INTERVAL = 3000;
const POLL_MAX_ATTEMPTS = 20;
const CARD_INTEGRATION_ID = process.env.EXPO_PUBLIC_PAYMOB_CARD_INTEGRATION_ID || '5252066';
const WALLET_INTEGRATION_ID = process.env.EXPO_PUBLIC_PAYMOB_WALLET_INTEGRATION_ID || '5744962';

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
    label: 'بِطَاقَة بَنْكِيَّة',
    hint: 'الدَّفْع عَبْر بِطَاقَة بَنْكِيَّة',
    Icon: CreditCard,
    color: '#7C3AED',
    bgColor: '#F5F3FF',
    integrationIdKey: 'EXPO_PUBLIC_PAYMOB_CARD_INTEGRATION_ID',
  },
  {
    id: 'wallet',
    type: 'WALLET',
    label: 'مَحْفَظَة إِلِكْتُرُونِيَّة',
    hint: 'فودافون كاش • أورانج كاش • إيصالات كاش • وي كاش',
    Icon: Wallet,
    color: '#2563EB',
    bgColor: '#EFF6FF',
    integrationIdKey: 'EXPO_PUBLIC_PAYMOB_WALLET_INTEGRATION_ID',
  },
  {
    id: 'instapay',
    type: 'INSTAPAY',
    labelKey: 'payment.instapay',
    hintKey: 'payment.instapayHint',
    Icon: Smartphone,
    color: '#059669',
    bgColor: '#ECFDF5',
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
  const [summaryExpanded, setSummaryExpanded] = useState(true);
  const [productsExpanded, setProductsExpanded] = useState(true);
  const [branches, setBranches] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState(null);
  const [watchOrderId, setWatchOrderId] = useState(null);
  const [showInstapayGuide, setShowInstapayGuide] = useState(false);
  const [showInstapayProof, setShowInstapayProof] = useState(false);
  const [instapayOrderId, setInstapayOrderId] = useState(null);
  const [instapayOrderData, setInstapayOrderData] = useState(null);
  const [uploadingProof, setUploadingProof] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  const sdkCallbackFired = useRef(false);
  const pollTimer = useRef(null);
  const navigatedRef = useRef(false);
  const appStateRef = useRef(AppState.currentState);
  const mountedRef = useRef(true);
  const orderDataRef = useRef(null);
  const pollingStarted = useRef(false);
  const lastForegroundVerifyRef = useRef(0);

  useEffect(() => {
    fetchAddresses();
    fetchBranches();
  }, [user?.id]);

  useEffect(() => {
    const onBackPress = () => {
      if (processing) {
        setProcessing(false);
        return true;
      }
      return false;
    };
    const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => sub.remove();
  }, [processing]);

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

  const navigateToSuccess = useCallback(() => {
    if (navigatedRef.current) return;
    navigatedRef.current = true;
    const od = orderDataRef.current;
    if (!od) return;
    navigation.reset({
      index: 0,
      routes: [{ name: 'OrderConfirm', params: { order: { ...od, paymentMethod: od.paymentMethod, paymentStatus: 'PAID' } } }],
    });
  }, [navigation]);

  const verifyWithServer = useCallback(async (orderId) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || '';
      const res = await fetch(`${supabaseUrl}/functions/v1/paymob-verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ orderId }),
      });
      const data = await res.json();
      console.log('[Paymob] verifyWithServer result:', JSON.stringify(data));
      return data?.status || null;
    } catch (err) {
      console.error('[Paymob] verifyWithServer error:', err);
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
        setProcessing(false);
        Alert.alert(t('payment.paymentFailed'), t('payment.retryPayment'));
        return true;
      }
      return false;
    } catch {
      return false;
    }
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
          setProcessing(false);
          Alert.alert(t('payment.paymentFailed'), t('payment.retryPayment'));
          return;
        }
      }

      // Also check local DB (in case webhook already updated it)
      const found = await checkOrderStatus();
      if (!found && mountedRef.current && !navigatedRef.current) {
        pollTimer.current = setTimeout(() => doPoll(attempt + 1), POLL_INTERVAL);
      }
    };
    pollTimer.current = setTimeout(() => doPoll(0), 2000);
  }, [checkOrderStatus, verifyWithServer, navigateToSuccess, t]);

  const handleAppStateChange = useCallback(async (nextState) => {
    const prev = appStateRef.current;
    appStateRef.current = nextState;
    if (prev.match(/background|inactive/) && nextState === 'active') {
      const now = Date.now();
      if (now - lastForegroundVerifyRef.current < 3000) return;
      lastForegroundVerifyRef.current = now;
      console.log('[Paymob] App returned to foreground — verifying payment');
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

  useEffect(() => {
    if (!watchOrderId) return;
    const channel = supabase
      .channel(`pay-order-${watchOrderId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'orders', filter: `id=eq.${watchOrderId}` },
        (payload) => {
          const newStatus = payload.new?.paymentStatus;
          console.log('[Paymob] Realtime order update:', newStatus);
          if (newStatus === 'PAID' && !navigatedRef.current) {
            navigateToSuccess();
          } else if (newStatus === 'FAILED' && !navigatedRef.current) {
            setProcessing(false);
            Alert.alert(t('payment.paymentFailed'), t('payment.retryPayment'));
          }
        },
      )
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [watchOrderId, navigateToSuccess, t]);

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
    pollingStarted.current = false;
    setWatchOrderId(orderData.orderId);

    if (pollTimer.current) { clearTimeout(pollTimer.current); pollTimer.current = null; }

    Paymob.setAppName('Mawada Phone');
    Paymob.setShowSaveCard(true);
    Paymob.setSaveCardDefault(false);
    Paymob.setShowConfirmationPage(false);
    Paymob.setShowTransactionResult(false);

    Paymob.setSdkListener(async (response) => {
      console.log('[Paymob] SDK callback:', JSON.stringify(response));
      sdkCallbackFired.current = true;
      const status = response?.status || response;
      console.log('[Paymob] Status:', status);

      if (status === PaymentStatus.SUCCESS) {
        console.log('[Paymob] SDK SUCCESS — verifying with Paymob API');
        const serverStatus = await verifyWithServer(orderData.orderId);
        if (serverStatus === 'PAID') {
          navigateToSuccess();
        } else {
          // DB not updated yet, start polling
          console.log('[Paymob] After SUCCESS verify, status:', serverStatus, '— polling');
          if (!pollingStarted.current) {
            pollingStarted.current = true;
            startPolling();
          }
        }
      } else {
        // SDK returned Fail/Cancel/etc — verify with Paymob API directly
        console.log('[Paymob] SDK not SUCCESS — verifying via server');
        const serverStatus = await verifyWithServer(orderData.orderId);
        if (serverStatus === 'PAID') {
          navigateToSuccess();
        } else {
          setProcessing(false);
          if (serverStatus === 'FAILED') {
            Alert.alert(t('payment.paymentFailed'), t('payment.retryPayment'));
          }
          if (serverStatus === 'PENDING' && !pollingStarted.current) {
            pollingStarted.current = true;
            startPolling();
          }
        }
      }
    });

    try {
      Paymob.presentPayVC(clientSecret, PAYMOB_PUBLIC_KEY);
      if (!pollingStarted.current) {
        pollingStarted.current = true;
        console.log('[Paymob] Starting immediate polling fallback');
        pollTimer.current = setTimeout(() => {
          if (mountedRef.current && !navigatedRef.current) {
            startPolling();
          }
        }, 5000);
      }
    } catch (err) {
      console.error('[Paymob] presentPayVC error:', err);
      setProcessing(false);
      Alert.alert(t('common.error'), t('payment.paymentInitFailed'));
    }
  }, [navigateToSuccess, startPolling, verifyWithServer, t]);

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

    const isOnline = method.type !== 'COD' && method.type !== 'INSTAPAY';
    if (isOnline) {
      const integrationId = method.id === 'card' ? CARD_INTEGRATION_ID : WALLET_INTEGRATION_ID;
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

      const integrationId = method.id === 'card' ? CARD_INTEGRATION_ID : WALLET_INTEGRATION_ID;
      const paymentMethodIds = isOnline && integrationId ? [parseInt(integrationId)] : [];

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
      } else if (method.type === 'INSTAPAY') {
        await db.clearCart(user.id);
        clearAppCart();
        setProcessing(false);
        setInstapayOrderId(data.orderId);
        setInstapayOrderData({
          id: data.orderId,
          orderNumber: data.orderNumber,
          paymentMethod: 'INSTAPAY',
          paymentStatus: 'PENDING',
          subtotal,
          shippingCost,
          discount,
          total,
          order_items: items.map((item) => ({
            ...item,
            nameAr: item.name || t('common.product'),
            unitPrice: item.unitPrice,
          })),
        });
        setShowInstapayGuide(true);
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

  const INSTAPAY_LINK = 'https://ipn.eg/S/chdzw/instapay/9f8SGC';

  const handleCopyLink = async () => {
    await Clipboard.setStringAsync(INSTAPAY_LINK);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  };

  const handlePickProof = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(t('common.error'), 'يجب منح صلاحية الوصول للصور');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      allowsEditing: true,
      aspect: [4, 3],
    });
    if (!result.canceled) {
      await uploadProof(result.assets[0].uri);
    }
  };

  const handleTakeProof = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(t('common.error'), 'يجب منح صلاحية الوصول للكاميرا');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      quality: 0.8,
      allowsEditing: true,
      aspect: [4, 3],
    });
    if (!result.canceled) {
      await uploadProof(result.assets[0].uri);
    }
  };

  const uploadProof = async (uri) => {
    setUploadingProof(true);
    try {
      const fileName = `proof_${instapayOrderId}_${Date.now()}.jpg`;
      const response = await fetch(uri);
      const blob = await response.blob();
      const { error: uploadErr } = await supabase.storage
        .from('payment-proof-images')
        .upload(fileName, blob, { contentType: 'image/jpeg' });
      if (uploadErr) throw uploadErr;
      const { data: urlData } = supabase.storage
        .from('payment-proof-images')
        .getPublicUrl(fileName);
      await supabase.from('orders').update({
        paymentProofUrl: urlData.publicUrl,
        paymentProofStatus: 'PENDING',
      }).eq('id', instapayOrderId);
      setShowInstapayProof(false);
      navigation.replace('OrderConfirm', {
        order: { ...instapayOrderData, paymentProofStatus: 'PENDING' },
      });
    } catch (err) {
      console.error('Upload proof error:', err);
      Alert.alert(t('common.error'), 'فشل في رفع الصورة');
    } finally {
      setUploadingProof(false);
    }
  };

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

        {/* Address / Branch — Borderless Layered */}
        {deliveryType === 'delivery' && (
          <View style={styles.locModule}>
            {loading ? (
              <View style={styles.cardLoading}>
                <ActivityIndicator size="small" color="#94A3B8" />
              </View>
            ) : deliveryAddress ? (
              <View style={styles.locLayer}>
                <View style={styles.locIconWrap}>
                  <LottieView
                    source={require('../assets/wired-lineal-18-location-pin-hover-jump.json')}
                    autoPlay
                    loop
                    style={{ width: 36, height: 36 }}
                  />
                </View>
                <View style={styles.locTextWrap}>
                  <Text style={styles.locLabel}>{deliveryAddress.label || deliveryAddress.city}</Text>
                  <Text style={styles.locDetail}>{deliveryAddress.street}{deliveryAddress.region ? ` - ${deliveryAddress.region}` : ''}</Text>
                  <Text style={styles.locPhone}>+20 {deliveryAddress.phone}</Text>
                </View>
                <TouchableOpacity
                  style={styles.locEditBtn}
                  onPress={() => navigation.navigate('DeliveryLocations', { onReturn: setDeliveryAddress })}
                  activeOpacity={0.7}
                >
                  <Edit3 size={15} color="#3B82F6" strokeWidth={2.2} />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity style={styles.locEmpty} onPress={() => navigation.navigate('DeliveryLocations', { onReturn: setDeliveryAddress })} activeOpacity={0.7}>
                <LottieView
                  source={require('../assets/wired-lineal-18-location-pin-hover-jump.json')}
                  autoPlay
                  loop
                  style={{ width: 40, height: 40 }}
                />
                <Text style={styles.locEmptyText}>{t('payment.addAddress')}</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {deliveryType === 'branch' && (
          <View style={styles.locModule}>
            <View style={styles.locLayer}>
              <View style={styles.locIconWrap}>
                <LottieView
                  source={require('../assets/wired-lineal-18-location-pin-hover-jump.json')}
                  autoPlay
                  loop
                  style={{ width: 36, height: 36 }}
                />
              </View>
              <View style={styles.locTextWrap}>
                <Text style={styles.locLabel}>{selectedBranch?.nameAr || selectedBranch?.name || 'الفرع'}</Text>
                <Text style={styles.locDetail}>{selectedBranch?.address || selectedBranch?.addressAr || ''}</Text>
              </View>
              <TouchableOpacity style={styles.locEditBtn} onPress={() => navigation.navigate('Locations', { onReturn: setSelectedBranch })} activeOpacity={0.7}>
                <Edit3 size={15} color="#3B82F6" strokeWidth={2.2} />
              </TouchableOpacity>
            </View>
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
            const label = method.label ? method.label : t(method.labelKey);
            const hint = method.hint ? method.hint : t(method.hintKey);
            return (
              <TouchableOpacity
                key={method.id}
                style={[
                  styles.methodItem,
                  isSelected && { borderColor: '#16A34A', backgroundColor: '#F0FDF4' },
                ]}
                onPress={() => {
                  LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                  setSelectedMethod(method.id);
                }}
                activeOpacity={0.7}
              >
                <View style={[styles.methodIconCircle, { backgroundColor: isSelected ? '#16A34A' : '#F1F5F9' }]}>
                  <Icon size={20} color={isSelected ? '#fff' : '#94A3B8'} />
                </View>
                <View style={styles.methodTextCol}>
                  <Text style={[styles.methodName, isSelected && { color: '#16A34A' }]}>{label}</Text>
                  <Text style={[styles.methodDesc, !isSelected && { color: '#CBD5E1' }]}>{hint}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Products — Expandable */}
        <View style={styles.summaryCard}>
          <TouchableOpacity
            style={styles.summaryHeader}
            onPress={() => {
              LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
              setProductsExpanded(!productsExpanded);
            }}
            activeOpacity={0.7}
          >
            <View style={styles.summaryHeaderRight}>
              <Text style={styles.summaryTitle}>{t('common.products')}</Text>
              <Text style={styles.summaryTotalInline}>{items.length} {t('common.product')}</Text>
            </View>
            <Animated.View style={{ transform: [{ rotate: productsExpanded ? '180deg' : '0deg' }] }}>
              <ChevronDown size={18} color="#94A3B8" />
            </Animated.View>
          </TouchableOpacity>

          {productsExpanded && (
            <View style={styles.summaryDetails}>
              <View style={styles.summaryDivider} />
              {items.map((item, index) => (
                <View key={index} style={styles.productItemRow}>
                  {item.image ? (
                    <Image source={{ uri: item.image }} style={styles.productItemImage} />
                  ) : (
                    <View style={[styles.productItemImage, { backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' }]}>
                      <Text style={{ fontSize: 16, color: '#CBD5E1' }}>📦</Text>
                    </View>
                  )}
                  <View style={styles.productItemInfo}>
                    <Text style={styles.productItemName} numberOfLines={2}>{item.name}</Text>
                    <Text style={styles.productItemQty}>×{item.quantity || 1}</Text>
                  </View>
                  <Text style={styles.productItemPrice}>{formatPrice((Number(item.unitPrice) || 0) * (item.quantity || 1))} {t('common.egp')}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Order Summary — Expandable */}
        <View style={styles.summaryCard}>
          <TouchableOpacity
            style={styles.summaryHeader}
            onPress={() => {
              LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
              setSummaryExpanded(!summaryExpanded);
            }}
            activeOpacity={0.7}
          >
            <View style={styles.summaryHeaderRight}>
              <Text style={styles.summaryTitle}>{t('orders.total')}</Text>
              <Text style={styles.summaryTotalInline}>{formatPrice(total)} {t('common.egp')}</Text>
            </View>
            <Animated.View style={{ transform: [{ rotate: summaryExpanded ? '180deg' : '0deg' }] }}>
              <ChevronDown size={18} color="#94A3B8" />
            </Animated.View>
          </TouchableOpacity>

          {summaryExpanded && (
            <View style={styles.summaryDetails}>
              <View style={styles.summaryDivider} />
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
              <View style={[styles.summaryDivider, { marginTop: 12 }]} />
              <View style={styles.summaryRow}>
                <Text style={styles.totalValue}>{formatPrice(total)} {t('common.egp')}</Text>
                <Text style={styles.totalLabel}>{t('common.total')}</Text>
              </View>
            </View>
          )}
        </View>

        {/* Return Policy */}
        <View style={styles.returnPolicySection}>
          <View style={styles.returnPolicyHeader}>
            <Text style={styles.returnPolicyTitle}>{t('payment.returnPolicy')}</Text>
          </View>
          <Text style={styles.returnPolicyItem}>• {t('payment.return14')}</Text>
          <Text style={styles.returnPolicyItem}>• {t('payment.return30')}</Text>
          <Text style={styles.returnPolicyItem}>• {t('payment.zeroGuarantee')}</Text>
          <Text style={styles.returnPolicyItem}>• {t('payment.intlGuarantee')}</Text>
          <Text style={styles.returnPolicyItem}>• {t('payment.usedGuarantee')}</Text>
          <Text style={styles.returnPolicyItem}>• {t('payment.accessoryReturn')}</Text>
          <Text style={styles.returnPolicyItem}>• {t('payment.warrantyReplace')}</Text>
          <Text style={styles.returnPolicyItem}>• {t('payment.invoiceRequired')}</Text>
        </View>

        {processing && (
          <View style={styles.processingOverlay}>
            <ActivityIndicator size="large" color="#0F172A" />
            <Text style={styles.processingText}>{t('payment.processing')}</Text>
          </View>
        )}

        <TouchableOpacity
          style={[styles.checkoutFloat, processing && { opacity: 0.6 }]}
          onPress={handleCheckout}
          activeOpacity={0.85}
          disabled={processing}
        >
          <Zap size={16} color="#FFF" fill="#FFF" />
          <Text style={styles.checkoutFloatText}>{t('payment.completeOrder')}</Text>
        </TouchableOpacity>

      </ScrollView>

      {/* InstaPay Step Guide Modal */}
      {showInstapayGuide && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalBackdrop} />
          <View style={styles.modalCard}>
            <View style={styles.modalHandleRow}><View style={styles.modalHandle} /></View>
            <View style={styles.modalHeader}>
              <View style={[styles.modalIconCircle, { backgroundColor: '#ECFDF5' }]}>
                <Smartphone size={24} color="#059669" />
              </View>
              <Text style={styles.modalTitle}>{t('payment.instapayGuideTitle')}</Text>
            </View>

            {[
              { num: 1, titleKey: 'instapayStep1', subKey: 'instapayStep1Sub' },
              { num: 2, titleKey: 'instapayStep2', subKey: 'instapayStep2Sub' },
              { num: 3, titleKey: 'instapayStep3', subKey: 'instapayStep3Sub' },
              { num: 4, titleKey: 'instapayStep4', subKey: 'instapayStep4Sub' },
            ].map((step, i) => (
              <View key={step.num} style={styles.guideStepRow}>
                <View style={styles.guideStepLeft}>
                  <View style={[styles.guideStepNum, i < 3 && styles.guideStepNumActive]}>
                    <Text style={[styles.guideStepNumText, i < 3 && { color: '#fff' }]}>{step.num}</Text>
                  </View>
                  {i < 3 && <View style={styles.guideStepLine} />}
                </View>
                <View style={styles.guideStepContent}>
                  <Text style={styles.guideStepTitle}>{t(`payment.${step.titleKey}`)}</Text>
                  <Text style={styles.guideStepSub}>{t(`payment.${step.subKey}`)}</Text>
                </View>
              </View>
            ))}

            <TouchableOpacity
              style={styles.modalBtn}
              onPress={() => { setShowInstapayGuide(false); setShowInstapayProof(true); }}
              activeOpacity={0.85}
            >
              <Text style={styles.modalBtnText}>{t('payment.instapayGotIt')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* InstaPay Proof Upload Modal */}
      {showInstapayProof && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalBackdrop} />
          <View style={styles.modalCard}>
            <View style={styles.modalHandleRow}><View style={styles.modalHandle} /></View>
            <View style={styles.modalHeader}>
              <View style={[styles.modalIconCircle, { backgroundColor: '#ECFDF5' }]}>
                <Smartphone size={24} color="#059669" />
              </View>
              <Text style={styles.modalTitle}>{t('payment.instapay')}</Text>
            </View>

            {/* Link section */}
            <View style={styles.linkCard}>
              <Text style={styles.linkLabel}>{t('payment.instapayLinkLabel')}</Text>
              <View style={styles.linkRow}>
                <Text style={styles.linkText} numberOfLines={1}>{INSTAPAY_LINK}</Text>
                <TouchableOpacity style={styles.linkCopyBtn} onPress={handleCopyLink} activeOpacity={0.7}>
                  {linkCopied ? (
                    <CheckCheck size={18} color="#059669" />
                  ) : (
                    <Copy size={18} color="#64748B" />
                  )}
                </TouchableOpacity>
              </View>
              <View style={styles.usernameRow}>
                <Text style={styles.usernameLabel}>{t('payment.instapayUsername')}</Text>
              </View>
            </View>

            {/* Upload buttons */}
            <View style={styles.uploadBtnsRow}>
              <TouchableOpacity
                style={styles.uploadBtnPrimary}
                onPress={handlePickProof}
                activeOpacity={0.85}
                disabled={uploadingProof}
              >
                {uploadingProof ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.uploadBtnPrimaryText}>{t('payment.instapaySend')}</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.uploadBtnSecondary}
                onPress={handleTakeProof}
                activeOpacity={0.85}
                disabled={uploadingProof}
              >
                <Text style={styles.uploadBtnSecondaryText}>📸</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.modalCancelBtn}
              onPress={() => { setShowInstapayProof(false); setProcessing(false); navigation.goBack(); }}
              activeOpacity={0.7}
            >
              <Text style={styles.modalCancelText}>{t('payment.instapayCancel')}</Text>
            </TouchableOpacity>
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
  stepLine: { width: 40, height: 1.5, backgroundColor: '#E2E8F0', marginHorizontal: 4 },
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
    borderRadius: 16,
    marginBottom: 16,
  },
  cardLoading: { padding: 24, alignItems: 'center' },

  /* ── Location Module — Borderless Layered ── */
  locModule: {
    backgroundColor: '#F8FAFC', borderRadius: 16,
    marginBottom: 16, padding: 2,
  },
  locLayer: {
    flexDirection: 'row-reverse', alignItems: 'center', gap: 12, padding: 14,
  },
  locIconWrap: {
    width: 44, height: 44, borderRadius: 14,
    backgroundColor: '#EFF6FF', alignItems: 'center', justifyContent: 'center',
  },
  locTextWrap: { flex: 1, alignItems: 'flex-end' },
  locLabel: { fontSize: 15, fontWeight: '700', color: '#0F172A', textAlign: 'right', marginBottom: 3 },
  locDetail: { fontSize: 12, color: '#64748B', textAlign: 'right', lineHeight: 17 },
  locPhone: { fontSize: 12, color: '#94A3B8', textAlign: 'right', marginTop: 3, fontWeight: '500' },
  locEditBtn: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: '#EFF6FF', alignItems: 'center', justifyContent: 'center',
  },
  locEmpty: {
    flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center',
    padding: 22, gap: 10,
  },
  locEmptyText: { color: '#3B82F6', fontSize: 14, fontWeight: '600' },

  /* ── Payment Methods — Border Only On Selection ── */
  methodsWrap: { gap: 8, marginBottom: 20 },
  methodItem: {
    flexDirection: 'row-reverse', alignItems: 'center',
    backgroundColor: '#F8FAFC', borderRadius: 14,
    padding: 12, gap: 12,
    borderWidth: 1.5, borderColor: 'transparent',
  },
  methodIconCircle: {
    width: 40, height: 40, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  methodTextCol: { flex: 1, alignItems: 'flex-end' },
  methodName: { fontSize: 14, fontWeight: '700', color: '#94A3B8', textAlign: 'right' },
  methodDesc: { fontSize: 11, color: '#CBD5E1', textAlign: 'right', marginTop: 1 },
  radioDot: {
    width: 18, height: 18, borderRadius: 9,
    borderWidth: 2, borderColor: '#E2E8F0',
    alignItems: 'center', justifyContent: 'center',
  },
  radioInner: { width: 8, height: 8, borderRadius: 4 },

  summaryCard: {
    backgroundColor: '#fff', borderRadius: 16, marginBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 4, elevation: 1,
    overflow: 'hidden',
  },
  summaryHeader: {
    flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center',
    padding: 16,
  },
  summaryHeaderRight: { flex: 1, alignItems: 'flex-end' },
  summaryTitle: { fontSize: 13, fontWeight: '600', color: '#94A3B8', textAlign: 'right', marginBottom: 2 },
  summaryTotalInline: { fontSize: 18, fontWeight: '800', color: '#0F172A', textAlign: 'right', letterSpacing: -0.3 },
  summaryDetails: { padding: 0, paddingHorizontal: 16, paddingBottom: 16 },
  summaryRow: {
    flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 6,
  },
  summaryLabel: { fontSize: 13, color: '#64748B' },
  summaryValue: { fontSize: 13, fontWeight: '600', color: '#0F172A' },
  summaryDivider: { height: 1, backgroundColor: '#F1F5F9', marginVertical: 8 },
  totalLabel: { fontSize: 14, fontWeight: '700', color: '#0F172A' },
  totalValue: { fontSize: 18, fontWeight: '800', color: '#0F172A' },

  productItemRow: {
    flexDirection: 'row-reverse', alignItems: 'center',
    paddingVertical: 8,
  },
  productItemImage: {
    width: 48, height: 48, borderRadius: 10,
    marginLeft: 10, backgroundColor: '#F8FAFC',
  },
  productItemInfo: { flex: 1 },
  productItemName: {
    fontSize: 13, fontWeight: '600', color: '#0F172A',
    textAlign: 'right', lineHeight: 18,
  },
  productItemQty: {
    fontSize: 12, color: '#94A3B8', textAlign: 'right', marginTop: 2,
  },
  productItemPrice: {
    fontSize: 13, fontWeight: '700', color: '#0F172A',
    textAlign: 'left', marginLeft: 8,
  },

  returnPolicySection: {
    backgroundColor: '#F8FAFC', borderRadius: 12,
    borderWidth: 1, borderColor: '#E2E8F0',
    padding: 12, marginBottom: 16,
  },
  returnPolicyHeader: { flexDirection: 'row-reverse', alignItems: 'center', marginBottom: 10 },
  returnPolicyTitle: { fontSize: 14, fontWeight: '700', color: '#0F172A', textAlign: 'right' },
  returnPolicyItem: { fontSize: 14, fontWeight: '700', color: '#334155', textAlign: 'right', lineHeight: 22, marginBottom: 6, writingDirection: 'rtl' },

  checkoutFloat: {
    flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#0F172A', borderRadius: 50, paddingVertical: 16, marginBottom: 20,
    shadowColor: '#0F172A', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.35, shadowRadius: 20, elevation: 8,
  },
  checkoutFloatText: { color: '#FFF', fontSize: 15, fontWeight: '700', letterSpacing: 0.3 },
  processingOverlay: { alignItems: 'center', paddingVertical: 16, gap: 8 },
  processingText: { fontSize: 14, color: '#64748B', fontWeight: '600' },

  /* InstaPay Modals */
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end', zIndex: 1000,
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalCard: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingHorizontal: 24, paddingBottom: 40,
    maxHeight: '85%',
  },
  modalHandleRow: { alignItems: 'center', paddingVertical: 12 },
  modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#CBD5E1' },
  modalHeader: {
    alignItems: 'center', marginBottom: 20, gap: 12,
  },
  modalIconCircle: {
    width: 56, height: 56, borderRadius: 28,
    alignItems: 'center', justifyContent: 'center',
  },
  modalTitle: {
    fontSize: 20, fontWeight: '800', color: '#0F172A', textAlign: 'center',
  },

  /* Guide Steps */
  guideStepRow: {
    flexDirection: 'row-reverse', marginBottom: 0,
  },
  guideStepLeft: {
    alignItems: 'center', width: 32, marginLeft: 12,
  },
  guideStepNum: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center',
  },
  guideStepNumActive: { backgroundColor: '#059669' },
  guideStepNumText: { fontSize: 13, fontWeight: '700', color: '#94A3B8' },
  guideStepLine: {
    width: 2, height: 28, backgroundColor: '#E2E8F0', marginTop: 4,
  },
  guideStepContent: { flex: 1, paddingVertical: 2 },
  guideStepTitle: { fontSize: 14, fontWeight: '700', color: '#0F172A', textAlign: 'right' },
  guideStepSub: { fontSize: 12, color: '#94A3B8', textAlign: 'right', marginTop: 2, lineHeight: 18 },

  modalBtn: {
    backgroundColor: '#059669', borderRadius: 16,
    paddingVertical: 16, alignItems: 'center', marginTop: 24,
    shadowColor: '#059669', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 12, elevation: 6,
  },
  modalBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  /* Proof Upload */
  linkCard: {
    backgroundColor: '#F8FAFC', borderRadius: 16,
    borderWidth: 1, borderColor: '#E2E8F0',
    padding: 16, marginBottom: 16,
  },
  linkLabel: {
    fontSize: 12, fontWeight: '600', color: '#94A3B8',
    textAlign: 'right', marginBottom: 8,
  },
  linkRow: {
    flexDirection: 'row-reverse', alignItems: 'center',
    backgroundColor: '#fff', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12,
    borderWidth: 1, borderColor: '#E2E8F0', gap: 10,
  },
  linkText: {
    flex: 1, fontSize: 13, fontWeight: '600', color: '#059669',
    textAlign: 'left', writingDirection: 'ltr',
  },
  linkCopyBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center',
  },
  usernameRow: {
    flexDirection: 'row-reverse', justifyContent: 'center', marginTop: 12,
  },
  usernameLabel: {
    fontSize: 16, fontWeight: '800', color: '#0F172A',
    textAlign: 'center',
  },

  uploadBtnsRow: {
    flexDirection: 'row-reverse', gap: 10, marginBottom: 12,
  },
  uploadBtnPrimary: {
    flex: 1, backgroundColor: '#059669', borderRadius: 14,
    paddingVertical: 16, alignItems: 'center', justifyContent: 'center',
    shadowColor: '#059669', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 12, elevation: 6,
  },
  uploadBtnPrimaryText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  uploadBtnSecondary: {
    width: 54, height: 54, borderRadius: 14,
    backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: '#E2E8F0',
  },

  modalCancelBtn: {
    alignItems: 'center', paddingVertical: 12,
  },
  modalCancelText: {
    fontSize: 14, fontWeight: '600', color: '#94A3B8',
  },
});
