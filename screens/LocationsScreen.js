import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { MapPin, Phone, Clock, Navigation, ChevronRight } from 'lucide-react-native';
import BottomNav from '../components/BottomNav';
import { ListSkeleton } from '../components/Skeleton';
import { db } from '../services/api';
import { COLORS } from '../constants';
import { useTranslation } from '../context/AppSettingsContext';
import { useDirection } from '../hooks/useDirection';

export default function LocationsScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const { t, weekdays } = useTranslation();
  const dir = useDirection();
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedBranch, setSelectedBranch] = useState(null);

  useEffect(() => {
    fetchBranches();
  }, []);

  const fetchBranches = async () => {
    try {
      const data = await db.getBranches();
      setBranches(data || []);
    } catch (error) {
      console.error('Error fetching branches:', error);
    } finally {
      setLoading(false);
    }
  };

  const callBranch = (phone) => {
    if (phone) Linking.openURL(`tel:${phone.replace(/\s/g, '')}`);
  };

  return (
    <View style={styles.container}>
      <View style={[styles.headerContainer, { paddingTop: insets.top + 10 }]}>
        <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
        <View style={[styles.headerContent, { flexDirection: dir.row }]}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()} activeOpacity={0.7}>
            <ChevronRight color={COLORS.text} size={24} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('branches.title')}</Text>
          <View style={styles.countBadge}>
            <Text style={styles.countText}>{t('branches.count', { count: branches.length })}</Text>
          </View>
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ListSkeleton rows={4} />
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
          <Text style={[styles.sectionLabel, { textAlign: dir.textAlign }]}>{t('branches.nearest')}</Text>

          {branches.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="location-outline" size={48} color="#CBD5E1" />
              <Text style={styles.emptyText}>{t('branches.empty')}</Text>
            </View>
          ) : (
            branches.map((branch) => (
              <TouchableOpacity
                key={branch.id}
                style={[
                  styles.branchCard,
                  selectedBranch === branch.id && styles.branchCardSelected,
                ]}
                onPress={() => setSelectedBranch(branch.id)}
                activeOpacity={0.85}
              >
                <View style={[styles.branchHeader, { flexDirection: dir.row }]}>
                  <View style={[styles.availBadge, !branch.isActive && styles.unavailBadge]}>
                    <Text style={[styles.availText, !branch.isActive && styles.unavailText]}>
                      {branch.isActive ? t('branches.open') : t('branches.closed')}
                    </Text>
                  </View>
                  <View style={[styles.branchNameBlock, { alignItems: dir.alignItems }]}>
                    <Text style={[styles.branchName, { textAlign: dir.textAlign }]}>{branch.nameAr || branch.name}</Text>
                    {branch.addressAr && <Text style={styles.branchArea}>{branch.addressAr}</Text>}
                  </View>
                </View>

                <View style={styles.branchDivider} />

                {branch.address && (
                  <View style={[styles.infoRow, { flexDirection: dir.row }]}>
                    <MapPin size={15} color="#64748B" />
                    <Text style={[styles.infoText, { textAlign: dir.textAlign }]}>{branch.address}</Text>
                  </View>
                )}

                {branch.workingHours && (
                  <View style={[styles.infoRow, { flexDirection: dir.row }]}>
                    <Clock size={15} color="#64748B" />
                    <Text style={[styles.infoText, { textAlign: dir.textAlign }]}>{branch.workingHours}</Text>
                  </View>
                )}

                {branch.phone && (
                  <TouchableOpacity style={[styles.infoRow, { flexDirection: dir.row }]} onPress={() => callBranch(branch.phone)} activeOpacity={0.7}>
                    <Phone size={15} color="#64748B" />
                    <Text style={[styles.infoText, { textAlign: dir.textAlign, color: COLORS.primary }]}>{branch.phone}</Text>
                  </TouchableOpacity>
                )}

                <View style={[styles.branchFooter, { flexDirection: dir.row }]}>
                  {branch.phone && (
                    <TouchableOpacity style={[styles.callBtn, { flexDirection: dir.row }]} onPress={() => callBranch(branch.phone)}>
                      <Phone size={14} color="#0F172A" />
                      <Text style={styles.callBtnText}>{t('branches.call')}</Text>
                    </TouchableOpacity>
                  )}

                </View>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      )}

      {selectedBranch && (
        <View style={[styles.stickyBottom, { paddingBottom: insets.bottom + 12 }]}>
          <TouchableOpacity
            style={styles.selectBtn}
            onPress={() => {
              const branch = branches.find(b => b.id === selectedBranch);
              const onReturn = route?.params?.onReturn;
              if (onReturn && branch) onReturn(branch);
              if (navigation.canGoBack()) {
                navigation.goBack();
              }
            }}
            activeOpacity={0.85}
          >
            <Text style={styles.selectBtnText}>{t('branches.select')}</Text>
          </TouchableOpacity>
        </View>
      )}
      <BottomNav navigation={navigation} activeRoute="Profile" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
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
  countBadge: { backgroundColor: '#F1F5F9', borderRadius: 14, paddingHorizontal: 12, paddingVertical: 5 },
  countText: { fontSize: 12, fontWeight: '600', color: '#64748B' },
  scroll: { padding: 16, paddingBottom: 100 },
  sectionLabel: { fontSize: 15, fontWeight: '700', color: '#0F172A', textAlign: 'right', marginBottom: 12 },
  emptyState: { alignItems: 'center', paddingVertical: 60 },
  emptyText: { fontSize: 16, color: '#94A3B8', marginTop: 12 },

  branchCard: {
    backgroundColor: '#fff', borderRadius: 20, padding: 16, marginBottom: 14,
    shadowColor: '#000', shadowOpacity: 0.05, shadowOffset: { width: 0, height: 4 }, shadowRadius: 10, elevation: 2,
    borderWidth: 1.5, borderColor: 'transparent',
  },
  branchCardSelected: { borderColor: '#0F172A' },
  branchHeader: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  branchNameBlock: { flex: 1, alignItems: 'flex-start' },
  branchName: { fontSize: 15, fontWeight: '700', color: '#0F172A', textAlign: 'right' },
  branchArea: { fontSize: 12, color: '#94A3B8', marginTop: 2 },
  availBadge: { backgroundColor: '#F0FDF4', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  unavailBadge: { backgroundColor: '#FEF2F2' },
  availText: { fontSize: 12, fontWeight: '700', color: '#22C55E' },
  unavailText: { color: '#EF4444' },
  branchDivider: { height: 1, backgroundColor: '#F1F5F9', marginBottom: 12 },
  infoRow: { flexDirection: 'row-reverse', alignItems: 'center', marginBottom: 8, gap: 8 },
  infoText: { fontSize: 13, color: '#64748B', textAlign: 'right', flex: 1, marginRight: 6 },
  branchFooter: { flexDirection: 'row-reverse', alignItems: 'center', marginTop: 10, gap: 10 },
  callBtn: {
    flexDirection: 'row-reverse', alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: '#E2E8F0', gap: 6,
  },
  callBtnText: { fontSize: 13, fontWeight: '600', color: '#0F172A', marginRight: 4 },
  selectBtn: { flex: 1, backgroundColor: '#0F172A', borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  selectBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  stickyBottom: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#fff', paddingHorizontal: 16, paddingTop: 12,
    borderTopWidth: 1, borderTopColor: '#F1F5F9',
    shadowColor: '#000', shadowOpacity: 0.08, shadowOffset: { width: 0, height: -4 }, shadowRadius: 12, elevation: 8,
  },
});
