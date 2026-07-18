import * as Haptics from 'expo-haptics';

// Safe haptic wrappers — silent fail on unsupported devices

export const hapticTap = () => {
  try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch (e) {}
};

export const hapticPress = () => {
  try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); } catch (e) {}
};

export const hapticSuccess = () => {
  try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch (e) {}
};

export const hapticWarning = () => {
  try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning); } catch (e) {}
};

export const hapticError = () => {
  try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error); } catch (e) {}
};

export const hapticHeavy = () => {
  try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy); } catch (e) {}
};
