import React, { useState, useEffect, useRef } from 'react';
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
import * as Clipboard from 'expo-clipboard';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, borderRadius, typography } from '../constants/theme';
import { ROLES, BANK_DETAILS, DISTRICTS, CONGREGATIONS } from '../constants/config';
import { useUser } from '../context/UserContext';
import { getEventById } from '../services/firestoreService';
import { registerAttendee } from '../services/eventRegistrationService';

const NAME_MAX = 80;

// What the function answers with when the same name is already on the list. A
// second person can share a name, so the leader gets to say so.
const ALREADY_EXISTS = 'functions/already-exists';

const formatDate = (date) =>
  new Date(date).toLocaleDateString('en-ZA', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' });

const RegisterAttendeeScreen = ({ navigation, route }) => {
  const { user } = useUser();
  const insets = useSafeAreaInsets();
  const eventId = route?.params?.eventId;
  const isAdmin = user?.role === ROLES.ADMIN;

  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  // Leaders register for their own congregation. An admin starts on theirs and
  // can pick another.
  const [district, setDistrict] = useState(isAdmin ? user?.district || '' : '');
  const [congregation, setCongregation] = useState(isAdmin ? user?.congregation || '' : '');
  const [registering, setRegistering] = useState(false);
  // How many have been registered from this screen, so the "event full" check
  // keeps up while the leader works down a list.
  const [addedHere, setAddedHere] = useState(0);
  // Updates synchronously, unlike state, so a double tap can't send twice.
  const registeringRef = useRef(false);

  useEffect(() => {
    let active = true;
    (async () => {
      const found = eventId ? await getEventById(eventId) : null;
      if (active) {
        setEvent(found);
        setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [eventId]);

  const needsPayment = !!event?.requiresPayment && (event?.registrationFee || 0) > 0;
  const paymentReference = event?.paymentReference || event?.name;
  const trimmedName = name.trim();

  const resetForm = () => {
    setName('');
    setPhone('');
  };

  const submit = async (allowDuplicate) => {
    registeringRef.current = true;
    setRegistering(true);
    try {
      const result = await registerAttendee(event, {
        name: trimmedName,
        phone: phone.trim() || undefined,
        ...(isAdmin ? { congregation, district } : {}),
        allowDuplicate,
      });
      setAddedHere((n) => n + 1);

      const reference = `${trimmedName} · ${result.paymentReference || event.name}`;
      // When money is owed they are not in until it is paid and approved, so
      // the popup must not say "registered".
      Alert.alert(
        result.requiresPayment ? 'Registration Pending' : 'Registered ✓',
        result.requiresPayment
          ? `${trimmedName}'s registration for ${event.name} is pending until their R${result.registrationFee} EFT payment is made and approved.\n\nTheir EFT payment:\nRef: ${reference}\nBank: ${BANK_DETAILS.bank}\nAccount: ${BANK_DETAILS.accountNumber}\n\nOnce it's paid, upload their proof of payment from People I've Registered.`
          : `${trimmedName} is registered for ${event.name}.`,
        [
          { text: 'Register Another', onPress: resetForm },
          { text: 'View List', onPress: () => navigation.navigate('MyAttendees') },
        ]
      );
    } catch (error) {
      if (error.code === ALREADY_EXISTS) {
        Alert.alert(
          'Already Registered?',
          `${error.message}\n\nIf this is a different person with the same name, you can register them anyway.`,
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Register Anyway', onPress: () => submit(true) },
          ]
        );
      } else {
        Alert.alert('Could Not Register', error.message || 'Failed to register this person.');
      }
    } finally {
      registeringRef.current = false;
      setRegistering(false);
    }
  };

  const handleRegister = () => {
    if (registeringRef.current) return;
    if (trimmedName.length < 2) {
      Alert.alert('Missing Info', "Please enter the person's full name.");
      return;
    }
    if (isAdmin && !congregation) {
      Alert.alert('Missing Info', 'Please choose the congregation they belong to.');
      return;
    }
    if (event.capacity && (event.attendeeCount || 0) + addedHere >= event.capacity) {
      Alert.alert('Event Full', 'This event has reached its capacity.');
      return;
    }
    submit(false);
  };

  const chooseDistrict = (value) => {
    setDistrict(value);
    setCongregation('');
  };

  const chooseCongregation = (item) => {
    setCongregation(item.name);
    setDistrict(item.district);
  };

  const congregationsInDistrict = CONGREGATIONS.filter((c) => c.district === district);

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Register Someone Else</Text>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.blue} />
        </View>
      ) : !event ? (
        <View style={styles.centered}>
          <Text style={styles.emptyIcon}>📅</Text>
          <Text style={styles.emptyTitle}>Event Not Found</Text>
          <Text style={styles.emptyText}>It may have been removed. Go back and pick an event again.</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: spacing.xxxl + insets.bottom }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          automaticallyAdjustKeyboardInsets
        >
          <View style={styles.eventCard}>
            <Text style={styles.eventName}>{event.name}</Text>
            <Text style={styles.eventMeta}>🗓 {formatDate(event.eventDate)}</Text>
            <Text style={styles.eventMeta}>📍 {event.venue}</Text>
            {event.capacity ? (
              <Text style={styles.eventMeta}>
                👥 {(event.attendeeCount || 0) + addedHere} / {event.capacity} registered
              </Text>
            ) : null}
          </View>

          <Text style={styles.intro}>
            For people who don't use the app. They'll be registered under {isAdmin ? 'the congregation you choose' : 'your congregation'}, and you'll
            get their payment updates.
          </Text>

          <Text style={styles.label}>Full Name</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Alice Adams"
            placeholderTextColor={colors.placeholder}
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
            maxLength={NAME_MAX}
          />

          <Text style={styles.label}>Phone Number (optional)</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. 082 123 4567"
            placeholderTextColor={colors.placeholder}
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            maxLength={20}
          />

          <Text style={styles.label}>Congregation</Text>
          {isAdmin ? (
            <>
              <View style={styles.chipRow}>
                {DISTRICTS.map(({ name: districtName }) => (
                  <TouchableOpacity
                    key={districtName}
                    style={[styles.chip, district === districtName && styles.chipSelected]}
                    onPress={() => chooseDistrict(districtName)}
                  >
                    <Text style={[styles.chipText, district === districtName && styles.chipTextSelected]}>{districtName}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              {!!district && (
                <View style={styles.chipRow}>
                  {congregationsInDistrict.map((item) => (
                    <TouchableOpacity
                      key={item.name}
                      style={[styles.chip, congregation === item.name && styles.chipSelected]}
                      onPress={() => chooseCongregation(item)}
                    >
                      <Text style={[styles.chipText, congregation === item.name && styles.chipTextSelected]}>{item.name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </>
          ) : (
            <View style={styles.fixedValue}>
              <Text style={styles.fixedValueText}>{user?.congregation || 'N/A'}</Text>
            </View>
          )}

          {needsPayment && (
            <View style={styles.paymentInfo}>
              <Text style={styles.paymentInfoTitle}>💳 Payment Details</Text>
              <Text style={styles.paymentInfoText}>
                After registering, pay{' '}
                <Text style={{ fontWeight: '700' }}>R{event.registrationFee}</Text> by EFT for them, then upload
                their proof of payment from People I've Registered. Another leader or an admin approves it.
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
                  {trimmedName || 'Their name'} · {paymentReference}
                </Text>
              </View>
            </View>
          )}

          <TouchableOpacity
            style={[styles.registerButton, registering && styles.buttonDisabled]}
            onPress={handleRegister}
            disabled={registering}
          >
            {registering ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={styles.registerButtonText}>
                Register{needsPayment ? ` — R${event.registrationFee}` : ''}
              </Text>
            )}
          </TouchableOpacity>
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
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xxxl },
  emptyIcon: { fontSize: 40, marginBottom: spacing.md },
  emptyTitle: { fontSize: typography.sizes.lg, fontWeight: '700', color: colors.textPrimary, marginBottom: spacing.sm },
  emptyText: { fontSize: typography.sizes.sm, color: colors.textSecondary, textAlign: 'center' },
  content: { padding: spacing.lg },
  eventCard: {
    backgroundColor: colors.white, borderRadius: borderRadius.lg,
    padding: spacing.md, marginBottom: spacing.lg,
    borderWidth: 1, borderColor: colors.border,
  },
  eventName: { fontSize: typography.sizes.md, fontWeight: '700', color: colors.textPrimary, marginBottom: spacing.xs },
  eventMeta: { fontSize: typography.sizes.xs, color: colors.textSecondary, marginTop: 2 },
  intro: { fontSize: typography.sizes.sm, color: colors.textSecondary, lineHeight: 20, marginBottom: spacing.lg },
  label: { fontSize: typography.sizes.xs, fontWeight: '700', color: colors.textSecondary, letterSpacing: 0.5, marginBottom: spacing.sm },
  input: {
    borderWidth: 1, borderColor: colors.border, borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md, paddingVertical: spacing.md,
    fontSize: typography.sizes.sm, color: colors.textPrimary,
    marginBottom: spacing.lg, backgroundColor: colors.white,
  },
  fixedValue: {
    borderWidth: 1, borderColor: colors.border, borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md, paddingVertical: spacing.md,
    marginBottom: spacing.lg, backgroundColor: colors.surfaceLight,
  },
  fixedValueText: { fontSize: typography.sizes.sm, color: colors.textPrimary, fontWeight: '600' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.lg },
  chip: {
    borderWidth: 1, borderColor: colors.border, borderRadius: borderRadius.full,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm, backgroundColor: colors.white,
  },
  chipSelected: { backgroundColor: colors.blue, borderColor: colors.blue },
  chipText: { fontSize: typography.sizes.sm, fontWeight: '600', color: colors.textPrimary },
  chipTextSelected: { color: colors.white },
  paymentInfo: {
    backgroundColor: colors.surfaceLight, borderRadius: borderRadius.md,
    padding: spacing.md, marginBottom: spacing.lg,
  },
  paymentInfoTitle: { fontSize: typography.sizes.sm, fontWeight: '700', color: colors.textPrimary, marginBottom: spacing.sm },
  paymentInfoText: { fontSize: typography.sizes.xs, color: colors.textSecondary, marginBottom: spacing.md, lineHeight: 18 },
  bankRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  bankLabel: { fontSize: typography.sizes.xs, color: colors.textSecondary },
  bankValue: { fontSize: typography.sizes.xs, fontWeight: '700', color: colors.textPrimary },
  bankValueRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  copyButton: {
    backgroundColor: colors.white, borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm, paddingVertical: 2,
  },
  copyButtonText: { fontSize: typography.sizes.xs, fontWeight: '700', color: colors.blue },
  referenceRow: { borderBottomWidth: 0 },
  referenceValue: { color: colors.blue },
  registerButton: {
    backgroundColor: colors.blue, borderRadius: borderRadius.md,
    paddingVertical: spacing.md, alignItems: 'center',
  },
  buttonDisabled: { opacity: 0.6 },
  registerButtonText: { color: colors.white, fontSize: typography.sizes.md, fontWeight: '700' },
});

export default RegisterAttendeeScreen;
