import React, { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Switch, StatusBar, Linking, Alert } from 'react-native';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { ChevronRight } from 'lucide-react-native';
import BottomNav from '../components/BottomNav';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { useTranslation, useTheme, useAppSettings } from '../context/AppSettingsContext';
import { COLORS } from '../constants';
import { useDirection } from '../hooks/useDirection';

const APP_VERSION = '1.0.0';

export default function SettingsScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { logout } = useAuth();
  const { t, locale } = useTranslation();
  const { darkMode, toggleDarkMode } = useTheme();
  const { toggleLocale } = useAppSettings();
  const [notificationsOn, setNotificationsOn] = useState(true);
  const [ordersNotif, setOrdersNotif] = useState(true);
  const [offersNotif, setOffersNotif] = useState(true);
  const dir = useDirection();

  const handleLogout = async () => {
    Alert.alert(t('auth.logoutTitle'), t('auth.logoutConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('auth.logout'), style: 'destructive', onPress: async () => {
        await logout();
        navigation.reset({ index: 0, routes: [{ name: 'Welcome' }] });
      }},
    ]);
  };

  const openUrl = (url) => Linking.openURL(url).catch(() => {});

  const Section = ({ title, children }) => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionCard}>{children}</View>
    </View>
  );

  const RowLink = ({ icon, iconType = 'Ionicons', label, value, onPress, isDestructive = false }) => {
    const color = isDestructive ? '#EF4444' : '#0F172A';
    const renderIcon = () => {
      if (iconType === 'Feather') return <Feather name={icon} size={20} color={isDestructive ? '#EF4444' : '#64748B'} />;
      if (iconType === 'MaterialCommunityIcons') return <MaterialCommunityIcons name={icon} size={20} color={isDestructive ? '#EF4444' : '#64748B'} />;
      return <Ionicons name={icon} size={20} color={isDestructive ? '#EF4444' : '#64748B'} />;
    };
    return (
      <TouchableOpacity style={[styles.row, { flexDirection: dir.row }]} onPress={onPress} activeOpacity={0.7}>
        <Ionicons name={dir.leftChevron} size={16} color="#C7C7CC" />
        <View style={[styles.rowContent, { flexDirection: dir.row, justifyContent: dir.flexStart }]}>
          {value ? <Text style={styles.rowValue}>{value}</Text> : null}
          <Text style={[styles.rowLabel, isDestructive && { color }]}>{label}</Text>
        </View>
        <View style={[styles.rowIcon, { backgroundColor: isDestructive ? '#FEF2F2' : '#F1F5F9' }]}>{renderIcon()}</View>
      </TouchableOpacity>
    );
  };

  const RowToggle = ({ icon, label, value, onValueChange }) => (
    <View style={[styles.row, { flexDirection: dir.row }]}>
      <Switch value={value} onValueChange={onValueChange} trackColor={{ false: '#E2E8F0', true: '#0F172A' }} thumbColor="#fff" ios_backgroundColor="#E2E8F0" style={{ transform: [{ scaleX: 0.85 }, { scaleY: 0.85 }] }} />
      <View style={[styles.rowContent, { flexDirection: dir.row, justifyContent: dir.flexStart }]}><Text style={styles.rowLabel}>{label}</Text></View>
      <View style={[styles.rowIcon, { backgroundColor: '#F1F5F9' }]}><Ionicons name={icon} size={20} color="#64748B" /></View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={[styles.headerContainer, { paddingTop: insets.top + 10 }]}>
        <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
        <View style={[styles.headerContent, { flexDirection: dir.row }]}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()} activeOpacity={0.7}>
            <ChevronRight color={COLORS.text} size={24} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('settings.title')}</Text>
          <View style={styles.spacer} />
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <Section title={t('settings.notifications')}>
          <RowToggle icon="notifications-outline" label={t('settings.enableNotifications')} value={notificationsOn} onValueChange={setNotificationsOn} />
          {notificationsOn && (
            <>
              <View style={styles.rowDivider} />
              <RowToggle icon="cube-outline" label={t('settings.orderNotifications')} value={ordersNotif} onValueChange={setOrdersNotif} />
              <View style={styles.rowDivider} />
              <RowToggle icon="pricetag-outline" label={t('settings.offerNotifications')} value={offersNotif} onValueChange={setOffersNotif} />
            </>
          )}
        </Section>

        <Section title={t('settings.appearance')}>
          <RowToggle icon="moon-outline" label={t('settings.darkMode')} value={darkMode} onValueChange={toggleDarkMode} />
          <View style={styles.rowDivider} />
          <RowLink icon="language-outline" label={t('settings.language')} value={locale === 'ar' ? t('settings.arabic') : t('settings.english')} onPress={toggleLocale} />
        </Section>

        <Section title={t('settings.account')}>
          <RowLink icon="person-outline" label={t('settings.editProfile')} onPress={() => navigation.navigate('EditProfile')} />
          <View style={styles.rowDivider} />
          <RowLink icon="lock-closed-outline" label={t('settings.changePassword')} onPress={() => navigation.navigate('UpdatePassword')} />
          <View style={styles.rowDivider} />
          <RowLink icon="location-outline" label={t('settings.manageAddresses')} onPress={() => navigation.navigate('DeliveryLocations')} />
          <View style={styles.rowDivider} />
          <RowLink icon="card-outline" label={t('settings.savedPaymentMethods')} onPress={() => Alert.alert(t('settings.deleteAccountTitle'), t('settings.comingSoon'))} />
          <View style={styles.rowDivider} />
          <RowLink iconType="Feather" icon="log-out" label={t('settings.logout')} onPress={handleLogout} />
          <View style={styles.rowDivider} />
          <RowLink iconType="Feather" icon="trash-2" label={t('settings.deleteAccount')} onPress={() => Alert.alert(t('settings.deleteAccountTitle'), t('settings.deleteAccountNotAvailable'))} isDestructive />
        </Section>

        <Section title={t('settings.support')}>
          <RowLink icon="chatbubble-ellipses-outline" label={t('settings.contactUs')} onPress={() => navigation.navigate('Chat')} />
          <View style={styles.rowDivider} />
          <RowLink icon="star-outline" label={t('settings.rateApp')} onPress={() => openUrl('https://play.google.com/store')} />
        </Section>

        <Section title={t('settings.legal')}>
          <RowLink icon="document-text-outline" label={t('settings.privacyPolicy')} onPress={() => Alert.alert(t('settings.privacyPolicy'), t('settings.comingSoon'))} />
          <View style={styles.rowDivider} />
          <RowLink icon="shield-checkmark-outline" label={t('settings.terms')} onPress={() => Alert.alert(t('settings.terms'), t('settings.comingSoon'))} />
        </Section>

        <View style={styles.versionBlock}>
          <Text style={styles.versionText}>{t('settings.appName')}</Text>
          <Text style={styles.versionNum}>{t('settings.version', { version: APP_VERSION })}</Text>
        </View>
      </ScrollView>
      <BottomNav navigation={navigation} activeRoute="Profile" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  headerContainer: { backgroundColor: COLORS.white, paddingBottom: 12, shadowColor: COLORS.black, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 3 },
  headerContent: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, height: 44 },
  backButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.gray50, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '600', color: COLORS.text, textAlign: 'center' },
  spacer: { width: 40 },
  scroll: { padding: 16, paddingBottom: 100 },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 12, fontWeight: '700', color: '#94A3B8', textAlign: 'right', marginBottom: 8, marginRight: 4, letterSpacing: 0.5, textTransform: 'uppercase' },
  sectionCard: { backgroundColor: '#fff', borderRadius: 20, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.04, shadowOffset: { width: 0, height: 2 }, shadowRadius: 8, elevation: 1 },
  row: { flexDirection: 'row-reverse', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, minHeight: 56 },
  rowContent: { flex: 1, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'flex-start', paddingHorizontal: 12 },
  rowLabel: { fontSize: 15, fontWeight: '500', color: '#0F172A' },
  rowValue: { fontSize: 13, color: '#94A3B8', marginLeft: 8 },
  rowIcon: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  rowDivider: { height: 1, backgroundColor: '#F1F5F9', marginHorizontal: 16 },
  versionBlock: { alignItems: 'center', paddingVertical: 24 },
  versionText: { fontSize: 14, fontWeight: '700', color: '#0F172A' },
  versionNum: { fontSize: 12, color: '#94A3B8', marginTop: 4 },
});
