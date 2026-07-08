import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  StatusBar,
  Alert,
  Animated,
} from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
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
  PENDING: { bg: '#FEF3C7', text: '#92400E', accent: '#F59E0B' },
  CONFIRMED: { bg: '#DBEAFE', text: '#1E40AF', accent: '#3B82F6' },
  PROCESSING: { bg: '#EDE9FE', text: '#6B21A8', accent: '#8B5CF6' },
  SHIPPED: { bg: '#E0E7FF', text: '#3730A3', accent: '#6366F1' },
  DELIVERED: { bg: '#D1FAE5', text: '#065F46', accent: '#22C55E' },
  CANCELLED: { bg: '#FEE2E2', text: '#991B1B', accent: '#EF4444' },
};

const PAYMENT_STATUS_COLORS = {
  PENDING: { bg: '#FEF3C7', text: '#92400E' },
  UNPAID: { bg: '#F1F5F9', text: '#475569' },
  PAID: { bg: '#D1FAE5', text: '#065F46' },
  FAILED: { bg: '#FEE2E2', text: '#991B1B' },
  REFUNDED: { bg: '#EDE9FE', text: '#6B21A8' },
};

const TABS = [
  { key: 'all', label: 'الكل', statuses: null },
  { key: 'active', label: 'قيد التنفيذ', statuses: ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED'] },
  { key: 'done', label: 'تم', statuses: ['DELIVERED'] },
  { key: 'cancelled', label: 'ملغي', statuses: ['CANCELLED'] },
];

const formatPrice = (n) => Number(n || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
const formatDate = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('ar-EG', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });
};

const isPayable = (order) =>
  order.paymentMethod !== 'COD' &&
  ['PENDING', 'UNPAID', 'FAILED'].includes(order.paymentStatus) &&
  order.status === 'PENDING';

