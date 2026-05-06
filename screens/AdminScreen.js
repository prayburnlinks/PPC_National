import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Text,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, borderRadius, typography } from '../constants/theme';
import { getPendingRegistrations, approveUser, rejectUser } from '../services/authService';

const TABS = ['Pending', 'Actions'];

const AdminScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const [pendingUsers, setPendingUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('Pending');
  const [processingUid, setProcessingUid] = useState(null);

  const loadPending = useCallback(async () => {
    const users = await getPendingRegistrations();
    setPendingUsers(users);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    loadPending();
  }, [loadPending]);

  const onRefresh = () => {
    setRefreshing(true);
    loadPending();
  };

  const handleApprove = (user) => {
    Alert.alert(
      'Approve Account',
      `Approve ${user.name} as ${user.role}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve',
          onPress: async () => {
            setProcessingUid(user.uid);
            try {
              await approveUser(user.uid);
              setPendingUsers(prev => prev.filter(u => u.uid !== user.uid));
            } catch {
              Alert.alert('Error', 'Failed to approve user. Please try again.');
            } finally {
              setProcessingUid(null);
            }
          },
        },
      ]
    );
  };

  const handleReject = (user) => {
    Alert.alert(
      'Reject Account',
      `Reject ${user.name}'s registration?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: async () => {
            setProcessingUid(user.uid);
            try {
              await rejectUser(user.uid);
              setPendingUsers(prev => prev.filter(u => u.uid !== user.uid));
            } catch {
              Alert.alert('Error', 'Failed to reject user. Please try again.');
            } finally {
              setProcessingUid(null);
            }
          },
        },
      ]
    );
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-ZA', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const roleColor = (role) => {
    if (role === 'admin') return colors.red;
    if (role === 'leader') return colors.blue;
    return colors.textSecondary;
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backText}>‹</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Admin Panel</Text>
          <Text style={styles.headerSub}>User Management</Text>
        </View>
        <View style={styles.badgeWrap}>
          {pendingUsers.length > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{pendingUsers.length}</Text>
            </View>
          )}
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        {TABS.map(tab => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab}{tab === 'Pending' && pendingUsers.length > 0 ? ` (${pendingUsers.length})` : ''}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.blue} />
        </View>
      ) : activeTab === 'Pending' ? (
        <ScrollView
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.blue]} />}
          showsVerticalScrollIndicator={false}
        >
          {pendingUsers.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>✅</Text>
              <Text style={styles.emptyTitle}>All caught up!</Text>
              <Text style={styles.emptyText}>No pending registrations at this time.</Text>
            </View>
          ) : (
            pendingUsers.map(user => (
              <View key={user.uid} style={styles.card}>
                <View style={styles.cardTop}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{user.name?.[0]?.toUpperCase() || '?'}</Text>
                  </View>
                  <View style={styles.cardInfo}>
                    <Text style={styles.userName}>{user.name}</Text>
                    <Text style={styles.userEmail}>{user.email}</Text>
                    <View style={[styles.rolePill, { borderColor: roleColor(user.role) }]}>
                      <Text style={[styles.rolePillText, { color: roleColor(user.role) }]}>
                        {user.role?.charAt(0).toUpperCase() + user.role?.slice(1)}
                      </Text>
                    </View>
                  </View>
                </View>

                <View style={styles.meta}>
                  <View style={styles.metaRow}>
                    <Text style={styles.metaLabel}>Congregation</Text>
                    <Text style={styles.metaValue}>{user.congregation || 'N/A'}</Text>
                  </View>
                  <View style={styles.metaRow}>
                    <Text style={styles.metaLabel}>District</Text>
                    <Text style={styles.metaValue}>{user.district || 'N/A'}</Text>
                  </View>
                  <View style={styles.metaRow}>
                    <Text style={styles.metaLabel}>Registered</Text>
                    <Text style={styles.metaValue}>{formatDate(user.createdAt)}</Text>
                  </View>
                  {user.phone && (
                    <View style={styles.metaRow}>
                      <Text style={styles.metaLabel}>Phone</Text>
                      <Text style={styles.metaValue}>{user.phone}</Text>
                    </View>
                  )}
                </View>

                {processingUid === user.uid ? (
                  <ActivityIndicator style={styles.spinner} color={colors.blue} />
                ) : (
                  <View style={styles.actions}>
                    <TouchableOpacity
                      style={styles.rejectBtn}
                      onPress={() => handleReject(user)}
                    >
                      <Text style={styles.rejectBtnText}>Reject</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.approveBtn}
                      onPress={() => handleApprove(user)}
                    >
                      <Text style={styles.approveBtnText}>Approve</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            ))
          )}
        </ScrollView>
      ) : (
        <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Quick Actions</Text>
            <TouchableOpacity style={styles.actionRow} onPress={() => setActiveTab('Pending')}>
              <Text style={styles.actionIcon}>⏳</Text>
              <View style={styles.actionText}>
                <Text style={styles.actionLabel}>Pending Approvals</Text>
                <Text style={styles.actionSub}>{pendingUsers.length} users awaiting approval</Text>
              </View>
              <Text style={styles.actionArrow}>›</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    backgroundColor: colors.darkBlue,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    width: 36,
    alignItems: 'flex-start',
  },
  backText: {
    color: colors.white,
    fontSize: 28,
    fontWeight: '300',
    lineHeight: 30,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    color: colors.white,
    fontSize: typography.sizes.xl,
    fontWeight: '700',
  },
  headerSub: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: typography.sizes.sm,
    marginTop: 2,
  },
  badgeWrap: {
    width: 36,
    alignItems: 'flex-end',
  },
  badge: {
    backgroundColor: colors.red,
    borderRadius: borderRadius.full,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  badgeText: {
    color: colors.white,
    fontSize: typography.sizes.xs,
    fontWeight: '700',
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: colors.blue,
  },
  tabText: {
    fontSize: typography.sizes.sm,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  tabTextActive: {
    color: colors.blue,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  list: {
    padding: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: spacing.huge,
  },
  emptyIcon: {
    fontSize: 40,
    marginBottom: spacing.md,
  },
  emptyTitle: {
    fontSize: typography.sizes.xl,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  emptyText: {
    fontSize: typography.sizes.base,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
    borderWidth: 2,
    borderColor: colors.border,
  },
  avatarText: {
    fontSize: typography.sizes.xl,
    fontWeight: '700',
    color: colors.blue,
  },
  cardInfo: {
    flex: 1,
  },
  userName: {
    fontSize: typography.sizes.lg,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  userEmail: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  rolePill: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  rolePillText: {
    fontSize: typography.sizes.xs,
    fontWeight: '700',
  },
  meta: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metaLabel: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  metaValue: {
    fontSize: typography.sizes.sm,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  spinner: {
    marginVertical: spacing.md,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  rejectBtn: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: '#FFD4C9',
    backgroundColor: '#FFF0EE',
    alignItems: 'center',
  },
  rejectBtnText: {
    fontSize: typography.sizes.sm,
    fontWeight: '600',
    color: colors.red,
  },
  approveBtn: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.blue,
    alignItems: 'center',
  },
  approveBtnText: {
    fontSize: typography.sizes.sm,
    fontWeight: '600',
    color: colors.white,
  },
  sectionTitle: {
    fontSize: typography.sizes.xs,
    fontWeight: '700',
    color: colors.textSecondary,
    letterSpacing: 0.5,
    marginBottom: spacing.md,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  actionIcon: {
    fontSize: 22,
    marginRight: spacing.md,
  },
  actionText: {
    flex: 1,
  },
  actionLabel: {
    fontSize: typography.sizes.base,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  actionSub: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  actionArrow: {
    fontSize: typography.sizes.xl,
    color: colors.textSecondary,
  },
});

export default AdminScreen;
