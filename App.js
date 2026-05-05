import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { auth } from './firebase-config';
import { onAuthStateChanged } from 'firebase/auth';
import { getCurrentUser } from './services/authService';
import { colors } from './constants/theme';
import { UserContext } from './context/UserContext';
import LoginScreen from './screens/LoginScreen';
import RegisterScreen from './screens/RegisterScreen';
import HomeScreen from './screens/HomeScreen';
import GivingScreen from './screens/GivingScreen';
import ProfileScreen from './screens/ProfileScreen';
import MediaScreen from './screens/MediaScreen';
import DistrictsScreen from './screens/DistrictsScreen';
import EventsScreen from './screens/EventsScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const TAB_ICONS = { Home: '🏠', Media: '📺', Giving: '💝', Districts: '🗺', Profile: '👤' };

function AppTabs() {
  const insets = useSafeAreaInsets();
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
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
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ tabBarLabel: 'Home' }} />
      <Tab.Screen name="Media" component={MediaScreen} options={{ tabBarLabel: 'Media' }} />
      <Tab.Screen name="Giving" component={GivingScreen} options={{ tabBarLabel: 'Give' }} />
      <Tab.Screen name="Districts" component={DistrictsScreen} options={{ tabBarLabel: 'Districts' }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ tabBarLabel: 'Profile' }} />
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
          setUser(userProfile);
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
            {user ? (
              <Stack.Screen name="Tabs" component={AppTabs} />
            ) : (
              <Stack.Screen name="Login" component={LoginScreen} />
            )}
            {!user && <Stack.Screen name="Register" component={RegisterScreen} />}
            {user && <Stack.Screen name="Events" component={EventsScreen} />}
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
