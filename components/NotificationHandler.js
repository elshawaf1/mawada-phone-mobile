import { useEffect, useRef } from 'react';
import { getLastNotificationResponse, addNotificationResponseListener } from '../services/push';
import { supabase } from '../services/supabase';
import { useAuth } from '../context/AuthContext';

export default function NotificationHandler({ navigation }) {
  const { user } = useAuth();
  const processingRef = useRef(false);

  const handleNotification = async (response) => {
    if (processingRef.current) return;
    processingRef.current = true;

    try {
      const data = response?.notification?.request?.content?.data;
      if (!data) return;

      const { orderId } = data;

      if (orderId) {
        navigation.navigate('OrderDetail', { orderId });
      } else {
        navigation.navigate('Notifications');
      }

      if (data.notifId && user?.id) {
        await supabase
          .from('notifications')
          .update({ isRead: true })
          .eq('id', data.notifId)
          .eq('userId', user.id);
      }
    } catch (e) {
      console.warn('[NotificationHandler] handle error:', e);
    } finally {
      setTimeout(() => { processingRef.current = false; }, 1000);
    }
  };

  useEffect(() => {
    let responseSubscription = null;

    const handleInitial = async () => {
      try {
        const response = await getLastNotificationResponse();
        if (response) {
          await handleNotification(response);
        }
      } catch (e) {
        console.warn('[NotificationHandler] initial response error:', e);
      }
    };

    handleInitial();

    responseSubscription = addNotificationResponseListener(handleNotification);

    return () => {
      if (responseSubscription) {
        responseSubscription.remove();
      }
    };
  }, [user?.id]);

  return null;
}
