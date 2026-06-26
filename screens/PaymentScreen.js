import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import { ChevronLeft, ChevronRight, MapPin } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Button from '../components/Button';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { useTranslation } from '../context/AppSettingsContext';
import { useDirection } from '../hooks/useDirection';
import { db } from '../services/api';
import { COLORS } from '../constants';
import { supabase, supabaseUrl } from '../services/supabase';

const PAYMENT_METHODS = [
  {
    id: 'cod',
    label: 'الدفع عند الاستلام (كاش)',
    hint: 'ادفع نقداً عند استلام الطلب',
  },
];

export default function PaymentScreen({ navigation, route }) {
  const { t } = useTranslation();
  const dir = useDirection();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { clearCart: clearAppCart, coupon } = useApp();
  const [deliveryType, setDeliveryType] = useState('delivery');
  const [deliveryAddress, setDeliveryAddress] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [branches, setBranches] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState(null);

  useEffect(() => {
    fetchAddresses();
    fetchBranches();
  }, [user?.id]);

  const fetchAddresses = async () => {
    if (!user?.id) return;
    try {
      const addresses = await db.getAddresses(user.id);
      const defaultAddr = addresses?.find(a => a.isDefault) || addresses?.[0];
      if (defaultAddr) {
        setDeliveryAddress(defaultAddr);
      }
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

  const openEditAddress = () => {
    navigation.navigate('DeliveryLocations', {
      onReturn: (address) => {
        setDeliveryAddress(address);
      },
    });
  };

  const openChangeBranch = () => {
    navigation.navigate('Locations', {
      onReturn: (branch) => {
        setSelectedBranch(branch);
      },
    });
  };

  const handleCheckout = async () => {
    if (!user?.id) {
      Alert.alert(t('auth.login'), t('auth.mustLogin'));
      return;
    }

    try {
      const routeParams = route?.params;
      const items = routeParams?.selectedItems || [];
      const orderNotes = routeParams?.notes || '';
      const subtotal = items.reduce((sum, item) => sum + (Number(item.unitPrice) || 0) * (item.quantity || 1), 0);
      const shippingCost = deliveryType === 'delivery' ? 90 : 0;
      const discount = coupon?.discount ? Math.round(subtotal * (coupon.discount / 100)) : 0;
      const total = subtotal - discount + shippingCost;

      if (!items || items.length === 0) {
        Alert.alert(t('payment.cartEmpty'), t('payment.addProductsFirst'));
        return;
      }

      setProcessing(true);

      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || '';

      const idempotencyKey = Date.now().toString(36) + Math.random().toString(36).slice(2);

      const edgeBody = {
        idempotencyKey,
        paymentMethod: 'COD',
        paymentMethodIds: [],
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

      if (!res.ok) {
        setProcessing(false);
        Alert.alert(t('common.error'), data?.error || data?.message || t('payment.serverError', { code: res.status }));
        return;
      }

      if (data?.error) {
        setProcessing(false);
        Alert.alert(t('common.error'), data.error);
        return;
      }

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
    } catch (error) {
      setProcessing(false);
      console.error('Checkout error:', error);
      Alert.alert(t('common.error'), t('payment.orderError'));
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={[styles.headerContainer, { paddingTop: insets.top + 10 }]}>
        <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
        <View style={styles.headerContent}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()} activeOpacity={0.7}>
            <ChevronLeft color={COLORS.text} size={24} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('payment.title')}</Text>
          <View style={styles.spacer} />
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        <View style={styles.segmentedControlContainer}>
          <TouchableOpacity
            style={[styles.segmentTab, deliveryType === 'branch' && styles.activeSegmentTab]}
            onPress={() => setDeliveryType('branch')}
          >
            <Text style={[styles.segmentText, deliveryType === 'branch' && styles.activeSegmentText]}>
              {t('payment.pickup')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.segmentTab, deliveryType === 'delivery' && styles.activeSegmentTab]}
            onPress={() => setDeliveryType('delivery')}
          >
            <Text style={[styles.segmentText, deliveryType === 'delivery' && styles.activeSegmentText]}>
              {t('payment.delivery')}
            </Text>
          </TouchableOpacity>
        </View>

        {deliveryType === 'delivery' && (
          <View style={styles.addressCard}>
            {loading ? (
              <ActivityIndicator size="small" color="#64748B" />
            ) : deliveryAddress ? (
              <>
                <View style={styles.addressInfoRow}>
                  <View style={styles.radioOuter}><View style={styles.radioInner} /></View>
                  <View style={styles.addressTextContainer}>
                    <Text style={styles.addressTextBold}>{deliveryAddress.label || deliveryAddress.city}</Text>
                    <Text style={styles.addressText}>{deliveryAddress.street}{deliveryAddress.region ? ` - ${deliveryAddress.region}` : ''}</Text>
                    <Text style={styles.addressTextPhone}>+20 {deliveryAddress.phone}</Text>
                  </View>
                </View>
                <TouchableOpacity style={styles.editButton} onPress={openEditAddress}>
                  <Text style={styles.editButtonText}>{t('payment.editAddress')}</Text>
                </TouchableOpacity>
              </>
            ) : (
              <TouchableOpacity style={styles.addAddressBtn} onPress={openEditAddress}>
                <MapPin size={20} color="#3B82F6" />
                <Text style={styles.addAddressText}>{t('payment.addAddress')}</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {deliveryType === 'branch' && (
          <View style={styles.branchCard}>
            <MapPin size={24} color="#3B82F6" />
            <Text style={styles.branchText}>
              {t('payment.branchInfo', { name: selectedBranch?.nameAr || selectedBranch?.name || 'الفرع' })}
            </Text>
            <Text style={styles.branchSubtext}>{selectedBranch?.address || selectedBranch?.addressAr || ''}</Text>
            <TouchableOpacity style={styles.changeBranchBtn} onPress={openChangeBranch}>
              <Text style={styles.changeBranchText}>{t('payment.changeBranch')}</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.paymentMethodsCard}>
          <Text style={styles.paymentSectionTitle}>{t('payment.chooseMethod')}</Text>

          {PAYMENT_METHODS.map((method) => (
            <TouchableOpacity
              key={method.id}
              style={[styles.methodRow, styles.selectedMethodRow]}
            >
              <View style={styles.methodInner}>
                <Text style={styles.codText}>{t('payment.cod')}</Text>
              </View>
            </TouchableOpacity>
          ))}
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
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.white },
  headerContainer: {
    backgroundColor: COLORS.white,
    paddingBottom: 12,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
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
    backgroundColor: COLORS.gray50, alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: 18, fontWeight: '600', color: COLORS.text, textAlign: 'center' },
  spacer: { width: 40 },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 40 },
  segmentedControlContainer: {
    flexDirection: 'row-reverse',
    backgroundColor: '#F1F5F9',
    borderRadius: 20,
    padding: 4,
    marginVertical: 16,
  },
  segmentTab: {
    flex: 1, paddingVertical: 10,
    justifyContent: 'center', alignItems: 'center', borderRadius: 16,
  },
  activeSegmentTab: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000', shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 2 }, shadowRadius: 4, elevation: 2,
  },
  segmentText: { fontSize: 14, fontWeight: '500', color: '#64748B' },
  activeSegmentText: { color: '#0F172A', fontWeight: '700' },
  addressCard: {
    backgroundColor: '#0F172A', borderRadius: 16,
    overflow: 'hidden', marginBottom: 20,
  },
  addressInfoRow: { flexDirection: 'row-reverse', padding: 16, alignItems: 'flex-start' },
  radioOuter: {
    width: 20, height: 20, borderRadius: 10,
    borderWidth: 2, borderColor: COLORS.white,
    justifyContent: 'center', alignItems: 'center', marginRight: 12, marginTop: 2,
  },
  radioInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: COLORS.white },
  addressTextContainer: { flex: 1, alignItems: 'flex-end' },
  addressTextBold: { fontSize: 15, fontWeight: '700', color: COLORS.white, textAlign: 'right', marginBottom: 4 },
  addressText: { fontSize: 13, color: '#94A3B8', textAlign: 'right', marginBottom: 2 },
  addressTextPhone: { fontSize: 13, color: '#94A3B8', marginTop: 4 },
  editButton: {
    backgroundColor: 'rgba(255,255,255,0.08)', paddingVertical: 12,
    justifyContent: 'center', alignItems: 'center',
    borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)',
  },
  editButtonText: { color: COLORS.white, fontSize: 15, fontWeight: '600' },
  addAddressBtn: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', padding: 20, gap: 10 },
  addAddressText: { color: '#3B82F6', fontSize: 15, fontWeight: '600' },
  branchCard: {
    backgroundColor: '#F0F7FF', borderRadius: 16, padding: 20, marginBottom: 20,
    alignItems: 'center', borderWidth: 1.5, borderColor: '#BFDBFE',
  },
  branchText: { fontSize: 15, fontWeight: '700', color: '#0F172A', textAlign: 'center', marginTop: 12, marginBottom: 4 },
  branchSubtext: { fontSize: 13, color: '#64748B', textAlign: 'center', marginBottom: 12 },
  changeBranchBtn: { backgroundColor: '#fff', borderRadius: 10, paddingHorizontal: 16, paddingVertical: 8, borderWidth: 1, borderColor: '#E2E8F0' },
  changeBranchText: { fontSize: 13, fontWeight: '600', color: '#3B82F6' },
  paymentMethodsCard: { backgroundColor: '#F8FAFC', borderRadius: 24, padding: 16, marginBottom: 20 },
  paymentSectionTitle: {
    fontSize: 16, fontWeight: '700', color: '#0F172A',
    textAlign: 'right', marginBottom: 16,
  },
  methodRow: {
    backgroundColor: COLORS.white, borderRadius: 14,
    paddingVertical: 14, paddingHorizontal: 16,
    marginVertical: 5, borderWidth: 1.5, borderColor: '#E2E8F0',
  },
  selectedMethodRow: { borderColor: '#0F172A', backgroundColor: '#F8FAFC' },
  methodInner: {
    flexDirection: 'row-reverse', justifyContent: 'center', alignItems: 'center',
  },
  codText: { fontSize: 14, fontWeight: '600', color: '#0F172A', textAlign: 'center', flex: 1 },
  checkoutButton: { marginTop: 8, marginBottom: 20 },
  processingOverlay: { alignItems: 'center', paddingVertical: 16, gap: 8 },
  processingText: { fontSize: 14, color: '#64748B', fontWeight: '600' },
});
