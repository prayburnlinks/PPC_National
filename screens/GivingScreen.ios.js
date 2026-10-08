/**
 * Giving Screen
 *
 * Apple Guideline 3.2.2(iv): an app may not collect charitable donations
 * in-app unless the organisation is an approved Benevity/Candid nonprofit.
 * PPC National is neither, so this screen no longer selects a fund/amount
 * or shows bank details for an in-app "donation flow" — it only explains
 * giving and links out to give.html (web/give.html) for the actual EFT
 * details, opened in the device's browser. Fund descriptions here are
 * informational only, not selectable.
 *
 * iOS-only (this .ios.js file). Android and web use the plain
 * GivingScreen.js instead, which keeps the original in-app flow — Google
 * Play has no equivalent restriction on donation collection.
 */

import React from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Text,
  Linking,
  Alert,
  Image,
} from 'react-native';
import { colors, spacing, borderRadius, typography } from '../constants/theme';
import { GIVING_FUNDS } from '../constants/config';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const GIVE_URL = 'https://ppc-national-church.web.app/give.html';

const openGivePage = () => {
  Linking.openURL(GIVE_URL).catch(() =>
    Alert.alert('Could not open link', 'Please visit ' + GIVE_URL + ' in your browser.')
  );
};

const GivingScreen = () => {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.container}>
      {/* Frozen Header */}
      <View style={[styles.heroHeader, { paddingTop: insets.top + spacing.md }]}>
        <Image source={require('../assets/emblem.jpg')} style={styles.emblem} resizeMode="contain" />
        <Text style={styles.heroTitle}>Give to God's Work</Text>
        <Text style={styles.heroVerse}>
          "Bring the whole tithe into the storehouse…" — Malachi 3:10
        </Text>
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Where Your Giving Goes</Text>
            <View style={styles.fundGrid}>
              {GIVING_FUNDS.map((fund) => (
                <View key={fund.id} style={styles.fundCard}>
                  <Text style={styles.fundIcon}>{fund.icon}</Text>
                  <Text style={styles.fundName}>{fund.name}</Text>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>How to Give</Text>
            <Text style={styles.bodyText}>
              Giving is made directly through your own banking app via EFT — this app does not
              collect payment. Tap below for our banking details and giving reference on our website.
            </Text>
          </View>

          <TouchableOpacity style={styles.giveButton} onPress={openGivePage}>
            <Text style={styles.giveButtonText}>Give Now — Opens in Browser →</Text>
          </TouchableOpacity>

          <Text style={styles.secureNote}>
            You'll be taken to ppc-national-church.web.app to view our EFT banking details.
          </Text>
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
  scroll: {
    flex: 1,
  },
  emblem: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.white,
    marginBottom: spacing.sm,
  },
  heroHeader: {
    backgroundColor: colors.darkBlue,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xl,
    alignItems: 'center',
  },
  heroTitle: {
    color: colors.white,
    fontSize: typography.sizes.xxl,
    fontWeight: '700',
    marginBottom: spacing.sm,
  },
  heroVerse: {
    color: 'rgba(255, 255, 255, 0.75)',
    fontSize: typography.sizes.xs,
    fontStyle: 'italic',
    lineHeight: 18,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: typography.sizes.md,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  bodyText: {
    fontSize: typography.sizes.base,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  fundGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  fundCard: {
    width: '48%',
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
  },
  fundIcon: {
    fontSize: typography.sizes.lg,
    marginBottom: spacing.sm,
  },
  fundName: {
    fontSize: typography.sizes.xs,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  giveButton: {
    backgroundColor: colors.blue,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  giveButtonText: {
    color: colors.white,
    fontSize: typography.sizes.md,
    fontWeight: '700',
  },
  secureNote: {
    textAlign: 'center',
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
  spacer: {
    height: spacing.xxl,
  },
});

export default GivingScreen;
