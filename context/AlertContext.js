import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from './AppSettingsContext';
import AlertBanner from '../components/AlertBanner';

const AlertContext = createContext(null);
const OFFLINE_ID = '__offline__';
const MAX_VISIBLE = 2;

let seq = 0;

export function AlertProvider({ children }) {
  const [alerts, setAlerts] = useState([]);
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const tRef = useRef(t);
  tRef.current = t;

  const showAlert = useCallback((spec) => {
    const id = spec.id || `alert_${Date.now()}_${seq++}`;
    setAlerts((prev) => {
      if (prev.some((a) => a.id === id)) return prev;
      return [...prev.slice(-4), { placement: 'banner', ...spec, id }];
    });
    return id;
  }, []);

  const dismissAlert = useCallback((id) => {
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const clearAlerts = useCallback(() => setAlerts([]), []);

  // Session-level offline banner: appears on disconnect, leaves on reconnect.
  useEffect(() => {
    const unsub = NetInfo.addEventListener((state) => {
      const online = state.isConnected && state.isInternetReachable !== false;
      const tr = tRef.current;
      if (!online) {
        setAlerts((prev) => {
          if (prev.some((a) => a.id === OFFLINE_ID)) return prev;
          return [{
            id: OFFLINE_ID,
            tone: 'warning',
            title: tr?.('alerts.offlineTitle') || 'No connection',
            message: tr?.('alerts.offlineBody') || 'Check your internet — actions will retry when back.',
            placement: 'banner',
          }, ...prev].slice(-5);
        });
      } else {
        setAlerts((prev) => prev.filter((a) => a.id !== OFFLINE_ID));
      }
    });
    return () => unsub();
  }, []);

  const value = useMemo(
    () => ({ showAlert, dismissAlert, clearAlerts }),
    [showAlert, dismissAlert, clearAlerts]
  );

  const visible = alerts.slice(0, MAX_VISIBLE);

  return (
    <AlertContext.Provider value={value}>
      {children}
      {visible.length > 0 && (
        <View style={[styles.host, { top: insets.top }]} pointerEvents="box-none">
          {visible.map((a) => (
            <AlertBanner
              key={a.id}
              tone={a.tone}
              title={a.title}
              message={a.message}
              placement={a.placement}
              actionLabel={a.action?.label}
              onAction={a.action?.onPress}
              onDismiss={a.sticky ? undefined : () => dismissAlert(a.id)}
            />
          ))}
        </View>
      )}
    </AlertContext.Provider>
  );
}

export function useAlert() {
  const ctx = useContext(AlertContext);
  if (!ctx) throw new Error('useAlert must be used within AlertProvider');
  return ctx;
}

const styles = StyleSheet.create({
  host: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 9998,
  },
});
