import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { auth } from './firebase-config';
import { onAuthStateChanged } from 'firebase/auth';
import { getCurrentUser } from './services/authService';
import { colors } from './constants/theme';
import { ROLES, USER_STATUS } from './constants/config';
import { UserContext } from './context/UserContext';
import LoginScreen from './screens/LoginScreen';
import RegisterScreen from './screens/RegisterScreen';
import HomeScreen from './screens/HomeScreen';
import GivingScreen from './screens/GivingScreen';
import ProfileScreen from './screens/ProfileScreen';
import MediaScreen from './screens/MediaScreen';
import DistrictsScreen from './screens/DistrictsScreen';

import EventsScreen from './screens/EventsScreen';
import PrayerWallScreen from './screens/PrayerWallScreen';
import AdminScreen from './screens/AdminScreen';
import NationalBoardScreen from './screens/NationalBoardScreen';
import DocumentsScreen from './screens/DocumentsScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const TAB_ICONS = { Home: '🏠', Media: '📺', Giving: '💝', Districts: '🗺', PrayerWall: '🙏', Profile: '👤', SignIn: '🔑' };

const tabBarScreenOptions = (insets) => ({ route }) => ({
  headerShown: false,
  tabBarActiveTintColor: colors.blue,
  tabBarInactiveTintColor: colors.textSecondary,
  tabBarLabelStyle: { fontSize: 10, fontWeight: '700' },
  tabBarStyle: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.white,
    paddingBottom: insets.bottom || 8,
    paddingTop: 8,
    height: 60 + (insets.bottom || 0),
  },
  tabBarIcon: () => (
    <Text style={{ fontSize: 18 }}>{TAB_ICONS[route.name] || '📱'}</Text>
  ),
});

// Full tabs for authenticated members, leaders and admins
function AppTabs() {
  const insets = useSafeAreaInsets();
  return (
    <Tab.Navigator screenOptions={tabBarScreenOptions(insets)}>
      <Tab.Screen name="Home" component={HomeScreen} options={{ tabBarLabel: 'Home' }} />
      <Tab.Screen name="Media" component={MediaScreen} options={{ tabBarLabel: 'Media' }} />
      <Tab.Screen name="Giving" component={GivingScreen} options={{ tabBarLabel: 'Give' }} />
      <Tab.Screen name="Districts" component={DistrictsScreen} options={{ tabBarLabel: 'Districts' }} />
      <Tab.Screen name="PrayerWall" component={PrayerWallScreen} options={{ tabBarLabel: 'Prayer' }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ tabBarLabel: 'Profile' }} />
    </Tab.Navigator>
  );
}

// Limited tabs for visitors — public content only
const SignInPromptScreen = ({ navigation }) => {
  const { onLogout } = React.useContext(UserContext);
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background, padding: 32 }}>
      <Text style={{ fontSize: 40, marginBottom: 16 }}>🔑</Text>
      <Text style={{ fontSize: 18, fontWeight: '700', color: colors.textPrimary, marginBottom: 8, textAlign: 'center' }}>Sign In for Full Access</Text>
      <Text style={{ fontSize: 13, color: colors.textSecondary, textAlign: 'center', marginBottom: 32 }}>
        Create an account or sign in to access Prayer Wall, Giving, and your Profile.
      </Text>
      <TouchableOpacity
        onPress={() => onLogout()}
        style={{ backgroundColor: colors.blue, borderRadius: 8, paddingVertical: 14, paddingHorizontal: 40, marginBottom: 12 }}
      >
        <Text style={{ color: colors.white, fontWeight: '700', fontSize: 14 }}>Sign In</Text>
      </TouchableOpacity>
    </View>
  );
};

function VisitorTabs() {
  const insets = useSafeAreaInsets();
  return (
    <Tab.Navigator screenOptions={tabBarScreenOptions(insets)}>
      <Tab.Screen name="Home" component={HomeScreen} options={{ tabBarLabel: 'Home' }} />
      <Tab.Screen name="Media" component={MediaScreen} options={{ tabBarLabel: 'Media' }} />
      <Tab.Screen name="Districts" component={DistrictsScreen} options={{ tabBarLabel: 'Districts' }} />
      <Tab.Screen name="SignIn" component={SignInPromptScreen} options={{ tabBarLabel: 'Sign In' }} />
    </Tab.Navigator>
  );
}

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (authUser) => {
      try {
        if (authUser) {
          const userProfile = await getCurrentUser();
          // If status changed since last login, block app access but do NOT
          // call signOut here — doing so mid-registration closes the Firestore
          // connection and leaves in-flight setDoc/addDoc awaits permanently stuck.
          // Explicit signOut happens in loginUser (status check) and handleRegister.
          if (userProfile && userProfile.status !== USER_STATUS.APPROVED) {
            setUser(null);
          } else {
            setUser(userProfile);
          }
        } else {
          setUser(null);
        }
      } catch {
        setUser(null);
      } finally {
        setLoading(false);
      }
    });
    return unsubscribe;
  }, []);

  const handleLogin = useCallback((userData) => setUser(userData), []);
  const handleLogout = useCallback(() => setUser(null), []);

  if (loading) {
    return (
      <View style={styles.splash}>
        <ActivityIndicator size="large" color={colors.blue} />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <UserContext.Provider value={{ user, onLogin: handleLogin, onLogout: handleLogout }}>
        <NavigationContainer>
          <Stack.Navigator screenOptions={{ headerShown: false }}>
            {user && user.role !== ROLES.VISITOR && (
              <Stack.Screen name="Tabs" component={AppTabs} />
            )}
            {user?.role === ROLES.VISITOR && (
              <Stack.Screen name="VisitorTabs" component={VisitorTabs} />
            )}
            {!user && <Stack.Screen name="Login" component={LoginScreen} />}
            {!user && <Stack.Screen name="Register" component={RegisterScreen} />}
            {user && <Stack.Screen name="Events" component={EventsScreen} />}
            {(user?.role === ROLES.ADMIN || user?.role === ROLES.LEADER) && <Stack.Screen name="Admin" component={AdminScreen} />}
            {(user?.role === ROLES.ADMIN || user?.role === ROLES.LEADER) && <Stack.Screen name="Documents" component={DocumentsScreen} />}
            {user && <Stack.Screen name="NationalBoard" component={NationalBoardScreen} />}
          </Stack.Navigator>
        </NavigationContainer>
      </UserContext.Provider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
});
