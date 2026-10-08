import React, { useState, useEffect, useCallback } from 'react';
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
import { useUser } from '../context/UserContext';
import { EVENT_CATEGORIES } from '../constants/config';
import { getAllEventsForAdmin, createEvent, updateEvent, deleteEvent } from '../services/firestoreService';
import { getEventRegistrationCount } from '../services/eventRegistrationService';

const CATEGORIES = Object.values(EVENT_CATEGORIES);

const emptyForm = {
  name: '',
  description: '',
  category: CATEGORIES[0],
  venue: '',
  eventDateText: '',
  endDateText: '',
  organizer: '',
  capacity: '',
  requiresPayment: false,
  registrationFee: '',
  paymentReference: '',
};

// Accepts "YYYY-MM-DD" or "YYYY-MM-DD HH:MM" and returns a Date, or null if invalid.
const parseEventDate = (text) => {
  const trimmed = text.trim();
  if (!trimmed) return null;
  const isoLike = trimmed.includes(' ') ? trimmed.replace(' ', 'T') : `${trimmed}T08:00`;
  const date = new Date(isoLike);
  return isNaN(date.getTime()) ? null : date;
};

const pad = (n) => String(n).padStart(2, '0');

// Inverse of parseEventDate, for pre-filling the form when editing.
const formatEventDateForInput = (date) => {
  if (!date) return '';
  const d = new Date(date);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const AdminEventsScreen = ({ navigation }) => {
  const { user } = useUser();
  const insets = useSafeAreaInsets();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [checkingDeleteId, setCheckingDeleteId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setEvents(await getAllEventsForAdmin());
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const openAddForm = () => {
    setEditingEvent(null);
    setForm(emptyForm);
    setShowForm(true);
  };

  const openEditForm = (event) => {
    setEditingEvent(event);
    setForm({
      name: event.name || '',
      description: event.description || '',
      category: event.category || CATEGORIES[0],
      venue: event.venue || '',
      eventDateText: formatEventDateForInput(event.eventDate),
      endDateText: event.endDate ? formatEventDateForInput(event.endDate) : '',
      organizer: event.organizer || '',
      capacity: event.capacity ? String(event.capacity) : '',
      requiresPayment: !!event.requiresPayment,
      registrationFee: event.registrationFee ? String(event.registrationFee) : '',
      paymentReference: event.paymentReference || '',
    });
    setShowForm(true);
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.venue.trim() || !form.category) {
      Alert.alert('Missing Info', 'Please fill in the name, venue and category before saving.');
      return;
    }
    const eventDate = parseEventDate(form.eventDateText);
    if (!eventDate) {
      Alert.alert('Invalid Date', 'Please enter the event date as YYYY-MM-DD or YYYY-MM-DD HH:MM.');
      return;
    }
    let endDate = null;
    if (form.endDateText.trim()) {
      endDate = parseEventDate(form.endDateText);
      if (!endDate) {
        Alert.alert('Invalid Date', 'Please enter the end date as YYYY-MM-DD or YYYY-MM-DD HH:MM.');
        return;
      }
    }
    if (form.requiresPayment && !form.registrationFee.trim()) {
      Alert.alert('Missing Info', 'Please enter a registration fee, or turn off "Requires Payment".');
      return;
    }

    const eventData = {
      name: form.name.trim(),
      description: form.description.trim(),
      category: form.category,
      venue: form.venue.trim(),
      eventDate,
      endDate,
      organizer: form.organizer.trim(),
      capacity: form.capacity.trim() ? parseInt(form.capacity, 10) : null,
      requiresPayment: form.requiresPayment,
      registrationFee: form.requiresPayment ? parseFloat(form.registrationFee) : 0,
      paymentReference: form.paymentReference.trim(),
    };

    setSaving(true);
    try {
      if (editingEvent) {
        await updateEvent(editingEvent.id, eventData);
      } else {
        await createEvent(user, eventData);
      }
      setShowForm(false);
      load();
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to save event.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePress = async (event) => {
    setCheckingDeleteId(event.id);
    const count = await getEventRegistrationCount(event.id);
    setCheckingDeleteId(null);

    const message = count > 0
      ? `${count} ${count === 1 ? 'person is' : 'people are'} registered for "${event.name}". Deleting it removes the event from their registration history. This cannot be undone.`
      : `This permanently deletes "${event.name}". This cannot be undone.`;

    Alert.alert('Delete Event?', message, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setDeletingId(event.id);
          try {
            await deleteEvent(event.id);
            setEvents(prev => prev.filter(e => e.id !== event.id));
          } catch (error) {
            Alert.alert('Error', error.message || 'Failed to delete event.');
          } finally {
            setDeletingId(null);
          }
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <TouchableOpacity onPress={() => (showForm ? setShowForm(false) : navigation.goBack())} style={styles.backButton}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{showForm ? (editingEvent ? 'Edit Event' : 'Add Event') : 'Manage Events'}</Text>
      </View>

      {showForm ? (
        <ScrollView
          contentContainerStyle={[styles.formContent, { paddingBottom: spacing.xxxl + insets.bottom }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          automaticallyAdjustKeyboardInsets
        >
          <Text style={styles.label}>Name</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. National Youth Rally"
            placeholderTextColor={colors.placeholder}
            value={form.name}
            onChangeText={(v) => setForm(f => ({ ...f, name: v }))}
          />

          <Text style={styles.label}>Description</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Describe the event (optional)"
            placeholderTextColor={colors.placeholder}
            value={form.description}
            onChangeText={(v) => setForm(f => ({ ...f, description: v }))}
            multiline
          />

          <Text style={styles.label}>Category</Text>
          <View style={styles.chipRow}>
            {CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat}
                style={[styles.chip, form.category === cat && styles.chipSelected]}
                onPress={() => setForm(f => ({ ...f, category: cat }))}
              >
                <Text style={[styles.chipText, form.category === cat && styles.chipTextSelected]}>{cat}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>Venue</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Cape Town City Hall"
            placeholderTextColor={colors.placeholder}
            value={form.venue}
            onChangeText={(v) => setForm(f => ({ ...f, venue: v }))}
          />

          <Text style={styles.label}>Event Date</Text>
          <TextInput
            style={styles.input}
            placeholder="YYYY-MM-DD or YYYY-MM-DD HH:MM"
            placeholderTextColor={colors.placeholder}
            value={form.eventDateText}
            onChangeText={(v) => setForm(f => ({ ...f, eventDateText: v }))}
          />

          <Text style={styles.label}>End Date (multi-day events only)</Text>
          <TextInput
            style={styles.input}
            placeholder="YYYY-MM-DD or YYYY-MM-DD HH:MM (optional)"
            placeholderTextColor={colors.placeholder}
            value={form.endDateText}
            onChangeText={(v) => setForm(f => ({ ...f, endDateText: v }))}
          />

          <Text style={styles.label}>Organizer</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. PPC Youth Ministry (optional)"
            placeholderTextColor={colors.placeholder}
            value={form.organizer}
            onChangeText={(v) => setForm(f => ({ ...f, organizer: v }))}
          />

          <Text style={styles.label}>Capacity</Text>
          <TextInput
            style={styles.input}
            placeholder="Max attendees (optional)"
            placeholderTextColor={colors.placeholder}
            keyboardType="numeric"
            value={form.capacity}
            onChangeText={(v) => setForm(f => ({ ...f, capacity: v }))}
          />

          <TouchableOpacity
            style={styles.checkboxRow}
            onPress={() => setForm(f => ({ ...f, requiresPayment: !f.requiresPayment }))}
          >
            <View style={[styles.checkbox, form.requiresPayment && styles.checkboxChecked]}>
              {form.requiresPayment && <Text style={styles.checkboxTick}>✓</Text>}
            </View>
            <Text style={styles.checkboxLabel}>Requires Payment</Text>
          </TouchableOpacity>

          {form.requiresPayment && (
            <>
              <Text style={styles.label}>Registration Fee (ZAR)</Text>
              <TextInput
                style={styles.input}
                placeholder="0"
                placeholderTextColor={colors.placeholder}
                keyboardType="numeric"
                value={form.registrationFee}
                onChangeText={(v) => setForm(f => ({ ...f, registrationFee: v }))}
              />

              <Text style={styles.label}>Payment Reference</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. YouthRally2026"
                placeholderTextColor={colors.placeholder}
                value={form.paymentReference}
                onChangeText={(v) => setForm(f => ({ ...f, paymentReference: v }))}
              />
            </>
          )}

          <TouchableOpacity style={[styles.saveButton, saving && styles.buttonDisabled]} onPress={handleSave} disabled={saving}>
            {saving ? <ActivityIndicator color={colors.white} /> : <Text style={styles.saveButtonText}>{editingEvent ? 'Save Changes' : 'Save Event'}</Text>}
          </TouchableOpacity>
        </ScrollView>
      ) : loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.blue} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
          <TouchableOpacity style={styles.addButton} onPress={openAddForm}>
            <Text style={styles.addButtonText}>+ Add Event</Text>
          </TouchableOpacity>

          {events.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>📅</Text>
              <Text style={styles.emptyTitle}>No Events Yet</Text>
              <Text style={styles.emptyText}>Add your first event above.</Text>
            </View>
          ) : (
            events.map((event) => (
              <View key={event.id} style={styles.eventCard}>
                <View style={styles.eventCardTop}>
                  <View style={styles.eventInfo}>
                    <Text style={styles.eventName}>{event.name}</Text>
                    <Text style={styles.eventMeta}>{event.venue}</Text>
                    <Text style={styles.eventMeta}>{formatDate(event.eventDate)}</Text>
                  </View>
                  <View style={styles.categoryTag}>
                    <Text style={styles.categoryTagText}>{event.category}</Text>
                  </View>
                </View>

                {deletingId === event.id ? (
                  <ActivityIndicator style={styles.cardSpinner} color={colors.blue} />
                ) : (
                  <View style={styles.eventCardActions}>
                    <TouchableOpacity onPress={() => openEditForm(event)}>
                      <Text style={styles.editLink}>Edit</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleDeletePress(event)} disabled={checkingDeleteId === event.id}>
                      {checkingDeleteId === event.id ? (
                        <ActivityIndicator size="small" color={colors.red} />
                      ) : (
                        <Text style={styles.deleteLink}>Delete</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            ))
          )}
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
  list: { padding: spacing.lg },
  addButton: {
    backgroundColor: colors.blue, borderRadius: borderRadius.md,
    paddingVertical: spacing.md, alignItems: 'center', marginBottom: spacing.lg,
  },
  addButtonText: { color: colors.white, fontSize: typography.sizes.sm, fontWeight: '700' },
  emptyContainer: { alignItems: 'center', paddingVertical: spacing.huge },
  emptyIcon: { fontSize: 40, marginBottom: spacing.md },
  emptyTitle: { fontSize: typography.sizes.lg, fontWeight: '700', color: colors.textPrimary, marginBottom: spacing.sm },
  emptyText: { fontSize: typography.sizes.sm, color: colors.textSecondary, textAlign: 'center' },
  eventCard: {
    backgroundColor: colors.white, borderRadius: borderRadius.lg,
    padding: spacing.md, marginBottom: spacing.md,
    borderWidth: 1, borderColor: colors.border,
  },
  eventCardTop: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md,
  },
  eventInfo: { flex: 1 },
  eventName: { fontSize: typography.sizes.sm, fontWeight: '700', color: colors.textPrimary, marginBottom: 2 },
  eventMeta: { fontSize: typography.sizes.xs, color: colors.textSecondary },
  categoryTag: {
    backgroundColor: colors.blue + '18', borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm, paddingVertical: 2,
  },
  categoryTagText: { fontSize: typography.sizes.xs, fontWeight: '700', color: colors.blue },
  eventCardActions: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.lg,
    marginTop: spacing.md, paddingTop: spacing.md,
    borderTopWidth: 1, borderTopColor: colors.border,
  },
  editLink: { fontSize: typography.sizes.xs, fontWeight: '700', color: colors.blue },
  deleteLink: { fontSize: typography.sizes.xs, fontWeight: '700', color: colors.red },
  cardSpinner: {
    marginTop: spacing.md, paddingTop: spacing.md,
    borderTopWidth: 1, borderTopColor: colors.border,
  },
  // Form
  formContent: { padding: spacing.lg },
  label: { fontSize: typography.sizes.xs, fontWeight: '700', color: colors.textSecondary, letterSpacing: 0.5, marginBottom: spacing.sm },
  input: {
    borderWidth: 1, borderColor: colors.border, borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md, paddingVertical: spacing.md,
    fontSize: typography.sizes.sm, color: colors.textPrimary,
    marginBottom: spacing.lg, backgroundColor: colors.white,
  },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.lg },
  chip: {
    borderWidth: 1, borderColor: colors.border, borderRadius: borderRadius.full,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
  },
  chipSelected: { backgroundColor: colors.blue, borderColor: colors.blue },
  chipText: { fontSize: typography.sizes.sm, fontWeight: '600', color: colors.textPrimary },
  chipTextSelected: { color: colors.white },
  checkboxRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.lg, gap: spacing.sm },
  checkbox: {
    width: 22, height: 22, borderRadius: borderRadius.sm,
    borderWidth: 1, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center', backgroundColor: colors.white,
  },
  checkboxChecked: { backgroundColor: colors.blue, borderColor: colors.blue },
  checkboxTick: { color: colors.white, fontSize: typography.sizes.sm, fontWeight: '700' },
  checkboxLabel: { fontSize: typography.sizes.sm, fontWeight: '600', color: colors.textPrimary },
  saveButton: {
    backgroundColor: colors.blue, borderRadius: borderRadius.md,
    paddingVertical: spacing.md, alignItems: 'center', marginTop: spacing.md,
  },
  buttonDisabled: { opacity: 0.6 },
  saveButtonText: { color: colors.white, fontSize: typography.sizes.md, fontWeight: '700' },
});

export default AdminEventsScreen;
