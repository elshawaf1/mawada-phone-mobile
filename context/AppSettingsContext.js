import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { translations } from '../constants/translations';

const AppSettingsContext = createContext(null);

const DARK_COLORS = {
  white: '#0F172A', black: '#FFFFFF', primary: '#1E293B', primaryLight: '#334155',
  secondary: '#94A3B8', accent: '#3B82F6',
  success: '#22C55E', warning: '#F59E0B', error: '#EF4444',
  red: '#EF4444', green: '#22C55E', blue: '#60A5FA', amber: '#F59E0B',
  redLight: '#451A1A', greenLight: '#143D1E', amberLight: '#3D2E00', blueLight: '#172554',
  gray50: '#0F172A', gray100: '#1E293B', gray200: '#334155',
  gray300: '#475569', gray400: '#64748B', gray500: '#94A3B8',
  gray600: '#CBD5E1', gray700: '#E2E8F0', gray800: '#F1F5F9', gray900: '#F8FAFC',
  bg: '#0F172A', surface: '#1E293B', border: '#334155', borderLight: '#1E293B',
  text: '#F1F5F9', textSecondary: '#94A3B8', textTertiary: '#64748B',
  overlay: 'rgba(0,0,0,0.7)',
};

const LIGHT_COLORS = {
  white: '#FFFFFF', black: '#000000', primary: '#0F172A', primaryLight: '#1E293B',
  secondary: '#64748B', accent: '#0F172A',
  success: '#22C55E', warning: '#F59E0B', error: '#EF4444',
  red: '#EF4444', green: '#22C55E', blue: '#3B82F6', amber: '#F59E0B',
  redLight: '#FEF2F2', greenLight: '#F0FDF4', amberLight: '#FFFBEB', blueLight: '#EFF6FF',
  gray50: '#F8FAFC', gray100: '#F1F5F9', gray200: '#E2E8F0',
  gray300: '#CBD5E1', gray400: '#94A3B8', gray500: '#64748B',
  gray600: '#475569', gray700: '#334155', gray800: '#1E293B', gray900: '#0F172A',
  bg: '#FFFFFF', surface: '#F8FAFC', border: '#E2E8F0', borderLight: '#F1F5F9',
  text: '#0F172A', textSecondary: '#64748B', textTertiary: '#94A3B8',
  overlay: 'rgba(0,0,0,0.5)',
};

function getNested(obj, path) {
  return path.split('.').reduce((acc, part) => acc?.[part], obj);
}

export function AppSettingsProvider({ children }) {
  const [locale, setLocale] = useState('ar');
  const [darkMode, setDarkMode] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.multiGet(['locale', 'darkMode'])
      .then(([l, d]) => {
        if (l[1]) setLocale(l[1]);
        if (d[1]) setDarkMode(d[1] === 'true');
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  const toggleLocale = useCallback(() => {
    const next = locale === 'ar' ? 'en' : 'ar';
    setLocale(next);
    AsyncStorage.setItem('locale', next);
  }, [locale]);

  const toggleDarkMode = useCallback(() => {
    const next = !darkMode;
    setDarkMode(next);
    AsyncStorage.setItem('darkMode', String(next));
  }, [darkMode]);

  const t = useCallback((key, params = {}) => {
    const dict = translations[locale] || translations.ar;
    let text = getNested(dict, key);
    if (!text) {
      const fallback = getNested(translations.ar, key);
      text = fallback || key;
    }
    if (params && typeof text === 'string') {
      Object.entries(params).forEach(([k, v]) => {
        text = text.replace(new RegExp(`\\{${k}\\}`, 'g'), v);
      });
    }
    return text;
  }, [locale]);

  const weekdays = useMemo(() => translations[locale]?.weekdays || translations.ar.weekdays, [locale]);
  const months = useMemo(() => translations[locale]?.months || translations.ar.months, [locale]);

  const colors = useMemo(() => (darkMode ? DARK_COLORS : LIGHT_COLORS), [darkMode]);

  const value = useMemo(() => ({
    locale, darkMode, loaded,
    t, toggleLocale, toggleDarkMode,
    colors, weekdays, months,
    isRTL: locale === 'ar',
  }), [locale, darkMode, loaded, t, toggleLocale, toggleDarkMode, colors, weekdays, months]);

  if (!loaded) return null;

  return (
    <AppSettingsContext.Provider value={value}>
      {children}
    </AppSettingsContext.Provider>
  );
}

export function useAppSettings() {
  const ctx = useContext(AppSettingsContext);
  if (!ctx) throw new Error('useAppSettings must be used within AppSettingsProvider');
  return ctx;
}

export function useTranslation() {
  const { t, locale, weekdays, months } = useAppSettings();
  return { t, locale, weekdays, months };
}

export function useTheme() {
  const { colors, darkMode, toggleDarkMode } = useAppSettings();
  return { colors, darkMode, toggleDarkMode };
}
