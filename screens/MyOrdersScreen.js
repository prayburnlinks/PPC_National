import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Text,
  ActivityIndicator,
  Image,
} from 'react-native';
import { colors, spacing, borderRadius, typography } from '../constants/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useUser } from '../context/UserContext';
import { getUserMerchOrders } from '../services/merchService';

const STATUS_STYLES = {
  awaiting_payment: { bg: '#FFFBEB', color: colors.gold, label: 'Awaiting Payment' },
  payment_submitted: { bg: '#FFFBEB', color: colors.gold, label: 'Under Review' },
  approved: { bg: '#F0FBF6', color: colors.green, label: 'Approved' },
  rejected: { bg: '#FFF0EE', color: colors.red, label: 'Rejected' },
};

const MyOrdersScreen = ({ navigation }) => {
  const { user } = useUser();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState([]);

  const load = useCallback(async () => {
    if (!user?.uid) return;
    setLoading(true);
    setOrders(await getUserMerchOrders(user.uid));
    setLoading(false);
  }, [user?.uid]);

  useEffect(() => { load(); }, [load]);

  const formatDate = (date) =>
    new Date(date?.toDate ? date.toDate() : date).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Image source={require('../assets/emblem.jpg')} style={styles.emblem} resizeMode="contain" />
        <Text style={styles.headerTitle}>My Orders</Text>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.blue} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
          {orders.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>🛍️</Text>
              <Text style={styles.emptyTitle}>No Orders Yet</Text>
              <Text style={styles.emptyText}>Items you order from the Store will appear here.</Text>
            </View>
          ) : (
            orders.map((order) => {
              const status = STATUS_STYLES[order.status] || STATUS_STYLES.awaiting_payment;
              return (
                <View key={order.id} style={styles.orderCard}>
                  <Image source={{ uri: order.itemImageUrl }} style={styles.orderImage} />
                  <View style={styles.orderInfo}>
                    <Text style={styles.orderName}>{order.itemName}</Text>
                    <Text style={styles.orderMeta}>{order.size ? `Size ${order.size} · ` : ''}Qty {order.quantity}</Text>
                    <Text style={styles.orderDate}>{formatDate(order.createdAt)}</Text>
                  </View>
                  <View style={styles.orderRight}>
                    <Text style={styles.orderAmount}>R{order.totalAmount}</Text>
                    <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
                      <Text style={[styles.statusBadgeText, { color: status.color }]}>{status.label}</Text>
                    </View>
                  </View>
                </View>
              );
            })
          )}
          <View style={{ height: spacing.xxxl + insets.bottom }} />
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  emblem: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.white, marginRight: spacing.sm },
  header: {
    backgroundColor: colors.darkBlue,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  backButton: {
    width: 34, height: 34, borderRadius: borderRadius.full,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center', justifyContent: 'center', marginRight: spacing.md,
  },
  backButtonText: { color: colors.white, fontSize: typography.sizes.lg },
  headerTitle: { color: colors.white, fontSize: typography.sizes.lg, fontWeight: '700' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: spacing.lg },
  emptyContainer: { alignItems: 'center', paddingVertical: spacing.huge },
  emptyIcon: { fontSize: 40, marginBottom: spacing.md },
  emptyTitle: { fontSize: typography.sizes.lg, fontWeight: '700', color: colors.textPrimary, marginBottom: spacing.sm },
  emptyText: { fontSize: typography.sizes.sm, color: colors.textSecondary, textAlign: 'center', paddingHorizontal: spacing.xl },
  orderCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  orderImage: {
    width: 56, height: 56, borderRadius: borderRadius.md,
    backgroundColor: colors.surfaceLight,
  },
  orderInfo: { flex: 1 },
  orderName: { fontSize: typography.sizes.sm, fontWeight: '700', color: colors.textPrimary, marginBottom: 2 },
  orderMeta: { fontSize: typography.sizes.xs, color: colors.textSecondary, marginBottom: 2 },
  orderDate: { fontSize: typography.sizes.xs, color: colors.textSecondary },
  orderRight: { alignItems: 'flex-end' },
  orderAmount: { fontSize: typography.sizes.sm, fontWeight: '700', color: colors.textPrimary, marginBottom: spacing.xs },
  statusBadge: { borderRadius: borderRadius.full, paddingHorizontal: spacing.sm, paddingVertical: 2 },
  statusBadgeText: { fontSize: typography.sizes.xs, fontWeight: '700' },
});

export default MyOrdersScreen;
