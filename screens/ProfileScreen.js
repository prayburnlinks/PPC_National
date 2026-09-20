/**
 * Profile Screen
 * User profile and account settings
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Text,
  Alert,
  Image,
  Modal,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { colors, spacing, borderRadius, typography, shadows } from '../constants/theme';
import Icon, { IconBadge, IconText } from '../components/Icon';
import { logoutUser, getCurrentUser, deleteMyAccount } from '../services/authService';
import { useUser } from '../context/UserContext';
import { ROLES } from '../constants/config';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const ProfileScreen = ({ navigation }) => {
  const { user, onLogin, onLogout } = useUser();
  const insets = useSafeAreaInsets();
  const [deleteVisible, setDeleteVisible] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    getCurrentUser().then(fresh => { if (fresh) onLogin(fresh); }).catch(console.error);
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

  const closeDeleteSheet = () => {
    if (deleting) return;
    setDeleteVisible(false);
    setDeletePassword('');
  };

  const handleDeleteAccount = async () => {
    if (!deletePassword) {
      Alert.alert('Password Required', 'Please enter your password to confirm.');
      return;
    }
    setDeleting(true);
    try {
      await deleteMyAccount(deletePassword);
      setDeleteVisible(false);
      setDeletePassword('');
      // deleteMyAccount has already signed the session out; onLogout is what
      // sends the app back to the login screen.
      onLogout?.();
      Alert.alert('Account Deleted', 'Your account has been removed. We are sorry to see you go.');
    } catch (error) {
      Alert.alert('Could Not Delete Account', error.message || 'Please try again.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Frozen Header */}
      <View style={[styles.heroHeader, { paddingTop: insets.top + spacing.md }]}>
        <View style={styles.avatar}>
          <Image source={require('../assets/emblem.jpg')} style={styles.emblem} resizeMode="contain" />
        </View>
        <Text style={styles.name}>{user?.name || 'Member'}</Text>
        <View style={styles.roleBadge}>
          <Text style={styles.roleBadgeText}>
            {user?.role || 'Member'} · {user?.status || 'Approved'}
          </Text>
        </View>
      </View>
      <ScrollView showsVerticalScrollIndicator={false}>

      {/* Content */}
      <View style={styles.content}>
        {/* Profile Info Card */}
        <View style={styles.card}>
          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <IconBadge name="business-outline" size={34} tone="blue" />
              <Text style={styles.rowLabel}>Congregation</Text>
            </View>
            <Text style={styles.rowValue}>{user?.congregation || 'N/A'}</Text>
          </View>
          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <IconBadge name="map-outline" size={34} tone="blue" />
              <Text style={styles.rowLabel}>District</Text>
            </View>
            <Text style={styles.rowValue}>{user?.district || 'N/A'}</Text>
          </View>

        </View>

        {/* Account Card */}
        <View style={styles.card}>
          <Text style={styles.cardHeader}>Account</Text>
          <TouchableOpacity style={styles.row} onPress={() => navigation.navigate('Notifications')}>
            <View style={styles.rowLeft}>
              <IconBadge name="notifications-outline" size={34} tone="blue" />
              <Text style={styles.rowLabel}>Notifications</Text>
            </View>
            <Icon name="chevron-forward" size={18} color={colors.textTertiary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.row} onPress={() => navigation.navigate('MyPrayerRequests')}>
            <View style={styles.rowLeft}>
              <IconBadge name="flame-outline" size={34} tone="blue" />
              <Text style={styles.rowLabel}>Prayer Requests</Text>
            </View>
            <Icon name="chevron-forward" size={18} color={colors.textTertiary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.row} onPress={() => navigation.navigate('MyEvents')}>
            <View style={styles.rowLeft}>
              <IconBadge name="calendar-outline" size={34} tone="blue" />
              <Text style={styles.rowLabel}>My Events</Text>
            </View>
            <Icon name="chevron-forward" size={18} color={colors.textTertiary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.row} onPress={() => navigation.navigate('MyOrders')}>
            <View style={styles.rowLeft}>
              <IconBadge name="bag-handle-outline" size={34} tone="blue" />
              <Text style={styles.rowLabel}>My Orders</Text>
            </View>
            <Icon name="chevron-forward" size={18} color={colors.textTertiary} />
          </TouchableOpacity>
        </View>

        {/* Ministries Card */}
        <View style={styles.card}>
          <Text style={styles.cardHeader}>Ministries</Text>
          <View style={styles.ministryChips}>
            <View style={styles.ministryChip}>
              <Text style={styles.ministryChipText}>Member</Text>
            </View>

          </View>
        </View>

        {/* Leadership Buttons — Admin and Leader only */}
        {(user?.role === ROLES.ADMIN || user?.role === ROLES.LEADER) && (
          <TouchableOpacity style={styles.adminButton} onPress={() => navigation.navigate('Documents')}>
            <IconText name="folder-open-outline" size={18} color={colors.white} textStyle={styles.adminButtonText} style={{ justifyContent: 'center' }}>Documents</IconText>
          </TouchableOpacity>
        )}
        {(user?.role === ROLES.ADMIN || user?.role === ROLES.LEADER) && (
          <TouchableOpacity style={[styles.adminButton, { marginTop: spacing.sm }]} onPress={() => navigation.navigate('Admin')}>
            <IconText name="shield-checkmark-outline" size={18} color={colors.white} textStyle={styles.adminButtonText} style={{ justifyContent: 'center' }}>Admin Panel</IconText>
          </TouchableOpacity>
        )}

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <IconText name="log-out-outline" size={18} color={colors.red} textStyle={styles.logoutButtonText} style={{ justifyContent: 'center' }}>Sign Out</IconText>
        </TouchableOpacity>

        {/* Apple's Guideline 5.1.1(v) requires account deletion to be reachable
            from inside the app, not just by emailing the church office. */}
        <TouchableOpacity style={styles.deleteButton} onPress={() => setDeleteVisible(true)}>
          <IconText name="trash-outline" size={15} color={colors.textTertiary} textStyle={styles.deleteButtonText} style={{ justifyContent: 'center' }}>Delete Account</IconText>
        </TouchableOpacity>

        <View style={styles.spacer} />
      </View>
      </ScrollView>

      <Modal
        visible={deleteVisible}
        transparent
        animationType="slide"
        onRequestClose={closeDeleteSheet}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={[styles.modalContent, { paddingBottom: spacing.lg + insets.bottom }]}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Delete Account</Text>
            <Text style={styles.modalBody}>
              This permanently deletes your profile, your sign-in, your prayer requests and your
              notifications. It cannot be undone.
            </Text>
            <Text style={styles.modalBody}>
              Event registrations and merchandise orders stay in the church's financial records, but
              your name is removed from them.
            </Text>

            <Text style={styles.modalLabel}>CONFIRM YOUR PASSWORD</Text>
            <TextInput
              style={styles.modalInput}
              value={deletePassword}
              onChangeText={setDeletePassword}
              placeholder="Password"
              placeholderTextColor={colors.placeholder}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              editable={!deleting}
            />

            <TouchableOpacity
              style={[styles.modalDeleteButton, deleting && styles.modalButtonDisabled]}
              onPress={handleDeleteAccount}
              disabled={deleting}
            >
              {deleting ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <Text style={styles.modalDeleteButtonText}>Delete My Account</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.modalCancelButton}
              onPress={closeDeleteSheet}
              disabled={deleting}
            >
              <Text style={styles.modalCancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
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
    fontSize: typography.sizes.xxxl,
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
    fontSize: typography.sizes.sm,
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
    ...shadows.sm,
  },
  cardHeader: {
    fontSize: typography.sizes.sm,
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
    fontSize: typography.sizes.xl,
  },
  rowLabel: {
    fontSize: typography.sizes.base,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  rowValue: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
  },
  rowArrow: {
    fontSize: typography.sizes.xl,
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
    fontSize: typography.sizes.sm,
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
    fontSize: typography.sizes.base,
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
    fontSize: typography.sizes.base,
    fontWeight: '600',
    color: colors.red,
  },
  deleteButton: {
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  deleteButtonText: {
    fontSize: typography.sizes.sm,
    fontWeight: '600',
    color: colors.textTertiary,
    textDecorationLine: 'underline',
  },
  spacer: {
    height: spacing.lg,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(10,31,68,0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.white,
    borderTopLeftRadius: borderRadius.xxl,
    borderTopRightRadius: borderRadius.xxl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
  },
  modalHandle: {
    width: 36,
    height: 4,
    backgroundColor: colors.border,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: spacing.lg,
  },
  modalTitle: {
    fontSize: typography.sizes.xl,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  modalBody: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: spacing.md,
  },
  modalLabel: {
    fontSize: typography.sizes.xs,
    fontWeight: '700',
    color: colors.textTertiary,
    letterSpacing: 0.5,
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: typography.sizes.base,
    color: colors.textPrimary,
    backgroundColor: colors.background,
    marginBottom: spacing.lg,
  },
  modalDeleteButton: {
    backgroundColor: colors.red,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  modalButtonDisabled: {
    opacity: 0.7,
  },
  modalDeleteButtonText: {
    fontSize: typography.sizes.base,
    fontWeight: '700',
    color: colors.white,
  },
  modalCancelButton: {
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  modalCancelButtonText: {
    fontSize: typography.sizes.base,
    fontWeight: '600',
    color: colors.textSecondary,
  },
});

export default ProfileScreen;
