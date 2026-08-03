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
import { useMessageBox } from '../context/MessageBoxContext';

export default function DeliveryLocationsScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { t } = useTranslation();
  const dir = useDirection();
  const { showMessageBox } = useMessageBox();
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
      showMessageBox({ type: 'error', title: t('common.error'), message: t('addresses.deleteFailed') + ': ' + error.message });
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
      showMessageBox({ type: 'error', title: t('common.error'), message: t('addresses.loginRequired') });
      return;
    }

    if (!formData.city || !formData.street || !formData.phone) {
      showMessageBox({ type: 'error', title: t('common.error'), message: t('addresses.fillRequired') });
      return;
    }

    if (formData.phone.length < 10) {
      showMessageBox({ type: 'error', title: t('common.error'), message: t('addresses.phoneInvalid') });
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
      showMessageBox({ type: 'error', title: t('common.error'), message: error.message });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    showMessageBox({
      type: 'warning',
      title: t('common.delete'),
      message: t('addresses.deleteConfirm'),
      buttons: [
        { text: t('common.cancel'), style: 'secondary' },
        {
          text: t('common.delete'),
          style: 'primary',
          onPress: async () => {
            try {
              await db.deleteAddress(id, user?.id);
              fetchAddresses();
            } catch (error) {
              showMessageBox({ type: 'error', title: t('common.error'), message: error.message });
            }
          },
        },
      ],
    });
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
      showMessageBox({ type: 'error', title: t('common.error'), message: error.message });
    }
  };

  return (
    <View style={styles.root}>
      <View style={[styles.headerContainer, { paddingTop: insets.top + 10 }]}>
        <StatusBar barStyle="dark-content" />
        <View style={[styles.headerContent, { flexDirection: dir.row }]}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()} activeOpacity={0.7}>
            <ChevronRight color="#6B7280" size={24} />
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
              <MapPin size={48} color="rgba(15,23,42,0.25)" />
              <Text style={styles.emptyText}>{t('addresses.empty')}</Text>
              <Text style={styles.emptySubtext}>{t('addresses.emptySub')}</Text>
            </View>
          ) : (
            addresses.map((addr, index) => {
              return (
                <TouchableOpacity
                  key={addr.id}
                  style={[styles.addressCard, addr.isDefault && styles.addressCardDefault]}
                  activeOpacity={0.8}
                  onPress={() => onReturn && handleSelect(addr)}
                >
                  <View style={styles.addressTopRow}>
                    <View style={styles.addressHeader}>
                      <View style={styles.addressInfo}>
                        <View style={[styles.addressRow, { flexDirection: dir.row }]}>
                          <MapPin size={16} color="#0F172A" />
                          <Text style={styles.addressCity}>{addr.label || `${addr.city} - ${addr.region}`}</Text>
                        </View>
                        <Text style={[styles.addressStreet, { textAlign: dir.textAlign }]} numberOfLines={2}>{addr.street}</Text>
                        <View style={[styles.addressRow, { flexDirection: dir.row }]}>
                          <Phone size={14} color="#6B7280" />
                          <Text style={styles.addressPhone}>+20 {addr.phone}</Text>
                        </View>
                      </View>
                    </View>
                    {addr.isDefault && (
                      <View style={[styles.defaultBadge, { flexDirection: dir.row }]}>
                        <Check size={12} color="#0F172A" />
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
                      <Edit3 size={14} color="#6B7280" />
                      <Text style={styles.actionBtnText}>{t('common.edit')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.actionBtn, { flexDirection: dir.row }]} onPress={() => handleDelete(addr.id)}>
                      <Trash2 size={14} color="#EF4444" />
                      <Text style={[styles.actionBtnText, { color: '#EF4444' }]}>{t('common.delete')}</Text>
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              );
            })
          )}

          <Button title={t('addresses.addButton')} onPress={openAddModal} fullWidth icon={<Plus size={18} color="#FFFFFF" />} style={{ borderRadius: 10, backgroundColor: '#0F172A', borderWidth: 0, shadowColor: '#0F172A', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.2, shadowRadius: 12, elevation: 8 }} textStyle={{ color: '#FFFFFF', fontWeight: '600' }} />
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
                <View style={[styles.inputRow, { flexDirection: dir.row }]}>
                  <Ionicons name="pricetag-outline" size={20} color="#6B7280" />
                  <TextInput style={[styles.input, { textAlign: dir.textAlign }]} placeholder={t('addresses.labelPlaceholder')} placeholderTextColor="rgba(0,0,0,0.30)" value={formData.label} onChangeText={(v) => setFormData(p => ({ ...p, label: v }))} textAlign={dir.textAlign} />
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { textAlign: dir.textAlign }]}>{t('addresses.city')}</Text>
                <View style={[styles.inputRow, { flexDirection: dir.row }]}>
                  <Ionicons name="business-outline" size={20} color="#6B7280" />
                  <TextInput style={[styles.input, { textAlign: dir.textAlign }]} placeholder={t('addresses.cityPlaceholder')} placeholderTextColor="rgba(0,0,0,0.30)" value={formData.city} onChangeText={(v) => setFormData(p => ({ ...p, city: v }))} textAlign={dir.textAlign} />
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { textAlign: dir.textAlign }]}>{t('addresses.region')}</Text>
                <View style={[styles.inputRow, { flexDirection: dir.row }]}>
                  <Ionicons name="map-outline" size={20} color="#6B7280" />
                  <TextInput style={[styles.input, { textAlign: dir.textAlign }]} placeholder={t('addresses.regionPlaceholder')} placeholderTextColor="rgba(0,0,0,0.30)" value={formData.region} onChangeText={(v) => setFormData(p => ({ ...p, region: v }))} textAlign={dir.textAlign} />
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { textAlign: dir.textAlign }]}>{t('addresses.street')}</Text>
                <View style={[styles.inputRow, { flexDirection: dir.row }]}>
                  <Ionicons name="road-outline" size={20} color="#6B7280" />
                  <TextInput style={[styles.input, { textAlign: dir.textAlign }]} placeholder={t('addresses.streetPlaceholder')} placeholderTextColor="rgba(0,0,0,0.30)" value={formData.street} onChangeText={(v) => setFormData(p => ({ ...p, street: v }))} textAlign={dir.textAlign} multiline />
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { textAlign: dir.textAlign }]}>{t('addresses.phone')}</Text>
                <Text style={[styles.phoneHint, { textAlign: dir.textAlign }]}>{t('addresses.phoneHint')}</Text>
                <View style={[styles.inputRow, { flexDirection: dir.row }]}>
                  <Phone size={20} color="#6B7280" />
                  <TextInput
                    style={[styles.input, { textAlign: dir.textAlign }]}
                    placeholder="+20 010-000-0000"
                    placeholderTextColor="rgba(0,0,0,0.30)"
                    textAlign={dir.textAlign}
                    keyboardType="phone-pad"
                    value={formData.phone ? `+20 ${formData.phone}` : ''}
                    onChangeText={(v) => {
                      const cleaned = v.replace(/[^0-9]/g, '');
                      const withoutPrefix = cleaned.startsWith('20') ? cleaned.slice(2) : cleaned;
                      const noLeadingZero = withoutPrefix.replace(/^0/, '');
                      if (noLeadingZero.length <= 10) setFormData(p => ({ ...p, phone: noLeadingZero }));
                    }}
                  />
                </View>
              </View>

              <View style={[styles.defaultRow, { flexDirection: dir.row }]}>
                <Text style={[styles.formLabel, { textAlign: dir.textAlign, marginBottom: 0 }]}>{t('addresses.isDefault')}</Text>
                <Switch value={formData.isDefault} onValueChange={(v) => setFormData(p => ({ ...p, isDefault: v }))} trackColor={{ false: 'rgba(0,0,0,0.12)', true: '#0F172A' }} thumbColor="#FFFFFF" />
              </View>

              <Button title={editingAddress ? t('addresses.saveEdit') : t('addresses.saveAdd')} onPress={handleSave} fullWidth style={{ marginTop: 16, borderRadius: 10, backgroundColor: '#0F172A', borderWidth: 0, shadowColor: '#0F172A', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.2, shadowRadius: 12, elevation: 8 }} loading={saving} disabled={saving} textStyle={{ color: '#FFFFFF', fontWeight: '600' }} />
              <Button title={t('common.cancel')} onPress={() => setModalVisible(false)} variant="ghost" fullWidth style={{ marginTop: 8, borderRadius: 10, elevation: 0, shadowOpacity: 0, shadowColor: "transparent" }} textStyle={{ color: '#6B7280', fontWeight: '500' }} />
            </KeyboardAvoidingView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F8F9FC' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  headerContainer: {
    backgroundColor: '#FFFFFF',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.08)',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    height: 44,
  },
  backButton: {
    width: 44, height: 44, borderRadius: 10,
    borderWidth: 1, borderColor: 'rgba(0,0,0,0.08)', backgroundColor: '#F8F9FC',
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: 18, fontWeight: '600', color: '#1A1D26', textAlign: 'center', letterSpacing: -0.3 },
  spacer: { width: 44 },
  scroll: { padding: 16, gap: 12 },

  emptyState: { alignItems: 'center', paddingVertical: 80 },
  emptyText: { fontSize: 20, fontWeight: '600', color: '#1A1D26', marginTop: 16, letterSpacing: -0.3 },
  emptySubtext: { fontSize: 14, color: '#6B7280', marginTop: 6, fontWeight: '400' },

  addressCard: {
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: 'rgba(0,0,0,0.06)',
    shadowColor: '#000000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 2,
  },
  addressCardDefault: {
    borderLeftWidth: 3, borderLeftColor: '#0F172A',
    shadowColor: '#0F172A', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8,
  },
  addressTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  addressHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', flex: 1 },
  addressInfo: { flex: 1 },
  addressRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  addressCity: { fontSize: 15, fontWeight: '600', color: '#1A1D26', letterSpacing: -0.2 },
  addressStreet: { fontSize: 13, color: '#6B7280', textAlign: 'left', marginBottom: 4, lineHeight: 18, fontWeight: '400' },
  addressPhone: { fontSize: 13, color: 'rgba(0,0,0,0.45)', fontWeight: '400' },
  defaultBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(15,23,42,0.08)', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5,
    borderWidth: 1, borderColor: 'rgba(15,23,42,0.20)',
  },
  defaultText: { fontSize: 11, fontWeight: '600', color: '#0F172A' },
  addressActions: { flexDirection: 'row', gap: 16, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.06)' },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  actionBtnText: { fontSize: 12, fontWeight: '500', color: '#6B7280', letterSpacing: 0.3 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: '#FFFFFF', borderTopLeftRadius: 20, borderTopRightRadius: 20,
    borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.06)',
    paddingHorizontal: 24, paddingBottom: 36, paddingTop: 16,
  },
  modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: 'rgba(0,0,0,0.12)', alignSelf: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 18, fontWeight: '600', color: '#1A1D26', textAlign: 'center', marginBottom: 24, letterSpacing: -0.3 },
  formGroup: { marginBottom: 20 },
  formLabel: { fontSize: 12, fontWeight: '500', color: '#6B7280', textAlign: 'left', marginBottom: 8, letterSpacing: 0.3 },
  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#F8F9FC', borderWidth: 1, borderColor: 'rgba(0,0,0,0.10)',
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, gap: 10,
  },
  input: {
    flex: 1, fontSize: 15, color: '#1A1D26',
    textAlign: 'left',
    ...Platform.select({ ios: { paddingVertical: 4 }, android: { paddingVertical: 0 } }),
  },
  phoneHint: { fontSize: 12, color: '#6B7280', textAlign: 'left', marginBottom: 8 },
  defaultRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, marginBottom: 8 },
});
