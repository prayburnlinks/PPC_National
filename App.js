/**
 * App.js - Main Entry Point
 * Handles navigation, authentication state, and app initialization
 */

import React, { useState, useEffect, useCallback } from 'react';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { auth } from './firebase-config';
import { onAuthStateChanged } from 'firebase/auth';
import { getCurrentUser } from './services/authService';
import { colors } from './constants/theme';

// Import Screens
import LoginScreen from './screens/LoginScreen';
import RegisterScreen from './screens/RegisterScreen';
import HomeScreen from './screens/HomeScreen';
import EventsScreen from './screens/EventsScreen';
import GivingScreen from './screens/GivingScreen';
import DistrictsScreen from './screens/DistrictsScreen';
import ProfileScreen from './screens/ProfileScreen';
import MediaScreen from './screens/MediaScreen';

// Create Navigators
const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Auth Stack
function AuthStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animationEnabled: true,
      }}
    >
      <Stack.Screen
        name="Login"
        component={LoginScreen}
        options={{ animationTypeForReplace: 'none' }}
      />
      <Stack.Screen
        name="Register"
        component={RegisterScreen}
      />
    </Stack.Navigator>
  );
}

// App Stack (Main Screens)
function AppStack({ user, onLogout }) {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.purple,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '700',
          marginTop: 0,
        },
        tabBarStyle: {
          borderTopWidth: 1,
          borderTopColor: colors.border,
          backgroundColor: colors.white,
          paddingBottom: 8,
          paddingTop: 8,
          height: 60,
        },
        tabBarIcon: ({ focused, color }) => {
          let iconText = '📱';

          if (route.name === 'Home') {
            iconText = '🏠';
          } else if (route.name === 'Media') {
            iconText = '📺';
          } else if (route.name === 'Giving') {
            iconText = '💝';
          } else if (route.name === 'Districts') {
            iconText = '🗺';
          } else if (route.name === 'Profile') {
            iconText = '👤';
          }

          return (
            <View style={{ fontSize: 18 }}>
              {iconText}
            </View>
          );
        },
      })}
    >
      <Tab.Screen
        name="Home"
        options={{
          tabBarLabel: 'Home',
        }}
        children={() => <HomeScreen user={user} navigation={Stack.navigator} />}
      />
      <Tab.Screen
        name="Media"
        component={MediaScreen}
        options={{
          tabBarLabel: 'Media',
        }}
      />
      <Tab.Screen
        name="Giving"
        options={{
          tabBarLabel: 'Give',
        }}
        children={() => <GivingScreen user={user} />}
      />
      <Tab.Screen
        name="Districts"
        component={DistrictsScreen}
        options={{
          tabBarLabel: 'Districts',
        }}
      />
      <Tab.Screen
        name="Profile"
        options={{
          tabBarLabel: 'Profile',
        }}
        children={() => <ProfileScreen user={user} onLogout={onLogout} />}
      />
    </Tab.Navigator>
  );
}

// Root Navigator
function RootNavigator({ user, onLogout, loading }) {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      {loading ? (
        <Stack.Screen
          name="SplashScreen"
          component={() => (
            <View style={styles.splashContainer}>
              <ActivityIndicator size="large" color={colors.purple} />
            </View>
          )}
          options={{ animationTypeForReplace: 'none' }}
        />
      ) : user ? (
        <Stack.Screen
          name="App"
          options={{ animationTypeForReplace: 'none' }}
          children={() => <AppStack user={user} onLogout={onLogout} />}
        />
      ) : (
        <Stack.Screen
          name="Auth"
          component={AuthStack}
          options={{ animationTypeForReplace: 'none' }}
        />
      )}
    </Stack.Navigator>
  );
}

// Main App Component
export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set up auth state listener
    const unsubscribe = onAuthStateChanged(auth, async (authUser) => {
      if (authUser) {
        // Fetch user profile from Firestore
        const userProfile = await getCurrentUser();
        setUser(userProfile);
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const handleLoginSuccess = useCallback((userData) => {
    setUser(userData);
  }, []);

  const handleLogout = useCallback(() => {
    setUser(null);
  }, []);

  return (
    <NavigationContainer>
      <RootNavigator
        user={user}
        onLogout={handleLogout}
        loading={loading}
      />
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  splashContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
});
