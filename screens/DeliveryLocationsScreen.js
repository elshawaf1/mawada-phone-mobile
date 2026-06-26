import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Switch,
  Alert,
  Platform,
  KeyboardAvoidingView,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MapPin, Phone, Plus, Trash2, Edit3, Check, ChevronRight } from 'lucide-react-native';
import Button from '../components/Button';
import { ListSkeleton } from '../components/Skeleton';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../constants';
import { useAuth } from '../context/AuthContext';
import { db } from '../services/api';
import { useTranslation } from '../context/AppSettingsContext';
import { useDirection } from '../hooks/useDirection';

export default function DeliveryLocationsScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { t } = useTranslation();
  const dir = useDirection();
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingAddress, setEditingAddress] = useState(null);
  const [formData, setFormData] = useState({ label: '', city: '', street: '', region: '', phone: '', isDefault: false });

  const onReturn = route?.params?.onReturn;

  useEffect(() => {
    fetchAddresses();
  }, [user?.id]);

  const fetchAddresses = async () => {
    if (!user?.id) return;
    try {
      const data = await db.getAddresses(user.id);
      setAddresses(data || []);
    } catch (error) {
      console.error('Error fetching addresses:', error);
      Alert.alert(t('common.error'), t('addresses.deleteFailed') + ': ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const openAddModal = () => {
    setEditingAddress(null);
    setFormData({ label: '', city: '', street: '', region: '', phone: '', isDefault: false });
    setModalVisible(true);
  };

  const openEditModal = (address) => {
    setEditingAddress(address);
    setFormData({
      label: address.label || '',
      city: address.city || '',
      street: address.street || '',
      region: address.region || '',
      phone: address.phone || '',
      isDefault: address.isDefault || false,
    });
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!user?.id) {
      Alert.alert(t('common.error'), t('addresses.loginRequired'));
      return;
    }

    if (!formData.city || !formData.street || !formData.phone) {
      Alert.alert(t('common.error'), t('addresses.fillRequired'));
      return;
    }

    if (formData.phone.length < 10) {
      Alert.alert(t('common.error'), t('addresses.phoneInvalid'));
      return;
    }

    setSaving(true);
    try {
      const addressData = {
        userId: user.id,
        label: formData.label || `${formData.city} - ${formData.region}`,
        city: formData.city,
        street: formData.street,
        region: formData.region,
        phone: formData.phone,
        isDefault: formData.isDefault,
      };

      if (editingAddress) {
        await db.updateAddress(editingAddress.id, addressData);
      } else {
        await db.createAddress(addressData);
      }

      setModalVisible(false);
      fetchAddresses();
    } catch (error) {
      Alert.alert('خطأ', error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    Alert.alert(t('common.delete'), t('addresses.deleteConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: async () => {
          try {
            await db.deleteAddress(id, user?.id);
            fetchAddresses();
          } catch (error) {
      Alert.alert(t('common.error'), error.message);
          }
        },
      },
    ]);
  };

  const handleSelect = (address) => {
    if (onReturn) {
      onReturn(address);
      navigation.goBack();
    }
  };

  const setDefault = async (id) => {
    try {
      await db.updateAddress(id, { isDefault: true, userId: user?.id });
      fetchAddresses();
    } catch (error) {
      Alert.alert(t('common.error'), error.message);
    }
  };

  return (
    <View style={styles.root}>
      <View style={[styles.headerContainer, { paddingTop: insets.top + 10 }]}>
        <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
        <View style={[styles.headerContent, { flexDirection: dir.row }]}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()} activeOpacity={0.7}>
            <ChevronRight color={COLORS.text} size={24} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('addresses.title')}</Text>
          <View style={styles.spacer} />
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ListSkeleton rows={4} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: 30 + insets.bottom }]} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {addresses.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="location-outline" size={48} color="#CBD5E1" />
              <Text style={styles.emptyText}>{t('addresses.empty')}</Text>
              <Text style={styles.emptySubtext}>{t('addresses.emptySub')}</Text>
            </View>
          ) : (
            addresses.map((addr) => (
              <TouchableOpacity
                key={addr.id}
                style={[styles.addressCard, addr.isDefault && styles.addressCardDefault]}
                activeOpacity={0.8}
                onPress={() => onReturn && handleSelect(addr)}
              >
                <View style={[styles.addressHeader, { flexDirection: dir.row }]}>
                  <View style={styles.addressInfo}>
                    <View style={[styles.addressRow, { flexDirection: dir.row }]}>
                      <MapPin size={16} color="#3B82F6" />
                      <Text style={styles.addressCity}>{addr.label || `${addr.city} - ${addr.region}`}</Text>
                    </View>
                    <Text style={[styles.addressStreet, { textAlign: dir.textAlign }]} numberOfLines={2}>{addr.street}</Text>
                    <View style={[styles.addressRow, { flexDirection: dir.row }]}>
                      <Phone size={14} color="#64748B" />
                      <Text style={styles.addressPhone}>+20 {addr.phone}</Text>
                    </View>
                  </View>
                  {addr.isDefault && (
                    <View style={[styles.defaultBadge, { flexDirection: dir.row }]}>
                      <Check size={12} color="#22C55E" />
                      <Text style={styles.defaultText}>{t('addresses.default')}</Text>
                    </View>
                  )}
                </View>

                <View style={[styles.addressActions, { flexDirection: dir.row }]}>
                  {!addr.isDefault && (
                    <TouchableOpacity style={[styles.actionBtn, { flexDirection: dir.row }]} onPress={() => setDefault(addr.id)}>
                      <Text style={styles.actionBtnText}>{t('addresses.setDefault')}</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity style={[styles.actionBtn, { flexDirection: dir.row }]} onPress={() => openEditModal(addr)}>
                    <Edit3 size={14} color="#64748B" />
                    <Text style={styles.actionBtnText}>{t('common.edit')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.actionBtn, { flexDirection: dir.row }]} onPress={() => handleDelete(addr.id)}>
                    <Trash2 size={14} color="#EF4444" />
                    <Text style={[styles.actionBtnText, { color: '#EF4444' }]}>{t('common.delete')}</Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            ))
          )}

          <Button title={t('addresses.addButton')} onPress={openAddModal} variant="outline" fullWidth icon={<Plus size={18} color="#0F172A" />} style={{ shadowOpacity: 0, elevation: 0 }} />
        </ScrollView>
      )}

      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setModalVisible(false)}>
          <TouchableOpacity activeOpacity={1} style={styles.modalSheet}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>{editingAddress ? t('addresses.editTitle') : t('addresses.addTitle')}</Text>

            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { textAlign: dir.textAlign }]}>{t('addresses.label')}</Text>
              <TextInput style={[styles.formInput, { textAlign: dir.textAlign }]} placeholder={t('addresses.labelPlaceholder')} value={formData.label} onChangeText={(v) => setFormData(p => ({ ...p, label: v }))} textAlign={dir.textAlign} />
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { textAlign: dir.textAlign }]}>{t('addresses.city')}</Text>
              <TextInput style={[styles.formInput, { textAlign: dir.textAlign }]} placeholder={t('addresses.cityPlaceholder')} value={formData.city} onChangeText={(v) => setFormData(p => ({ ...p, city: v }))} textAlign={dir.textAlign} />
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { textAlign: dir.textAlign }]}>{t('addresses.region')}</Text>
              <TextInput style={[styles.formInput, { textAlign: dir.textAlign }]} placeholder={t('addresses.regionPlaceholder')} value={formData.region} onChangeText={(v) => setFormData(p => ({ ...p, region: v }))} textAlign={dir.textAlign} />
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { textAlign: dir.textAlign }]}>{t('addresses.street')}</Text>
              <TextInput style={[styles.formInput, { textAlign: dir.textAlign }]} placeholder={t('addresses.streetPlaceholder')} value={formData.street} onChangeText={(v) => setFormData(p => ({ ...p, street: v }))} textAlign={dir.textAlign} multiline />
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { textAlign: dir.textAlign }]}>{t('addresses.phone')}</Text>
              <Text style={[styles.phoneHint, { textAlign: dir.textAlign }]}>{t('addresses.phoneHint')}</Text>
              <View style={styles.phoneRow}>
                <View style={styles.phonePrefix}><Text style={styles.phonePrefixText}>+20</Text></View>
                <TextInput style={styles.phoneInput} placeholder="1012345678" keyboardType="phone-pad" value={formData.phone} onChangeText={(v) => { const cleaned = v.replace(/[^0-9]/g, ''); const noLeadingZero = cleaned.replace(/^0/, ''); if (noLeadingZero.length <= 10) setFormData(p => ({ ...p, phone: noLeadingZero })); }} textAlign="right" />
              </View>
            </View>

            <View style={[styles.defaultRow, { flexDirection: dir.row }]}>
              <Text style={[styles.formLabel, { textAlign: dir.textAlign }]}>{t('addresses.isDefault')}</Text>
              <Switch value={formData.isDefault} onValueChange={(v) => setFormData(p => ({ ...p, isDefault: v }))} trackColor={{ false: '#E2E8F0', true: '#0F172A' }} thumbColor="#fff" />
            </View>

            <Button title={editingAddress ? t('addresses.saveEdit') : t('addresses.saveAdd')} onPress={handleSave} fullWidth style={{ marginTop: 16 }} loading={saving} disabled={saving} />
            <Button title={t('common.cancel')} onPress={() => setModalVisible(false)} variant="ghost" fullWidth style={{ marginTop: 8, shadowOpacity: 0, elevation: 0 }} />
            </KeyboardAvoidingView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F8FAFC' },
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
  spacer: { width: 40 },
  scroll: { padding: 16, gap: 12 },
  emptyState: { alignItems: 'center', paddingVertical: 60 },
  emptyText: { fontSize: 16, fontWeight: '600', color: '#64748B', marginTop: 12 },
  emptySubtext: { fontSize: 14, color: '#94A3B8', marginTop: 4 },

  addressCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16,
    borderWidth: 1.5, borderColor: '#E2E8F0',
  },
  addressCardDefault: { borderColor: '#3B82F6', backgroundColor: '#F0F7FF' },
  addressHeader: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'flex-start' },
  addressInfo: { flex: 1 },
  addressRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6, marginBottom: 4 },
  addressCity: { fontSize: 15, fontWeight: '700', color: '#0F172A' },
  addressStreet: { fontSize: 13, color: '#64748B', textAlign: 'right', marginBottom: 4, lineHeight: 18 },
  addressPhone: { fontSize: 13, color: '#64748B' },
  defaultBadge: { flexDirection: 'row-reverse', alignItems: 'center', gap: 4, backgroundColor: '#F0FDF4', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  defaultText: { fontSize: 11, fontWeight: '600', color: '#22C55E' },
  addressActions: { flexDirection: 'row-reverse', gap: 12, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  actionBtn: { flexDirection: 'row-reverse', alignItems: 'center', gap: 4 },
  actionBtnText: { fontSize: 12, fontWeight: '600', color: '#64748B' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 24, paddingBottom: 36, paddingTop: 16 },
  modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#E2E8F0', alignSelf: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#0F172A', textAlign: 'center', marginBottom: 20 },
  formGroup: { marginBottom: 16 },
  formLabel: { fontSize: 13, fontWeight: '600', color: '#64748B', textAlign: 'right', marginBottom: 6 },
  formInput: { backgroundColor: '#F8FAFC', borderRadius: 12, borderWidth: 1.5, borderColor: '#E2E8F0', paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: '#0F172A', minHeight: 48, textAlign: 'right' },
  phoneRow: { flexDirection: 'row-reverse', backgroundColor: '#F8FAFC', borderRadius: 12, borderWidth: 1.5, borderColor: '#E2E8F0', overflow: 'hidden', height: 48 },
  phonePrefix: { backgroundColor: '#0F172A', paddingHorizontal: 14, justifyContent: 'center', alignItems: 'center' },
  phonePrefixText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  phoneHint: { fontSize: 12, color: '#94A3B8', textAlign: 'right', marginBottom: 8 },
  phoneInput: { flex: 1, paddingHorizontal: 14, fontSize: 15, color: '#0F172A', textAlign: 'right' },
  defaultRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
});
