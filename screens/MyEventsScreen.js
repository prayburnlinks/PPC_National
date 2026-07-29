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
import { getUserRegisteredEvents } from '../services/firestoreService';

const CATEGORY_COLORS = {
  Women: colors.red,
  Youth: colors.blue,
  Leaders: colors.darkBlue,
  Missions: colors.darkGreen,
  Worship: colors.lightBlue,
  'All Districts': colors.blue,
};

const MyEventsScreen = ({ navigation }) => {
  const { user } = useUser();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState([]);

  const load = useCallback(async () => {
    if (!user?.uid) return;
    setLoading(true);
    const list = await getUserRegisteredEvents(user.uid);
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
  registeredBadge: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: colors.green, alignItems: 'center', justifyContent: 'center',
  },
  registeredText: { color: colors.white, fontSize: typography.sizes.sm, fontWeight: '700' },
});

export default MyEventsScreen;
