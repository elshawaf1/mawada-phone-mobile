import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Linking, Alert } from 'react-native';
import { MessageCircle, Phone } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, SHADOWS } from '../constants';
import ScreenHeader from '../components/ScreenHeader';
import { useTranslation } from '../context/AppSettingsContext';
import { useDirection } from '../hooks/useDirection';

const WHATSAPP_NUMBER = '201093338390';
const PHONE_DISPLAY = '+20 109 333 8390';
const PHONE_TEL = '+201093338390';
const WHATSAPP_BRAND = '#25D366';

function ActionCard({ icon: Icon, accent, title, number, hint, onPress, a11yHint }) {
  const dir = useDirection();
  return (
    <TouchableOpacity
      style={[styles.card, { alignItems: dir.alignItems }]}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`${title} ${number}`}
      accessibilityHint={a11yHint}
    >
      <View style={styles.iconTile}>
        <Icon size={20} color={accent} strokeWidth={2.25} />
      </View>
      <Text style={[styles.cardTitle, { textAlign: dir.textAlign }]}>{title}</Text>
      <Text
        style={[styles.cardLink, { color: accent, textAlign: dir.textAlign }]}
        onPress={onPress}
        accessibilityRole="link"
      >
        {number}
      </Text>
      <Text style={[styles.cardHint, { textAlign: dir.textAlign }]}>{hint}</Text>
    </TouchableOpacity>
  );
}

export default function SupportScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const dir = useDirection();
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
        Alert.alert(t('support.whatsappError'), t('support.whatsappErrorSub', { phone: PHONE_DISPLAY }));
      }
    }
  }

  function openPhone() {
    Linking.openURL(`tel:${PHONE_TEL}`).catch(() =>
      Alert.alert(t('support.phoneError'), t('support.phoneErrorSub', { phone: PHONE_DISPLAY }))
    );
  }

  return (
    <View style={styles.container}>
      <ScreenHeader title={t('support.title')} onBack={() => navigation.goBack()} />

      <View style={[styles.body, { paddingBottom: insets.bottom + 24 }]}>
        <View style={styles.heroCard}>
          <View style={styles.heroIcon}>
            <MessageCircle size={28} color="#FFFFFF" />
          </View>
          <Text style={styles.heroTitle}>{t('support.hero')}</Text>
          <Text style={styles.heroSubtitle}>{t('support.heroSub')}</Text>
        </View>

        <View style={[styles.bentoRow, { flexDirection: dir.row }]}>
          <ActionCard
            icon={MessageCircle}
            accent={WHATSAPP_BRAND}
            title={t('support.whatsapp')}
            number={PHONE_DISPLAY}
            hint={t('support.whatsappHint')}
            onPress={openWhatsApp}
            a11yHint="يفتح محادثة واتساب"
          />
          <ActionCard
            icon={Phone}
            accent={COLORS.primary}
            title={t('support.callUs')}
            number={PHONE_DISPLAY}
            hint={t('support.callHint')}
            onPress={openPhone}
            a11yHint="يفتح تطبيق الهاتف"
          />
        </View>

        <Text style={styles.footnote}>{t('support.footer')}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  body: { flex: 1, padding: 16 },

  heroCard: {
    backgroundColor: COLORS.primary,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    marginBottom: 20,
    ...SHADOWS.md,
  },
  heroIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.white,
    textAlign: 'center',
    marginBottom: 6,
    letterSpacing: -0.2,
  },
  heroSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.72)',
    textAlign: 'center',
    lineHeight: 18,
  },

  bentoRow: {
    flexDirection: 'row-reverse',
    gap: 12,
  },
  card: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: 16,
    paddingHorizontal: 14,
    alignItems: 'flex-end',
    minHeight: 148,
    ...SHADOWS.sm,
  },
  iconTile: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: COLORS.gray100,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    textAlign: 'right',
    marginBottom: 4,
  },
  cardLink: {
    fontSize: 12,
    fontWeight: '600',
    textDecorationLine: 'underline',
    textAlign: 'right',
    letterSpacing: 0.1,
  },
  cardHint: {
    fontSize: 11,
    color: COLORS.textTertiary,
    textAlign: 'right',
    marginTop: 6,
  },

  footnote: {
    fontSize: 12,
    color: COLORS.textTertiary,
    textAlign: 'center',
    marginTop: 20,
  },
});
