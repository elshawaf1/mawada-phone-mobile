import React, { useEffect, useMemo, useState } from 'react';
import { SafeAreaView, StatusBar, StyleSheet, View, Linking } from 'react-native';
import { AppProvider } from './context/AppContext';
import { AppSettingsProvider } from './context/AppSettingsContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { supabase } from './services/supabase';
import SplashScreen from './screens/SplashScreen';
import WelcomeScreen from './screens/auth/WelcomeScreen';
import LoginScreen from './screens/auth/LoginScreen';
import RegisterScreen from './screens/auth/RegisterScreen';
import OtpVerificationScreen from './screens/auth/OtpVerificationScreen';
import HomeScreen from './screens/HomeScreen';
import SearchScreen from './screens/SearchScreen';
import ItemScreen from './screens/ItemScreen';
import CartScreen from './screens/CartScreen';
import PaymentScreen from './screens/PaymentScreen';
import VisaScreen from './screens/VisaScreen';
import OrderConfirmScreen from './screens/OrderConfirm';

import ProfileScreen from './screens/ProfileScreen';
import NotificationScreen from './screens/NotificationScreen';
import LocationsScreen from './screens/LocationsScreen';
import SettingsScreen from './screens/SettingsScreen';
import ChatScreen from './screens/ChatScreen';
import CategoryProductsScreen from './screens/CategoryProductsScreen';
import DeliveryLocationsScreen from './screens/DeliveryLocationsScreen';
import OrderDetailScreen from './screens/OrderDetailScreen';
import ResumePaymentScreen from './screens/ResumePaymentScreen';
import EditProfileScreen from './screens/EditProfileScreen';
import UpdatePasswordScreen from './screens/UpdatePasswordScreen';
import MyOrdersScreen from './screens/MyOrdersScreen';
import EmailConfirmationScreen from './screens/auth/EmailConfirmationScreen';
import ForgotPasswordScreen from './screens/auth/ForgotPasswordScreen';
import ResetPasswordScreen from './screens/auth/ResetPasswordScreen';
import BrandsScreen from './screens/BrandsScreen';
import RecentlyViewedScreen from './screens/RecentlyViewedScreen';
import WishlistScreen from './screens/WishlistScreen';
import OffersScreen from './screens/OffersScreen';
import MyReviewsScreen from './screens/MyReviewsScreen';
import PaymentMethodsScreen from './screens/PaymentMethodsScreen';
import SupportScreen from './screens/SupportScreen';

const screenRegistry = {
  Splash: SplashScreen,
  Welcome: WelcomeScreen,
  Login: LoginScreen,
  Register: RegisterScreen,
  Otp: OtpVerificationScreen,
  Home: HomeScreen,
  Search: SearchScreen,
  Item: ItemScreen,
  Cart: CartScreen,
  Payment: PaymentScreen,
  Visa: VisaScreen,
  OrderConfirm: OrderConfirmScreen,
  Favorites: WishlistScreen,
  Profile: ProfileScreen,
  Notifications: NotificationScreen,
  Locations: LocationsScreen,
  Settings: SettingsScreen,
  Chat: ChatScreen,
  CategoryProducts: CategoryProductsScreen,
  DeliveryLocations: DeliveryLocationsScreen,
  OrderDetail: OrderDetailScreen,
  ResumePayment: ResumePaymentScreen,
  EditProfile: EditProfileScreen,
  UpdatePassword: UpdatePasswordScreen,
  MyOrders: MyOrdersScreen,
  EmailConfirmation: EmailConfirmationScreen,
  ForgotPassword: ForgotPasswordScreen,
  ResetPassword: ResetPasswordScreen,
  Brands: BrandsScreen,
  RecentlyViewed: RecentlyViewedScreen,
  Wishlist: WishlistScreen,
  Offers: OffersScreen,
  MyReviews: MyReviewsScreen,
  PaymentMethods: PaymentMethodsScreen,
  Support: SupportScreen,
};

