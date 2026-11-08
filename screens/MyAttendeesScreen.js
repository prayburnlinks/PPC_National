import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Text,
  ActivityIndicator,
  Alert,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import * as DocumentPicker from 'expo-document-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, borderRadius, typography } from '../constants/theme';
import { BANK_DETAILS } from '../constants/config';
import { useUser } from '../context/UserContext';
import {
  getAttendeesRegisteredBy,
  submitEventRegistrationPayment,
  cancelAttendee,
} from '../services/eventRegistrationService';

const STATUS_STYLES = {
  awaiting_payment: { bg: '#FFFBEB', color: colors.gold, label: 'Awaiting Payment' },
  payment_submitted: { bg: '#FFFBEB', color: colors.gold, label: 'Under Review' },
  approved: { bg: '#F0FBF6', color: colors.green, label: 'Registered & Paid' },
  confirmed: { bg: '#F0FBF6', color: colors.green, label: 'Registered' },
  rejected: { bg: '#FFF0EE', color: colors.red, label: 'Payment Rejected' },
};

// Only registrations nobody has paid for, or sent proof of payment for, can be
// cancelled here. Keep in step with CANCELLABLE_STATUSES in functions/registrations.js.
const CANCELLABLE = ['awaiting_payment', 'rejected', 'confirmed'];

const toDate = (raw) => (raw?.toDate ? raw.toDate() : new Date(raw));

