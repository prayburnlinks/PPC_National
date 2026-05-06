/**
 * Profile Screen
 * User profile and account settings
 */

import React, { useEffect } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Text,
  Alert,
  Image,
} from 'react-native';
import { colors, spacing, borderRadius, typography } from '../constants/theme';
import { logoutUser, getCurrentUser } from '../services/authService';
import { useUser } from '../context/UserContext';
import { ROLES } from '../constants/config';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const ProfileScreen = ({ navigation }) => {
  const { user, onLogin, onLogout } = useUser();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    getCurrentUser().then(fresh => { if (fresh) onLogin(fresh); });
  }, []);
  const handleLogout = async () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', onPress: () => {} },
      {
        text: 'Sign Out',
        onPress: async () => {
          try {
            await logoutUser();
            onLogout?.();
          } catch (error) {
            Alert.alert('Error', 'Failed to sign out');
          }
        },
        style: 'destructive',
      },
    ]);
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Hero Header */}
      <View style={[styles.heroHeader, { paddingTop: insets.top + spacing.md }]}>
        <View style={styles.avatar}>
          <Image source={require('../assets/emblem.jpg')} style={styles.emblem} resizeMode="contain" />
        </View>
        <Text style={styles.name}>{user?.name || 'Member'}</Text>
        <View style={styles.roleBadge}>
          <Text style={styles.roleBadgeText}>
            ⭐ {user?.role || 'Member'} · {user?.status || 'Approved'}
          </Text>
        </View>
      </View>

      {/* Content */}
      <View style={styles.content}>
        {/* Profile Info Card */}
        <View style={styles.card}>
          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <Text style={styles.rowIcon}>🏛</Text>
              <Text style={styles.rowLabel}>Congregation</Text>
            </View>
            <Text style={styles.rowValue}>{user?.congregation || 'N/A'}</Text>
          </View>
          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <Text style={styles.rowIcon}>🗺</Text>
              <Text style={styles.rowLabel}>District</Text>
            </View>
            <Text style={styles.rowValue}>{user?.district || 'N/A'}</Text>
          </View>
          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <Text style={styles.rowIcon}>📅</Text>
              <Text style={styles.rowLabel}>Member Since</Text>
            </View>
            <Text style={styles.rowValue}>
              {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
            </Text>
          </View>
        </View>

        {/* Account Card */}
        <View style={styles.card}>
          <Text style={styles.cardHeader}>Account</Text>
          <TouchableOpacity style={styles.row} onPress={() => alert('Coming soon')}>
            <View style={styles.rowLeft}>
              <Text style={styles.rowIcon}>🔔</Text>
              <Text style={styles.rowLabel}>Notifications</Text>
            </View>
            <Text style={styles.rowArrow}>›</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.row} onPress={() => alert('Coming soon')}>
            <View style={styles.rowLeft}>
              <Text style={styles.rowIcon}>💝</Text>
              <Text style={styles.rowLabel}>Giving History</Text>
            </View>
            <Text style={styles.rowArrow}>›</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.row} onPress={() => alert('Coming soon')}>
            <View style={styles.rowLeft}>
              <Text style={styles.rowIcon}>🙏</Text>
              <Text style={styles.rowLabel}>Prayer Requests</Text>
            </View>
            <Text style={styles.rowArrow}>›</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.row} onPress={() => alert('Coming soon')}>
            <View style={styles.rowLeft}>
              <Text style={styles.rowIcon}>📋</Text>
              <Text style={styles.rowLabel}>My Events</Text>
            </View>
            <Text style={styles.rowArrow}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Ministries Card */}
        <View style={styles.card}>
          <Text style={styles.cardHeader}>Ministries</Text>
          <View style={styles.ministryChips}>
            <View style={styles.ministryChip}>
              <Text style={styles.ministryChipText}>Member</Text>
            </View>
            <View style={styles.ministryChip}>
              <Text style={styles.ministryChipText}>Worship Team</Text>
            </View>
          </View>
        </View>

        {/* Admin Panel — only for admins */}
        {user?.role === ROLES.ADMIN && (
          <TouchableOpacity style={styles.adminButton} onPress={() => navigation.navigate('Admin')}>
            <Text style={styles.adminButtonText}>Admin Panel</Text>
          </TouchableOpacity>
        )}

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutButtonText}>Sign Out</Text>
        </TouchableOpacity>

        <View style={styles.spacer} />
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  heroHeader: {
    backgroundColor: colors.darkBlue,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xxxl,
    alignItems: 'center',
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
    borderWidth: 2.5,
    borderColor: colors.red,
    overflow: 'hidden',
  },
  emblem: {
    width: 68,
    height: 68,
  },
  name: {
    color: colors.white,
    fontSize: typography.sizes.xxl,
    fontWeight: '700',
    marginBottom: spacing.md,
  },
  roleBadge: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  roleBadgeText: {
    color: colors.white,
    fontSize: typography.sizes.xs,
    fontWeight: '600',
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    marginTop: -18,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardHeader: {
    fontSize: typography.sizes.xs,
    fontWeight: '700',
    color: colors.textSecondary,
    letterSpacing: 0.5,
    marginBottom: spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  rowIcon: {
    fontSize: typography.sizes.lg,
  },
  rowLabel: {
    fontSize: typography.sizes.sm,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  rowValue: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
  },
  rowArrow: {
    fontSize: typography.sizes.lg,
    color: colors.textSecondary,
  },
  ministryChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  ministryChip: {
    backgroundColor: colors.surfaceLight,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  ministryChipText: {
    fontSize: typography.sizes.xs,
    fontWeight: '700',
    color: colors.blue,
  },
  adminButton: {
    backgroundColor: colors.darkBlue,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  adminButtonText: {
    fontSize: typography.sizes.sm,
    fontWeight: '600',
    color: colors.white,
  },
  logoutButton: {
    backgroundColor: '#FFF0EE',
    borderWidth: 1,
    borderColor: '#FFD4C9',
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  logoutButtonText: {
    fontSize: typography.sizes.sm,
    fontWeight: '600',
    color: colors.red,
  },
  spacer: {
    height: spacing.lg,
  },
});

export default ProfileScreen;
