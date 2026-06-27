import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase, clearStaleAuthData } from '../services/supabase';
import { savePushTokenForUser, removePushTokenForUser } from '../services/push';

const AuthContext = createContext(null);

async function fetchProfile(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, name, email, phone, role')
    .eq('id', userId)
    .single();

  if (error) {
    console.warn('[Auth] fetchProfile error:', error.message);
    return null;
  }
  return data;
}

async function fetchProfileWithRetry(userId, retries = 3) {
  for (let i = 0; i < retries; i++) {
    const profile = await fetchProfile(userId);
    if (profile) return profile;
    if (i < retries - 1) {
      await new Promise(r => setTimeout(r, 500));
    }
  }
  return null;
}

async function createProfile(userId, name, email, phone) {
  const { data, error } = await supabase
    .from('profiles')
    .upsert(
      { id: userId, name: name || '', email: email || '', phone: phone || '', role: 'CUSTOMER' },
      { onConflict: 'id' }
    )
    .select()
    .single();

  if (error) {
    console.warn('[Auth] createProfile error:', error.message);
    return null;
  }
  return data;
}

async function waitForProfile(userId, maxAttempts = 10) {
  for (let i = 0; i < maxAttempts; i++) {
    const profile = await fetchProfile(userId);
    if (profile) return profile;
    await new Promise(r => setTimeout(r, 500));
  }
  return null;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const login = useCallback(async (identifier, password) => {
    const isEmail = identifier.includes('@');
    const authPayload = isEmail ? { email: identifier } : { phone: identifier };

    const { data, error } = await supabase.auth.signInWithPassword({
      ...authPayload,
      password,
    });

    if (error) {
      if (error.message.includes('Invalid login')) {
        throw new Error('بيانات الدخول غير صحيحة');
      }
      throw new Error(error.message);
    }

    let profile = await fetchProfileWithRetry(data.user.id);

    if (!profile) {
      profile = await createProfile(
        data.user.id,
        data.user.user_metadata?.name,
        data.user.email,
        data.user.user_metadata?.phone
      );
    }

    if (!profile) {
      throw new Error('فشل في تحميل بيانات حسابك. حاول مرة أخرى');
    }

    setUser(profile);
    savePushTokenForUser(profile.id);
    return profile;
  }, []);

  const register = useCallback(async (name, email, phone, password) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name, phone },
      },
    });

    if (error) {
      if (error.message.includes('already registered') || error.message.includes('already been registered')) {
        throw new Error('هذا البريد الإلكتروني مسجل بالفعل');
      }
      throw new Error(error.message);
    }

    if (!data.user) throw new Error('فشل إنشاء الحساب');

    if (!data.session) {
      return { emailConfirmed: false, email };
    }

    let profile = await waitForProfile(data.user.id);

    if (!profile) {
      profile = await createProfile(data.user.id, name, email, phone);
    }

    if (!profile) {
      throw new Error('فشل إنشاء الحساب. حاول مرة أخرى');
    }

    setUser(profile);
    savePushTokenForUser(profile.id);
    return profile;
  }, []);

  const verifyEmailOtp = useCallback(async (email, token, type = 'signup', profileData = {}) => {
    const { data, error } = await supabase.auth.verifyOtp({ email, token, type });
    if (error) {
      if (error.message.includes('expired') || error.message.includes('expired')) {
        throw new Error('otpExpired');
      }
      if (error.message.includes('invalid') || error.message.includes('Token') || error.message.includes('token')) {
        throw new Error('otpInvalid');
      }
      throw error;
    }

    if (type === 'signup' && data.session?.user) {
      const { name, phone } = profileData;
      let profile = await waitForProfile(data.session.user.id);
      if (!profile) {
        profile = await createProfile(data.session.user.id, name, email, phone);
      }
      if (!profile) {
        throw new Error('فشل إنشاء الحساب');
      }
      setUser(profile);
      savePushTokenForUser(profile.id);
      return profile;
    }

    return data;
  }, []);

  const logout = useCallback(async () => {
    if (user?.id) {
      await removePushTokenForUser(user.id);
    }
    await supabase.auth.signOut();
    setUser(null);
  }, [user]);

  const updateUser = useCallback((userData) => {
    setUser(userData);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const checkSession = async () => {
      try {
        await clearStaleAuthData();

        const { data: { session }, error } = await supabase.auth.getSession();
        if (cancelled) return;

        if (error) {
          console.warn('[Auth] getSession error:', error.message);
          if (!cancelled) setLoading(false);
          return;
        }

        if (session?.user) {
          const profile = await fetchProfileWithRetry(session.user.id);
          if (!cancelled) setUser(profile);
          if (profile) savePushTokenForUser(profile.id);
        }
      } catch (e) {
        console.warn('[Auth] Session check failed:', e.message);
      }
      if (!cancelled) setLoading(false);
    };

    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_OUT' || !session) {
          if (!cancelled) setUser(null);
        } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') {
          if (session?.user) {
            const profile = await fetchProfileWithRetry(session.user.id);
            if (!cancelled) setUser(profile);
          }
        }
      }
    );

    return () => {
      cancelled = true;
      subscription?.unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, verifyEmailOtp, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
