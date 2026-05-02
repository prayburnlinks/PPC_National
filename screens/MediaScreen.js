/**
 * Media & Sermons Screen
 * Access to church media and sermon recordings
 */

import React from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Text,
} from 'react-native';
import { colors, spacing, borderRadius, typography } from '../constants/theme';

const MediaScreen = ({ navigation }) => {
  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.hero}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.heroTitle}>Media & Sermons</Text>
      </View>

      <View style={styles.content}>
        {/* Live Card */}
        <View style={styles.section}>
          <View style={styles.liveCard}>
            <View style={styles.liveBadge}>
              <View style={styles.liveDot} />
              <Text style={styles.liveBadgeText}>LIVE ON YOUTUBE</Text>
            </View>
            <Text style={styles.liveTitle}>Sunday Morning Service</Text>
            <Text style={styles.liveMeta}>🎤 Ps. David Mokoena · 👁 2.4k</Text>
            <View style={styles.playButton}>
              <Text style={styles.playIcon}>▶</Text>
            </View>
          </View>
        </View>

        {/* Recent Sermons */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Sermons</Text>
          
          {[
            { emoji: '🎤', title: 'Walking in Divine Purpose', meta: 'Ps. Ruth Dlamini · 22 Apr · 45:22 · 8.2k views' },
            { emoji: '🔥', title: 'The Fire That Never Dies', meta: 'Overseer Baloyi · 15 Apr · 1:02:45 · 14.7k' },
            { emoji: '✝', title: 'Restoration Season', meta: 'Ps. Sipho Nkosi · 8 Apr · 38:10 · 5.9k' },
            { emoji: '📖', title: 'The Word Is a Lamp', meta: 'Ps. Hannah Mokoena · 1 Apr · 52:30 · 4.1k' },
          ].map((sermon, idx) => (
            <TouchableOpacity key={idx} style={styles.sermonCard}>
              <View style={[styles.sermonThumb, { backgroundColor: colors.purple }]}>
                <Text style={styles.sermonEmoji}>{sermon.emoji}</Text>
              </View>
              <View style={styles.sermonInfo}>
                <Text style={styles.sermonTitle}>{sermon.title}</Text>
                <Text style={styles.sermonMeta}>{sermon.meta}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Past Conventions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Past Conventions</Text>
          <View style={styles.liveCard}>
            <Text style={styles.conventionLabel}>NATIONAL CONVENTION 2024</Text>
            <Text style={styles.liveTitle}>Full Convention Recordings</Text>
            <Text style={styles.liveMeta}>42 messages · 5 days · All districts</Text>
            <View style={styles.playButton}>
              <Text style={styles.playIcon}>▶</Text>
            </View>
          </View>
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
  hero: {
    backgroundColor: colors.darkPurple,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    gap: spacing.md,
  },
  backButton: {
    width: 34,
    height: 34,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonText: {
    color: colors.white,
    fontSize: typography.sizes.lg,
  },
  heroTitle: {
    color: colors.white,
    fontSize: typography.sizes.lg,
    fontWeight: '700',
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: typography.sizes.md,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  liveCard: {
    backgroundColor: colors.darkPurple,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    position: 'relative',
  },
  liveBadge: {
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
  playButton: {
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
  playIcon: {
    fontSize: typography.sizes.lg,
    color: colors.white,
  },
  conventionLabel: {
    color: 'rgba(255, 255, 255, 0.45)',
    fontSize: typography.sizes.xs,
    letterSpacing: 1,
    marginBottom: spacing.sm,
  },
  sermonCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  sermonThumb: {
    width: 52,
    height: 48,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sermonEmoji: {
    fontSize: typography.sizes.xl,
  },
  sermonInfo: {
    flex: 1,
  },
  sermonTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  sermonMeta: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
  },
  spacer: {
    height: spacing.lg,
  },
});

export default MediaScreen;
