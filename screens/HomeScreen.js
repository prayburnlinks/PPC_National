/**
 * Home Screen
 * Main dashboard with events, announcements, and quick actions
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Text,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import { colors, spacing, borderRadius, typography } from '../constants/theme';
import { getUpcomingEvents } from '../services/firestoreService';

const HomeScreen = ({ user, navigation }) => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUpcomingEvents();
  }, []);

  const loadUpcomingEvents = async () => {
    setLoading(true);
    const upcomingEvents = await getUpcomingEvents(4);
    setEvents(upcomingEvents);
    setLoading(false);
  };

  const formatDate = (date) => {
    const d = new Date(date);
    return {
      day: d.getDate(),
      month: d.toLocaleString('en-ZA', { month: 'short' }).toUpperCase(),
    };
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Hero Header */}
      <View style={styles.heroHeader}>
        <View style={styles.headerTop}>
          <View style={styles.logoRow}>
            <Text style={styles.logo}>🔥</Text>
            <View>
              <Text style={styles.logoName}>PPC for Jesus</Text>
              <Text style={styles.logoSub}>National Church · SA</Text>
            </View>
          </View>
          <TouchableOpacity
            onPress={() => alert('🔔 Notifications coming soon!')}
            style={styles.notifBell}
          >
            <Text style={styles.notifIcon}>🔔</Text>
            <View style={styles.notifDot} />
          </TouchableOpacity>
        </View>
        <Text style={styles.greeting}>Good morning, beloved</Text>
        <Text style={styles.greetingName}>{user?.name || 'Member'} 🙌</Text>
        <View style={styles.districtChip}>
          <Text style={styles.districtText}>📍 {user?.district || 'District'}</Text>
        </View>
      </View>

      {/* Ticker Banner */}
      <View style={styles.ticker}>
        <Text style={styles.tickerBadge}>NOTICE</Text>
        <Text style={styles.tickerText}>
          National Convention 15–18 May · Orlando Stadium · Register now!
        </Text>
      </View>

      {/* Body Content */}
      <View style={styles.body}>
        {/* Live Now Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Live Now</Text>
            <View style={styles.liveBadge}>
              <View style={styles.liveDot} />
              <Text style={styles.liveBadgeText}>LIVE</Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.liveCard}
            onPress={() => navigation.navigate('Media')}
          >
            <View style={styles.liveBadgeContainer}>
              <View style={styles.liveDot} />
              <Text style={styles.liveBadgeText}>LIVE</Text>
            </View>
            <Text style={styles.liveTitle}>Sunday Morning Service</Text>
            <Text style={styles.liveMeta}>🎤 Ps. David Mokoena · 👁 2.4k watching</Text>
            <View style={styles.livePlayButton}>
              <Text style={styles.livePlayIcon}>▶</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Quick Action Grid */}
        <View style={styles.quickGrid}>
          <TouchableOpacity
            style={[styles.quickCard, styles.quickCardPurple]}
            onPress={() => navigation.navigate('Giving')}
          >
            <Text style={styles.quickIcon}>💝</Text>
            <Text style={styles.quickTitle}>Give & Tithe</Text>
            <Text style={styles.quickSub}>Sow a seed today</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.quickCard, styles.quickCardOrange]}
            onPress={() => navigation.navigate('Districts')}
          >
            <Text style={styles.quickIcon}>🗺</Text>
            <Text style={styles.quickTitle}>Districts</Text>
            <Text style={styles.quickSub}>9 districts · 90 congs</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.quickCard, styles.quickCardWhite]}
            onPress={() => navigation.navigate('Media')}
          >
            <Text style={styles.quickIcon}>🎬</Text>
            <Text style={styles.quickTitleDark}>Sermons</Text>
            <Text style={styles.quickSubDark}>Watch & listen</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.quickCard, styles.quickCardWhite]}
            onPress={() => alert('Prayer Wall coming soon 🙏')}
          >
            <Text style={styles.quickIcon}>🙏</Text>
            <Text style={styles.quickTitleDark}>Prayer Wall</Text>
            <Text style={styles.quickSubDark}>Submit requests</Text>
          </TouchableOpacity>
        </View>

        {/* Upcoming Events Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Upcoming Events</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Events')}>
              <Text style={styles.seeAllButton}>See all</Text>
            </TouchableOpacity>
          </View>

          {loading ? (
            <ActivityIndicator size="large" color={colors.purple} />
          ) : events.length === 0 ? (
            <Text style={styles.emptyText}>No upcoming events</Text>
          ) : (
            events.map((event) => {
              const { day, month } = formatDate(event.eventDate);
              return (
                <TouchableOpacity
                  key={event.id}
                  style={styles.eventCard}
                  onPress={() => navigation.navigate('Events', { eventId: event.id })}
                >
                  <View style={[styles.eventDate, { backgroundColor: colors.purple }]}>
                    <Text style={styles.eventDay}>{day}</Text>
                    <Text style={styles.eventMonth}>{month}</Text>
                  </View>
                  <View style={styles.eventInfo}>
                    <Text style={styles.eventTitle}>{event.name}</Text>
                    <Text style={styles.eventVenue}>📍 {event.venue}</Text>
                    <View style={styles.eventTag}>
                      <Text style={styles.eventTagText}>{event.category}</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </View>

        <View style={styles.spacer} />
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  heroHeader: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
    background: 'linear-gradient(150deg, #1A0A2E 0%, #4B1D8E 60%, #7C3FD4 100%)',
    backgroundColor: colors.darkPurple,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  logo: {
    fontSize: typography.sizes.xxxl,
  },
  logoName: {
    color: colors.white,
    fontSize: typography.sizes.md,
    fontWeight: '700',
  },
  logoSub: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: typography.sizes.xs,
    letterSpacing: 1,
  },
  notifBell: {
    width: 34,
    height: 34,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  notifIcon: {
    fontSize: typography.sizes.lg,
  },
  notifDot: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 7,
    height: 7,
    borderRadius: borderRadius.full,
    backgroundColor: colors.gold,
    borderWidth: 1.5,
    borderColor: colors.darkPurple,
  },
  greeting: {
    color: 'rgba(255, 255, 255, 0.55)',
    fontSize: typography.sizes.xs,
    marginBottom: spacing.xs,
  },
  greetingName: {
    color: colors.white,
    fontSize: typography.sizes.xxl,
    fontWeight: '700',
    marginBottom: spacing.md,
  },
  districtChip: {
    backgroundColor: 'rgba(212, 160, 23, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(212, 160, 23, 0.35)',
    borderRadius: borderRadius.full,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    alignSelf: 'flex-start',
    marginTop: spacing.md,
  },
  districtText: {
    color: colors.gold,
    fontSize: typography.sizes.xs,
    fontWeight: '600',
  },
  ticker: {
    backgroundColor: colors.orangeRed,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  tickerBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    color: colors.white,
    fontSize: typography.sizes.xs,
    fontWeight: '700',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    letterSpacing: 0.5,
  },
  tickerText: {
    color: colors.white,
    fontSize: typography.sizes.xs,
    fontWeight: '500',
    flex: 1,
  },
  body: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: typography.sizes.md,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.orangeRed,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  liveDot: {
    width: 5,
    height: 5,
    borderRadius: borderRadius.full,
    backgroundColor: colors.white,
  },
  liveBadgeText: {
    color: colors.white,
    fontSize: typography.sizes.xs,
    fontWeight: '700',
    letterSpacing: 1,
  },
  seeAllButton: {
    fontSize: typography.sizes.xs,
    color: colors.lightPurple,
    fontWeight: '600',
  },
  liveCard: {
    backgroundColor: colors.darkPurple,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    position: 'relative',
  },
  liveBadgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.orangeRed,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    alignSelf: 'flex-start',
    marginBottom: spacing.md,
  },
  liveTitle: {
    color: colors.white,
    fontSize: typography.sizes.md,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  liveMeta: {
    color: 'rgba(255, 255, 255, 0.55)',
    fontSize: typography.sizes.xs,
  },
  livePlayButton: {
    position: 'absolute',
    right: spacing.lg,
    top: '50%',
    marginTop: -20,
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  livePlayIcon: {
    fontSize: typography.sizes.lg,
    color: colors.white,
  },
  quickGrid: {
    display: 'grid',
    gap: spacing.md,
    marginBottom: spacing.lg,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  quickCard: {
    width: '48%',
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    alignItems: 'flex-start',
  },
  quickCardPurple: {
    backgroundColor: colors.purple,
  },
  quickCardOrange: {
    backgroundColor: colors.orangeRed,
  },
  quickCardWhite: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
  },
  quickIcon: {
    fontSize: typography.sizes.xxxl,
    marginBottom: spacing.sm,
  },
  quickTitle: {
    color: colors.white,
    fontSize: typography.sizes.sm,
    fontWeight: '700',
  },
  quickTitleDark: {
    color: colors.textPrimary,
    fontSize: typography.sizes.sm,
    fontWeight: '700',
  },
  quickSub: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: typography.sizes.xs,
    marginTop: spacing.xs,
  },
  quickSubDark: {
    color: colors.textSecondary,
    fontSize: typography.sizes.xs,
    marginTop: spacing.xs,
  },
  eventCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  eventDate: {
    width: 44,
    height: 50,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eventDay: {
    color: colors.white,
    fontSize: typography.sizes.xl,
    fontWeight: '800',
  },
  eventMonth: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: typography.sizes.xs,
    letterSpacing: 0.5,
  },
  eventInfo: {
    flex: 1,
  },
  eventTitle: {
    color: colors.textPrimary,
    fontSize: typography.sizes.sm,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  eventVenue: {
    color: colors.textSecondary,
    fontSize: typography.sizes.xs,
    marginBottom: spacing.sm,
  },
  eventTag: {
    backgroundColor: colors.surfaceLight,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    alignSelf: 'flex-start',
  },
  eventTagText: {
    color: colors.purple,
    fontSize: typography.sizes.xs,
    fontWeight: '700',
  },
  emptyText: {
    textAlign: 'center',
    color: colors.textSecondary,
    fontSize: typography.sizes.base,
    paddingVertical: spacing.xl,
  },
  spacer: {
    height: spacing.xxl,
  },
});

export default HomeScreen;
