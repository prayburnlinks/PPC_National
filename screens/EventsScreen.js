import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Text,
  ActivityIndicator,
  Modal,
  Alert,
  Image,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { colors, spacing, borderRadius, typography } from '../constants/theme';
import { BANK_DETAILS } from '../constants/config';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useUser } from '../context/UserContext';
import { getAllEvents } from '../services/firestoreService';
import {
  registerForEvent,
  getUserEventRegistrationsMap,
} from '../services/eventRegistrationService';

const EventsScreen = ({ navigation }) => {
  const { user } = useUser();
  const insets = useSafeAreaInsets();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [registering, setRegistering] = useState(false);
  const [registeredIds, setRegisteredIds] = useState(new Set());
  const [registrations, setRegistrations] = useState(new Map());
  // Mirrors `registering` state but updates synchronously — state updates
  // are batched by React, so two taps in the same tick could both read the
  // same stale (pre-update) state before a re-render happens.
  const registeringRef = useRef(false);

  const loadEvents = useCallback(async () => {
    setLoading(true);

    const { events: list } = await getAllEvents(20);
    setEvents(list);

    if (user?.uid) {
      const regsMap = await getUserEventRegistrationsMap(user.uid);
      setRegistrations(regsMap);
      setRegisteredIds(new Set(regsMap.keys()));
    }
    setLoading(false);
  }, [user?.uid]);

  useEffect(() => { loadEvents(); }, [loadEvents]);

  const formatDate = (date) => {
    const d = new Date(date);
    return d.toLocaleDateString('en-ZA', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' });
  };

  const formatDateShort = (date) => {
    const d = new Date(date);
    return { day: d.getDate(), month: d.toLocaleString('en-ZA', { month: 'short' }).toUpperCase() };
  };

  const handleRegister = async () => {
    if (!selectedEvent) return;
    if (!user?.uid) {
      Alert.alert('Sign In Required', 'Please sign in or create an account to register for events.');
      return;
    }
    if (
      selectedEvent.capacity &&
      (selectedEvent.attendeeCount || 0) >= selectedEvent.capacity
    ) {
      Alert.alert('Event Full', 'This event has reached its capacity.');
      return;
    }
    if (registeringRef.current) return;
    registeringRef.current = true;
    setRegistering(true);
    try {
      await registerForEvent(user, selectedEvent);

      setRegisteredIds(prev => new Set([...prev, selectedEvent.id]));
      setSelectedEvent(null);

      Alert.alert(
        'Registration Successful! 🎉',
        selectedEvent.requiresPayment
          ? `You are registered for ${selectedEvent.name}.\n\nPlease complete your R${selectedEvent.registrationFee} EFT payment using:\n\nRef: ${user.name} · ${selectedEvent.paymentReference || selectedEvent.name}\nBank: ${BANK_DETAILS.bank}\nAccount: ${BANK_DETAILS.accountNumber}`
          : `You are registered for ${selectedEvent.name}.`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to register');
    } finally {
      registeringRef.current = false;
      setRegistering(false);
    }
  };

  const CATEGORY_COLORS = {
    Women: colors.red,
    Youth: colors.blue,
    Leaders: colors.darkBlue,
    Missions: colors.darkGreen,
    Worship: colors.lightBlue,
    'All Districts': colors.blue,
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Image source={require('../assets/emblem.jpg')} style={styles.emblem} resizeMode="contain" />
        <Text style={styles.headerTitle}>Events & Registration</Text>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.blue} />
          <Text style={styles.loadingText}>Loading events...</Text>
        </View>
      ) : events.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>📅</Text>
          <Text style={styles.emptyTitle}>No Upcoming Events</Text>
          <Text style={styles.emptyText}>Check back soon for new events.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
          {events.map(event => {
            const { day, month } = formatDateShort(event.eventDate);
            const isRegistered = registeredIds.has(event.id);
            const catColor = CATEGORY_COLORS[event.category] || colors.blue;

            return (
              <TouchableOpacity
                key={event.id}
                style={styles.eventCard}
                onPress={() => setSelectedEvent(event)}
              >
                <View style={[styles.dateBadge, { backgroundColor: catColor }]}>
                  <Text style={styles.dateDay}>{day}</Text>
                  <Text style={styles.dateMonth}>{month}</Text>
                </View>

                <View style={styles.eventInfo}>
                  <View style={styles.eventTopRow}>
                    <View style={[styles.categoryTag, { backgroundColor: catColor + '22' }]}>
                      <Text style={[styles.categoryTagText, { color: catColor }]}>{event.category}</Text>
                    </View>
                    {event.registrationFee > 0 && (
                      <View style={styles.feeTag}>
                        <Text style={styles.feeTagText}>R{event.registrationFee}</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.eventName}>{event.name}</Text>
                  <Text style={styles.eventVenue}>📍 {event.venue}</Text>
                  <Text style={styles.eventDate}>🗓 {formatDate(event.eventDate)}</Text>
                  {['confirmed', 'approved'].includes(registrations.get(event.id)?.status) && (
                    <View style={styles.paidBadge}>
                      <Text style={styles.paidBadgeText}>✅ Registered & Paid</Text>
                    </View>
                  )}
                </View>

                {isRegistered ? (
                  <View style={styles.registeredBadge}>
                    <Text style={styles.registeredText}>✓</Text>
                  </View>
                ) : (
                  <View style={styles.registerArrow}>
                    <Text style={styles.registerArrowText}>›</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}

          <View style={{ height: spacing.xxxl + insets.bottom }} />
        </ScrollView>
      )}

      {/* Event Detail Modal */}
      <Modal
        visible={!!selectedEvent}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedEvent(null)}
      >
        {selectedEvent && (
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { paddingBottom: spacing.lg + insets.bottom }]}>
              <View style={styles.modalHandle} />

              <ScrollView showsVerticalScrollIndicator={false}>
                {/* Category + fee */}
                <View style={styles.modalTagRow}>
                  <View style={[styles.categoryTag, { backgroundColor: (CATEGORY_COLORS[selectedEvent.category] || colors.blue) + '22' }]}>
                    <Text style={[styles.categoryTagText, { color: CATEGORY_COLORS[selectedEvent.category] || colors.blue }]}>
                      {selectedEvent.category}
                    </Text>
                  </View>
                  {selectedEvent.registrationFee > 0 && (
                    <View style={styles.feeTag}>
                      <Text style={styles.feeTagText}>R{selectedEvent.registrationFee} registration fee</Text>
                    </View>
                  )}
                </View>

                <Text style={styles.modalTitle}>{selectedEvent.name}</Text>

                <View style={styles.modalDetailRow}>
                  <Text style={styles.modalDetailIcon}>🗓</Text>
                  <Text style={styles.modalDetailText}>{formatDate(selectedEvent.eventDate)}</Text>
                </View>
                {selectedEvent.endDate && (
                  <View style={styles.modalDetailRow}>
                    <Text style={styles.modalDetailIcon}>🏁</Text>
                    <Text style={styles.modalDetailText}>Ends {formatDate(selectedEvent.endDate)}</Text>
                  </View>
                )}
                <View style={styles.modalDetailRow}>
                  <Text style={styles.modalDetailIcon}>📍</Text>
                  <Text style={styles.modalDetailText}>{selectedEvent.venue}</Text>
                </View>
                {selectedEvent.organizer && (
                  <View style={styles.modalDetailRow}>
                    <Text style={styles.modalDetailIcon}>🎤</Text>
                    <Text style={styles.modalDetailText}>{selectedEvent.organizer}</Text>
                  </View>
                )}
                {selectedEvent.capacity && (
                  <View style={styles.modalDetailRow}>
                    <Text style={styles.modalDetailIcon}>👥</Text>
                    <Text style={styles.modalDetailText}>
                      {selectedEvent.attendeeCount || 0} / {selectedEvent.capacity} registered
                    </Text>
                  </View>
                )}

                {selectedEvent.description ? (
                  <Text style={styles.modalDescription}>{selectedEvent.description}</Text>
                ) : null}

                {/* Payment info */}
                {selectedEvent.requiresPayment && selectedEvent.registrationFee > 0 && !registeredIds.has(selectedEvent.id) && (
                  <View style={styles.paymentInfo}>
                    <Text style={styles.paymentInfoTitle}>💳 Payment Details</Text>
                    <Text style={styles.paymentInfoText}>
                      After registering, complete your EFT payment of{' '}
                      <Text style={{ fontWeight: '700' }}>R{selectedEvent.registrationFee}</Text>:
                    </Text>
                    <View style={styles.bankRow}>
                      <Text style={styles.bankLabel}>Bank</Text>
                      <Text style={styles.bankValue}>{BANK_DETAILS.bank}</Text>
                    </View>
                    <View style={styles.bankRow}>
                      <Text style={styles.bankLabel}>Account</Text>
                      <Text style={styles.bankValue}>{BANK_DETAILS.accountName}</Text>
                    </View>
                    <View style={styles.bankRow}>
                      <Text style={styles.bankLabel}>Number</Text>
                      <View style={styles.bankValueRow}>
                        <Text style={styles.bankValue}>{BANK_DETAILS.accountNumber}</Text>
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
                    </View>
                    <View style={styles.bankRow}>
                      <Text style={styles.bankLabel}>Branch</Text>
                      <Text style={styles.bankValue}>{BANK_DETAILS.branchCode}</Text>
                    </View>
                    <View style={[styles.bankRow, styles.referenceRow]}>
                      <Text style={styles.bankLabel}>Reference</Text>
                      <Text style={[styles.bankValue, styles.referenceValue]}>
                        {user?.name} · {selectedEvent.paymentReference || selectedEvent.name}
                      </Text>
                    </View>
                  </View>
                )}
              </ScrollView>

              {/* Action buttons */}
              {registeredIds.has(selectedEvent.id) ? (
                <View style={styles.registeredConfirm}>
                  <Text style={styles.registeredConfirmText}>✓ You are registered for this event</Text>
                </View>
              ) : (
                <TouchableOpacity
                  style={[styles.registerButton, registering && styles.buttonDisabled]}
                  onPress={handleRegister}
                  disabled={registering}
                >
                  {registering ? (
                    <ActivityIndicator color={colors.white} />
                  ) : (
                    <Text style={styles.registerButtonText}>
                      Register{selectedEvent.registrationFee > 0 ? ` — R${selectedEvent.registrationFee}` : ''}
                    </Text>
                  )}
                </TouchableOpacity>
              )}

              <TouchableOpacity style={styles.closeButton} onPress={() => setSelectedEvent(null)}>
                <Text style={styles.closeButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  emblem: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.white,
    marginRight: spacing.sm,
  },
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
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: spacing.md },
  loadingText: { color: colors.textSecondary, fontSize: typography.sizes.base },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xxxl },
  emptyIcon: { fontSize: 48, marginBottom: spacing.lg },
  emptyTitle: { fontSize: typography.sizes.lg, fontWeight: '700', color: colors.textPrimary, marginBottom: spacing.sm },
  emptyText: { fontSize: typography.sizes.base, color: colors.textSecondary, textAlign: 'center' },
  list: { padding: spacing.lg },
  eventCard: {
    backgroundColor: colors.white, borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md, paddingVertical: spacing.lg,
    marginBottom: spacing.md,
    flexDirection: 'row', alignItems: 'flex-start',
    borderWidth: 1, borderColor: colors.border,
    gap: spacing.md,
  },
  dateBadge: {
    width: 50, height: 56, borderRadius: borderRadius.md,
    alignItems: 'center', justifyContent: 'center',
  },
  dateDay: { color: colors.white, fontSize: typography.sizes.xl, fontWeight: '800' },
  dateMonth: { color: 'rgba(255,255,255,0.8)', fontSize: typography.sizes.xs, letterSpacing: 0.5 },
  eventInfo: { flex: 1 },
  eventTopRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.xs },
  categoryTag: { borderRadius: borderRadius.sm, paddingHorizontal: spacing.sm, paddingVertical: 2 },
  categoryTagText: { fontSize: typography.sizes.xs, fontWeight: '700' },
  feeTag: {
    backgroundColor: colors.red + '18', borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm, paddingVertical: 2,
  },
  feeTagText: { fontSize: typography.sizes.xs, fontWeight: '700', color: colors.red },
  eventName: { fontSize: typography.sizes.sm, fontWeight: '700', color: colors.textPrimary, marginBottom: 2 },
  eventVenue: { fontSize: typography.sizes.xs, color: colors.textSecondary, marginBottom: 2 },
  eventDate: { fontSize: typography.sizes.xs, color: colors.textSecondary },
  paidBadge: {
    backgroundColor: 'rgba(46, 173, 111, 0.15)',
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    marginTop: spacing.xs,
    alignSelf: 'flex-start',
  },
  paidBadgeText: {
    color: '#2EAD6F',
    fontSize: typography.sizes.xs,
    fontWeight: '700',
  },
  registeredBadge: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: colors.green, alignItems: 'center', justifyContent: 'center',
  },
  registeredText: { color: colors.white, fontSize: typography.sizes.sm, fontWeight: '700' },
  registerArrow: { paddingLeft: spacing.sm },
  registerArrowText: { fontSize: 22, color: colors.textSecondary },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(10,31,68,0.6)', justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: colors.white, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.lg,
    maxHeight: '90%',
  },
  modalHandle: {
    width: 36, height: 4, backgroundColor: colors.border,
    borderRadius: 2, alignSelf: 'center', marginBottom: spacing.lg,
  },
  modalTagRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  modalTitle: {
    fontSize: typography.sizes.xxl, fontWeight: '800',
    color: colors.textPrimary, marginBottom: spacing.lg,
  },
  modalDetailRow: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.sm, alignItems: 'flex-start' },
  modalDetailIcon: { fontSize: 16, marginTop: 1 },
  modalDetailText: { flex: 1, fontSize: typography.sizes.sm, color: colors.textSecondary },
  modalDescription: {
    fontSize: typography.sizes.sm, color: colors.textPrimary,
    lineHeight: 22, marginTop: spacing.lg, marginBottom: spacing.lg,
  },
  paymentInfo: {
    backgroundColor: colors.surfaceLight, borderRadius: borderRadius.md,
    padding: spacing.md, marginVertical: spacing.lg,
  },
  paymentInfoTitle: { fontSize: typography.sizes.sm, fontWeight: '700', color: colors.textPrimary, marginBottom: spacing.sm },
  paymentInfoText: { fontSize: typography.sizes.xs, color: colors.textSecondary, marginBottom: spacing.md },
  bankRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  bankLabel: { fontSize: typography.sizes.xs, color: colors.textSecondary },
  bankValue: { fontSize: typography.sizes.xs, fontWeight: '700', color: colors.textPrimary },
  bankValueRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  copyButton: {
    backgroundColor: colors.surfaceLight, borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm, paddingVertical: 2,
  },
  copyButtonText: { fontSize: typography.sizes.xs, fontWeight: '700', color: colors.blue },
  referenceRow: { borderBottomWidth: 0 },
  referenceValue: { color: colors.blue },
  registeredConfirm: {
    backgroundColor: colors.green + '18', borderRadius: borderRadius.md,
    padding: spacing.md, alignItems: 'center', marginTop: spacing.lg,
  },
  registeredConfirmText: { color: colors.green, fontWeight: '700', fontSize: typography.sizes.sm },
  registerButton: {
    backgroundColor: colors.blue, borderRadius: borderRadius.md,
    paddingVertical: spacing.md, alignItems: 'center', marginTop: spacing.lg,
  },
  buttonDisabled: { opacity: 0.6 },
  registerButtonText: { color: colors.white, fontSize: typography.sizes.md, fontWeight: '700' },
  closeButton: {
    borderRadius: borderRadius.md, paddingVertical: spacing.md,
    alignItems: 'center', marginTop: spacing.sm,
  },
  closeButtonText: { color: colors.textSecondary, fontSize: typography.sizes.sm, fontWeight: '600' },
});

export default EventsScreen;
