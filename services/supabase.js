import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

export const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://hwhnskouvcwiufczxhek.supabase.co';
export const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_vag7acj6jSmz21mFfN9Qxw_qAhDNwUN';

const AsyncStorageAdapter = {
  async getItem(key) {
    try {
      return await AsyncStorage.getItem(key);
    } catch (e) {
      console.warn('[SupabaseStorage] getItem failed:', key, e.message);
      return null;
    }
  },
  async setItem(key, value) {
    try {
      await AsyncStorage.setItem(key, value);
    } catch (e) {
      console.warn('[SupabaseStorage] setItem failed:', key, e.message);
    }
  },
  async removeItem(key) {
    try {
      await AsyncStorage.removeItem(key);
    } catch (e) {
      console.warn('[SupabaseStorage] removeItem failed:', key, e.message);
    }
  },
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorageAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

let cleaned = false;
export async function clearStaleAuthData() {
  if (cleaned) return;
  cleaned = true;
  try {
    const alreadyDone = await AsyncStorage.getItem('__securestore_cleanup_done__');
    if (alreadyDone) return;

    try {
      const projectRef = supabaseUrl.replace('https://', '').replace('.supabase.co', '');
      const secureKey = `sb-${projectRef}-auth-token`;
      await SecureStore.deleteItemAsync(secureKey);
    } catch (_) {}

    await AsyncStorage.setItem('__securestore_cleanup_done__', 'true');
  } catch (_) {}
}
