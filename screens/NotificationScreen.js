import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Animated,
  RefreshControl,
  LayoutAnimation,
  UIManager,
  Platform,
} from 'react-native';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}
import { Ionicons } from '@expo/vector-icons';
import { Bell, Package, Tag, Info, ChevronRight, CheckCheck } from 'lucide-react-native';
import BottomNav from '../components/BottomNav';
import { ListSkeleton } from '../components/Skeleton';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, SPACING, RADIUS, FONT_SIZES, FONT_WEIGHTS, SHADOWS } from '../constants';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from '../context/AppSettingsContext';
import { useDirection } from '../hooks/useDirection';
import { supabase } from '../services/supabase';
import { setBadgeCountAsync } from '../services/push';

const notifConfig = {
  order: { icon: Package, bg: '#EFF6FF', color: COLORS.blue },
  promo: { icon: Tag, bg: '#F0FDF4', color: '#22C55E' },
  info: { icon: Info, bg: '#FFFBEB', color: '#F59E0B' },
  system: { icon: Bell, bg: '#F3F4F6', color: COLORS.gray500 },
  payment: { icon: Package, bg: '#ECFEFF', color: '#06B6D4' },
  payment_success: { icon: Package, bg: '#ECFEFF', color: '#06B6D4' },
  payment_failed: { icon: Package, bg: '#FEF2F2', color: '#EF4444' },
};

