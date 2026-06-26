import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { db } from './api';

let cachedToken = null;
let cachedPlatform = null;

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: false,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: true,
  }),
});

async function ensureAndroidChannel() {
  if (Platform.OS !== 'android') return;
  try {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Mawada',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#0F2A44',
      sound: 'default',
    });
  } catch (e) {
    console.warn('Failed to set notification channel', e);
  }
}

function isExpoGoSimulator() {
  return (
    Platform.OS === 'ios' &&
    Device.isDevice === false &&
    Constants.appOwnership === 'expo'
  );
}

export async function registerForPushNotificationsAsync() {
  try {
    if (!Device.isDevice) {
      console.log('Push notifications require a physical device.');
      return null;
    }
    if (isExpoGoSimulator()) {
      console.log('Push notifications unavailable in iOS simulator.');
      return null;
    }

    await ensureAndroidChannel();

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') {
      console.log('Notification permission not granted.');
      return null;
    }

    const projectId =
      Constants?.expoConfig?.extra?.eas?.projectId ??
      Constants?.easConfig?.projectId;

    const tokenResponse = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined,
    );
    cachedToken = tokenResponse.data;
    cachedPlatform = Platform.OS;
    return { token: cachedToken, platform: cachedPlatform };
  } catch (e) {
    console.warn('Failed to register for push notifications', e);
    return null;
  }
}

export async function savePushTokenForUser(userId) {
  if (!userId) return;
  if (cachedToken) {
    try {
      await db.savePushToken({ userId, token: cachedToken, platform: cachedPlatform });
      return;
    } catch (e) {
      console.warn('savePushToken cached failed, re-registering', e);
    }
  }
  const reg = await registerForPushNotificationsAsync();
  if (reg?.token) {
    try {
      await db.savePushToken({ userId, token: reg.token, platform: reg.platform });
    } catch (e) {
      console.warn('savePushToken failed', e);
    }
  }
}

export async function removePushTokenForUser(userId) {
  if (!userId || !cachedToken) return;
  try {
    await db.deletePushToken({ userId, token: cachedToken });
  } catch (e) {
    console.warn('deletePushToken failed', e);
  }
}

export function getLastNotificationResponse() {
  return Notifications.getLastNotificationResponseAsync();
}

export function addNotificationResponseListener(listener) {
  return Notifications.addNotificationResponseReceivedListener(listener);
}

export function addNotificationReceivedListener(listener) {
  return Notifications.addNotificationReceivedListener(listener);
}

export async function setBadgeCountAsync(count) {
  try {
    await Notifications.setBadgeCountAsync(count);
  } catch (e) {
    console.warn('setBadgeCount failed', e);
  }
}
