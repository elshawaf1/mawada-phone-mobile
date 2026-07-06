import React, { useEffect, useMemo, useRef, useState } from 'react';
import { BackHandler, SafeAreaView, StatusBar, StyleSheet, View } from 'react-native';
import { AppProvider } from './context/AppContext';
import { AppSettingsProvider } from './context/AppSettingsContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import SwipeBack from './components/SwipeBack';
import ScreenTransition from './components/ScreenTransition';
import NotificationHandler from './components/NotificationHandler';
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

import MyOrdersScreen from './screens/MyOrdersScreen';
import ForgotPasswordScreen from './screens/auth/ForgotPasswordScreen';
import ResetPasswordScreen from './screens/auth/ResetPasswordScreen';
import BrandsScreen from './screens/BrandsScreen';
import RecentlyViewedScreen from './screens/RecentlyViewedScreen';
import WishlistScreen from './screens/WishlistScreen';
import OffersScreen from './screens/OffersScreen';
import PaymentMethodsScreen from './screens/PaymentMethodsScreen';
import SupportScreen from './screens/SupportScreen';
import AllCategoriesScreen from './screens/AllCategoriesScreen';
import LegalScreen from './screens/LegalScreen';

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

  MyOrders: MyOrdersScreen,
  ForgotPassword: ForgotPasswordScreen,
  ResetPassword: ResetPasswordScreen,
  Brands: BrandsScreen,
  RecentlyViewed: RecentlyViewedScreen,
  Wishlist: WishlistScreen,
  Offers: OffersScreen,
  PaymentMethods: PaymentMethodsScreen,
  Support: SupportScreen,
  AllCategories: AllCategoriesScreen,
  Legal: LegalScreen,
};

function AppInner() {
  const { user, loading: authLoading, updateUser } = useAuth();
  const [currentScreen, setCurrentScreen] = useState('Splash');
  const [history, setHistory] = useState([]);
  const [routeParams, setRouteParams] = useState(null);
  const [navDirection, setNavDirection] = useState('fade');
  const [authState, setAuthState] = useState({
    isAuthenticated: false,
    userName: 'علي',
    phone: '',
    email: '',
  });

  const historyRef = useRef([]);
  historyRef.current = history;
  const isNavigatingRef = useRef(false);

  useEffect(() => {
    const noBackScreens = ['Splash', 'Welcome', 'Login', 'Register', 'Otp',
      'ForgotPassword', 'ResetPassword', 'Home',
      'Payment', 'ResumePayment', 'OrderConfirm'];
    const onBackPress = () => {
      if (noBackScreens.includes(currentScreen)) return true;
      if (historyRef.current.length === 0) return true;
      if (isNavigatingRef.current) return true;
      isNavigatingRef.current = true;
      setTimeout(() => { isNavigatingRef.current = false; }, 500);
      goBack();
      return true;
    };
    const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => sub.remove();
  }, [currentScreen]);

  const navigate = (screen, params) => {
    setNavDirection('push');
    setHistory((prev) => {
      const next = [...prev, currentScreen];
      historyRef.current = next;
      return next;
    });
    setRouteParams(params || null);
    setCurrentScreen(screen);
  };

  const replace = (screen, params) => {
    setNavDirection('fade');
    setRouteParams(params || null);
    setCurrentScreen(screen);
  };

  const goBack = () => {
    const h = historyRef.current;
    if (h.length === 0) return false;
    const prev = h[h.length - 1];
    const next = h.slice(0, h.length - 1);
    historyRef.current = next;
    setNavDirection('pop');
    setHistory(next);
    setCurrentScreen(prev);
    return true;
  };

  const reset = ({ index = 0, routes = [] }) => {
    const target = routes[index] || routes[0];
    if (target?.name) {
      setNavDirection('fade');
      setHistory([]);
      setRouteParams(target.params || null);
      setCurrentScreen(target.name);
    }
  };

  const navigation = useMemo(
    () => ({ navigate, replace, goBack, reset }),
    [history, currentScreen, routeParams]
  );

  const ActiveScreen = screenRegistry[currentScreen] || SplashScreen;

  const noSwipeBackScreens = [
    'Splash', 'Welcome', 'Login', 'Register', 'Otp',
    'ForgotPassword', 'ResetPassword', 'Home',
    'Payment', 'ResumePayment', 'OrderConfirm', 'Item',
    'Notifications', 'Search',
  ];

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
      <NotificationHandler navigation={navigation} />
      <View style={styles.screenWrapper}>
        <SwipeBack
          navigation={navigation}
          canGoBack={history.length > 0}
          disabled={noSwipeBackScreens.includes(currentScreen)}
          isNavigatingRef={isNavigatingRef}
        >
          <ScreenTransition key={currentScreen} type={navDirection}>
            <ActiveScreen
              navigation={navigation}
              route={{ params: routeParams }}
              authState={authState}
            />
          </ScreenTransition>
        </SwipeBack>
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