function AppInner() {
  const { user, loading: authLoading, updateUser } = useAuth();
  const [currentScreen, setCurrentScreen] = useState('Splash');
  const [history, setHistory] = useState([]);
  const [routeParams, setRouteParams] = useState(null);
  const [authState, setAuthState] = useState({
    isAuthenticated: false,
    userName: 'علي',
    phone: '',
    email: '',
  });

  useEffect(() => {
    const handleUrl = async (event) => {
      const url = event?.url || event;
      if (!url) return;
      if (url.includes('reset-password') || url.includes('type=recovery')) {
        try {
          const hashIdx = url.indexOf('#');
          const queryIdx = url.indexOf('?');
          let paramStr = '';
          if (hashIdx > -1) {
            paramStr = url.slice(hashIdx + 1);
          } else if (queryIdx > -1) {
            paramStr = url.slice(queryIdx + 1);
          }
          const params = new URLSearchParams(paramStr);
          const accessToken = params.get('access_token');
          const refreshToken = params.get('refresh_token');
          if (accessToken && refreshToken) {
            const { error } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });
            if (!error) {
              replace('ResetPassword');
            }
          }
        } catch (e) {
          console.error('Reset password deep link error:', e);
        }
      }
    };
    Linking.getInitialURL().then((url) => {
      if (url) handleUrl({ url });
    });
    const sub = Linking.addEventListener('url', handleUrl);
    return () => sub?.remove();
  }, []);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'PASSWORD_RECOVERY') {
          replace('ResetPassword');
        }
      }
    );
    return () => subscription?.unsubscribe();
  }, []);

  const navigate = (screen, params) => {
    setHistory((prev) => [...prev, currentScreen]);
    setRouteParams(params || null);
    setCurrentScreen(screen);
  };

  const replace = (screen, params) => {
    setRouteParams(params || null);
    setCurrentScreen(screen);
  };

  const goBack = () => {
    let target = null;
    setHistory((prevHistory) => {
      if (prevHistory.length === 0) return prevHistory;
      target = prevHistory[prevHistory.length - 1];
      return prevHistory.slice(0, prevHistory.length - 1);
    });
    if (target) setCurrentScreen(target);
  };

  const reset = ({ index = 0, routes = [] }) => {
    const target = routes[index] || routes[0];
    if (target?.name) {
      setHistory([]);
      setRouteParams(target.params || null);
      setCurrentScreen(target.name);
    }
  };

  const completeAuth = (payload = {}) => {
    setAuthState((prev) => ({ ...prev, ...payload, isAuthenticated: true }));
    updateUser({
      id: payload?.id || 'mock-user-id',
      name: payload?.userName || payload?.name || 'علي',
      email: payload?.email || '',
      phone: payload?.phone || '',
      role: 'CUSTOMER',
    });
    if (currentScreen !== 'Home') replace('Home');
  };

  const navigation = useMemo(
    () => ({ navigate, replace, goBack, reset }),
    [history, currentScreen, routeParams]
  );

  const ActiveScreen = screenRegistry[currentScreen] || SplashScreen;

  const isDarkScreen = ['Splash'].includes(currentScreen);
  const isNavyScreen = ['Cart', 'OrderConfirm'].includes(currentScreen);
  const isChatScreen = currentScreen === 'Chat';
  const statusBg = isDarkScreen
    ? '#0F172A'
    : isNavyScreen
    ? '#3E4A59'
    : isChatScreen
    ? '#0F172A'
    : '#FFFFFF';
  const statusBarStyle =
    isDarkScreen || isNavyScreen || isChatScreen ? 'light-content' : 'dark-content';

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: statusBg }]}>
      <StatusBar barStyle={statusBarStyle} backgroundColor={statusBg} />
      <View style={styles.screenWrapper}>
        <ActiveScreen
          navigation={navigation}
          route={{ params: routeParams }}
          authState={authState}
          completeAuth={completeAuth}
        />
      </View>
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <GestureHandlerRootView style={styles.safeArea}>
      <SafeAreaProvider>
        <AppSettingsProvider>
          <AuthProvider>
            <AppProvider>
              <AppInner />
            </AppProvider>
          </AuthProvider>
        </AppSettingsProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FFFFFF' },
  screenWrapper: { flex: 1, backgroundColor: '#FFFFFF' },
});
