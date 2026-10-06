import AsyncStorage from '@react-native-async-storage/async-storage';

// Order-notes draft persistence — notes survive navigation + app restarts
// and are cleared only when an order actually succeeds (see PaymentScreen).

export const ORDER_NOTES_MAX = 500;

export const orderNotesDraftKey = (userId) =>
  userId ? `@mawada:order_notes:${userId}` : null;

export async function loadOrderNotesDraft(userId) {
  try {
    const key = orderNotesDraftKey(userId);
    if (!key) return '';
    return (await AsyncStorage.getItem(key)) || '';
  } catch {
    return '';
  }
}

export async function clearOrderNotesDraft(userId) {
  try {
    const key = orderNotesDraftKey(userId);
    if (key) await AsyncStorage.removeItem(key);
  } catch {
    /* best effort */
  }
}
