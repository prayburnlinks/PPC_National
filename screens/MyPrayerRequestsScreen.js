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
import { getUserPrayerRequests } from '../services/firestoreService';

const MyPrayerRequestsScreen = ({ navigation }) => {
  const { user } = useUser();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState([]);

  const load = useCallback(async () => {
    if (!user?.uid) return;
    setLoading(true);
    const list = await getUserPrayerRequests(user.uid);
    setRequests(list);
    setLoading(false);
  }, [user?.uid]);

  useEffect(() => { load(); }, [load]);

  const formatDate = (date) =>
    new Date(date).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Image source={require('../assets/emblem.jpg')} style={styles.emblem} resizeMode="contain" />
        <Text style={styles.headerTitle}>My Prayer Requests</Text>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.blue} />
        </View>
      ) : requests.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>🙏</Text>
          <Text style={styles.emptyTitle}>No Requests Yet</Text>
          <Text style={styles.emptyText}>Prayer requests you submit will appear here.</Text>
          <TouchableOpacity style={styles.browseButton} onPress={() => navigation.navigate('PrayerWall')}>
            <Text style={styles.browseButtonText}>Go to Prayer Wall</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
          {requests.map(item => (
            <View key={item.id} style={styles.requestCard}>
              <View style={styles.requestHeader}>
                <Text style={styles.requestTitle}>{item.title || 'Prayer Request'}</Text>
                <View style={[styles.scopeTag, item.scope === 'district' && styles.scopeTagDistrict]}>
                  <Text style={styles.scopeTagText}>{item.scope === 'district' ? item.district || 'District' : 'National'}</Text>
                </View>
              </View>
              <Text style={styles.requestBody}>{item.body}</Text>
              <View style={styles.requestFooter}>
                <Text style={styles.requestMeta}>📅 {formatDate(item.createdAt)}</Text>
                <Text style={styles.requestCount}>🙏 {item.prayCount || 0} praying</Text>
              </View>
            </View>
          ))}
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
  headerTitle: { color: colors.white, fontSize: typography.sizes.lg, fontWeight: '700', flexShrink: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xxxl },
  emptyIcon: { fontSize: 48, marginBottom: spacing.lg },
  emptyTitle: { fontSize: typography.sizes.lg, fontWeight: '700', color: colors.textPrimary, marginBottom: spacing.sm },
  emptyText: { fontSize: typography.sizes.base, color: colors.textSecondary, textAlign: 'center', marginBottom: spacing.lg },
  browseButton: { backgroundColor: colors.blue, borderRadius: borderRadius.md, paddingVertical: spacing.md, paddingHorizontal: spacing.xl },
  browseButtonText: { color: colors.white, fontSize: typography.sizes.sm, fontWeight: '700' },
  list: { padding: spacing.lg },
  requestCard: {
    backgroundColor: colors.white, marginBottom: spacing.md, borderRadius: borderRadius.md,
    padding: spacing.md, borderWidth: 1, borderColor: colors.border,
  },
  requestHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xs, gap: spacing.sm },
  requestTitle: { fontWeight: '700', color: colors.textPrimary, flex: 1, fontSize: typography.sizes.sm },
  scopeTag: { backgroundColor: colors.surfaceLight, borderRadius: borderRadius.full, paddingHorizontal: spacing.sm, paddingVertical: 2 },
  scopeTagDistrict: { backgroundColor: 'rgba(212, 160, 23, 0.18)' },
  scopeTagText: { fontSize: typography.sizes.xs, fontWeight: '700', color: colors.textSecondary },
  requestBody: { color: colors.textPrimary, marginBottom: spacing.sm, fontSize: typography.sizes.sm },
  requestFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  requestMeta: { color: colors.textSecondary, fontSize: typography.sizes.xs },
  requestCount: { color: colors.textSecondary, fontSize: typography.sizes.xs, fontWeight: '600' },
});

export default MyPrayerRequestsScreen;
