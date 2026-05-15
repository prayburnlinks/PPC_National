import React, { useState, useEffect, useRef, useMemo } from 'react';
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

const DAILY_SCRIPTURES = [
  { verse: "I can do all things through Christ who strengthens me.", ref: "Philippians 4:13" },
  { verse: "For I know the plans I have for you, declares the Lord, plans to prosper you and not to harm you, plans to give you hope and a future.", ref: "Jeremiah 29:11" },
  { verse: "The Lord is my shepherd; I shall not want.", ref: "Psalm 23:1" },
  { verse: "Trust in the Lord with all your heart and lean not on your own understanding.", ref: "Proverbs 3:5" },
  { verse: "Be strong and courageous. Do not be afraid; do not be discouraged, for the Lord your God will be with you wherever you go.", ref: "Joshua 1:9" },
  { verse: "The Lord is my light and my salvation — whom shall I fear?", ref: "Psalm 27:1" },
  { verse: "Come to me, all you who are weary and burdened, and I will give you rest.", ref: "Matthew 11:28" },
  { verse: "But those who hope in the Lord will renew their strength. They will soar on wings like eagles.", ref: "Isaiah 40:31" },
  { verse: "The Lord bless you and keep you; the Lord make his face shine on you and be gracious to you.", ref: "Numbers 6:24-25" },
  { verse: "Delight yourself in the Lord, and he will give you the desires of your heart.", ref: "Psalm 37:4" },
  { verse: "For God so loved the world that he gave his one and only Son, that whoever believes in him shall not perish but have eternal life.", ref: "John 3:16" },
  { verse: "The name of the Lord is a fortified tower; the righteous run to it and are safe.", ref: "Proverbs 18:10" },
  { verse: "Cast all your anxiety on him because he cares for you.", ref: "1 Peter 5:7" },
  { verse: "For the Spirit God gave us does not make us timid, but gives us power, love and self-discipline.", ref: "2 Timothy 1:7" },
  { verse: "No weapon formed against you shall prosper.", ref: "Isaiah 54:17" },
  { verse: "The Lord will fight for you; you need only to be still.", ref: "Exodus 14:14" },
  { verse: "Even though I walk through the darkest valley, I will fear no evil, for you are with me.", ref: "Psalm 23:4" },
  { verse: "Do not be anxious about anything, but in every situation, by prayer and petition, with thanksgiving, present your requests to God.", ref: "Philippians 4:6" },
  { verse: "And we know that in all things God works for the good of those who love him.", ref: "Romans 8:28" },
  { verse: "The joy of the Lord is your strength.", ref: "Nehemiah 8:10" },
  { verse: "With God all things are possible.", ref: "Matthew 19:26" },
  { verse: "He who began a good work in you will carry it on to completion until the day of Christ Jesus.", ref: "Philippians 1:6" },
  { verse: "The Lord your God is with you, the Mighty Warrior who saves. He will take great delight in you; in his love he will no longer rebuke you, but will rejoice over you with singing.", ref: "Zephaniah 3:17" },
  { verse: "I praise you because I am fearfully and wonderfully made; your works are wonderful, I know that full well.", ref: "Psalm 139:14" },
  { verse: "Seek first his kingdom and his righteousness, and all these things will be given to you as well.", ref: "Matthew 6:33" },
  { verse: "My grace is sufficient for you, for my power is made perfect in weakness.", ref: "2 Corinthians 12:9" },
  { verse: "For I am convinced that neither death nor life, neither angels nor demons, neither the present nor the future, nor any powers, can separate us from the love of God.", ref: "Romans 8:38-39" },
  { verse: "The thief comes only to steal and kill and destroy; I have come that they may have life, and have it to the full.", ref: "John 10:10" },
  { verse: "Call to me and I will answer you and tell you great and unsearchable things you do not know.", ref: "Jeremiah 33:3" },
  { verse: "Have I not commanded you? Be strong and courageous. Do not be discouraged, for the Lord your God will be with you wherever you go.", ref: "Joshua 1:9" },
  { verse: "God is our refuge and strength, an ever-present help in trouble.", ref: "Psalm 46:1" },
];

const getDailyScripture = () => {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const dayOfYear = Math.floor((now - start) / 86400000);
  return DAILY_SCRIPTURES[dayOfYear % DAILY_SCRIPTURES.length];
};

const getDayLabel = () => {
  return new Date().toLocaleDateString('en-ZA', { weekday: 'long', day: 'numeric', month: 'long' });
};

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

const ScriptureBoard = () => {
  const scripture = useMemo(() => getDailyScripture(), []);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }).start();
  }, []);

  return (
    <Animated.View style={[styles.scriptureBoard, { opacity: fadeAnim }]}>
      <View style={styles.scriptureBoardHeader}>
        <View style={styles.scriptureBadge}>
          <Text style={styles.scriptureBadgeText}>VERSE OF THE DAY</Text>
        </View>
        <Text style={styles.scriptureDateText}>{getDayLabel()}</Text>
      </View>
      <View style={styles.scriptureAccentBar} />
      <Text style={styles.scriptureVerse}>{scripture.verse}</Text>
      <View style={styles.scriptureDivider} />
      <Text style={styles.scriptureRef}>{scripture.ref}</Text>
    </Animated.View>
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

          {/* Daily Scripture Board */}
          <ScriptureBoard />

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
  scriptureBoard: {
    backgroundColor: colors.darkBlue,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    marginTop: spacing.lg,
    marginBottom: spacing.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(212, 160, 23, 0.25)',
  },
  scriptureBoardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  scriptureBadge: {
    backgroundColor: 'rgba(212, 160, 23, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(212, 160, 23, 0.4)',
    borderRadius: borderRadius.full,
    paddingVertical: 3,
    paddingHorizontal: spacing.md,
  },
  scriptureBadgeText: {
    color: colors.gold,
    fontSize: typography.sizes.xs,
    fontWeight: '700',
    letterSpacing: 1,
  },
  scriptureDateText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: typography.sizes.xs,
  },
  scriptureAccentBar: {
    width: 32,
    height: 3,
    backgroundColor: colors.gold,
    opacity: 0.5,
    marginBottom: spacing.md,
  },
  scriptureVerse: {
    color: colors.white,
    fontSize: typography.sizes.md,
    fontWeight: '500',
    lineHeight: 26,
    marginBottom: spacing.lg,
  },
  scriptureDivider: {
    width: 40,
    height: 2,
    backgroundColor: colors.gold,
    marginBottom: spacing.md,
    opacity: 0.6,
  },
  scriptureRef: {
    color: colors.gold,
    fontSize: typography.sizes.sm,
    fontWeight: '700',
    letterSpacing: 0.5,
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
