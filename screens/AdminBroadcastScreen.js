import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Text,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, borderRadius, typography } from '../constants/theme';
import { DISTRICTS, CONGREGATIONS } from '../constants/config';
import {
  TITLE_MAX,
  BODY_MAX,
  sendBroadcast,
  getAudienceCount,
  getRecentBroadcasts,
} from '../services/broadcastService';

const AUDIENCE_TYPES = [
  { type: 'all', label: 'Everyone' },
  { type: 'district', label: 'A District' },
  { type: 'congregation', label: 'A Congregation' },
];

// Who a { type, value } audience is, in a sentence: "everyone in Boland".
const audienceScope = ({ type, value }) => {
  if (type === 'district') return `everyone in the ${value} district`;
  if (type === 'congregation') return `everyone in ${value}`;
  return 'everyone';
};

// The same audience as a short label for the history list.
const audienceLabel = ({ type, value }) => {
  if (type === 'district') return `${value} district`;
  if (type === 'congregation') return value;
  return 'Everyone';
};

const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

// What the admin is told once the function has finished.
const describeResult = ({ recipients, devices, failed, pushFailed }) => {
  const sent = `Sent to ${plural(recipients, 'member')}.`;
  if (pushFailed) {
    return `${sent} Push notifications couldn't be delivered right now, but the announcement is in their notifications.`;
  }
  if (devices === 0) {
    return `${sent} None of them have push notifications switched on yet, but the announcement is in their notifications.`;
  }
  const reached = `${sent} Pushed to ${plural(devices, 'device')}.`;
  return failed > 0 ? `${reached} ${plural(failed, 'device')} couldn't be reached.` : reached;
};

const formatDate = (date) =>
  date
    ? date.toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
    : '';

const AdminBroadcastScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [audienceType, setAudienceType] = useState('all');
  const [district, setDistrict] = useState('');
  const [congregation, setCongregation] = useState('');
  // undefined while counting, null when the count couldn't be worked out.
  const [count, setCount] = useState(undefined);
  const [sending, setSending] = useState(false);
  const [recent, setRecent] = useState([]);
  const [loadingRecent, setLoadingRecent] = useState(true);

  // null until the admin has picked everything the audience needs.
  const audience = useMemo(() => {
    if (audienceType === 'all') return { type: 'all' };
    if (audienceType === 'district') return district ? { type: 'district', value: district } : null;
    return congregation ? { type: 'congregation', value: congregation } : null;
  }, [audienceType, district, congregation]);

  const loadRecent = useCallback(async () => {
    setRecent(await getRecentBroadcasts(10));
    setLoadingRecent(false);
  }, []);

  useEffect(() => { loadRecent(); }, [loadRecent]);

  // Show how many members the chosen audience reaches before anything is sent.
  useEffect(() => {
    setCount(undefined);
    if (!audience) return undefined;

    let active = true;
    getAudienceCount(audience).then((n) => { if (active) setCount(n); });
    return () => { active = false; };
  }, [audience]);

  const chooseAudienceType = (type) => {
    setAudienceType(type);
    if (type !== 'congregation') setCongregation('');
  };

  const chooseDistrict = (name) => {
    setDistrict(name);
    setCongregation('');
  };

  const canSend = !!title.trim() && !!body.trim() && !!audience && count !== 0 && !sending;

  const send = async () => {
    setSending(true);
    try {
      const result = await sendBroadcast({ title: title.trim(), body: body.trim(), audience });
      setTitle('');
      setBody('');
      Alert.alert('Announcement Sent', describeResult(result));
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to send the announcement.');
    } finally {
      setSending(false);
      // Even after a failure the function may have got as far as recording it.
      loadRecent();
    }
  };

  const handleSendPress = () => {
    const members = typeof count === 'number' ? ` (${plural(count, 'member')})` : '';
    Alert.alert(
      'Send Announcement?',
      `"${title.trim()}" will be sent as a push notification to ${audienceScope(audience)}${members}. It can't be recalled once sent.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Send', onPress: send },
      ]
    );
  };

  const reachText = () => {
    if (!audience) return audienceType === 'district' ? 'Choose a district.' : 'Choose a district, then a congregation.';
    if (count === undefined) return 'Counting members…';
    if (count === null) return '';
    if (count === 0) return 'No approved members match this audience.';
    return `Reaches ${plural(count, 'member')}.`;
  };

  const congregationsInDistrict = CONGREGATIONS.filter((c) => c.district === district);

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Announcements</Text>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: spacing.xxxl + insets.bottom }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
      >
        <Text style={styles.label}>Title</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. National Convention registration is open"
          placeholderTextColor={colors.placeholder}
          value={title}
          onChangeText={setTitle}
          maxLength={TITLE_MAX}
        />
        <Text style={styles.counter}>{title.length}/{TITLE_MAX}</Text>

        <Text style={styles.label}>Message</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="What do members need to know?"
          placeholderTextColor={colors.placeholder}
          value={body}
          onChangeText={setBody}
          maxLength={BODY_MAX}
          multiline
        />
        <Text style={styles.counter}>{body.length}/{BODY_MAX}</Text>

        <Text style={styles.label}>Send To</Text>
        <View style={styles.chipRow}>
          {AUDIENCE_TYPES.map(({ type, label }) => (
            <TouchableOpacity
              key={type}
              style={[styles.chip, audienceType === type && styles.chipSelected]}
              onPress={() => chooseAudienceType(type)}
            >
              <Text style={[styles.chipText, audienceType === type && styles.chipTextSelected]}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {audienceType !== 'all' && (
          <>
            <Text style={styles.label}>District</Text>
            <View style={styles.chipRow}>
              {DISTRICTS.map(({ name }) => (
                <TouchableOpacity
                  key={name}
                  style={[styles.chip, district === name && styles.chipSelected]}
                  onPress={() => chooseDistrict(name)}
                >
                  <Text style={[styles.chipText, district === name && styles.chipTextSelected]}>{name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        {audienceType === 'congregation' && !!district && (
          <>
            <Text style={styles.label}>Congregation</Text>
            <View style={styles.chipRow}>
              {congregationsInDistrict.map(({ name }) => (
                <TouchableOpacity
                  key={name}
                  style={[styles.chip, congregation === name && styles.chipSelected]}
                  onPress={() => setCongregation(name)}
                >
                  <Text style={[styles.chipText, congregation === name && styles.chipTextSelected]}>{name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        <Text style={styles.reach}>{reachText()}</Text>

        <TouchableOpacity
          style={[styles.sendButton, !canSend && styles.buttonDisabled]}
          onPress={handleSendPress}
          disabled={!canSend}
        >
          {sending ? <ActivityIndicator color={colors.white} /> : <Text style={styles.sendButtonText}>Send Announcement</Text>}
        </TouchableOpacity>

        <Text style={styles.sectionTitle}>Recent Announcements</Text>
        {loadingRecent ? (
          <ActivityIndicator style={styles.recentSpinner} color={colors.blue} />
        ) : recent.length === 0 ? (
          <Text style={styles.emptyText}>Nothing sent yet.</Text>
        ) : (
          recent.map((item) => (
            <View key={item.id} style={styles.recentCard}>
              <Text style={styles.recentTitle}>{item.title}</Text>
              <Text style={styles.recentMeta}>
                {audienceLabel(item.audience || { type: 'all' })} · {formatDate(item.sentAt)}
              </Text>
              {item.status === 'sending' && <Text style={styles.recentMeta}>Sending…</Text>}
              {item.status === 'failed' && <Text style={styles.recentFailed}>Failed — may not have reached everyone</Text>}
              {item.status === 'sent' && (
                <Text style={styles.recentMeta}>
                  {plural(item.recipients ?? 0, 'member')} · {plural(item.devices ?? 0, 'device')} pushed
                </Text>
              )}
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
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
  content: { padding: spacing.lg },
  label: { fontSize: typography.sizes.xs, fontWeight: '700', color: colors.textSecondary, letterSpacing: 0.5, marginBottom: spacing.sm },
  input: {
    borderWidth: 1, borderColor: colors.border, borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md, paddingVertical: spacing.md,
    fontSize: typography.sizes.sm, color: colors.textPrimary,
    backgroundColor: colors.white,
  },
  textArea: { minHeight: 100, textAlignVertical: 'top' },
  counter: { fontSize: typography.sizes.xs, color: colors.textTertiary, textAlign: 'right', marginTop: spacing.xs, marginBottom: spacing.lg },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.lg },
  chip: {
    borderWidth: 1, borderColor: colors.border, borderRadius: borderRadius.full,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    backgroundColor: colors.white,
  },
  chipSelected: { backgroundColor: colors.blue, borderColor: colors.blue },
  chipText: { fontSize: typography.sizes.sm, fontWeight: '600', color: colors.textPrimary },
  chipTextSelected: { color: colors.white },
  reach: { fontSize: typography.sizes.sm, color: colors.textSecondary, marginBottom: spacing.lg },
  sendButton: {
    backgroundColor: colors.blue, borderRadius: borderRadius.md,
    paddingVertical: spacing.md, alignItems: 'center', marginBottom: spacing.xxxl,
  },
  buttonDisabled: { opacity: 0.5 },
  sendButtonText: { color: colors.white, fontSize: typography.sizes.md, fontWeight: '700' },
  sectionTitle: { fontSize: typography.sizes.base, fontWeight: '700', color: colors.textPrimary, marginBottom: spacing.md },
  recentSpinner: { marginTop: spacing.lg },
  emptyText: { fontSize: typography.sizes.sm, color: colors.textSecondary },
  recentCard: {
    backgroundColor: colors.white, borderRadius: borderRadius.lg,
    padding: spacing.md, marginBottom: spacing.md,
    borderWidth: 1, borderColor: colors.border,
  },
  recentTitle: { fontSize: typography.sizes.sm, fontWeight: '700', color: colors.textPrimary, marginBottom: 2 },
  recentMeta: { fontSize: typography.sizes.xs, color: colors.textSecondary },
  recentFailed: { fontSize: typography.sizes.xs, fontWeight: '700', color: colors.red },
});

export default AdminBroadcastScreen;
