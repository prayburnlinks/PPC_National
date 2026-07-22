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
import { getUserGivingHistory } from '../services/firestoreService';
import { GIVING_FUNDS } from '../constants/config';

const STATUS_STYLES = {
  pending: { bg: '#FFFBEB', color: colors.gold, label: 'Pending' },
  approved: { bg: '#F0FBF6', color: colors.green, label: 'Approved' },
  rejected: { bg: '#FFF0EE', color: colors.red, label: 'Rejected' },
};

const GivingHistoryScreen = ({ navigation }) => {
  const { user } = useUser();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState([]);

  const load = useCallback(async () => {
    if (!user?.uid) return;
    setLoading(true);
    const list = await getUserGivingHistory(user.uid);
    setHistory(list);
    setLoading(false);
  }, [user?.uid]);

  useEffect(() => { load(); }, [load]);

  const total = history.reduce((sum, tx) => sum + (tx.amount || 0), 0);

  const fundName = (fundId) => {
    if (fundId === 'event_registration') return 'Event Registration';
    return GIVING_FUNDS.find(f => f.id === fundId)?.name || fundId || 'Giving';
  };

  const fundIcon = (fundId) => GIVING_FUNDS.find(f => f.id === fundId)?.icon || '💝';

  const formatDate = (date) =>
    new Date(date).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Image source={require('../assets/emblem.jpg')} style={styles.emblem} resizeMode="contain" />
        <Text style={styles.headerTitle}>Giving History</Text>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.blue} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
          <View style={styles.totalCard}>
            <Text style={styles.totalLabel}>Total Given</Text>
            <Text style={styles.totalAmount}>R{total.toLocaleString('en-ZA')}</Text>
            <Text style={styles.totalSub}>{history.length} transaction{history.length === 1 ? '' : 's'}</Text>
          </View>

          {history.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>💝</Text>
              <Text style={styles.emptyTitle}>No Giving Yet</Text>
              <Text style={styles.emptyText}>Your giving history will appear here once you make your first gift.</Text>
            </View>
          ) : (
            history.map((tx) => {
              const status = STATUS_STYLES[tx.status] || STATUS_STYLES.pending;
              return (
                <View key={tx.id} style={styles.txCard}>
                  <View style={styles.txIconBox}>
                    <Text style={styles.txIcon}>{fundIcon(tx.fund)}</Text>
                  </View>
                  <View style={styles.txInfo}>
                    <Text style={styles.txFund}>{fundName(tx.fund)}</Text>
                    <Text style={styles.txDate}>{formatDate(tx.createdAt)}</Text>
                  </View>
                  <View style={styles.txRight}>
                    <Text style={styles.txAmount}>R{tx.amount}</Text>
                    <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
                      <Text style={[styles.statusBadgeText, { color: status.color }]}>{status.label}</Text>
                    </View>
                  </View>
                </View>
              );
            })
          )}
          <View style={{ height: spacing.xxxl }} />
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
  totalCard: {
    backgroundColor: colors.darkBlue,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  totalLabel: { color: 'rgba(255,255,255,0.6)', fontSize: typography.sizes.sm, marginBottom: spacing.xs },
  totalAmount: { color: colors.white, fontSize: typography.sizes.h1, fontWeight: '800' },
  totalSub: { color: 'rgba(255,255,255,0.5)', fontSize: typography.sizes.xs, marginTop: spacing.xs },
  emptyContainer: { alignItems: 'center', paddingVertical: spacing.huge },
  emptyIcon: { fontSize: 40, marginBottom: spacing.md },
  emptyTitle: { fontSize: typography.sizes.lg, fontWeight: '700', color: colors.textPrimary, marginBottom: spacing.sm },
  emptyText: { fontSize: typography.sizes.sm, color: colors.textSecondary, textAlign: 'center', paddingHorizontal: spacing.xl },
  txCard: {
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
  txIconBox: {
    width: 44, height: 44, borderRadius: borderRadius.md,
    backgroundColor: colors.surfaceLight, alignItems: 'center', justifyContent: 'center',
  },
  txIcon: { fontSize: typography.sizes.lg },
  txInfo: { flex: 1 },
  txFund: { fontSize: typography.sizes.sm, fontWeight: '700', color: colors.textPrimary, marginBottom: 2 },
  txDate: { fontSize: typography.sizes.xs, color: colors.textSecondary },
  txRight: { alignItems: 'flex-end' },
  txAmount: { fontSize: typography.sizes.sm, fontWeight: '700', color: colors.textPrimary, marginBottom: spacing.xs },
  statusBadge: { borderRadius: borderRadius.full, paddingHorizontal: spacing.sm, paddingVertical: 2 },
  statusBadgeText: { fontSize: typography.sizes.xs, fontWeight: '700' },
});

export default GivingHistoryScreen;
