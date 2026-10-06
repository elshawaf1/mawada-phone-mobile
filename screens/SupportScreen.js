import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Linking } from 'react-native';
import { MessageCircle, Phone, ChevronLeft, ChevronRight } from 'lucide-react-native';
import { COLORS, FONT_SIZES, FONT_WEIGHTS, RADIUS, SHADOWS } from '../constants';
import ScreenHeader from '../components/ScreenHeader';
import { useTranslation } from '../context/AppSettingsContext';
import { useDirection } from '../hooks/useDirection';
import { useMessageBox } from '../context/MessageBoxContext';
import { hapticTap } from '../utils/haptics';

const WHATSAPP_NUMBER = '201093338390';
const PHONE_DISPLAY = '+20 109 333 8390';
const PHONE_TEL = '+201093338390';
const WHATSAPP_BRAND = '#25D366';

function ChannelRow({ icon: Icon, tint, title, value, onPress }) {
  const dir = useDirection();
  const Chevron = dir.isRTL ? ChevronLeft : ChevronRight;
  return (
    <TouchableOpacity
      style={[styles.row, { flexDirection: dir.row }]}
      onPress={() => { hapticTap(); onPress(); }}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`${title} ${value}`}
    >
      <View style={[styles.tile, { backgroundColor: tint }]}>
        <Icon size={22} color={tint === WHATSAPP_BRAND ? COLORS.white : COLORS.primary} />
      </View>
      <View style={styles.texts}>
        <Text style={[styles.rowTitle, { textAlign: dir.textAlign }]}>{title}</Text>
        <Text style={[styles.rowValue, { textAlign: dir.textAlign }]}>{value}</Text>
      </View>
      <Chevron size={20} color={COLORS.textTertiary} />
    </TouchableOpacity>
  );
}

export default function SupportScreen({ navigation }) {
  const { t } = useTranslation();
  const dir = useDirection();
  const { showMessageBox } = useMessageBox();
  const PREFILLED_MESSAGE = t('support.whatsappMessage');

  async function openWhatsApp() {
    const waMeUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(PREFILLED_MESSAGE)}`;
    const intentUrl = `whatsapp://send?phone=${WHATSAPP_NUMBER}&text=${encodeURIComponent(PREFILLED_MESSAGE)}`;
    try {
      await Linking.openURL(waMeUrl);
    } catch (err) {
      try {
        await Linking.openURL(intentUrl);
      } catch (err2) {
        showMessageBox({ type: 'error', title: t('support.whatsappError'), message: t('support.whatsappErrorSub', { phone: PHONE_DISPLAY }) });
      }
    }
  }

  function openPhone() {
    Linking.openURL(`tel:${PHONE_TEL}`).catch(() =>
      showMessageBox({ type: 'error', title: t('support.phoneError'), message: t('support.phoneErrorSub', { phone: PHONE_DISPLAY }) })
    );
  }

  return (
    <View style={styles.container}>
      <ScreenHeader title={t('support.title')} onBack={() => navigation.goBack()} />

      <View style={styles.body}>
        <Text style={[styles.heading, { textAlign: dir.textAlign }]}>{t('support.hero')}</Text>
        <Text style={[styles.subheading, { textAlign: dir.textAlign }]}>{t('support.heroSub')}</Text>

        <ChannelRow
          icon={MessageCircle}
          tint={WHATSAPP_BRAND}
          title={t('support.whatsapp')}
          value={PHONE_DISPLAY}
          onPress={openWhatsApp}
        />
        <ChannelRow
          icon={Phone}
          tint={COLORS.gray100}
          title={t('support.callUs')}
          value={PHONE_DISPLAY}
          onPress={openPhone}
        />

        <Text style={styles.footnote}>{t('support.footer')}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  body: { flex: 1, padding: 16 },
  heading: {
    fontSize: FONT_SIZES.xxxl,
    fontWeight: FONT_WEIGHTS.extrabold,
    color: COLORS.text,
    marginBottom: 4,
  },
  subheading: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.regular,
    color: COLORS.textSecondary,
    lineHeight: 20,
    marginBottom: 20,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 12,
    marginBottom: 10,
    ...SHADOWS.sm,
  },
  tile: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  texts: { flex: 1 },
  rowTitle: { fontSize: FONT_SIZES.md, fontWeight: FONT_WEIGHTS.bold, color: COLORS.text },
  rowValue: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  footnote: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textTertiary,
    textAlign: 'center',
    marginTop: 16,
  },
});
