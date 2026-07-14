import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, I18nManager } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, FONT_SIZES, FONT_WEIGHTS, RADIUS } from '../constants/theme';
import { getLocales } from 'expo-localization';

// Detect RTL in class component (hooks can't be used)
function isDeviceRTL() {
  try {
    const locale = getLocales()[0];
    if (locale?.textDirection === 'rtl') return true;
    if (locale?.languageTag?.startsWith('ar')) return true;
    if (locale?.languageCode?.startsWith('ar')) return true;
    if (locale?.languageScriptCode === 'Arab') return true;
    return I18nManager.isRTL;
  } catch {
    return I18nManager.isRTL;
  }
}

// Translations for error screen (class component can't use useTranslation)
const ERROR_MESSAGES = {
  ar: {
    title: 'حدث خطأ ما',
    subtitle: 'واجه التطبيق خطأ غير متوقع',
    restart: 'إعادة تشغيل التطبيق',
    goHome: 'الذهاب للرئيسية',
  },
  en: {
    title: 'Something went wrong',
    subtitle: 'The app encountered an unexpected error',
    restart: 'Restart App',
    goHome: 'Go Home',
  },
};

function getMessages() {
  const rtl = isDeviceRTL();
  return rtl ? ERROR_MESSAGES.ar : ERROR_MESSAGES.en;
}

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ErrorBoundary] Caught error:', error);
    console.error('[ErrorBoundary] Error info:', errorInfo);
    this.setState({ errorInfo });
  }

  handleRestart = async () => {
    try {
      // Try expo-updates reload (works in production)
      const Updates = require('expo-updates');
      if (Updates.reloadAsync) {
        await Updates.reloadAsync();
        return;
      }
    } catch (e) {
      // expo-updates not available in dev, fall back
    }
    try {
      // Fallback: open the app URL (dev mode)
      const Linking = require('expo-linking');
      const url = await Linking.createURL('/');
      await Linking.openURL(url);
    } catch (e) {
      // Last resort: do nothing — the error screen stays
      console.warn('[ErrorBoundary] Could not restart app:', e);
    }
  };

  handleGoHome = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    // The navigation will reset to Home if possible
    try {
      if (this.props.navigation?.reset) {
        this.props.navigation.reset({
          index: 0,
          routes: [{ name: 'Home' }],
        });
      }
    } catch (e) {
      // Navigation may not be available — just clear the error
      console.warn('[ErrorBoundary] Could not navigate home:', e);
    }
  };

  render() {
    if (this.state.hasError) {
      const isRTL = isDeviceRTL();
      const messages = getMessages();
      const dir = isRTL ? 'rtl' : 'ltr';
      const textAlign = isRTL ? 'right' : 'left';

      return (
        <View style={[styles.container, { direction: dir }]}>
          <View style={styles.content}>
            {/* Warning Icon */}
            <View style={styles.iconContainer}>
              <Ionicons
                name="warning-outline"
                size={72}
                color={COLORS.warning}
              />
            </View>

            {/* Title */}
            <Text style={[styles.title, { textAlign }]}>{messages.title}</Text>

            {/* Subtitle */}
            <Text style={[styles.subtitle, { textAlign }]}>{messages.subtitle}</Text>

            {/* Error details (dev only, optional) */}
            {__DEV__ && this.state.error && (
              <View style={styles.errorDetails}>
                <Text style={[styles.errorText, { textAlign }]} numberOfLines={5}>
                  {this.state.error.toString()}
                </Text>
              </View>
            )}

            {/* Action Buttons */}
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={this.handleRestart}
                activeOpacity={0.8}
              >
                <Ionicons name="refresh" size={20} color={COLORS.white} style={styles.buttonIcon} />
                <Text style={styles.primaryButtonText}>{messages.restart}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={this.handleGoHome}
                activeOpacity={0.8}
              >
                <Ionicons name="home-outline" size={20} color={COLORS.primary} style={styles.buttonIcon} />
                <Text style={styles.secondaryButtonText}>{messages.goHome}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.huge,
    maxWidth: 400,
    width: '100%',
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: COLORS.amberLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.xxxl,
  },
  title: {
    fontSize: FONT_SIZES.xxxl,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.text,
    marginBottom: SPACING.md,
    lineHeight: 32,
  },
  subtitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.regular,
    color: COLORS.textSecondary,
    marginBottom: SPACING.huge,
    lineHeight: 24,
    paddingHorizontal: SPACING.lg,
  },
  errorDetails: {
    backgroundColor: COLORS.gray50,
    borderRadius: RADIUS.md,
    padding: SPACING.lg,
    marginBottom: SPACING.xxl,
    width: '100%',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  errorText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.regular,
    color: COLORS.error,
    fontFamily: 'monospace',
  },
  buttonContainer: {
    width: '100%',
    gap: SPACING.lg,
  },
  primaryButton: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.lg,
    paddingVertical: SPACING.xl,
    paddingHorizontal: SPACING.xxxl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.black,
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 4,
  },
  primaryButtonText: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.white,
  },
  secondaryButton: {
    backgroundColor: COLORS.gray50,
    borderRadius: RADIUS.lg,
    paddingVertical: SPACING.xl,
    paddingHorizontal: SPACING.xxxl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  secondaryButtonText: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.primary,
  },
  buttonIcon: {
    marginRight: SPACING.md,
  },
});
