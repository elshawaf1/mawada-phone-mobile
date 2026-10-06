import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import {
  Receipt, Heart, History, Tag, Bell, Settings, MapPin,
  MessageCircle, LogOut, Trash2, Pencil,
  ChevronLeft, ChevronRight,
} from 'lucide-react-native';
import BottomNav from '../components/BottomNav';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../services/supabase';
import { setBadgeCountAsync } from '../services/push';
import { COLORS, FONT_SIZES, FONT_WEIGHTS, RADIUS, SHADOWS } from '../constants';
import { useTranslation } from '../context/AppSettingsContext';
import { useDirection } from '../hooks/useDirection';
import { useMessageBox } from '../context/MessageBoxContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { hapticTap } from '../utils/haptics';

export default function ProfileScreen({ navigation }) {
  const { t } = useTranslation();
  const dir = useDirection();
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();
  const { showMessageBox } = useMessageBox();
  const [unreadCount, setUnreadCount] = useState(0);

  const ForwardIcon = dir.isRTL ? ChevronLeft : ChevronRight;
  const initial = ((user?.name || user?.email || '?').trim().charAt(0) || '?').toUpperCase();

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
    hapticTap();
    await logout();
    navigation.reset({ index: 0, routes: [{ name: 'Welcome' }] });
  };

  const handleDeleteAccount = async () => {
    showMessageBox({
      type: 'warning',
      title: t('settings.deleteAccount'),
      message: t('settings.deleteAccountConfirm') || t('auth.deleteAccount') || 'Are you sure? This cannot be undone.',
      buttons: [
        { text: t('common.cancel'), style: 'secondary' },
        {
          text: t('settings.deleteAccount') || t('auth.deleteAccount') || 'Delete',
          style: 'primary',
          onPress: async () => {
            try {
              const { error } = await supabase.rpc('delete_user_account');
              if (error) throw error;
              await logout();
              navigation.reset({ index: 0, routes: [{ name: 'Welcome' }] });
            } catch (err) {
              showMessageBox({ type: 'error', title: t('common.error'), message: err.message });
            }
          },
        },
      ],
    });
  };

  const Section = ({ title, children }) => (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { textAlign: dir.textAlign }]}>{title}</Text>
      <View style={styles.sectionCard}>{children}</View>
    </View>
  );

  const Row = ({ icon: Icon, label, onPress, badge, isDestructive = false }) => (
    <TouchableOpacity
      style={[styles.row, { flexDirection: dir.row }]}
      activeOpacity={0.6}
      onPress={() => { hapticTap(); onPress(); }}
    >
      <View style={[styles.rowIcon, isDestructive ? styles.rowIconDestructive : styles.rowIconNormal]}>
        <Icon size={18} color={isDestructive ? COLORS.error : COLORS.textSecondary} />
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
        <ForwardIcon size={16} color={COLORS.gray300} />
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <View style={[styles.hero, { paddingTop: insets.top + 20 }]}>
          <View style={[styles.heroRow, { flexDirection: dir.row }]}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initial}</Text>
            </View>
            <View style={styles.heroTexts}>
              <Text style={[styles.userName, { textAlign: dir.textAlign }]} numberOfLines={1}>
                {user?.name || '—'}
              </Text>
              {user?.email ? (
                <Text style={[styles.userContact, { textAlign: dir.textAlign }]} numberOfLines={1}>
                  {user.email}
                </Text>
              ) : null}
              {user?.phone ? (
                <Text style={[styles.userContact, { textAlign: dir.textAlign }]} numberOfLines={1}>
                  {user.phone}
                </Text>
              ) : null}
            </View>
            <TouchableOpacity
              style={styles.editBtn}
              onPress={() => { hapticTap(); navigation.navigate('EditProfile'); }}
              activeOpacity={0.7}
            >
              <Pencil size={15} color={COLORS.white} />
              <Text style={styles.editText}>{t('profile.menuEditProfile')}</Text>
            </TouchableOpacity>
          </View>

        </View>

        <View style={styles.sections}>
          <Section title={t('settings.orders')}>
            <Row icon={Receipt} label={t('profile.menuOrders')} onPress={() => navigation.navigate('MyOrders')} />
            <View style={styles.rowDivider} />
            <Row icon={Heart} label={t('wishlist.title')} onPress={() => navigation.navigate('Favorites')} />
            <View style={styles.rowDivider} />
            <Row icon={History} label={t('recentlyViewed.title')} onPress={() => navigation.navigate('RecentlyViewed')} />
            <View style={styles.rowDivider} />
            <Row icon={Tag} label={t('offers.title')} onPress={() => navigation.navigate('Offers')} />
          </Section>

          <Section title={t('profile.notifications')}>
            <Row icon={Bell} label={t('profile.notifications')} onPress={() => navigation.navigate('Notifications')} badge={unreadCount} />
          </Section>

          <Section title={t('profile.support')}>
            <Row icon={Settings} label={t('settings.title')} onPress={() => navigation.navigate('Settings')} />
            <View style={styles.rowDivider} />
            <Row icon={MapPin} label={t('profile.menuBranches')} onPress={() => navigation.navigate('Locations')} />
            <View style={styles.rowDivider} />
            <Row icon={MessageCircle} label={t('profile.support')} onPress={() => navigation.navigate('Support')} />
          </Section>

          <View style={styles.logoutSection}>
            <TouchableOpacity
              style={[styles.logoutButton, { flexDirection: dir.row }]}
              activeOpacity={0.6}
              onPress={handleLogout}
            >
              <LogOut size={18} color={COLORS.error} />
              <Text style={styles.logoutText}>{t('auth.logout')}</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={handleDeleteAccount} activeOpacity={0.6} style={styles.deleteQuiet}>
              <Text style={styles.deleteQuietText}>
                {t('settings.deleteAccount') || t('auth.deleteAccount') || 'Delete Account'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

      </ScrollView>
      <BottomNav navigation={navigation} activeRoute="Profile" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.gray50 },
  scroll: { paddingBottom: 100 },

  hero: {
    backgroundColor: COLORS.primary,
    borderBottomLeftRadius: RADIUS.xxl + 8,
    borderBottomRightRadius: RADIUS.xxl + 8,
    paddingHorizontal: 20,
    paddingBottom: 20,
    ...SHADOWS.md,
  },
  heroRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 28, fontWeight: FONT_WEIGHTS.extrabold, color: COLORS.white },
  heroTexts: { flex: 1 },
  userName: { fontSize: FONT_SIZES.xxl, fontWeight: FONT_WEIGHTS.extrabold, color: COLORS.white },
  userContact: { fontSize: FONT_SIZES.sm, color: 'rgba(255,255,255,0.72)', marginTop: 2 },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    borderRadius: RADIUS.full,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  editText: { fontSize: FONT_SIZES.xs, fontWeight: FONT_WEIGHTS.bold, color: COLORS.white },

  sections: { paddingBottom: 8 },
  section: { marginTop: 20, paddingHorizontal: 16 },
  sectionTitle: {
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.textTertiary,
    marginBottom: 8,
    marginHorizontal: 4,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  sectionCard: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.xxl,
    overflow: 'hidden',
    ...SHADOWS.sm,
  },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, minHeight: 54 },
  rowIcon: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  rowIconNormal: { backgroundColor: COLORS.gray100 },
  rowIconDestructive: { backgroundColor: COLORS.redLight },
  rowContent: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start', paddingHorizontal: 12 },
  rowLabel: { fontSize: FONT_SIZES.md, fontWeight: FONT_WEIGHTS.medium, color: COLORS.text },
  rowLabelDestructive: { color: COLORS.error },
  rowChevron: { justifyContent: 'center', alignItems: 'center' },
  rowDivider: { height: 1, backgroundColor: COLORS.gray100, marginHorizontal: 16 },
  badge: {
    minWidth: 20, height: 20, borderRadius: 10,
    backgroundColor: COLORS.error, justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: 6, marginHorizontal: 8,
  },
  badgeText: { color: COLORS.white, fontSize: FONT_SIZES.xs, fontWeight: FONT_WEIGHTS.bold },

  logoutSection: { marginTop: 24, paddingHorizontal: 16 },
  logoutButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: COLORS.white, borderRadius: RADIUS.xxl, paddingVertical: 16, gap: 8,
    ...SHADOWS.sm,
  },
  logoutText: { fontSize: FONT_SIZES.md, fontWeight: FONT_WEIGHTS.semibold, color: COLORS.error },
  deleteQuiet: { alignItems: 'center', paddingVertical: 14 },
  deleteQuietText: {
    fontSize: FONT_SIZES.sm, fontWeight: FONT_WEIGHTS.medium,
    color: COLORS.textTertiary, textDecorationLine: 'underline',
  },
});
