/**
 * Events Screen Placeholder
 * Shows list of upcoming events
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

const EventsScreen = ({ navigation }) => {
  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Events & Registration</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.placeholder}>
          <Text style={styles.placeholderIcon}>📅</Text>
          <Text style={styles.placeholderTitle}>Events Listing</Text>
          <Text style={styles.placeholderText}>
            Browse all church events and register to attend
          </Text>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    backgroundColor: colors.darkPurple,
  },
  backButton: {
    width: 34,
    height: 34,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  backButtonText: {
    color: colors.white,
    fontSize: typography.sizes.lg,
  },
  headerTitle: {
    color: colors.white,
    fontSize: typography.sizes.lg,
    fontWeight: '700',
  },
  content: {
    padding: spacing.xl,
  },
  placeholder: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.xxxl,
    alignItems: 'center',
    marginTop: spacing.xl,
  },
  placeholderIcon: {
    fontSize: 48,
    marginBottom: spacing.lg,
  },
  placeholderTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  placeholderText: {
    fontSize: typography.sizes.base,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});

export default EventsScreen;
