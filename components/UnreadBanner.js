import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Animated, StyleSheet } from 'react-native';
import { colors, spacing, borderRadius, typography } from '../constants/theme';
import { badgeLabel } from '../utils/badge';

/**
 * The card on Home that says there is something new, with a peek at the latest
 * one. It is the "you can't miss this" signal, so it only exists while
 * something is unread, and eases in rather than snapping into place.
 */
const UnreadBanner = ({ count, latest, onPress }) => {
  const appear = useRef(new Animated.Value(0)).current;
  const visible = count > 0;

  useEffect(() => {
    if (!visible) return undefined;
    Animated.timing(appear, { toValue: 1, duration: 300, useNativeDriver: true }).start();
    return () => appear.setValue(0);
  }, [visible, appear]);

  if (!visible) return null;

  const headline = count === 1 ? '1 new notification' : `${count} new notifications`;
  const preview = latest ? `${latest.title} · ${latest.body}` : '';

  return (
    <Animated.View
      style={{
        opacity: appear,
        transform: [{ translateY: appear.interpolate({ inputRange: [0, 1], outputRange: [-8, 0] }) }],
      }}
    >
      <TouchableOpacity
        style={styles.card}
        onPress={onPress}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel={latest ? `${headline}. Latest: ${latest.title}` : headline}
        accessibilityHint="Opens your notifications"
      >
        <View style={styles.countCircle}>
          <Text style={styles.countText}>{badgeLabel(count)}</Text>
        </View>
        <View style={styles.info}>
          <Text style={styles.headline}>{headline}</Text>
          {!!preview && <Text style={styles.preview} numberOfLines={1}>{preview}</Text>}
        </View>
        <Text style={styles.chevron}>›</Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    minHeight: 60,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  countCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.red,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countText: {
    color: colors.white,
    fontSize: typography.sizes.lg,
    fontWeight: '800',
  },
  info: { flex: 1 },
  headline: {
    color: colors.textPrimary,
    fontSize: typography.sizes.base,
    fontWeight: '700',
  },
  preview: {
    color: colors.textSecondary,
    fontSize: typography.sizes.sm,
    marginTop: 1,
  },
  chevron: {
    color: colors.textSecondary,
    fontSize: typography.sizes.xl,
  },
});

export default UnreadBanner;
