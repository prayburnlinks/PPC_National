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
import { getUserNotifications, markNotificationAsRead } from '../services/firestoreService';

const TYPE_ICONS = {
  approval_status: '👤',
  pop_status: '💳',
  event_reminder: '📅',
  giving_receipt: '💝',
};

const NotificationsScreen = ({ navigation }) => {
  const { user } = useUser();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState([]);

  const load = useCallback(async () => {
    if (!user?.uid) return;
    setLoading(true);
    const list = await getUserNotifications(user.uid, 50);
    setNotifications(list);
    setLoading(false);
  }, [user?.uid]);

  useEffect(() => { load(); }, [load]);

  const handlePress = async (item) => {
    if (item.read) return;
    setNotifications(prev => prev.map(n => n.id === item.id ? { ...n, read: true } : n));
    await markNotificationAsRead(user.uid, item.id);
  };

  const formatDate = (date) =>
    new Date(date).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Image source={require('../assets/emblem.jpg')} style={styles.emblem} resizeMode="contain" />
        <Text style={styles.headerTitle}>Notifications</Text>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.blue} />
        </View>
      ) : notifications.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>🔔</Text>
          <Text style={styles.emptyTitle}>No Notifications</Text>
          <Text style={styles.emptyText}>Updates about your account and giving will appear here.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
          {notifications.map(item => (
            <TouchableOpacity
              key={item.id}
              style={[styles.notifCard, !item.read && styles.notifCardUnread]}
              onPress={() => handlePress(item)}
              activeOpacity={0.8}
            >
              <View style={styles.notifIconBox}>
                <Text style={styles.notifIcon}>{TYPE_ICONS[item.type] || '🔔'}</Text>
              </View>
              <View style={styles.notifInfo}>
                <Text style={styles.notifTitle}>{item.title}</Text>
                <Text style={styles.notifBody}>{item.body}</Text>
                <Text style={styles.notifDate}>{formatDate(item.createdAt)}</Text>
              </View>
              {!item.read && <View style={styles.unreadDot} />}
            </TouchableOpacity>
          ))}
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
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xxxl },
  emptyIcon: { fontSize: 48, marginBottom: spacing.lg },
  emptyTitle: { fontSize: typography.sizes.lg, fontWeight: '700', color: colors.textPrimary, marginBottom: spacing.sm },
  emptyText: { fontSize: typography.sizes.base, color: colors.textSecondary, textAlign: 'center' },
  list: { padding: spacing.lg },
  notifCard: {
    backgroundColor: colors.white, borderRadius: borderRadius.lg,
    padding: spacing.md, marginBottom: spacing.md,
    flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md,
    borderWidth: 1, borderColor: colors.border,
  },
  notifCardUnread: { borderColor: colors.blue, backgroundColor: colors.surfaceLight },
  notifIconBox: {
    width: 40, height: 40, borderRadius: borderRadius.md,
    backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center',
  },
  notifIcon: { fontSize: typography.sizes.lg },
  notifInfo: { flex: 1 },
  notifTitle: { fontSize: typography.sizes.sm, fontWeight: '700', color: colors.textPrimary, marginBottom: 2 },
  notifBody: { fontSize: typography.sizes.xs, color: colors.textSecondary, marginBottom: spacing.xs, lineHeight: 18 },
  notifDate: { fontSize: typography.sizes.xs, color: colors.textTertiary },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.blue, marginTop: 4 },
});

export default NotificationsScreen;