const formatDate = (raw) =>
  toDate(raw).toLocaleDateString('en-ZA', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' });

const MyAttendeesScreen = ({ navigation }) => {
  const { user } = useUser();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [attendees, setAttendees] = useState([]);
  const [uploadingId, setUploadingId] = useState(null);
  const [cancellingId, setCancellingId] = useState(null);

  const load = useCallback(async () => {
    if (!user?.uid) return;
    setLoading(true);
    setAttendees(await getAttendeesRegisteredBy(user));
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  // The proof goes in under the leader's own account (that is what the storage
  // rules allow), on the registration of the person it is for.
  const handleUpload = async (attendee) => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/jpeg', 'image/png', 'application/pdf'],
        copyToCacheDirectory: true,
      });
      if (result.canceled) return;
      setUploadingId(attendee.id);
      await submitEventRegistrationPayment(attendee.id, user, result.assets[0]);
      await load();
      Alert.alert('Submitted', `${attendee.userName}'s proof of payment has been submitted and is awaiting review.`);
    } catch (error) {
      Alert.alert('Upload Failed', error.message || 'Failed to upload proof of payment.');
    } finally {
      setUploadingId(null);
    }
  };

  const handleCancel = (attendee) => {
    Alert.alert(
      'Cancel Registration?',
      `This removes ${attendee.userName} from ${attendee.eventName} and gives their place back.`,
      [
        { text: 'Keep', style: 'cancel' },
        {
          text: 'Cancel Registration',
          style: 'destructive',
          onPress: async () => {
            setCancellingId(attendee.id);
            try {
              await cancelAttendee(attendee.id);
              setAttendees((prev) => prev.filter((a) => a.id !== attendee.id));
            } catch (error) {
              Alert.alert('Could Not Cancel', error.message || 'Failed to cancel this registration.');
            } finally {
              setCancellingId(null);
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>People I've Registered</Text>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.blue} />
        </View>
      ) : attendees.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>👥</Text>
          <Text style={styles.emptyTitle}>Nobody Yet</Text>
          <Text style={styles.emptyText}>
            People you register for an event, because they don't use the app, will appear here.
          </Text>
          <TouchableOpacity style={styles.browseButton} onPress={() => navigation.navigate('Events')}>
            <Text style={styles.browseButtonText}>Browse Events</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
          <TouchableOpacity style={styles.addButton} onPress={() => navigation.navigate('Events')}>
            <Text style={styles.addButtonText}>+ Register Someone</Text>
          </TouchableOpacity>

          {attendees.map((attendee) => {
            const statusStyle = STATUS_STYLES[attendee.status];
            const canUpload = attendee.requiresPayment && ['awaiting_payment', 'rejected'].includes(attendee.status);
            const canCancel = CANCELLABLE.includes(attendee.status);
            const uploading = uploadingId === attendee.id;
            const cancelling = cancellingId === attendee.id;
            const isPast = toDate(attendee.eventDate) < new Date();
            return (
              <View key={attendee.id} style={[styles.card, isPast && styles.cardPast]}>
                <Text style={styles.name}>{attendee.userName}</Text>
                {attendee.attendeePhone ? <Text style={styles.meta}>📞 {attendee.attendeePhone}</Text> : null}
                <Text style={styles.eventName}>{attendee.eventName}</Text>
                <Text style={styles.meta}>🗓 {formatDate(attendee.eventDate)}</Text>
                <Text style={styles.meta}>⛪ {attendee.congregation}</Text>

                {statusStyle && (
                  <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
                    <Text style={[styles.statusBadgeText, { color: statusStyle.color }]}>{statusStyle.label}</Text>
                  </View>
                )}

                {attendee.status === 'rejected' && attendee.rejectionReason ? (
                  <Text style={styles.rejectionReason}>{attendee.rejectionReason}</Text>
                ) : null}

                {attendee.status === 'payment_submitted' ? (
                  <Text style={styles.hint}>Another leader or an admin reviews payments you submit.</Text>
                ) : null}

                {attendee.status === 'awaiting_payment' ? (
                  <View style={styles.bankHintRow}>
                    <Text style={styles.bankHintText}>
                      R{attendee.registrationFee} · {BANK_DETAILS.bank} · {BANK_DETAILS.accountNumber} · Ref: {attendee.userName} · {attendee.paymentReference || attendee.eventName}
                    </Text>
                    <TouchableOpacity
                      style={styles.copyButton}
                      onPress={async () => {
                        await Clipboard.setStringAsync(BANK_DETAILS.accountNumber);
                        Alert.alert('Copied', `"${BANK_DETAILS.accountNumber}" copied to clipboard!`);
                      }}
                    >
                      <Text style={styles.copyButtonText}>Copy</Text>
                    </TouchableOpacity>
                  </View>
                ) : null}

                {canUpload && (
                  <TouchableOpacity
                    style={[styles.uploadBtn, uploading && styles.buttonDisabled]}
                    onPress={() => handleUpload(attendee)}
                    disabled={uploading}
                  >
                    {uploading ? (
                      <ActivityIndicator color={colors.white} size="small" />
                    ) : (
                      <Text style={styles.uploadBtnText}>
                        {attendee.status === 'rejected' ? 'Resubmit Proof of Payment' : 'Upload Proof of Payment'}
                      </Text>
                    )}
                  </TouchableOpacity>
                )}

                {canCancel && (
                  <TouchableOpacity
                    style={styles.cancelBtn}
                    onPress={() => handleCancel(attendee)}
                    disabled={cancelling}
                  >
                    {cancelling ? (
                      <ActivityIndicator color={colors.red} size="small" />
                    ) : (
                      <Text style={styles.cancelBtnText}>Cancel Registration</Text>
                    )}
                  </TouchableOpacity>
                )}
              </View>
            );
          })}
          <View style={{ height: spacing.xxxl + insets.bottom }} />
        </ScrollView>
      )}
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
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xxxl },
  emptyIcon: { fontSize: 48, marginBottom: spacing.lg },
  emptyTitle: { fontSize: typography.sizes.lg, fontWeight: '700', color: colors.textPrimary, marginBottom: spacing.sm },
  emptyText: { fontSize: typography.sizes.base, color: colors.textSecondary, textAlign: 'center', marginBottom: spacing.lg },
  browseButton: { backgroundColor: colors.blue, borderRadius: borderRadius.md, paddingVertical: spacing.md, paddingHorizontal: spacing.xl },
  browseButtonText: { color: colors.white, fontSize: typography.sizes.sm, fontWeight: '700' },
  list: { padding: spacing.lg },
  addButton: {
    backgroundColor: colors.blue, borderRadius: borderRadius.md,
    paddingVertical: spacing.md, alignItems: 'center', marginBottom: spacing.lg,
  },
  addButtonText: { color: colors.white, fontSize: typography.sizes.sm, fontWeight: '700' },
  card: {
    backgroundColor: colors.white, borderRadius: borderRadius.lg,
    padding: spacing.md, marginBottom: spacing.md,
    borderWidth: 1, borderColor: colors.border,
  },
  cardPast: { opacity: 0.6 },
  name: { fontSize: typography.sizes.md, fontWeight: '700', color: colors.textPrimary, marginBottom: 2 },
  eventName: { fontSize: typography.sizes.sm, fontWeight: '700', color: colors.blue, marginTop: spacing.xs, marginBottom: 2 },
  meta: { fontSize: typography.sizes.xs, color: colors.textSecondary, marginTop: 2 },
  statusBadge: {
    borderRadius: borderRadius.full, paddingHorizontal: spacing.sm, paddingVertical: 2,
    alignSelf: 'flex-start', marginTop: spacing.sm,
  },
  statusBadgeText: { fontSize: typography.sizes.xs, fontWeight: '700' },
  rejectionReason: { fontSize: typography.sizes.xs, color: colors.red, marginTop: spacing.xs },
  hint: { fontSize: typography.sizes.xs, color: colors.textSecondary, marginTop: spacing.xs, fontStyle: 'italic' },
  bankHintText: { flex: 1, fontSize: typography.sizes.xs, color: colors.textSecondary },
  bankHintRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.sm },
  copyButton: {
    backgroundColor: colors.surfaceLight, borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm, paddingVertical: 2,
  },
  copyButtonText: { fontSize: typography.sizes.xs, fontWeight: '700', color: colors.blue },
  uploadBtn: {
    backgroundColor: colors.blue, borderRadius: borderRadius.md,
    paddingVertical: spacing.sm, alignItems: 'center', marginTop: spacing.md,
  },
  uploadBtnText: { color: colors.white, fontSize: typography.sizes.xs, fontWeight: '700' },
  buttonDisabled: { opacity: 0.6 },
  cancelBtn: { alignItems: 'center', paddingVertical: spacing.sm, marginTop: spacing.sm },
  cancelBtnText: { color: colors.red, fontSize: typography.sizes.xs, fontWeight: '700' },
});

export default MyAttendeesScreen;
