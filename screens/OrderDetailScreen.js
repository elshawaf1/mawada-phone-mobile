import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  StatusBar,
  Alert,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { db } from '../services/api';
import { supabase } from '../services/supabase';
import { COLORS } from '../constants';
import ScreenHeader from '../components/ScreenHeader';
import { useTranslation } from '../context/AppSettingsContext';
import { useDirection } from '../hooks/useDirection';

const STATUS_COLORS = {
  PENDING: { bg: '#FEF3C7', text: '#92400E' },
  CONFIRMED: { bg: '#DBEAFE', text: '#1E40AF' },
  PROCESSING: { bg: '#EDE9FE', text: '#6B21A8' },
  SHIPPED: { bg: '#E0E7FF', text: '#3730A3' },
  DELIVERED: { bg: '#D1FAE5', text: '#065F46' },
  CANCELLED: { bg: '#FEE2E2', text: '#991B1B' },
};

const PAYMENT_STATUS_COLORS = {
  PENDING: { bg: '#FEF3C7', text: '#92400E' },
  UNPAID: { bg: '#F1F5F9', text: '#475569' },
  PAID: { bg: '#D1FAE5', text: '#065F46' },
  FAILED: { bg: '#FEE2E2', text: '#991B1B' },
  REFUNDED: { bg: '#EDE9FE', text: '#6B21A8' },
};

