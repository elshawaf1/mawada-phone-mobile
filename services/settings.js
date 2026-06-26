import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';

const CACHE_KEY = '@mawada_system_settings';
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

let _settingsCache = null;
let _lastFetch = 0;

const DEFAULTS = {
  delivery_fee: 90,
  free_shipping_threshold: 50000,
  branch_pickup_fee: 0,
  estimated_delivery_days: 3,
  cod_fee: 0,
  min_order_amount: 0,
  max_cod_amount: 0,
  tax_rate: 0,
  phone_whatsapp: 0,
  phone_support: 0,
};

export async function fetchSettings() {
  try {
    const now = Date.now();
    if (_settingsCache && now - _lastFetch < CACHE_TTL) {
      return _settingsCache;
    }

    const stored = await AsyncStorage.getItem(CACHE_KEY);
    if (stored && now - JSON.parse(stored)._ts < CACHE_TTL) {
      const { _ts, ...data } = JSON.parse(stored);
      _settingsCache = data;
      _lastFetch = _ts;
      return data;
    }

    const { data, error } = await supabase
      .from('system_settings')
      .select('key, value')
      .eq('is_active', true);

    if (error) throw error;

    const settingsMap = {};
    (data || []).forEach((s) => {
      settingsMap[s.key] = Number(s.value);
    });

    const merged = { ...DEFAULTS, ...settingsMap };

    await AsyncStorage.setItem(
      CACHE_KEY,
      JSON.stringify({ ...merged, _ts: Date.now() })
    );

    _settingsCache = merged;
    _lastFetch = Date.now();

    return merged;
  } catch (err) {
    console.warn('Failed to fetch system settings:', err.message);
    const stored = await AsyncStorage.getItem(CACHE_KEY);
    if (stored) {
      const { _ts, ...data } = JSON.parse(stored);
      return data;
    }
    return DEFAULTS;
  }
}

export function getSetting(key) {
  if (_settingsCache && _settingsCache[key] !== undefined) {
    return _settingsCache[key];
  }
  return DEFAULTS[key] ?? 0;
}

export function getDeliveryFee() {
  return getSetting('delivery_fee');
}

export function getFreeShippingThreshold() {
  return getSetting('free_shipping_threshold');
}

export function getBranchPickupFee() {
  return getSetting('branch_pickup_fee');
}

export function getEstimatedDeliveryDays() {
  return getSetting('estimated_delivery_days');
}

export function getCodFee() {
  return getSetting('cod_fee');
}

export function getMinOrderAmount() {
  return getSetting('min_order_amount');
}

export function getMaxCodAmount() {
  return getSetting('max_cod_amount');
}

export function getTaxRate() {
  return getSetting('tax_rate');
}

export function getWhatsAppPhone() {
  return getSetting('phone_whatsapp');
}

export function getSupportPhone() {
  return getSetting('phone_support');
}

export function clearSettingsCache() {
  _settingsCache = null;
  _lastFetch = 0;
  AsyncStorage.removeItem(CACHE_KEY);
}

export { DEFAULTS };
