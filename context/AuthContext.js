import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { supabase, clearStaleAuthData } from '../services/supabase';
import { savePushTokenForUser, removePushTokenForUser, setBadgeCountAsync } from '../services/push';

const AuthContext = createContext(null);

function withTimeout(promise, ms, label) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(label || 'timeout')), ms)
    ),
  ]);
}

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
  if (!userId) return null;
  for (let i = 0; i < retries; i++) {
    try {
      const profile = await withTimeout(fetchProfile(userId), 5000, 'fetchProfile timeout');
      if (profile) return profile;
    } catch (e) {
      console.warn('[Auth] fetchProfile attempt', i + 1, 'failed:', e.message);
    }
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

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const authInProgress = useRef(false);
  const lastFetchedUserId = useRef(null);
  const sessionChecked = useRef(false);

  const login = useCallback(async (identifier, password) => {
    authInProgress.current = true;
    try {
      const isEmail = identifier.includes('@');
      const authPayload = isEmail ? { email: identifier } : { phone: identifier };

      const { data, error } = await withTimeout(
        supabase.auth.signInWithPassword({
          ...authPayload,
          password,
        }),
        15000,
        'timeout'
      );

      if (error) {
        const msg = error.message || '';
        if (msg.includes('Invalid login') || msg.includes('invalid')) {
          throw new Error('بيانات الدخول غير صحيحة');
        }
        if (msg.includes('Email not confirmed') || msg.includes('not confirmed')) {
          throw new Error('البريد الإلكتروني غير مُؤَكَّد. يُرجى التحقق مِن البريد أَوَّلًا');
        }
        throw new Error(msg);
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

      lastFetchedUserId.current = profile.id;
      setUser(profile);
      savePushTokenForUser(profile.id);
      return profile;
    } finally {
      authInProgress.current = false;
    }
  }, []);

  const register = useCallback(async (name, email, phone, password) => {
    authInProgress.current = true;
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { name, phone },
        },
      });

      if (error) {
        const msg = error.message || '';
        if (msg.includes('already') || msg.includes('registered') || msg.includes('already been')) {
          throw new Error('هَذَا الْبَرِيد الإِلِكْتُرُونِي مُسَجَّل بِالْفِعْل. سجِّل الدُّخُول بِدَلِيلًا');
        }
        if (msg.includes('rate') || msg.includes('limit')) {
          throw new Error('لَقَد تَجَاوَزْتَ عَدَد الْمُحَاوَلَات. يُرجَى الْمُحَاوَلَة لَاحِقًا');
        }
        throw new Error(msg);
      }

      if (!data || !data.user) {
        if (!data || !data.session) {
          return { emailConfirmed: false, email };
        }
        throw new Error('فَشِلَ إِنْشَاء الْحِسَاب');
      }

      if (!data.user?.identities?.length && data.user?.role !== 'authenticated') {
        throw new Error('هَذَا الْبَرِيد الإِلِكْتُرُونِي مُسَجَّل بِالْفِعْل. سجِّل الدُّخُول بِدَلِيلًا');
      }

      if (!data.session) {
        return { emailConfirmed: false, email };
      }

      let profile = await createProfile(data.user.id, name, email, phone);

      if (!profile) {
        throw new Error('فشل إنشاء الحساب. حاول مرة أخرى');
      }

      lastFetchedUserId.current = profile.id;
      setUser(profile);
      savePushTokenForUser(profile.id);
      return profile;
    } finally {
      authInProgress.current = false;
    }
  }, []);

  const verifyEmailOtp = useCallback(async (email, token, type = 'signup', profileData = {}) => {
    authInProgress.current = true;
    try {
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
        let profile = await createProfile(data.session.user.id, name, email, phone);
        if (!profile) {
          throw new Error('فشل إنشاء الحساب');
        }
        lastFetchedUserId.current = profile.id;
        setUser(profile);
        savePushTokenForUser(profile.id);
        return profile;
      }

      return data;
    } finally {
      authInProgress.current = false;
    }
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

    const safetyTimer = setTimeout(() => {
      if (!cancelled) setLoading(false);
    }, 3000);

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
          if (!cancelled) {
            if (profile) {
              setUser(profile);
              lastFetchedUserId.current = profile.id;
              savePushTokenForUser(profile.id);
              const { count } = await supabase
                .from('notifications')
                .select('id', { count: 'exact', head: true })
                .eq('userId', profile.id)
                .eq('isRead', false);
              setBadgeCountAsync(count || 0);
            }
          }
        }
      } catch (e) {
        console.warn('[Auth] Session check failed:', e.message);
      }
      sessionChecked.current = true;
      if (!cancelled) setLoading(false);
    };

    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (authInProgress.current) return;

        if (event === 'SIGNED_OUT' || !session) {
          if (!cancelled) setUser(null);
        } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') {
          if (event === 'INITIAL_SESSION' && sessionChecked.current) return;
          if (session?.user) {
            if (lastFetchedUserId.current === session.user.id) return;
            const profile = await fetchProfileWithRetry(session.user.id);
            if (cancelled) return;
            if (profile) {
              lastFetchedUserId.current = profile.id;
              setUser(profile);
            } else {
              const newProfile = await createProfile(
                session.user.id,
                session.user.user_metadata?.name,
                session.user.email,
                session.user.user_metadata?.phone
              );
              if (!cancelled && newProfile) {
                lastFetchedUserId.current = newProfile.id;
                setUser(newProfile);
              }
            }
          }
        }
      }
    );

    return () => {
      cancelled = true;
      clearTimeout(safetyTimer);
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
