import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Text,
  Image,
  Linking,
  Animated,
} from 'react-native';
import { colors, spacing, borderRadius, typography } from '../constants/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getLiveStatus } from '../services/firestoreService';

// Update these with the real channel/page URLs
const YOUTUBE_CHANNEL_URL = 'https://www.youtube.com/@PPCNationalChurch';
const YOUTUBE_LIVE_URL    = 'https://www.youtube.com/@PPCNationalChurch/live';
const FACEBOOK_PAGE_URL   = 'https://www.facebook.com/PPCNationalChurch';

const openURL = (url) => Linking.openURL(url).catch(() => {});

const AnimatedLiveDot = () => {
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 0.3, duration: 700, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1,   duration: 700, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return (
    <Animated.View style={[styles.liveDot, { opacity: pulse }]} />
  );
};

const MediaScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const [liveStatus, setLiveStatus] = useState({ isLive: false, title: '' });

  useEffect(() => {
    getLiveStatus().then(setLiveStatus);
  }, []);

  return (
    <View style={styles.container}>
      {/* Frozen Header */}
      <View style={[styles.hero, { paddingTop: insets.top + spacing.md }]}>
        <Image source={require('../assets/emblem.jpg')} style={styles.emblem} resizeMode="contain" />
        <Text style={styles.heroTitle}>Media</Text>
        {liveStatus.isLive && (
          <View style={styles.liveHeaderBadge}>
            <AnimatedLiveDot />
            <Text style={styles.liveHeaderText}>LIVE</Text>
          </View>
        )}
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.content}>

          {/* Live Banner — shown only when isLive */}
          {liveStatus.isLive && (
            <TouchableOpacity
              style={styles.liveBanner}
              onPress={() => openURL(
                liveStatus.platform === 'facebook' ? FACEBOOK_PAGE_URL : YOUTUBE_LIVE_URL
              )}
              activeOpacity={0.85}
            >
              <View style={styles.liveBadge}>
                <AnimatedLiveDot />
                <Text style={styles.liveBadgeText}>
                  LIVE ON {liveStatus.platform === 'facebook' ? 'FACEBOOK' : 'YOUTUBE'}
                </Text>
              </View>
              <Text style={styles.liveTitle}>
                {liveStatus.title || 'Live Service'}
              </Text>
              <Text style={styles.liveSub}>Tap to watch now</Text>
              <View style={styles.playButton}>
                <Text style={styles.playIcon}>▶</Text>
              </View>
            </TouchableOpacity>
          )}

          {/* Platform Cards */}
          <Text style={styles.sectionTitle}>Watch & Follow</Text>

          <TouchableOpacity
            style={[styles.platformCard, styles.youtubeCard]}
            onPress={() => openURL(YOUTUBE_CHANNEL_URL)}
            activeOpacity={0.85}
          >
            <View style={styles.platformLeft}>
              <Text style={styles.platformIcon}>▶</Text>
              <View>
                <Text style={styles.platformName}>YouTube</Text>
                <Text style={styles.platformSub}>Sermons, livestreams & more</Text>
              </View>
            </View>
            <Text style={styles.platformArrow}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.platformCard, styles.facebookCard]}
            onPress={() => openURL(FACEBOOK_PAGE_URL)}
            activeOpacity={0.85}
          >
            <View style={styles.platformLeft}>
              <Text style={styles.platformIcon}>f</Text>
              <View>
                <Text style={styles.platformName}>Facebook</Text>
                <Text style={styles.platformSub}>Updates, events & live streams</Text>
              </View>
            </View>
            <Text style={styles.platformArrow}>›</Text>
          </TouchableOpacity>

          {/* Recent Sermons */}
          <Text style={[styles.sectionTitle, { marginTop: spacing.lg }]}>Recent Sermons</Text>

          {[
            { emoji: '🎤', title: 'Walking in Divine Purpose', meta: 'Ps. Ruth Dlamini · 22 Apr' },
            { emoji: '🔥', title: 'The Fire That Never Dies', meta: 'Overseer Baloyi · 15 Apr' },
            { emoji: '✝', title: 'Restoration Season', meta: 'Ps. Sipho Nkosi · 8 Apr' },
            { emoji: '📖', title: 'The Word Is a Lamp', meta: 'Ps. Hannah Mokoena · 1 Apr' },
          ].map((sermon, idx) => (
            <TouchableOpacity
              key={idx}
              style={styles.sermonCard}
              onPress={() => openURL(YOUTUBE_CHANNEL_URL)}
              activeOpacity={0.8}
            >
              <View style={styles.sermonThumb}>
                <Text style={styles.sermonEmoji}>{sermon.emoji}</Text>
              </View>
              <View style={styles.sermonInfo}>
                <Text style={styles.sermonTitle}>{sermon.title}</Text>
                <Text style={styles.sermonMeta}>{sermon.meta}</Text>
              </View>
              <Text style={styles.sermonArrow}>›</Text>
            </TouchableOpacity>
          ))}

          {/* Featured Video */}
          <TouchableOpacity
            style={styles.featuredCard}
            onPress={() => openURL('https://www.youtube.com/watch?v=2U8i81b-p1s')}
            activeOpacity={0.85}
          >
            <View style={styles.featuredThumb}>
              <Text style={styles.featuredPlay}>▶</Text>
            </View>
            <View style={styles.featuredInfo}>
              <Text style={styles.featuredLabel}>FEATURED</Text>
              <Text style={styles.featuredSub}>Tap to open video</Text>
            </View>
            <View style={styles.featuredRight}>
              <Text style={styles.featuredAssembly}>Ebenezer Assembly</Text>
              <Text style={styles.featuredDistrict}>Southern Cape District</Text>
            </View>
          </TouchableOpacity>

          <View style={styles.spacer} />
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  hero: {
    backgroundColor: colors.darkBlue,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    gap: spacing.md,
  },
  emblem: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.white,
  },
  heroTitle: {
    flex: 1,
    color: colors.white,
    fontSize: typography.sizes.lg,
    fontWeight: '700',
  },
  liveHeaderBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.red,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
  },
  liveHeaderText: {
    color: colors.white,
    fontSize: typography.sizes.xs,
    fontWeight: '700',
    letterSpacing: 1,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  liveBanner: {
    backgroundColor: colors.darkBlue,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.xl,
    position: 'relative',
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.red,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    alignSelf: 'flex-start',
    marginBottom: spacing.md,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
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
  liveSub: {
    color: 'rgba(255,255,255,0.55)',
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
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playIcon: {
    color: colors.white,
    fontSize: typography.sizes.lg,
  },
  sectionTitle: {
    fontSize: typography.sizes.md,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  platformCard: {
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  youtubeCard: {
    backgroundColor: '#FF0000',
  },
  facebookCard: {
    backgroundColor: '#1877F2',
  },
  platformLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  platformIcon: {
    color: colors.white,
    fontSize: 22,
    fontWeight: '900',
    width: 28,
    textAlign: 'center',
  },
  platformName: {
    color: colors.white,
    fontSize: typography.sizes.md,
    fontWeight: '700',
  },
  platformSub: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: typography.sizes.xs,
    marginTop: 2,
  },
  platformArrow: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: typography.sizes.xl,
  },
  sermonCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sermonThumb: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surfaceLight,
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
  sermonArrow: {
    fontSize: typography.sizes.xl,
    color: colors.textSecondary,
  },
  featuredCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  featuredThumb: {
    width: 64,
    height: 56,
    borderRadius: borderRadius.md,
    backgroundColor: '#FF0000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  featuredPlay: {
    color: colors.white,
    fontSize: typography.sizes.xl,
  },
  featuredInfo: {
    flex: 1,
  },
  featuredLabel: {
    fontSize: typography.sizes.xs,
    fontWeight: '700',
    color: colors.red,
    letterSpacing: 1,
    marginBottom: 2,
  },
  featuredTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  featuredSub: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
  },
  spacer: {
    height: spacing.xxxl,
  },
});

export default MediaScreen;
