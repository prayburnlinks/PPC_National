import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  Alert,
  Keyboard,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, borderRadius, typography } from '../constants/theme';
import Icon, { IconBadge, IconText } from '../components/Icon';
import { useUser } from '../context/UserContext';
import {
  getPrayerRequests,
  submitPrayerRequest,
  prayForRequest,
  reportPrayerRequest,
  blockMember,
} from '../services/firestoreService';

const PrayerWallScreen = () => {
  const insets = useSafeAreaInsets();
  const { user } = useUser();

  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState([]);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [scope, setScope] = useState('national');
  const [submitting, setSubmitting] = useState(false);
  const [prayingIds, setPrayingIds] = useState([]);
  // Refs mirror the state above but update synchronously — state updates are
  // batched by React, so two taps in the same tick could both read the same
  // stale (pre-update) state before a re-render happens. Refs close that gap.
  const submittingRef = useRef(false);
  const prayingRef = useRef(new Set());

  useEffect(() => {
    loadRequests();
  }, [scope]);

  const loadRequests = async () => {
    setLoading(true);
    // The viewer decides what this member is not shown — anything they
    // reported, and anything by someone they blocked.
    const list = await getPrayerRequests(scope, user?.district, {
      uid: user?.uid,
      blockedUsers: user?.blockedUsers,
    });
    setRequests(list);
    setLoading(false);
  };

  const handleSubmit = async () => {
    if (!user) return Alert.alert('Please sign in to submit a request');
    if (!body.trim()) return Alert.alert('Please enter a prayer request');
    if (title.trim().length > 100) return Alert.alert('Title too long', 'Title must be 100 characters or less');
    if (body.trim().length > 500) return Alert.alert('Request too long', 'Prayer request must be 500 characters or less');
    if (submittingRef.current) return;
    submittingRef.current = true;
    setSubmitting(true);
    try {
      Keyboard.dismiss();
      await submitPrayerRequest(user.uid, { title: title.trim() || 'Prayer Request', body: body.trim(), scope });
      setTitle('');
      setBody('');
      await loadRequests();
    } catch (e) {
      // The filter's rejection tells the member to rephrase, which is the
      // whole point of it — show that rather than a generic failure.
      Alert.alert('Could Not Post', e?.message || 'Failed to submit prayer request');
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  const handlePray = async (id) => {
    if (!user) return Alert.alert('Sign in to pray for requests');
    if (prayingRef.current.has(id)) return;
    prayingRef.current.add(id);
    setPrayingIds(prev => [...prev, id]);
    try {
      const { action } = await prayForRequest(id, user.uid);
      setRequests(prev => prev.map(r => {
        if (r.id !== id) return r;
        const delta = action === 'added' ? 1 : -1;
        return { ...r, prayCount: (r.prayCount || 0) + delta };
      }));
    } catch (e) {
      Alert.alert('Error', 'Failed to update prayer count');
    } finally {
      prayingRef.current.delete(id);
      setPrayingIds(prev => prev.filter(pid => pid !== id));
    }
  };

  // Drop the request from this member's wall straight away. The server has
  // already recorded it; re-fetching would only make them watch it vanish.
  const removeLocally = (id) => setRequests(prev => prev.filter(r => r.id !== id));

  const handleReport = (item) => {
    if (!user) return Alert.alert('Sign in to report a request');
    Alert.alert(
      'Report this request?',
      'It will be hidden from your prayer wall and sent to the church administrators to review.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Report',
          style: 'destructive',
          onPress: async () => {
            try {
              await reportPrayerRequest(item.id);
              removeLocally(item.id);
              Alert.alert('Reported', 'Thank you. The administrators will review this request.');
            } catch (e) {
              Alert.alert('Error', e?.message || 'Failed to report this request');
            }
          },
        },
      ]
    );
  };

  const handleBlock = (item) => {
    if (!user) return Alert.alert('Sign in to block a member');
    if (item.createdBy === user.uid) return;
    Alert.alert(
      'Block this member?',
      'You will no longer see anything they post on the prayer wall. They are not told, and their requests stay visible to everyone else.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Block',
          style: 'destructive',
          onPress: async () => {
            try {
              await blockMember(user.uid, item.createdBy);
              // Take everything of theirs off the wall, not just this one.
              setRequests(prev => prev.filter(r => r.createdBy !== item.createdBy));
              Alert.alert('Blocked', 'You will no longer see requests from this member.');
            } catch (e) {
              Alert.alert('Error', e?.message || 'Failed to block this member');
            }
          },
        },
      ]
    );
  };

  const renderItem = ({ item }) => {
    const isPraying = prayingIds.includes(item.id);
    const isOwn = item.createdBy && user?.uid === item.createdBy;
    return (
      <View style={styles.requestCard}>
        <View style={styles.requestHeader}>
          <Text style={styles.requestTitle}>{item.title || 'Prayer'}</Text>
          <Text style={styles.requestCount}>{item.prayCount || 0} praying</Text>
        </View>
        <Text style={styles.requestBody}>{item.body}</Text>
        <View style={styles.requestFooter}>
          <IconText name="calendar-outline" size={13} color={colors.textTertiary} textStyle={styles.requestMeta}>{new Date(item.createdAt).toLocaleDateString()}</IconText>
          <TouchableOpacity
            style={[styles.prayButton, isPraying && styles.prayButtonDisabled]}
            onPress={() => handlePray(item.id)}
            disabled={isPraying}
          >
            <IconText name="flame" size={15} color={colors.darkBlue} textStyle={styles.prayText}>Praying</IconText>
          </TouchableOpacity>
        </View>
        {/* App Store Guideline 1.2 — members need a way to report content and
            block its author. Hidden on your own requests, where neither
            applies. */}
        {!isOwn && (
          <View style={styles.moderationRow}>
            <TouchableOpacity onPress={() => handleReport(item)} accessibilityRole="button" hitSlop={{ top: 10, bottom: 10, left: 8, right: 8 }}>
              <IconText name="flag-outline" size={13} color={colors.textTertiary} textStyle={styles.moderationText}>Report</IconText>
            </TouchableOpacity>
            <Text style={styles.moderationDivider}>·</Text>
            <TouchableOpacity onPress={() => handleBlock(item)} accessibilityRole="button" hitSlop={{ top: 10, bottom: 10, left: 8, right: 8 }}>
              <IconText name="ban-outline" size={13} color={colors.textTertiary} textStyle={styles.moderationText}>Block member</IconText>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Prayer Wall</Text>
        <Text style={styles.sub}>Share requests and stand in prayer for one another</Text>
      </View>

      <View style={styles.form}>
        <TextInput
          placeholder="Title (optional)"
          value={title}
          onChangeText={setTitle}
          style={styles.input}
        />
        <TextInput
          placeholder="Write your prayer request..."
          value={body}
          onChangeText={setBody}
          style={[styles.input, styles.textArea]}
          multiline
        />

        <View style={styles.scopeRow}>
          <TouchableOpacity
            style={[styles.scopeButton, scope === 'national' && styles.scopeActive]}
            onPress={() => setScope('national')}
          >
            <Text style={scope === 'national' ? styles.scopeTextActive : styles.scopeText}>National</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.scopeButton, scope === 'district' && styles.scopeActive]}
            onPress={() => setScope('district')}
            disabled={!user?.district}
          >
            <Text style={scope === 'district' ? styles.scopeTextActive : styles.scopeText}>District</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator size="small" color={colors.white} />
          ) : (
            <Text style={styles.submitText}>Submit Request</Text>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.listContainer}>
        {loading ? (
          <ActivityIndicator size="large" color={colors.purple} />
        ) : (
          <FlatList
            data={requests}
            keyExtractor={item => item.id}
            renderItem={renderItem}
            contentContainerStyle={{ padding: spacing.lg }}
            ListEmptyComponent={<Text style={styles.empty}>No prayer requests yet — be the first to share.</Text>}
          />
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md, backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.border },
  title: { fontSize: typography.sizes.xl, fontWeight: '800', color: colors.textPrimary },
  sub: { fontSize: typography.sizes.xs, color: colors.textSecondary, marginTop: spacing.xs },
  form: { padding: spacing.lg, backgroundColor: 'transparent' },
  input: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderRadius: borderRadius.md, padding: spacing.md, marginBottom: spacing.sm },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  scopeRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm },
  scopeButton: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: borderRadius.full, borderWidth: 1, borderColor: colors.border, backgroundColor: 'transparent' },
  scopeActive: { backgroundColor: colors.purple, borderColor: colors.purple },
  scopeText: { color: colors.textSecondary },
  scopeTextActive: { color: colors.white },
  submitButton: { backgroundColor: colors.purple, padding: spacing.md, borderRadius: borderRadius.md, alignItems: 'center', marginTop: spacing.sm },
  submitButtonDisabled: { opacity: 0.6 },
  submitText: { color: colors.white, fontWeight: '700' },
  listContainer: { flex: 1 },
  requestCard: { backgroundColor: colors.white, marginBottom: spacing.md, borderRadius: borderRadius.md, padding: spacing.md, borderWidth: 1, borderColor: colors.border },
  requestHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xs },
  requestTitle: { fontWeight: '700', color: colors.textPrimary },
  requestCount: { color: colors.textSecondary, fontSize: typography.sizes.xs },
  requestBody: { color: colors.textPrimary, marginBottom: spacing.sm },
  requestFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  requestMeta: { color: colors.textSecondary, fontSize: typography.sizes.xs },
  prayButton: { backgroundColor: colors.gold, paddingVertical: 6, paddingHorizontal: 10, borderRadius: borderRadius.sm },
  prayButtonDisabled: { opacity: 0.5 },
  prayText: { color: colors.darkBlue, fontWeight: '700' },
  empty: { padding: spacing.lg, color: colors.textSecondary },
  // Deliberately quiet: these are safety controls, not calls to action, and
  // should not compete with Praying on a wall of people's burdens.
  moderationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  moderationText: { color: colors.textTertiary, fontSize: typography.sizes.xs, fontWeight: '600' },
  moderationDivider: { color: colors.textTertiary, fontSize: typography.sizes.xs, marginHorizontal: spacing.sm },
});

export default PrayerWallScreen;
