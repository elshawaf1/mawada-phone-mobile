import { useEffect, useRef, useState, useCallback } from 'react';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { View, StyleSheet } from 'react-native';
import {
  getLastNotificationResponse,
  addNotificationResponseListener,
  addNotificationReceivedListener,
} from '../services/push';
import { supabase } from '../services/supabase';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from '../context/AppSettingsContext';
import NotificationPopup from './NotificationPopup';

const DEDUPE_MS = 10000;

export default function NotificationHandler({ navigation }) {
  const { user } = useAuth();
  const { locale } = useTranslation();
  const insets = useSafeAreaInsets();
  const processingRef = useRef(false);
  const [popup, setPopup] = useState(null);
  const lastShownRef = useRef({ key: '', at: 0 });

  const openTarget = useCallback(async (data) => {
    try {
      if (data?.orderId) {
        navigation.navigate('OrderDetail', { orderId: data.orderId });
      } else {
        navigation.navigate('Notifications');
      }
      if (data?.notifId && user?.id) {
        await supabase
          .from('notifications')
          .update({ isRead: true })
          .eq('id', data.notifId)
          .eq('userId', user.id);
      }
    } catch (e) {
      console.warn('[NotificationHandler] open error:', e);
    }
  }, [navigation, user?.id]);

  const showPopup = useCallback((notif) => {
    const key = notif.notifId || `${notif.title}|${notif.body}`;
    const now = Date.now();
    if (lastShownRef.current.key === key && now - lastShownRef.current.at < DEDUPE_MS) return;
    lastShownRef.current = { key, at: now };
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}
    setPopup({ ...notif, popupKey: `${key}|${now}` });
  }, []);

  const handleResponse = async (response) => {
    if (processingRef.current) return;
    processingRef.current = true;
    try {
      const data = response?.notification?.request?.content?.data;
      if (data) await openTarget(data);
    } catch (e) {
      console.warn('[NotificationHandler] handle error:', e);
    } finally {
      setTimeout(() => { processingRef.current = false; }, 1000);
    }
  };

  useEffect(() => {
    let responseSubscription = null;
    let receivedSubscription = null;
    let channel = null;

    const handleInitial = async () => {
      try {
        const response = await getLastNotificationResponse();
        if (response) await handleResponse(response);
      } catch (e) {
        console.warn('[NotificationHandler] initial response error:', e);
      }
    };

    handleInitial();
    responseSubscription = addNotificationResponseListener(handleResponse);

    // Foreground push -> branded in-app popup (in addition to the OS banner).
    try {
      receivedSubscription = addNotificationReceivedListener((notification) => {
        const content = notification?.request?.content;
        if (!content) return;
        const data = content.data || {};
        showPopup({
          title: content.title || '',
          body: content.body || '',
          type: data.type || 'info',
          orderId: data.orderId,
          notifId: data.notifId,
          createdAt: data.createdAt || new Date().toISOString(),
        });
      });
    } catch (e) {
      console.warn('[NotificationHandler] received listener error:', e);
    }

    // Realtime DB inserts -> popup even without push permission.
    if (user?.id) {
      channel = supabase
        .channel(`notif-popup-${user.id}`)
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `userId=eq.${user.id}`,
        }, (payload) => {
          const n = payload.new;
          if (!n) return;
          const isAr = locale === 'ar';
          showPopup({
            title: (isAr ? n.titleAr : n.title) || n.title || '',
            body: (isAr ? n.bodyAr : n.body) || n.body || '',
            type: n.type || 'info',
            orderId: n.orderId,
            notifId: n.id,
            createdAt: n.createdAt || new Date().toISOString(),
          });
        })
        .subscribe();
    }

    return () => {
      if (responseSubscription) responseSubscription.remove();
      if (receivedSubscription) receivedSubscription.remove();
      if (channel) supabase.removeChannel(channel);
    };
  }, [user?.id, locale]);

  if (!popup) return null;

  return (
    <View style={[styles.host, { top: insets.top + 8 }]} pointerEvents="box-none">
      <NotificationPopup
        key={popup.popupKey}
        notif={popup}
        onOpen={() => {
          const data = popup;
          setPopup(null);
          openTarget(data);
        }}
        onDismiss={() => setPopup(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 9999,
  },
});
