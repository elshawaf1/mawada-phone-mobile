import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ChevronRight, LogOut } from 'lucide-react-native';
import BottomNav from '../components/BottomNav';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../services/supabase';
import { setBadgeCountAsync } from '../services/push';
import { COLORS } from '../constants';
import { useTranslation } from '../context/AppSettingsContext';
import { useDirection } from '../hooks/useDirection';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function ProfileScreen({ navigation }) {
  const { t } = useTranslation();
  const dir = useDirection();
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user?.id) return;
    fetchUnreadCount();
    const sub = supabase
      .channel('profile-notifications')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `userId=eq.${user.id}` }, () => {
        setUnreadCount((prev) => {
          const next = prev + 1;
          setBadgeCountAsync(next);
          return next;
        });
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'notifications', filter: `userId=eq.${user.id}` }, () => {
        fetchUnreadCount();
      })
      .subscribe();
    return () => { sub.unsubscribe(); };
  }, [user?.id]);

  const fetchUnreadCount = async () => {
    if (!user?.id) return;
    const { count } = await supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('userId', user.id)
      .eq('isRead', false);
    setUnreadCount(count || 0);
  };

  const handleLogout = async () => {
    await logout();
    navigation.reset({ index: 0, routes: [{ name: 'Welcome' }] });
  };

  const Section = ({ title, children }) => (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { textAlign: dir.textAlign }]}>{title}</Text>
      <View style={styles.sectionCard}>{children}</View>
    </View>
  );

  const Row = ({ iconName, label, onPress, badge, isDestructive = false }) => (
    <TouchableOpacity
      style={[styles.row, { flexDirection: dir.row }]}
      activeOpacity={0.6}
      onPress={onPress}
    >
      <View style={[styles.rowIcon, isDestructive ? styles.rowIconDestructive : styles.rowIconNormal]}>
        {isDestructive ? (
          <LogOut size={18} color="#EF4444" />
        ) : (
          <Ionicons name={iconName} size={18} color="#64748B" />
        )}
      </View>
      <View style={[styles.rowContent, { flexDirection: dir.row }]}>
        <Text style={[styles.rowLabel, isDestructive && styles.rowLabelDestructive]}>{label}</Text>
        {badge > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{badge > 9 ? '9+' : badge}</Text>
          </View>
        )}
      </View>
      <View style={styles.rowChevron}>
        <ChevronRight size={16} color="#CBD5E1" />
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
          <Text style={styles.userName}>{user?.name || '—'}</Text>
          {user?.email ? <Text style={styles.userEmail}>{user.email}</Text> : null}
          {user?.phone ? <Text style={styles.userPhone}>{user.phone}</Text> : null}
        </View>

        <Section title={t('settings.orders')}>
          <Row iconName="receipt-outline" label={t('profile.menuOrders')} onPress={() => navigation.navigate('MyOrders')} />
          <View style={styles.rowDivider} />
          <Row iconName="heart-outline" label={t('wishlist.title')} onPress={() => navigation.navigate('Wishlist')} />
          <View style={styles.rowDivider} />
          <Row iconName="time-outline" label={t('recentlyViewed.title')} onPress={() => navigation.navigate('RecentlyViewed')} />
          <View style={styles.rowDivider} />
          <Row iconName="pricetag-outline" label={t('offers.title')} onPress={() => navigation.navigate('Offers')} />
        </Section>

        <Section title={t('profile.notifications')}>
          <Row iconName="notifications-outline" label={t('profile.notifications')} onPress={() => navigation.navigate('Notifications')} badge={unreadCount} />
        </Section>

        <Section title={t('profile.support')}>
          <Row iconName="location-outline" label={t('profile.menuBranches')} onPress={() => navigation.navigate('Locations')} />
          <View style={styles.rowDivider} />
          <Row iconName="chatbubble-ellipses-outline" label={t('profile.support')} onPress={() => navigation.navigate('Support')} />
        </Section>

        <View style={styles.logoutSection}>
          <TouchableOpacity
            style={[styles.logoutButton, { flexDirection: dir.row }]}
            activeOpacity={0.6}
            onPress={handleLogout}
          >
            <LogOut size={18} color="#EF4444" />
            <Text style={styles.logoutText}>{t('auth.logout')}</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
      <BottomNav navigation={navigation} activeRoute="Profile" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.gray50 },
  scroll: { paddingTop: 10, paddingBottom: 100 },

  header: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 24,
    paddingTop: 24,
    backgroundColor: COLORS.white,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  userName: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
  },
  userEmail: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 6,
  },
  userPhone: {
    fontSize: 14,
    color: COLORS.textTertiary,
    marginTop: 4,
  },

  section: { marginTop: 20, paddingHorizontal: 16 },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textTertiary,
    marginBottom: 8,
    marginRight: 4,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  sectionCard: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 1,
  },
  row: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    minHeight: 54,
  },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rowIconNormal: { backgroundColor: COLORS.gray100 },
  rowIconDestructive: { backgroundColor: COLORS.redLight },
  rowContent: {
    flex: 1,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingHorizontal: 12,
  },
  rowLabel: { fontSize: 15, fontWeight: '500', color: COLORS.text },
  rowLabelDestructive: { color: '#EF4444' },
  rowChevron: { justifyContent: 'center', alignItems: 'center' },
  rowDivider: { height: 1, backgroundColor: COLORS.gray100, marginHorizontal: 16 },
  badge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: COLORS.error,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
    marginHorizontal: 8,
  },
  badgeText: { color: COLORS.white, fontSize: 10, fontWeight: '700' },

  logoutSection: { marginTop: 24, paddingHorizontal: 16 },
  logoutButton: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 20,
    paddingVertical: 16,
    gap: 8,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 1,
  },
  logoutText: { fontSize: 15, fontWeight: '600', color: '#EF4444' },
});
