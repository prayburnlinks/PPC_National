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
  Modal,
  Image,
  Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, borderRadius, typography } from '../constants/theme';
import { getPendingRegistrations, approveUser, rejectUser } from '../services/authService';
import { getPendingPOPs, approvePOP, rejectPOP } from '../services/popService';
import { useUser } from '../context/UserContext';

const TABS = ['Pending', 'Payments', 'Actions'];

const AdminScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { user: reviewer } = useUser();
  const [pendingUsers, setPendingUsers] = useState([]);
  const [pendingPOPs, setPendingPOPs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('Pending');
  const [processingUid, setProcessingUid] = useState(null);
  const [processingPopId, setProcessingPopId] = useState(null);
  const [viewingPOP, setViewingPOP] = useState(null);

  const loadAll = useCallback(async () => {
    const [users, pops] = await Promise.all([
      getPendingRegistrations(),
      getPendingPOPs(reviewer?.role, reviewer?.congregation),
    ]);
    setPendingUsers(users);
    setPendingPOPs(pops);
    setLoading(false);
    setRefreshing(false);
  }, [reviewer]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const onRefresh = () => {
    setRefreshing(true);
    loadAll();
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
          {(pendingUsers.length + pendingPOPs.length) > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{pendingUsers.length + pendingPOPs.length}</Text>
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
              {tab}
              {tab === 'Pending' && pendingUsers.length > 0 ? ` (${pendingUsers.length})` : ''}
              {tab === 'Payments' && pendingPOPs.length > 0 ? ` (${pendingPOPs.length})` : ''}
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
      ) : activeTab === 'Payments' ? (
        <ScrollView
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.blue]} />}
          showsVerticalScrollIndicator={false}
        >
          {pendingPOPs.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>✅</Text>
              <Text style={styles.emptyTitle}>All caught up!</Text>
              <Text style={styles.emptyText}>No pending proof of payments.</Text>
            </View>
          ) : (
            pendingPOPs.map(pop => (
              <View key={pop.id} style={styles.card}>
                <View style={styles.cardTop}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{pop.userName?.[0]?.toUpperCase() || '?'}</Text>
                  </View>
                  <View style={styles.cardInfo}>
                    <Text style={styles.userName}>{pop.userName}</Text>
                    <Text style={styles.userEmail}>{pop.congregation || 'No congregation'}</Text>
                    <View style={[styles.rolePill, { borderColor: colors.blue }]}>
                      <Text style={[styles.rolePillText, { color: colors.blue }]}>
                        {pop.mimeType?.includes('pdf') ? '📄 PDF' : '🖼 Image'}
                      </Text>
                    </View>
                  </View>
                </View>
                <View style={styles.meta}>
                  <View style={styles.metaRow}>
                    <Text style={styles.metaLabel}>District</Text>
                    <Text style={styles.metaValue}>{pop.district || 'N/A'}</Text>
                  </View>
                  <View style={styles.metaRow}>
                    <Text style={styles.metaLabel}>File</Text>
                    <Text style={styles.metaValue} numberOfLines={1}>{pop.fileName}</Text>
                  </View>
                  <View style={styles.metaRow}>
                    <Text style={styles.metaLabel}>Submitted</Text>
                    <Text style={styles.metaValue}>{formatDate(pop.submittedAt?.toDate?.() || pop.submittedAt)}</Text>
                  </View>
                </View>
                {/* View button */}
                <TouchableOpacity
                  style={styles.viewBtn}
                  onPress={() => {
                    if (pop.mimeType?.includes('pdf')) {
                      Linking.openURL(pop.fileUrl).catch(() => Alert.alert('Error', 'Could not open file.'));
                    } else {
                      setViewingPOP(pop);
                    }
                  }}
                >
                  <Text style={styles.viewBtnText}>👁  View Proof of Payment</Text>
                </TouchableOpacity>

                {processingPopId === pop.id ? (
                  <ActivityIndicator style={styles.spinner} color={colors.blue} />
                ) : (
                  <View style={styles.actions}>
                    <TouchableOpacity
                      style={styles.rejectBtn}
                      onPress={() => {
                        Alert.alert('Reject POP', `Reject proof of payment from ${pop.userName}?`, [
                          { text: 'Cancel', style: 'cancel' },
                          {
                            text: 'Reject', style: 'destructive',
                            onPress: async () => {
                              setProcessingPopId(pop.id);
                              try {
                                await rejectPOP(pop.id, pop.userId, reviewer?.uid);
                                setPendingPOPs(prev => prev.filter(p => p.id !== pop.id));
                              } catch { Alert.alert('Error', 'Failed to reject.'); }
                              finally { setProcessingPopId(null); }
                            },
                          },
                        ]);
                      }}
                    >
                      <Text style={styles.rejectBtnText}>Reject</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.approveBtn}
                      onPress={() => {
                        Alert.alert('Approve POP', `Approve proof of payment from ${pop.userName}?`, [
                          { text: 'Cancel', style: 'cancel' },
                          {
                            text: 'Approve',
                            onPress: async () => {
                              setProcessingPopId(pop.id);
                              try {
                                await approvePOP(pop.id, pop.userId, reviewer?.uid);
                                setPendingPOPs(prev => prev.filter(p => p.id !== pop.id));
                              } catch { Alert.alert('Error', 'Failed to approve.'); }
                              finally { setProcessingPopId(null); }
                            },
                          },
                        ]);
                      }}
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
            <TouchableOpacity style={styles.actionRow} onPress={() => setActiveTab('Payments')}>
              <Text style={styles.actionIcon}>💳</Text>
              <View style={styles.actionText}>
                <Text style={styles.actionLabel}>Proof of Payments</Text>
                <Text style={styles.actionSub}>{pendingPOPs.length} payments awaiting review</Text>
              </View>
              <Text style={styles.actionArrow}>›</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}

      {/* POP Image Viewer Modal */}
      <Modal
        visible={!!viewingPOP}
        transparent
        animationType="fade"
        onRequestClose={() => setViewingPOP(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{viewingPOP?.userName} — Proof of Payment</Text>
              <TouchableOpacity onPress={() => setViewingPOP(null)} style={styles.modalClose}>
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>
            {viewingPOP?.fileUrl && (
              <Image
                source={{ uri: viewingPOP.fileUrl }}
                style={styles.modalImage}
                resizeMode="contain"
              />
            )}
          </View>
        </View>
      </Modal>
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
  viewBtn: {
    backgroundColor: colors.surfaceLight,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  viewBtnText: {
    fontSize: typography.sizes.sm,
    fontWeight: '600',
    color: colors.blue,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalBox: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    width: '100%',
    maxHeight: '80%',
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: '700',
    color: colors.textPrimary,
    flex: 1,
    marginRight: spacing.md,
  },
  modalClose: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCloseText: {
    fontSize: typography.sizes.base,
    color: colors.textSecondary,
    fontWeight: '700',
  },
  modalImage: {
    width: '100%',
    height: 400,
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
