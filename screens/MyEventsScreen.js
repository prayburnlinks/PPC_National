import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Text,
  ActivityIndicator,
  Image,
  Alert,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { colors, spacing, borderRadius, typography } from '../constants/theme';
import { BANK_DETAILS } from '../constants/config';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useUser } from '../context/UserContext';
import {
  getUserEventRegistrations,
  submitEventRegistrationPayment,
} from '../services/eventRegistrationService';
import * as DocumentPicker from 'expo-document-picker';

const CATEGORY_COLORS = {
  Women: colors.red,
  Youth: colors.blue,
  Leaders: colors.darkBlue,
  Missions: colors.darkGreen,
  Worship: colors.lightBlue,
  'All Districts': colors.blue,
};

const STATUS_STYLES = {
  awaiting_payment: { bg: '#FFFBEB', color: colors.gold, label: 'Awaiting Payment' },
  payment_submitted: { bg: '#FFFBEB', color: colors.gold, label: 'Under Review' },
  approved: { bg: '#F0FBF6', color: colors.green, label: 'Registered & Paid' },
  confirmed: { bg: '#F0FBF6', color: colors.green, label: 'Registered' },
  rejected: { bg: '#FFF0EE', color: colors.red, label: 'Payment Rejected' },
};

const MyEventsScreen = ({ navigation }) => {
  const { user } = useUser();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState([]);
  const [uploadingId, setUploadingId] = useState(null);

  const load = useCallback(async () => {
    if (!user?.uid) return;
    setLoading(true);
    const list = await getUserEventRegistrations(user.uid);
    setEvents(list);
    setLoading(false);
  }, [user?.uid]);

  useEffect(() => { load(); }, [load]);

  const formatDate = (date) =>
    new Date(date).toLocaleDateString('en-ZA', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' });

  const formatDateShort = (date) => {
    const d = new Date(date);
    return { day: d.getDate(), month: d.toLocaleString('en-ZA', { month: 'short' }).toUpperCase() };
  };

  const handleUpload = async (event) => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/jpeg', 'image/png', 'application/pdf'],
        copyToCacheDirectory: true,
      });
      if (result.canceled) return;
      const file = result.assets[0];
      setUploadingId(event.registrationId);
      await submitEventRegistrationPayment(event.registrationId, user, file);
      await load();
      Alert.alert('Submitted', 'Your proof of payment has been submitted and is awaiting review.');
    } catch (error) {
      Alert.alert('Upload Failed', error.message || 'Failed to upload proof of payment.');
    } finally {
      setUploadingId(null);
    }
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Image source={require('../assets/emblem.jpg')} style={styles.emblem} resizeMode="contain" />
        <Text style={styles.headerTitle}>My Events</Text>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.blue} />
        </View>
      ) : events.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>📋</Text>
          <Text style={styles.emptyTitle}>No Registered Events</Text>
          <Text style={styles.emptyText}>Events you register for will appear here.</Text>
          <TouchableOpacity style={styles.browseButton} onPress={() => navigation.navigate('Events')}>
            <Text style={styles.browseButtonText}>Browse Events</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
          {events.map(event => {
            const { day, month } = formatDateShort(event.eventDate);
            const catColor = CATEGORY_COLORS[event.category] || colors.blue;
            const isPast = new Date(event.eventDate) < new Date();
            const statusStyle = STATUS_STYLES[event.registrationStatus];
            const canUpload = event.registrationStatus === 'awaiting_payment' || event.registrationStatus === 'rejected';
            const uploading = uploadingId === event.registrationId;
            return (
              <View key={event.id} style={[styles.eventCard, isPast && styles.eventCardPast]}>
                <View style={[styles.dateBadge, { backgroundColor: catColor }]}>
                  <Text style={styles.dateDay}>{day}</Text>
                  <Text style={styles.dateMonth}>{month}</Text>
                </View>
                <View style={styles.eventInfo}>
                  <View style={[styles.categoryTag, { backgroundColor: catColor + '22' }]}>
                    <Text style={[styles.categoryTagText, { color: catColor }]}>{event.category}</Text>
                  </View>
                  <Text style={styles.eventName}>{event.name}</Text>
                  <Text style={styles.eventVenue}>📍 {event.venue}</Text>
                  <Text style={styles.eventDate}>🗓 {formatDate(event.eventDate)}</Text>

                  {statusStyle && (
                    <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
                      <Text style={[styles.statusBadgeText, { color: statusStyle.color }]}>{statusStyle.label}</Text>
                    </View>
                  )}

                  {event.registrationStatus === 'rejected' && event.rejectionReason ? (
                    <Text style={styles.rejectionReason}>{event.rejectionReason}</Text>
                  ) : null}

                  {event.registrationStatus === 'awaiting_payment' ? (
                    <View style={styles.bankHintRow}>
                      <Text style={styles.bankHintText}>
                        R{event.registrationFee} · {BANK_DETAILS.bank} · {BANK_DETAILS.accountNumber} · Ref: {event.paymentReference || event.name}
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
                      onPress={() => handleUpload(event)}
                      disabled={uploading}
                    >
                      {uploading ? (
                        <ActivityIndicator color={colors.white} size="small" />
                      ) : (
                        <Text style={styles.uploadBtnText}>
                          {event.registrationStatus === 'rejected' ? 'Resubmit Proof of Payment' : 'Upload Proof of Payment'}
                        </Text>
                      )}
                    </TouchableOpacity>
                  )}
                </View>
                <View style={styles.registeredBadge}>
                  <Text style={styles.registeredText}>✓</Text>
                </View>
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
  emptyText: { fontSize: typography.sizes.base, color: colors.textSecondary, textAlign: 'center', marginBottom: spacing.lg },
  browseButton: { backgroundColor: colors.blue, borderRadius: borderRadius.md, paddingVertical: spacing.md, paddingHorizontal: spacing.xl },
  browseButtonText: { color: colors.white, fontSize: typography.sizes.sm, fontWeight: '700' },
  list: { padding: spacing.lg },
  eventCard: {
    backgroundColor: colors.white, borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md, paddingVertical: spacing.lg,
    marginBottom: spacing.md,
    flexDirection: 'row', alignItems: 'flex-start',
    borderWidth: 1, borderColor: colors.border,
    gap: spacing.md,
  },
  eventCardPast: { opacity: 0.6 },
  dateBadge: {
    width: 50, height: 56, borderRadius: borderRadius.md,
    alignItems: 'center', justifyContent: 'center',
  },
  dateDay: { color: colors.white, fontSize: typography.sizes.xl, fontWeight: '800' },
  dateMonth: { color: 'rgba(255,255,255,0.8)', fontSize: typography.sizes.xs, letterSpacing: 0.5 },
  eventInfo: { flex: 1 },
  categoryTag: { borderRadius: borderRadius.sm, paddingHorizontal: spacing.sm, paddingVertical: 2, alignSelf: 'flex-start', marginBottom: spacing.xs },
  categoryTagText: { fontSize: typography.sizes.xs, fontWeight: '700' },
  eventName: { fontSize: typography.sizes.sm, fontWeight: '700', color: colors.textPrimary, marginBottom: 2 },
  eventVenue: { fontSize: typography.sizes.xs, color: colors.textSecondary, marginBottom: 2 },
  eventDate: { fontSize: typography.sizes.xs, color: colors.textSecondary },
  statusBadge: {
    borderRadius: borderRadius.full, paddingHorizontal: spacing.sm, paddingVertical: 2,
    alignSelf: 'flex-start', marginTop: spacing.xs,
  },
  statusBadgeText: { fontSize: typography.sizes.xs, fontWeight: '700' },
  rejectionReason: { fontSize: typography.sizes.xs, color: colors.red, marginTop: spacing.xs },
  bankHintText: { flex: 1, fontSize: typography.sizes.xs, color: colors.textSecondary },
  bankHintRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.xs },
  copyButton: {
    backgroundColor: colors.surfaceLight, borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm, paddingVertical: 2,
  },
  copyButtonText: { fontSize: typography.sizes.xs, fontWeight: '700', color: colors.blue },
  uploadBtn: {
    backgroundColor: colors.blue, borderRadius: borderRadius.md,
    paddingVertical: spacing.sm, alignItems: 'center', marginTop: spacing.sm,
  },
  buttonDisabled: { opacity: 0.6 },
  uploadBtnText: { color: colors.white, fontSize: typography.sizes.xs, fontWeight: '700' },
  registeredBadge: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: colors.green, alignItems: 'center', justifyContent: 'center',
  },
  registeredText: { color: colors.white, fontSize: typography.sizes.sm, fontWeight: '700' },
});

export default MyEventsScreen;
