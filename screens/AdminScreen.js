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
import { ROLES } from '../constants/config';
import { getPendingRegistrations, approveUser, rejectUser } from '../services/authService';
import { getPendingEventRegistrations, approveEventRegistration, rejectEventRegistration } from '../services/eventRegistrationService';
import { getPendingMerchOrders, approveMerchOrder, rejectMerchOrder } from '../services/merchService';
import { useUser } from '../context/UserContext';

const AdminScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { user: reviewer } = useUser();
  // Only Admins can approve/reject user registrations (firestore.rules
  // grants that to isAdmin() only) — Leaders get Payments review instead.
  const isAdminReviewer = reviewer?.role === ROLES.ADMIN;
  const TABS = isAdminReviewer ? ['Pending', 'Payments', 'Merch Orders', 'Actions'] : ['Payments', 'Merch Orders', 'Actions'];
  const [pendingUsers, setPendingUsers] = useState([]);
  const [pendingEventPayments, setPendingEventPayments] = useState([]);
  const [pendingMerchOrders, setPendingMerchOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState(isAdminReviewer ? 'Pending' : 'Payments');
  // Arrays, not a single id — otherwise acting on item B while item A is
  // still processing reassigns the shared id to B, which makes A's buttons
  // reappear and lets it be re-tapped (double-fire) while its own request
  // is still in flight.
  const [processingUids, setProcessingUids] = useState([]);
  const [processingRegistrationIds, setProcessingRegistrationIds] = useState([]);
  const [processingOrderIds, setProcessingOrderIds] = useState([]);
  const [viewingRegistrationProof, setViewingRegistrationProof] = useState(null);
  const [viewingOrderProof, setViewingOrderProof] = useState(null);
  const [loadError, setLoadError] = useState(false);

  const loadAll = useCallback(async () => {
    try {
      const [users, registrations, orders] = await Promise.all([
        isAdminReviewer ? getPendingRegistrations() : Promise.resolve([]),
        getPendingEventRegistrations(reviewer?.role, reviewer?.congregation),
        getPendingMerchOrders(reviewer?.role, reviewer?.congregation),
      ]);
      setPendingUsers(users);
      setPendingEventPayments(registrations);
      setPendingMerchOrders(orders);
      setLoadError(false);
    } catch {
      setLoadError(true);
      Alert.alert('Error', 'Failed to load admin data. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [reviewer, isAdminReviewer]);

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
            setProcessingUids(prev => [...prev, user.uid]);
            try {
              await approveUser(user.uid);
              setPendingUsers(prev => prev.filter(u => u.uid !== user.uid));
            } catch {
              Alert.alert('Error', 'Failed to approve user. Please try again.');
            } finally {
              setProcessingUids(prev => prev.filter(id => id !== user.uid));
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
            setProcessingUids(prev => [...prev, user.uid]);
            try {
              await rejectUser(user.uid);
              setPendingUsers(prev => prev.filter(u => u.uid !== user.uid));
            } catch {
              Alert.alert('Error', 'Failed to reject user. Please try again.');
            } finally {
              setProcessingUids(prev => prev.filter(id => id !== user.uid));
            }
          },
        },
      ]
    );
  };

  const handleApproveEventPayment = (registration) => {
    Alert.alert('Approve Payment', `Approve proof of payment from ${registration.userName} for ${registration.eventName}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Approve',
        onPress: async () => {
          setProcessingRegistrationIds(prev => [...prev, registration.id]);
          try {
            await approveEventRegistration(registration.id, registration.userId, reviewer?.uid);
            setPendingEventPayments(prev => prev.filter(r => r.id !== registration.id));
          } catch {
            Alert.alert('Error', 'Failed to approve payment. Please try again.');
          } finally {
            setProcessingRegistrationIds(prev => prev.filter(id => id !== registration.id));
          }
        },
      },
    ]);
  };

  const handleRejectEventPayment = (registration) => {
    Alert.alert('Reject Payment', `Reject proof of payment from ${registration.userName} for ${registration.eventName}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reject',
        style: 'destructive',
        onPress: async () => {
          setProcessingRegistrationIds(prev => [...prev, registration.id]);
          try {
            await rejectEventRegistration(registration.id, registration.userId, reviewer?.uid);
            setPendingEventPayments(prev => prev.filter(r => r.id !== registration.id));
          } catch {
            Alert.alert('Error', 'Failed to reject payment. Please try again.');
          } finally {
            setProcessingRegistrationIds(prev => prev.filter(id => id !== registration.id));
          }
        },
      },
    ]);
  };

  const handleApproveMerchOrder = (order) => {
    Alert.alert('Approve Order', `Approve ${order.itemName} order from ${order.userName}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Approve',
        onPress: async () => {
          setProcessingOrderIds(prev => [...prev, order.id]);
          try {
            await approveMerchOrder(order.id, order.userId, reviewer?.uid);
            setPendingMerchOrders(prev => prev.filter(o => o.id !== order.id));
          } catch {
            Alert.alert('Error', 'Failed to approve order. Please try again.');
          } finally {
            setProcessingOrderIds(prev => prev.filter(id => id !== order.id));
          }
        },
      },
    ]);
  };

  const handleRejectMerchOrder = (order) => {
    Alert.alert('Reject Order', `Reject ${order.itemName} order from ${order.userName}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reject',
        style: 'destructive',
        onPress: async () => {
          setProcessingOrderIds(prev => [...prev, order.id]);
          try {
            await rejectMerchOrder(order.id, order.userId, reviewer?.uid);
            setPendingMerchOrders(prev => prev.filter(o => o.id !== order.id));
          } catch {
            Alert.alert('Error', 'Failed to reject order. Please try again.');
          } finally {
            setProcessingOrderIds(prev => prev.filter(id => id !== order.id));
          }
        },
      },
    ]);
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
    if (role === ROLES.ADMIN) return colors.red;
    if (role === ROLES.LEADER) return colors.blue;
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
          {(pendingUsers.length + pendingEventPayments.length + pendingMerchOrders.length) > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{pendingUsers.length + pendingEventPayments.length + pendingMerchOrders.length}</Text>
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
              {tab === 'Payments' && pendingEventPayments.length > 0 ? ` (${pendingEventPayments.length})` : ''}
              {tab === 'Merch Orders' && pendingMerchOrders.length > 0 ? ` (${pendingMerchOrders.length})` : ''}
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
          contentContainerStyle={[styles.list, { paddingBottom: spacing.xxxl + insets.bottom }]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.blue]} />}
          showsVerticalScrollIndicator={false}
        >
          {pendingUsers.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>{loadError ? '⚠️' : '✅'}</Text>
              <Text style={styles.emptyTitle}>{loadError ? 'Failed to load' : 'All caught up!'}</Text>
              <Text style={styles.emptyText}>
                {loadError ? 'Pull down to retry.' : 'No pending registrations at this time.'}
              </Text>
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

                {processingUids.includes(user.uid) ? (
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
          contentContainerStyle={[styles.list, { paddingBottom: spacing.xxxl + insets.bottom }]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.blue]} />}
          showsVerticalScrollIndicator={false}
        >
          {pendingEventPayments.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>{loadError ? '⚠️' : '✅'}</Text>
              <Text style={styles.emptyTitle}>{loadError ? 'Failed to load' : 'All caught up!'}</Text>
              <Text style={styles.emptyText}>
                {loadError ? 'Pull down to retry.' : 'No pending proof of payments.'}
              </Text>
            </View>
          ) : (
            pendingEventPayments.map(registration => (
              <View key={registration.id} style={styles.card}>
                <View style={styles.cardTop}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{registration.userName?.[0]?.toUpperCase() || '?'}</Text>
                  </View>
                  <View style={styles.cardInfo}>
                    <Text style={styles.userName}>{registration.userName}</Text>
                    <Text style={styles.userEmail}>{registration.eventName}</Text>
                    <View style={[styles.rolePill, { borderColor: colors.blue }]}>
                      <Text style={[styles.rolePillText, { color: colors.blue }]}>
                        {registration.mimeType?.includes('pdf') ? '📄 PDF' : '🖼 Image'}
                      </Text>
                    </View>
                  </View>
                </View>
                <View style={styles.meta}>
                  <View style={styles.metaRow}>
                    <Text style={styles.metaLabel}>Amount</Text>
                    <Text style={styles.metaValue}>{registration.currency}{registration.registrationFee}</Text>
                  </View>
                  <View style={styles.metaRow}>
                    <Text style={styles.metaLabel}>Congregation</Text>
                    <Text style={styles.metaValue}>{registration.congregation || 'N/A'}</Text>
                  </View>
                  <View style={styles.metaRow}>
                    <Text style={styles.metaLabel}>File</Text>
                    <Text style={styles.metaValue} numberOfLines={1}>{registration.fileName}</Text>
                  </View>
                  <View style={styles.metaRow}>
                    <Text style={styles.metaLabel}>Submitted</Text>
                    <Text style={styles.metaValue}>{formatDate(registration.paymentSubmittedAt?.toDate?.() || registration.paymentSubmittedAt)}</Text>
                  </View>
                </View>
                {/* View button */}
                <TouchableOpacity
                  style={styles.viewBtn}
                  onPress={() => {
                    if (registration.mimeType?.includes('pdf')) {
                      Linking.openURL(registration.fileUrl).catch(() => Alert.alert('Error', 'Could not open file.'));
                    } else {
                      setViewingRegistrationProof(registration);
                    }
                  }}
                >
                  <Text style={styles.viewBtnText}>👁  View Proof of Payment</Text>
                </TouchableOpacity>

                {processingRegistrationIds.includes(registration.id) ? (
                  <ActivityIndicator style={styles.spinner} color={colors.blue} />
                ) : (
                  <View style={styles.actions}>
                    <TouchableOpacity
                      style={styles.rejectBtn}
                      onPress={() => handleRejectEventPayment(registration)}
                    >
                      <Text style={styles.rejectBtnText}>Reject</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.approveBtn}
                      onPress={() => handleApproveEventPayment(registration)}
                    >
                      <Text style={styles.approveBtnText}>Approve</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            ))
          )}
        </ScrollView>
      ) : activeTab === 'Merch Orders' ? (
        <ScrollView
          contentContainerStyle={[styles.list, { paddingBottom: spacing.xxxl + insets.bottom }]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.blue]} />}
          showsVerticalScrollIndicator={false}
        >
          {pendingMerchOrders.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>{loadError ? '⚠️' : '✅'}</Text>
              <Text style={styles.emptyTitle}>{loadError ? 'Failed to load' : 'All caught up!'}</Text>
              <Text style={styles.emptyText}>
                {loadError ? 'Pull down to retry.' : 'No merch orders awaiting review.'}
              </Text>
            </View>
          ) : (
            pendingMerchOrders.map(order => (
              <View key={order.id} style={styles.card}>
                <View style={styles.cardTop}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{order.userName?.[0]?.toUpperCase() || '?'}</Text>
                  </View>
                  <View style={styles.cardInfo}>
                    <Text style={styles.userName}>{order.userName}</Text>
                    <Text style={styles.userEmail}>{order.itemName}</Text>
                    <View style={[styles.rolePill, { borderColor: colors.blue }]}>
                      <Text style={[styles.rolePillText, { color: colors.blue }]}>
                        {order.size ? `Size ${order.size} · ` : ''}Qty {order.quantity}
                      </Text>
                    </View>
                  </View>
                </View>
                <View style={styles.meta}>
                  <View style={styles.metaRow}>
                    <Text style={styles.metaLabel}>Amount</Text>
                    <Text style={styles.metaValue}>{order.currency}{order.totalAmount}</Text>
                  </View>
                  <View style={styles.metaRow}>
                    <Text style={styles.metaLabel}>District</Text>
                    <Text style={styles.metaValue}>{order.district || 'N/A'}</Text>
                  </View>
                  <View style={styles.metaRow}>
                    <Text style={styles.metaLabel}>Submitted</Text>
                    <Text style={styles.metaValue}>{formatDate(order.paymentSubmittedAt?.toDate?.() || order.paymentSubmittedAt)}</Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.viewBtn}
                  onPress={() => {
                    if (order.mimeType?.includes('pdf')) {
                      Linking.openURL(order.fileUrl).catch(() => Alert.alert('Error', 'Could not open file.'));
                    } else {
                      setViewingOrderProof(order);
                    }
                  }}
                >
                  <Text style={styles.viewBtnText}>👁  View Proof of Payment</Text>
                </TouchableOpacity>

                {processingOrderIds.includes(order.id) ? (
                  <ActivityIndicator style={styles.spinner} color={colors.blue} />
                ) : (
                  <View style={styles.actions}>
                    <TouchableOpacity
                      style={styles.rejectBtn}
                      onPress={() => handleRejectMerchOrder(order)}
                    >
                      <Text style={styles.rejectBtnText}>Reject</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.approveBtn}
                      onPress={() => handleApproveMerchOrder(order)}
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
        <ScrollView contentContainerStyle={[styles.list, { paddingBottom: spacing.xxxl + insets.bottom }]} showsVerticalScrollIndicator={false}>
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Quick Actions</Text>
            {isAdminReviewer && (
              <TouchableOpacity style={styles.actionRow} onPress={() => setActiveTab('Pending')}>
                <Text style={styles.actionIcon}>⏳</Text>
                <View style={styles.actionText}>
                  <Text style={styles.actionLabel}>Pending Approvals</Text>
                  <Text style={styles.actionSub}>{pendingUsers.length} users awaiting approval</Text>
                </View>
                <Text style={styles.actionArrow}>›</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.actionRow} onPress={() => setActiveTab('Payments')}>
              <Text style={styles.actionIcon}>💳</Text>
              <View style={styles.actionText}>
                <Text style={styles.actionLabel}>Proof of Payments</Text>
                <Text style={styles.actionSub}>{pendingEventPayments.length} payments awaiting review</Text>
              </View>
              <Text style={styles.actionArrow}>›</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionRow} onPress={() => setActiveTab('Merch Orders')}>
              <Text style={styles.actionIcon}>🛍️</Text>
              <View style={styles.actionText}>
                <Text style={styles.actionLabel}>Merch Orders</Text>
                <Text style={styles.actionSub}>{pendingMerchOrders.length} orders awaiting review</Text>
              </View>
              <Text style={styles.actionArrow}>›</Text>
            </TouchableOpacity>
            {isAdminReviewer && (
              <TouchableOpacity style={styles.actionRow} onPress={() => navigation.navigate('AdminMerchItems')}>
                <Text style={styles.actionIcon}>🏷️</Text>
                <View style={styles.actionText}>
                  <Text style={styles.actionLabel}>Manage Merchandise</Text>
                  <Text style={styles.actionSub}>Add or edit store items</Text>
                </View>
                <Text style={styles.actionArrow}>›</Text>
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>
      )}

      {/* Event Registration Payment Proof Viewer Modal */}
      <Modal
        visible={!!viewingRegistrationProof}
        transparent
        animationType="fade"
        onRequestClose={() => setViewingRegistrationProof(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{viewingRegistrationProof?.userName} — Proof of Payment</Text>
              <TouchableOpacity onPress={() => setViewingRegistrationProof(null)} style={styles.modalClose}>
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>
            {viewingRegistrationProof?.fileUrl && (
              <Image
                source={{ uri: viewingRegistrationProof.fileUrl }}
                style={styles.modalImage}
                resizeMode="contain"
              />
            )}
          </View>
        </View>
      </Modal>

      {/* Merch Order Proof Viewer Modal */}
      <Modal
        visible={!!viewingOrderProof}
        transparent
        animationType="fade"
        onRequestClose={() => setViewingOrderProof(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{viewingOrderProof?.userName} — Proof of Payment</Text>
              <TouchableOpacity onPress={() => setViewingOrderProof(null)} style={styles.modalClose}>
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>
            {viewingOrderProof?.fileUrl && (
              <Image
                source={{ uri: viewingOrderProof.fileUrl }}
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