const formatPrice = (n) => Number(n || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');

const isPayable = (order) =>
  order.paymentMethod !== 'COD' &&
  ['PENDING', 'UNPAID', 'FAILED'].includes(order.paymentStatus) &&
  order.status === 'PENDING';

const stepState = (currentStatus, stepKey) => {
  const order = ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED'];
  const currentIdx = order.indexOf(currentStatus);
  const stepIdx = order.indexOf(stepKey);
  if (currentIdx === -1) return 'pending';
  if (currentIdx > stepIdx) return 'done';
  if (currentIdx === stepIdx) return 'active';
  return 'pending';
};

export default function OrderDetailScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { t } = useTranslation();
  const orderId = route?.params?.orderId;
  const initialOrder = route?.params?.order || null;
  const [order, setOrder] = useState(initialOrder);
  const [loading, setLoading] = useState(!initialOrder);
  const dir = useDirection();

  const STATUS_LABELS = {
    PENDING: t('orders.statusPending'),
    CONFIRMED: t('orders.statusConfirmed'),
    PROCESSING: t('orders.statusProcessing'),
    SHIPPED: t('orders.statusShipped'),
    DELIVERED: t('orders.statusDelivered'),
    CANCELLED: t('orders.statusCancelled'),
  };

  const PAYMENT_STATUS_LABELS = {
    PENDING: t('orders.payPending'),
    UNPAID: t('orders.payUnpaid'),
    PAID: t('orders.payPaid'),
    FAILED: t('orders.payFailed'),
    REFUNDED: t('orders.payRefunded'),
  };

  const PAYMENT_METHOD_LABELS = {
    VISA: t('orders.methodVisa'),
    WALLET: t('orders.methodWallet'),
    COD: t('orders.methodCod'),
    BRANCH: t('orders.methodBranch'),
  };

  const TIMELINE_STEPS = [
    { key: 'CONFIRMED', label: t('orders.stepConfirmed') },
    { key: 'PROCESSING', label: t('orders.stepPreparing') },
    { key: 'SHIPPED', label: t('orders.stepShipped') },
    { key: 'DELIVERED', label: t('orders.stepDelivered') },
  ];

  const fetchOrder = useCallback(async () => {
    if (!orderId) {
      setLoading(false);
      return;
    }
    try {
      const data = await db.getOrder(orderId, user?.id);
      setOrder(data);
    } catch (error) {
      console.error('Error fetching order:', error);
    } finally {
      setLoading(false);
    }
  }, [orderId, user?.id]);

  useEffect(() => {
    fetchOrder();
  }, [fetchOrder]);

  useEffect(() => {
    if (!orderId) return;
    const channel = supabase
      .channel(`order-detail-${orderId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'orders', filter: `id=eq.${orderId}` },
        (payload) => {
          setOrder((prev) => (prev ? { ...prev, ...payload.new } : prev));
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'orders', filter: `id=eq.${orderId}` },
        (payload) => {
          if (payload.old?.id === orderId) {
            navigation.goBack();
          }
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [orderId, navigation]);

  const handleDelete = useCallback(() => {
    if (!order) return;
    Alert.alert(
      t('common.delete'),
      t('orders.deleteConfirm', { number: order.orderNumber }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await db.deleteOrder(order.id, user?.id);
              navigation.goBack();
            } catch (error) {
              console.error('Error deleting order:', error);
              Alert.alert(t('common.error'), t('orders.deleteFailed'));
            }
          },
        },
      ]
    );
  }, [order, navigation]);

  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />
        <ScreenHeader title={t('orders.detail')} onBack={() => navigation.goBack()} />
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
        <ScreenHeader title={t('orders.detail')} onBack={() => navigation.goBack()} />
        <View style={styles.centered}>
          <Ionicons name="alert-circle-outline" size={64} color="#CBD5E1" />
          <Text style={styles.errorText}>{t('orders.notFound')}</Text>
        </View>
      </View>
    );
  }

  const statusColor = STATUS_COLORS[order.status] || { bg: '#F1F5F9', text: '#475569' };
  const paymentColor = PAYMENT_STATUS_COLORS[order.paymentStatus] || { bg: '#F1F5F9', text: '#475569' };
  const items = order.order_items || [];
  const address = order.addresses;
  const payable = isPayable(order);
  const isCancelled = order.status === 'CANCELLED';

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <ScreenHeader
        title={order.orderNumber}
        onBack={() => navigation.goBack()}
        rightAction={<Ionicons name="trash-outline" size={22} color="#EF4444" />}
        onRightPress={handleDelete}
      />

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: payable ? 100 : 24 }]}
        showsVerticalScrollIndicator={false}
      >
        {isCancelled ? (
          <View style={[styles.cancelledBanner, { flexDirection: dir.row }]}>
            <Ionicons name="close-circle" size={20} color="#991B1B" style={{ marginLeft: 8 }} />
            <Text style={styles.cancelledText}>{t('orders.cancelledBanner')}</Text>
          </View>
        ) : (
          <View style={styles.timelineCard}>
            <Text style={styles.cardTitle}>{t('orders.status')}</Text>
            <View style={styles.horizontalTimeline}>
              {TIMELINE_STEPS.map((step, idx) => {
                const state = stepState(order.status, step.key);
                const isLast = idx === TIMELINE_STEPS.length - 1;
                return (
                  <React.Fragment key={step.key}>
                    <View style={styles.stepContainer}>
                      <View style={[
                        styles.stepCircle,
                        state === 'done' && styles.stepCircleDone,
                        state === 'active' && styles.stepCircleActive,
                      ]}>
                        {state === 'done' ? (
                          <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                        ) : state === 'active' ? (
                          <View style={styles.activeInnerDot} />
                        ) : null}
                      </View>
                      <Text style={[
                        styles.stepLabel,
                        state === 'done' && styles.stepLabelDone,
                        state === 'active' && styles.stepLabelActive,
                        state === 'pending' && styles.stepLabelPending,
                      ]} numberOfLines={2}>
                        {step.label}
                      </Text>
                    </View>
                    {!isLast && (
                      <View style={styles.stepLineWrap}>
                        <View style={[
                          styles.stepLine,
                          (state === 'done') && styles.stepLineDone,
                        ]} />
                      </View>
                    )}
                  </React.Fragment>
                );
              })}
            </View>
          </View>
        )}

        {address && (
          <View style={styles.card}>
            <View style={[styles.cardHeader, { flexDirection: dir.row }]}>
              <Ionicons name="location-outline" size={20} color="#0F172A" />
              <Text style={styles.cardTitle}>{t('orders.address')}</Text>
            </View>
            <Text style={[styles.addressLabel, { textAlign: dir.textAlign }]}>{address.label || t('orders.addressFallback')}</Text>
            <Text style={[styles.addressText, { textAlign: dir.textAlign }]}>
              {address.street}{address.region ? ` - ${address.region}` : ''}
            </Text>
            <Text style={[styles.addressText, { textAlign: dir.textAlign }]}>{address.city}</Text>
            {address.phone && <Text style={[styles.addressText, { textAlign: dir.textAlign }]}>+20 {address.phone}</Text>}
          </View>
        )}

        <View style={styles.card}>
          <View style={[styles.cardHeader, { flexDirection: dir.row }]}>
            <MaterialCommunityIcons name="package-variant" size={20} color="#0F172A" />
            <Text style={styles.cardTitle}>{t('common.products')} ({items.length})</Text>
          </View>
          {items.map((item, idx) => {
            const product = item.products || {};
            const variant = item.product_variants || {};
            const img = product.product_images?.[0]?.url;
            const attrs = [variant.color, variant.storage, variant.ram].filter(Boolean).join(' · ');
            return (
              <View key={item.id || idx} style={[styles.itemRow, { flexDirection: dir.row }, idx === 0 && { borderTopWidth: 0 }]}>
                <View style={styles.itemImageWrapper}>
                  {img ? (
                    <Image source={{ uri: img }} style={styles.itemImage} resizeMode="cover" />
                  ) : (
                    <View style={[styles.itemImage, styles.itemImagePlaceholder]}>
                      <Ionicons name="image-outline" size={24} color="#CBD5E1" />
                    </View>
                  )}
                </View>
                <View style={[styles.itemInfo, { alignItems: dir.alignItems }]}>
                  <Text style={[styles.itemTitle, { textAlign: dir.textAlign }]} numberOfLines={2}>
                    {product.nameAr || t('common.product')}
                  </Text>
                  {attrs ? <Text style={[styles.itemVariant, { textAlign: dir.textAlign }]}>{attrs}</Text> : null}
                  <Text style={[styles.itemQty, { textAlign: dir.textAlign }]}>{t('orders.quantity', { count: item.quantity })}</Text>
                </View>
                    <Text style={styles.itemPrice}>{formatPrice(item.unitPrice * item.quantity)} {t('common.egp')}</Text>
              </View>
            );
          })}
        </View>

        <View style={styles.card}>
          <View style={[styles.cardHeader, { flexDirection: dir.row }]}>
            <Ionicons name="card-outline" size={20} color="#0F172A" />
            <Text style={styles.cardTitle}>{t('orders.paymentSummary')}</Text>
          </View>
          <View style={[styles.summaryRow, { flexDirection: dir.row }]}>
            <Text style={styles.summaryValue}>{formatPrice(order.subtotal)} {t('common.egp')}</Text>
            <Text style={styles.summaryLabel}>{t('common.subtotal')}</Text>
          </View>
          {Number(order.shippingCost) > 0 && (
            <View style={[styles.summaryRow, { flexDirection: dir.row }]}>
              <Text style={styles.summaryValue}>{formatPrice(order.shippingCost)} {t('common.egp')}</Text>
              <Text style={styles.summaryLabel}>{t('orders.delivery')}</Text>
            </View>
          )}
          {Number(order.discount) > 0 && (
            <View style={[styles.summaryRow, { flexDirection: dir.row }]}>
              <Text style={styles.summaryValue}>- {formatPrice(order.discount)} {t('common.egp')}</Text>
              <Text style={styles.summaryLabel}>{t('common.discount')}</Text>
            </View>
          )}
          <View style={styles.divider} />
          <View style={[styles.summaryRow, { flexDirection: dir.row }]}>
            <Text style={styles.totalValue}>{formatPrice(order.total)} {t('common.egp')}</Text>
            <Text style={styles.totalLabel}>{t('common.total')}</Text>
          </View>
          <View style={styles.divider} />
          <View style={[styles.summaryRow, { flexDirection: dir.row }]}>
            <View style={[styles.badge, { backgroundColor: '#F1F5F9' }]}>
              <Text style={[styles.badgeText, { color: '#334155' }]}>
                {PAYMENT_METHOD_LABELS[order.paymentMethod] || order.paymentMethod}
              </Text>
            </View>
            <Text style={styles.summaryLabel}>{t('orders.paymentMethod')}</Text>
          </View>
          <View style={[styles.summaryRow, { flexDirection: dir.row }]}>
            <View style={[styles.badge, { backgroundColor: paymentColor.bg }]}>
              <Text style={[styles.badgeText, { color: paymentColor.text }]}>
                {PAYMENT_STATUS_LABELS[order.paymentStatus] || order.paymentStatus}
              </Text>
            </View>
            <Text style={styles.summaryLabel}>{t('orders.paymentStatus')}</Text>
          </View>
          {order.couponCode && (
            <View style={[styles.summaryRow, { flexDirection: dir.row }]}>
              <Text style={styles.summaryValue}>{order.couponCode}</Text>
              <Text style={styles.summaryLabel}>{t('orders.couponCode')}</Text>
            </View>
          )}
        </View>
      </ScrollView>

      {payable && (
        <View style={[styles.bottomCta, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          <TouchableOpacity
            style={[styles.payNowButton, { flexDirection: dir.row }]}
            activeOpacity={0.85}
            onPress={() => navigation.navigate('ResumePayment', { orderId: order.id })}
          >
            <MaterialCommunityIcons name="credit-card-outline" size={20} color="#fff" style={{ marginLeft: 8 }} />
            <Text style={styles.payNowButtonText}>{t('orders.payNow')}</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  errorText: { fontSize: 14, color: '#94A3B8', marginTop: 12 },
  scrollContent: { padding: 16 },
  card: {
    backgroundColor: '#fff', borderRadius: 20, padding: 16, marginBottom: 12,
    shadowColor: '#000', shadowOpacity: 0.04, shadowOffset: { width: 0, height: 4 }, shadowRadius: 10, elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row-reverse', alignItems: 'center', gap: 8, marginBottom: 12,
  },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#0F172A' },
  cancelledBanner: {
    flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#FEE2E2', borderRadius: 16, padding: 14, marginBottom: 12,
  },
  cancelledText: { color: '#991B1B', fontSize: 14, fontWeight: '700' },
  timelineCard: {
    backgroundColor: '#fff', borderRadius: 20, padding: 18, marginBottom: 12,
    shadowColor: '#000', shadowOpacity: 0.04, shadowOffset: { width: 0, height: 4 }, shadowRadius: 10, elevation: 2,
  },
  horizontalTimeline: {
    flexDirection: 'row-reverse',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  stepContainer: {
    alignItems: 'center',
    flex: 1,
    maxWidth: 80,
  },
  stepCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  stepCircleDone: {
    backgroundColor: '#22C55E',
    shadowColor: '#22C55E',
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 3,
  },
  stepCircleActive: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2.5,
    borderColor: '#F59E0B',
    shadowColor: '#F59E0B',
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 3,
  },
  activeInnerDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#F59E0B',
  },
  stepLineWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 15,
    marginHorizontal: -4,
  },
  stepLine: {
    height: 2.5,
    width: '100%',
    backgroundColor: '#E2E8F0',
    borderRadius: 2,
  },
  stepLineDone: {
    backgroundColor: '#22C55E',
  },
  stepLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#0F172A',
    textAlign: 'center',
    lineHeight: 14,
  },
  stepLabelDone: {
    color: '#22C55E',
  },
  stepLabelActive: {
    color: '#F59E0B',
    fontWeight: '700',
  },
  stepLabelPending: {
    color: '#94A3B8',
  },
  addressLabel: { fontSize: 15, fontWeight: '700', color: '#0F172A', textAlign: 'right', marginBottom: 4 },
  addressText: { fontSize: 13, color: '#64748B', textAlign: 'right', marginBottom: 2 },
  itemRow: {
    flexDirection: 'row-reverse', alignItems: 'center', paddingVertical: 10,
    borderTopWidth: 1, borderTopColor: '#F1F5F9',
  },
  itemImageWrapper: { width: 56, height: 56, borderRadius: 12, overflow: 'hidden', backgroundColor: '#F1F5F9' },
  itemImage: { width: 56, height: 56 },
  itemImagePlaceholder: { justifyContent: 'center', alignItems: 'center' },
  itemInfo: { flex: 1, marginHorizontal: 12, alignItems: 'flex-end' },
  itemTitle: { fontSize: 13, fontWeight: '600', color: '#0F172A', textAlign: 'right' },
  itemVariant: { fontSize: 11, color: '#94A3B8', textAlign: 'right', marginTop: 2 },
  itemQty: { fontSize: 11, color: '#64748B', textAlign: 'right', marginTop: 2 },
  itemPrice: { fontSize: 13, fontWeight: '700', color: '#0F172A' },
  summaryRow: {
    flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 8,
  },
  summaryLabel: { fontSize: 13, color: '#64748B' },
  summaryValue: { fontSize: 13, color: '#0F172A', fontWeight: '600' },
  summaryValueMono: { fontSize: 12, color: '#0F172A', fontFamily: 'monospace' },
  divider: { height: 1, backgroundColor: '#F1F5F9', marginVertical: 4 },
  totalValue: { fontSize: 18, fontWeight: '800', color: '#0F172A' },
  totalLabel: { fontSize: 14, fontWeight: '700', color: '#0F172A' },
  bottomCta: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#F1F5F9',
    padding: 16, paddingTop: 12,
    shadowColor: '#000', shadowOpacity: 0.08, shadowOffset: { width: 0, height: -2 }, shadowRadius: 8, elevation: 4,
  },
  payNowButton: {
    flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#0F172A', borderRadius: 16, paddingVertical: 14,
  },
  payNowButtonText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