export default function MyOrdersScreen({ navigation }) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const dir = useDirection();

  const animValues = useRef(new Map()).current;
  const tabAnim = useRef(new Animated.Value(0)).current;
  const tabPositions = useRef({}).current;

  const tabCounts = useMemo(() => {
    const counts = { all: orders.length, active: 0, done: 0, cancelled: 0 };
    orders.forEach((o) => {
      const tab = TABS.find((t) => t.statuses && t.statuses.includes(o.status));
      if (tab) counts[tab.key] += 1;
    });
    return counts;
  }, [orders]);

  const filtered = useMemo(() => {
    let result = orders.filter((o) => o.paymentStatus !== 'PENDING');
    if (activeTab === 'all') return result;
    const tab = TABS.find((t) => t.key === activeTab);
    if (!tab || !tab.statuses) return result;
    return result.filter((o) => tab.statuses.includes(o.status));
  }, [orders, activeTab]);

  useEffect(() => {
    const filteredList = filtered;
    filteredList.forEach((order) => {
      if (!animValues.has(order.id)) {
        animValues.set(order.id, new Animated.Value(0));
      }
    });
    const timer = setTimeout(() => {
      filteredList.forEach((order, index) => {
        const val = animValues.get(order.id);
        if (val) {
          Animated.timing(val, {
            toValue: 1,
            duration: 450,
            delay: index * 70,
            useNativeDriver: true,
          }).start();
        }
      });
    }, 50);
    return () => clearTimeout(timer);
  }, [filtered, activeTab]);

  const fetchOrders = useCallback(async () => {
    if (!user?.id) return;
    try {
      const data = await db.getOrders(user.id);
      setOrders(data || []);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel('my-orders-screen')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders', filter: `userId=eq.${user.id}` },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setOrders((prev) => [payload.new, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            setOrders((prev) =>
              prev.map((o) => (o.id === payload.new.id ? { ...o, ...payload.new } : o))
            );
          } else if (payload.eventType === 'DELETE') {
            setOrders((prev) => prev.filter((o) => o.id !== payload.old.id));
          }
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    animValues.forEach((val) => val.setValue(0));
    fetchOrders();
  }, [fetchOrders, animValues]);

  const handleDelete = useCallback((order) => {
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
              setOrders((prev) => prev.filter((o) => o.id !== order.id));
            } catch (error) {
              console.error('Error deleting order:', error);
              Alert.alert(t('common.error'), t('orders.deleteFailed'));
            }
          },
        },
      ]
    );
  }, []);

  const handleTabPress = (key) => {
    setActiveTab(key);
    const idx = TABS.findIndex((t) => t.key === key);
    Animated.spring(tabAnim, {
      toValue: idx,
      friction: 8,
      tension: 60,
      useNativeDriver: false,
    }).start();
  };

  const renderDeleteAction = (order) => (
    <TouchableOpacity
      style={styles.deleteAction}
      activeOpacity={0.85}
      onPress={() => handleDelete(order)}
    >
      <Ionicons name="trash-outline" size={22} color="#fff" />
      <Text style={styles.deleteActionText}>{t('common.delete')}</Text>
    </TouchableOpacity>
  );

  const renderCard = (order) => {
    const statusColor = STATUS_COLORS[order.status] || { bg: '#F1F5F9', text: '#475569', accent: '#64748B' };
    const paymentColor = PAYMENT_STATUS_COLORS[order.paymentStatus] || { bg: '#F1F5F9', text: '#475569' };
    const itemCount = (order.order_items || []).reduce((s, i) => s + i.quantity, 0);
    const payable = isPayable(order);
    const isCODActive = order.paymentMethod === 'COD' && ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED'].includes(order.status);
    const anim = animValues.get(order.id);
    const cardAnim = anim
      ? {
          opacity: anim.interpolate({ inputRange: [0, 1], outputRange: [0, 1] }),
          transform: [{
            translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }),
          }],
        }
      : {};

    const cardContent = (
      <TouchableOpacity
        activeOpacity={0.92}
        onPress={() => navigation.navigate('OrderDetail', { orderId: order.id, order })}
        style={styles.cardTouchable}
      >
        <View style={[styles.cardInner, { flexDirection: dir.row }]}>
          <View style={[styles.accentBar, { backgroundColor: statusColor.accent }]} />
          <View style={styles.cardBody}>
            <View style={[styles.cardHeader, { flexDirection: dir.row }]}>
              {['PENDING', 'CANCELLED'].includes(order.status) && (
                <TouchableOpacity
                  style={styles.deleteIconBtn}
                  activeOpacity={0.7}
                  onPress={() => handleDelete(order)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="trash-outline" size={16} color="#CBD5E1" />
                </TouchableOpacity>
              )}
              <View style={[styles.cardHeaderText, { alignItems: dir.alignItems }]}>
                <Text style={styles.orderNumber}>{order.orderNumber}</Text>
                <Text style={styles.orderDate}>{formatDate(order.createdAt)}</Text>
              </View>
            </View>

            <Text style={[styles.itemSummary, { textAlign: dir.textAlign }]}>
              {t(itemCount === 1 ? 'orders.itemCount' : 'orders.itemCountPlural', { count: itemCount })} · {t(`orders.method${order.paymentMethod[0]}${order.paymentMethod.substring(1).toLowerCase()}`) || order.paymentMethod}
            </Text>

            <View style={[styles.badgesRow, { flexDirection: dir.row }]}>
              <View style={[styles.statusDot, { backgroundColor: statusColor.accent }]} />
              <Text style={[styles.statusLabel, { color: statusColor.text }]}>
                {t(`orders.status${order.status[0]}${order.status.substring(1).toLowerCase()}`) || order.status}
              </Text>
              <View style={styles.badgeSeparator} />
              <Text style={[styles.paymentStatusLabel, { color: paymentColor.text }]}>
                {t(`orders.pay${order.paymentStatus[0]}${order.paymentStatus.substring(1).toLowerCase()}`) || order.paymentStatus}
              </Text>
            </View>

            <View style={styles.divider} />

            <View style={[styles.totalRow, { flexDirection: dir.row }]}>
              <Text style={styles.totalLabel}>{t('orders.total')}</Text>
              <Text style={styles.totalValue}>{formatPrice(order.total)} {t('common.egp')}</Text>
            </View>

            {payable && (
              <TouchableOpacity
                style={[styles.ctaButton, { flexDirection: dir.row }]}
                activeOpacity={0.85}
                onPress={() => navigation.navigate('ResumePayment', { orderId: order.id })}
              >
                <MaterialCommunityIcons name="credit-card-outline" size={16} color="#fff" style={{ marginLeft: 6 }} />
                <Text style={styles.ctaButtonText}>{t('orders.payNow')}</Text>
              </TouchableOpacity>
            )}

            {isCODActive && (
              <TouchableOpacity
                style={[styles.trackButton, { flexDirection: dir.row }]}
                activeOpacity={0.85}
                onPress={() => navigation.navigate('OrderDetail', { orderId: order.id, order })}
              >
                <Ionicons name="locate-outline" size={16} color="#fff" style={{ marginLeft: 6 }} />
                <Text style={styles.trackButtonText}>{t('orders.track')}</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );

    return (
      <Swipeable
        key={order.id}
        renderRightActions={() => renderDeleteAction(order)}
        overshootRight={false}
      >
        {anim ? (
          <Animated.View style={cardAnim}>{cardContent}</Animated.View>
        ) : (
          cardContent
        )}
      </Swipeable>
    );
  };

  const renderTab = (tab, index) => {
    const isActive = activeTab === tab.key;
    const count = tabCounts[tab.key] || 0;
    return (
      <TouchableOpacity
        key={tab.key}
        activeOpacity={0.7}
        onPress={() => handleTabPress(tab.key)}
        style={[styles.tab, isActive && styles.tabActive]}
        onLayout={(e) => {
          tabPositions[tab.key] = e.nativeEvent.layout;
        }}
      >
        <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
          {t(`orders.tab${tab.key[0].toUpperCase()}${tab.key.substring(1)}`)} {count > 0 ? `(${count})` : ''}
        </Text>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />
        <ScreenHeader
          title={
            <View style={{ alignItems: 'center' }}>
              <Text style={styles.headerTitle}>{t('orders.title')}</Text>
              <Text style={styles.headerSubtitle}>{t('orders.loading')}</Text>
            </View>
          }
          onBack={() => navigation.goBack() || navigation.navigate('Home')}
        />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#0F172A" />
        </View>
      </View>
    );
  }

  const activeTabIdx = TABS.findIndex((t) => t.key === activeTab);
  const tabIndicatorX = activeTabIdx * 90;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <ScreenHeader
        title={
          <View style={{ alignItems: 'center' }}>
            <Text style={styles.headerTitle}>{t('orders.title')}</Text>
            <Text style={styles.headerSubtitle}>
              {filtered.length} {activeTab !== 'all' ? t(`orders.tab${activeTab[0].toUpperCase()}${activeTab.substring(1)}`) : ''}
            </Text>
          </View>
        }
        onBack={() => navigation.goBack() || navigation.navigate('Home')}
      />

      <View style={styles.tabBarWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={[styles.tabsRow, { flexDirection: dir.row }]}
        >
          {TABS.map(renderTab)}
        </ScrollView>
      </View>

      <ScrollView
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#0F172A"
            colors={['#0F172A']}
          />
        }
      >
        {orders.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconWrap}>
              <Ionicons name="receipt-outline" size={48} color="#CBD5E1" />
            </View>
            <Text style={styles.emptyTitle}>{t('orders.empty')}</Text>
            <Text style={styles.emptySubtitle}>{t('orders.emptySub')}</Text>
            <TouchableOpacity
              style={styles.shopButton}
              activeOpacity={0.85}
              onPress={() => navigation.navigate('Home')}
            >
              <Text style={styles.shopButtonText}>{t('orders.shopNow')}</Text>
            </TouchableOpacity>
          </View>
        ) : filtered.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconWrap}>
              <Ionicons name="search-outline" size={36} color="#CBD5E1" />
            </View>
            <Text style={styles.emptySubtitle}>{t('orders.emptyFilter')}</Text>
          </View>
        ) : (
          filtered.map(renderCard)
        )}
        <View style={{ height: 20 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#0F172A', textAlign: 'center' },
  headerSubtitle: { fontSize: 12, color: '#64748B', marginTop: 2, textAlign: 'center' },

  tabBarWrapper: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  tabsRow: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  tab: {
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    marginLeft: 8,
  },
  tabActive: {
    backgroundColor: '#0F172A',
    shadowColor: '#0F172A',
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 8,
    elevation: 4,
  },
  tabText: { fontSize: 13, fontWeight: '600', color: '#64748B' },
  tabTextActive: { color: '#fff' },

  listContent: { padding: 16 },

  cardTouchable: {
    borderRadius: 24,
    overflow: 'hidden',
  },
  cardInner: {
    backgroundColor: '#fff',
    borderRadius: 24,
    flexDirection: 'row',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 16,
    elevation: 3,
    marginBottom: 14,
    overflow: 'hidden',
  },
  accentBar: {
    width: 5,
    borderTopRightRadius: 24,
    borderBottomRightRadius: 24,
  },
  cardBody: {
    flex: 1,
    padding: 16,
    paddingLeft: 14,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  cardHeaderText: {
    flex: 1,
    alignItems: 'flex-end',
  },
  deleteIconBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 6,
  },
  orderNumber: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: 0.3,
    fontFamily: 'monospace',
  },
  orderDate: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  itemSummary: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'left',
    marginBottom: 10,
  },

  badgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: 6,
  },
  statusLabel: {
    fontSize: 12,
    fontWeight: '700',
  },
  badgeSeparator: {
    width: 1,
    height: 12,
    backgroundColor: '#E2E8F0',
    marginHorizontal: 8,
  },
  paymentStatusLabel: {
    fontSize: 12,
    fontWeight: '600',
  },

  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginBottom: 10,
  },

  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: { fontSize: 13, color: '#94A3B8', fontWeight: '600' },
  totalValue: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },

  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0F172A',
    borderRadius: 14,
    paddingVertical: 11,
    marginTop: 12,
  },
  ctaButtonText: { color: '#fff', fontSize: 14, fontWeight: '700' },

  trackButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0F172A',
    borderRadius: 14,
    paddingVertical: 11,
    marginTop: 12,
  },
  trackButtonText: { color: '#fff', fontSize: 14, fontWeight: '700' },

  deleteAction: {
    backgroundColor: '#EF4444',
    borderRadius: 24,
    marginBottom: 14,
    marginLeft: 8,
    justifyContent: 'center',
    alignItems: 'center',
    width: 72,
  },
  deleteActionText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 4,
  },

  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 24,
  },
  emptyIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
    marginBottom: 24,
  },
  shopButton: {
    backgroundColor: '#0F172A',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 14,
  },
  shopButtonText: { color: '#fff', fontSize: 14, fontWeight: '700' },
});