function NotifCard({ notif, onMarkRead, t }) {
  const dir = useDirection();
  const readAnim = useRef(new Animated.Value(notif.isRead ? 0 : 1)).current;

  useEffect(() => {
    Animated.spring(readAnim, { toValue: notif.isRead ? 0 : 1, useNativeDriver: true, tension: 50, friction: 7 }).start();
  }, [notif.isRead]);

  const IconComp = (notifConfig[notif.type] || notifConfig.info).icon;
  const iconBg = (notifConfig[notif.type] || notifConfig.info).bg;
  const iconColor = (notifConfig[notif.type] || notifConfig.info).color;

  return (
    <View style={[styles.notifCard, { flexDirection: dir.row }, !notif.isRead && styles.notifCardUnread]}>
      <View style={[styles.notifIcon, { backgroundColor: iconBg }]}>
        <IconComp size={20} color={iconColor} />
      </View>

      <View style={styles.notifContent}>
        <View style={[styles.notifTopRow, { flexDirection: dir.row }]}>
          <Animated.View style={[styles.unreadDot, { opacity: readAnim, transform: [{ scale: readAnim }] }]} />
          <Text style={styles.notifTime}>{formatTime(notif.createdAt, t)}</Text>
        </View>
        <Text style={[styles.notifTitle, { textAlign: dir.textAlign }]} numberOfLines={1}>
          {notif.titleAr || notif.title}
        </Text>
        <Text style={[styles.notifBody, { textAlign: dir.textAlign }]} numberOfLines={2}>
          {notif.bodyAr || notif.body}
        </Text>
      </View>

      <View style={styles.notifActions}>
        {!notif.isRead && (
          <TouchableOpacity
            style={[styles.notifActionBtn, styles.notifActionRead]}
            onPress={() => onMarkRead(notif.id)}
            activeOpacity={0.7}
          >
            <CheckCheck size={14} color={COLORS.blue} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

function groupNotifications(notifications, t) {
  const groups = [];
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);

  let currentGroup = null;

  notifications.forEach((notif) => {
    const d = new Date(notif.createdAt);
    let groupKey;

    if (d >= today) groupKey = 'today';
    else if (d >= yesterday) groupKey = 'yesterday';
    else if (d >= weekAgo) groupKey = 'week';
    else groupKey = 'earlier';

    if (!currentGroup || currentGroup.key !== groupKey) {
      currentGroup = { key: groupKey, label: groupLabel(groupKey, t), data: [] };
      groups.push(currentGroup);
    }
    currentGroup.data.push(notif);
  });

  return groups;
}

function groupLabel(key, t) {
  switch (key) {
    case 'today': return t('notifications.today');
    case 'yesterday': return t('notifications.yesterday');
    case 'week': return t('notifications.thisWeek');
    case 'earlier': return t('notifications.earlier');
    default: return '';
  }
}

function formatTime(dateStr, t) {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now - date;
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffMin < 1) return t('time.justNow');
  if (diffMin < 60) return t('time.minutesAgo', { n: diffMin });
  if (diffHr < 24) return t('time.hoursAgo', { n: diffHr });
  if (diffDay < 7) return t('time.daysAgo', { n: diffDay });
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export default function NotificationScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { t } = useTranslation();
  const dir = useDirection();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const fadeAnims = useRef([]);

  const fetchNotifications = useCallback(async () => {
    if (!user?.id) return;
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('userId', user.id)
        .order('createdAt', { ascending: false });
      if (error) throw error;
      setNotifications(data || []);
      fadeAnims.current = (data || []).map(() => new Animated.Value(0));
      Animated.stagger(60, (data || []).map((_, i) =>
        Animated.timing(fadeAnims.current[i], { toValue: 1, duration: 300, useNativeDriver: true })
      )).start();
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchNotifications();

    const subscription = supabase
      .channel('notifications')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `userId=eq.${user?.id}`,
      }, (payload) => {
        setNotifications((prev) => [payload.new, ...prev]);
      })
      .subscribe();

    return () => { subscription.unsubscribe(); };
  }, [user?.id, fetchNotifications]);

  useEffect(() => {
    const unsubscribe = navigation?.addListener?.('focus', () => {
      fetchNotifications();
    });
    return () => { unsubscribe?.(); };
  }, [navigation, fetchNotifications]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchNotifications();
    setRefreshing(false);
  }, [fetchNotifications]);

  const markRead = useCallback(async (id) => {
    setNotifications((prev) => {
      const updated = prev.map((n) => (n.id === id ? { ...n, isRead: true } : n));
      setBadgeCountAsync(updated.filter((n) => !n.isRead).length);
      return updated;
    });
    await supabase.from('notifications').update({ isRead: true }).eq('id', id);
  }, []);

  const markAllRead = useCallback(async () => {
    if (!user?.id) return;
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setBadgeCountAsync(0);
    await supabase.from('notifications').update({ isRead: true }).eq('userId', user.id).eq('isRead', false);
  }, [user?.id]);

  const unreadCount = notifications.filter((n) => !n.isRead).length;
  const isEmpty = notifications.length === 0;
  const groups = groupNotifications(notifications, t);

  return (
    <View style={styles.container}>
      <View style={[styles.headerContainer, { paddingTop: insets.top + 10 }]}>
        <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
        <View style={[styles.headerContent, { flexDirection: dir.row }]}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()} activeOpacity={0.7}>
            <ChevronRight color={COLORS.text} size={24} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('notifications.title')}</Text>
          {unreadCount > 0 ? (
            <TouchableOpacity onPress={markAllRead} style={[styles.markAllBtn, { flexDirection: dir.row }]}>
              <CheckCheck size={16} color={COLORS.blue} />
              <Text style={styles.markAllText}>{t('notifications.markAllRead')}</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.spacer} />
          )}
        </View>
      </View>

      {unreadCount > 0 && (
        <View style={[styles.unreadBanner, { flexDirection: dir.row }]}>
          <Bell size={16} color={COLORS.primary} />
          <Text style={styles.unreadText}>
            {unreadCount === 1 ? t('notifications.unreadBanner', { count: unreadCount }) : t('notifications.unreadBannerPlural', { count: unreadCount })}
          </Text>
        </View>
      )}

      {loading ? (
        <View style={styles.loadingContainer}>
          <ListSkeleton rows={6} />
        </View>
      ) : isEmpty ? (
        <View style={styles.emptyState}>
          <View style={styles.emptyIconWrapper}>
            <Ionicons name="notifications-off-outline" size={48} color={COLORS.gray300} />
          </View>
          <Text style={styles.emptyTitle}>{t('notifications.empty')}</Text>
          <Text style={styles.emptySubtitle}>{t('notifications.emptySub')}</Text>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.scroll, { paddingBottom: 120 + insets.bottom }]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} tintColor={COLORS.primary} />}
        >
          {groups.map((group) => (
            <View key={group.key}>
              <Text style={styles.sectionHeader}>{group.label}</Text>
              {group.data.map((notif) => (
                <NotifCard
                  key={notif.id}
                  notif={notif}
                  onMarkRead={markRead}
                  t={t}
                />
              ))}
            </View>
          ))}
        </ScrollView>
      )}
      <BottomNav navigation={navigation} activeRoute="Profile" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.gray50 },
  headerContainer: {
    backgroundColor: COLORS.white,
    paddingBottom: 12,
    ...SHADOWS.sm,
  },
  headerContent: {
    flexDirection: 'row',
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
  markAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  markAllText: { fontSize: 13, fontWeight: '600', color: COLORS.blue },
  spacer: { width: 60 },
  unreadBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  unreadText: { fontSize: FONT_SIZES.sm, fontWeight: FONT_WEIGHTS.semibold, color: '#1D4ED8' },
  loadingContainer: { flex: 1, paddingTop: 16 },
  scroll: { padding: 16, paddingBottom: 100 },
  sectionHeader: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.textTertiary,
    textTransform: 'uppercase',
    marginBottom: 8,
    marginTop: 16,
    paddingHorizontal: 4,
    letterSpacing: 0.5,
  },
  notifCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    gap: 12,
    alignItems: 'center',
    ...SHADOWS.sm,
  },
  notifCardUnread: {
    backgroundColor: '#FAFEFF',
    borderRightWidth: 3,
    borderRightColor: COLORS.blue,
  },
  notifIcon: {
    width: 44, height: 44, borderRadius: 22,
    justifyContent: 'center', alignItems: 'center', flexShrink: 0,
  },
  notifContent: { flex: 1 },
  notifTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.blue },
  notifTime: { fontSize: 11, color: COLORS.gray400 },
  notifTitle: { fontSize: FONT_SIZES.md, fontWeight: FONT_WEIGHTS.bold, color: COLORS.text, textAlign: 'left', marginBottom: 4 },
  notifBody: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary, textAlign: 'left', lineHeight: 20 },
  chevron: { marginRight: 4 },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 },
  emptyIconWrapper: {
    width: 88, height: 88, borderRadius: 44,
    backgroundColor: COLORS.gray100,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 20,
  },
  emptyTitle: { fontSize: FONT_SIZES.xl, fontWeight: FONT_WEIGHTS.bold, color: COLORS.text, marginBottom: 8 },
  emptySubtitle: { fontSize: FONT_SIZES.md, color: COLORS.textTertiary, textAlign: 'center', lineHeight: 22 },
  notifActions: {
    alignItems: 'center', gap: 6, flexShrink: 0,
  },
  notifActionBtn: {
    width: 30, height: 30, borderRadius: 15,
    alignItems: 'center', justifyContent: 'center',
  },
  notifActionRead: {
    backgroundColor: '#EFF6FF',
  },
});
