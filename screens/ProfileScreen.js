import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,       
  View,
  ScrollView,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import BottomNav from '../components/BottomNav';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../services/supabase';
import { COLORS } from '../constants';
import { useTranslation } from '../context/AppSettingsContext';
import { useDirection } from '../hooks/useDirection';

export default function ProfileScreen({ navigation }) { 
  const { t } = useTranslation();
  const dir = useDirection();
  const { user, logout } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user?.id) return;
    fetchUnreadCount();
    const sub = supabase
      .channel('profile-notifications')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `userId=eq.${user.id}` }, () => {
        setUnreadCount((prev) => prev + 1);
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

  const menuItems = [
    {
      id: 'notifications',
      title: t('profile.notifications'),
      iconType: 'Ionicons',
      iconName: 'notifications-outline',
      isDestructive: false,
      hasChevron: true,
      badge: unreadCount,
      onPress: () => navigation.navigate('Notifications'),
    },
    {
      id: 'orders',
      title: t('profile.menuOrders'),
      iconType: 'Ionicons',
      iconName: 'receipt-outline',
      isDestructive: false,
      hasChevron: true,
      onPress: () => navigation.navigate('MyOrders'),
    },
    {
      id: 'wishlist',
      title: t('wishlist.title'),
      iconType: 'Ionicons',
      iconName: 'heart-outline',
      isDestructive: false,
      hasChevron: true,
      onPress: () => navigation.navigate('Wishlist'),
    },
    {
      id: 'recentlyViewed',
      title: t('recentlyViewed.title'),
      iconType: 'Ionicons',
      iconName: 'time-outline',
      isDestructive: false,
      hasChevron: true,
      onPress: () => navigation.navigate('RecentlyViewed'),
    },
    {
      id: 'offers',
      title: t('offers.title'),
      iconType: 'Ionicons',
      iconName: 'pricetag-outline',
      isDestructive: false,
      hasChevron: true,
      onPress: () => navigation.navigate('Offers'),
    },
    {
      id: 'myReviews',
      title: t('profile.menuMyReviews'),
      iconType: 'Ionicons',
      iconName: 'star-outline',
      isDestructive: false,
      hasChevron: true,
      onPress: () => navigation.navigate('MyReviews'),
    },
    {
      id: 'locations',
      title: t('profile.menuBranches'),
      iconType: 'Ionicons',
      iconName: 'location-outline',
      isDestructive: false,
      hasChevron: true,
      onPress: () => navigation.navigate('Locations'),
    },
    {
      id: 'settings',
      title: t('settings.title'),
      iconType: 'Ionicons',
      iconName: 'settings-outline',
      isDestructive: false,
      hasChevron: true,
      onPress: () => navigation.navigate('Settings'),
    },
    {
      id: 'chat',
      title: t('profile.support'),
      iconType: 'Ionicons',
      iconName: 'chatbubble-ellipses-outline',
      isDestructive: false,
      hasChevron: true,
      onPress: () => navigation.navigate('Support'),
    },
    {
      id: 'logout',
      title: t('auth.logout'),
      iconType: 'Feather',
      iconName: 'log-out',
      isDestructive: true,
      hasChevron: false,
      onPress: async () => {
        await logout();
        navigation.reset({ index: 0, routes: [{ name: 'Welcome' }] });
      },
    },
  ];

  const renderIcon = (item) => {
    const iconColor = item.isDestructive ? '#c62419' : '#2C2C2E';
    const size = 20;

    if (item.iconType === 'Feather') {
      return <Feather name={item.iconName} size={size} color={iconColor} />;
    } else if (item.iconType === 'MaterialCommunityIcons') {
      return <MaterialCommunityIcons name={item.iconName} size={size} color={iconColor} />;
    }
    return <Ionicons name={item.iconName} size={size} color={iconColor} />;
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F9F9F9" />
      
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.profileCard}>
          <View style={styles.avatarWrapper}>
            <View style={styles.avatarOutline}>
              <View style={styles.avatarPlaceholder}>
                <Ionicons name="person-outline" size={50} color="#C7C7CC" />
              </View>
            </View>
            <TouchableOpacity style={styles.editBadge} activeOpacity={0.8}>
              <MaterialCommunityIcons name="pencil" size={14} color="#FFF" />
            </TouchableOpacity>
          </View>

          {user && (
            <View style={styles.userInfo}>
              <Text style={styles.userName}>{user.name}</Text>
              <Text style={styles.userEmail}>{user.email}</Text>
            </View>
          )}

          <View style={styles.menuList}>
            {menuItems.map((item, index) => {
              const isSystemAction = item.id === 'logout';
              
              return (
                <TouchableOpacity 
                  key={item.id} 
                  style={[
                    styles.menuRow, 
                    isSystemAction && styles.systemRowAdjustment,
                    index === menuItems.length - 1 && { marginBottom: 10 }
                  ]}
                  activeOpacity={0.7}
                  onPress={item.onPress}
                >
                  <View style={styles.leftCol}>
                    {item.hasChevron && (
                      <Ionicons name={dir.leftChevron} size={16} color="#C7C7CC" />
                    )}
                  </View>

                  <View style={styles.rightCol}>
                    <Text style={[styles.menuTitle, item.isDestructive && styles.destructiveText]}>
                      {item.title}
                    </Text>

                    {item.badge > 0 && (
                      <View style={styles.menuBadge}>
                        <Text style={styles.menuBadgeText}>{item.badge > 9 ? '9+' : item.badge}</Text>
                      </View>
                    )}
                    
                    <View style={[
                      styles.iconContainer, 
                      item.isDestructive ? styles.destructiveIconBg : styles.normalIconBg
                    ]}>
                      {renderIcon(item)}
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

        </View>

      </ScrollView>
      <BottomNav navigation={navigation} activeRoute="Profile" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9F9F9' },
  scrollContent: { paddingTop: 80, paddingBottom: 100, alignItems: 'center' },
  profileCard: {
    width: '90%', backgroundColor: '#ffffff', borderRadius: 28,
    paddingHorizontal: 20, paddingBottom: 24,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 3,
    position: 'relative',
  },
  avatarWrapper: { position: 'absolute', top: -55, alignSelf: 'center', zIndex: 10 },
  avatarOutline: {
    width: 110, height: 110, borderRadius: 55, borderWidth: 1.5, borderColor: '#E5E5EA',
    backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center', overflow: 'hidden',
  },
  avatarImage: { width: 102, height: 102, borderRadius: 51 },
  avatarPlaceholder: { width: 110, height: 110, borderRadius: 55, backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center' },
  editBadge: {
    position: 'absolute', bottom: 2, left: 6, backgroundColor: '#2C2C2E',
    width: 26, height: 26, borderRadius: 13, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#FFF',
  },
  userInfo: { marginTop: 75, marginBottom: 16, alignItems: 'center' },
  userName: { fontSize: 18, fontWeight: '700', color: '#2C2C2E' },
  userEmail: { fontSize: 14, color: '#94A3B8' },
  menuList: { marginTop: 8 },
  menuRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, height: 56 },
  systemRowAdjustment: { marginTop: 8 },
  leftCol: { justifyContent: 'center', alignItems: 'flex-end', width: 30 },
  rightCol: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'flex-start', flex: 1 },
  menuTitle: { fontSize: 15, fontWeight: '600', color: '#2C2C2E', marginRight: 14, textAlign: 'right' },
  destructiveText: { color: '#FF3B30' },
  iconContainer: { width: 38, height: 38, borderRadius: 19, justifyContent: 'center', alignItems: 'center' },
  normalIconBg: { backgroundColor: '#F2F2F7' },
  destructiveIconBg: { backgroundColor: '#FFEEEE' },
  menuBadge: {
    minWidth: 20, height: 20, borderRadius: 10,
    backgroundColor: COLORS.error,
    justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: 5, marginRight: 8,
  },
  menuBadgeText: {
    color: '#FFFFFF', fontSize: 10, fontWeight: '700',
  },
});