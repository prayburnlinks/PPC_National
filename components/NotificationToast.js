import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Animated, Easing, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, borderRadius, typography } from '../constants/theme';
import { iconForType } from '../constants/notifications';

export const TOAST_VISIBLE_MS = 5000;
const OFFSCREEN = -180;

/**
 * Slides in from the top when a notification arrives while the app is open,
 * stays a few seconds, then slides away. Tapping it opens the notifications.
 * Mount it with a `key` per notification so each one gets its own entrance.
 */
const NotificationToast = ({ notification, onPress, onDismiss }) => {
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(OFFSCREEN)).current;
  const onDismissRef = useRef(onDismiss);
  onDismissRef.current = onDismiss;

  useEffect(() => {
    Animated.timing(translateY, {
      toValue: 0,
      duration: 320,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();

    const timer = setTimeout(() => {
      Animated.timing(translateY, { toValue: OFFSCREEN, duration: 250, useNativeDriver: true })
        .start(() => onDismissRef.current());
    }, TOAST_VISIBLE_MS);

    return () => clearTimeout(timer);
  }, [translateY]);

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[styles.wrap, { top: insets.top + spacing.sm, transform: [{ translateY }] }]}
    >
      <TouchableOpacity
        style={styles.card}
        onPress={onPress}
        activeOpacity={0.9}
        accessibilityRole="button"
        accessibilityLiveRegion="polite"
        accessibilityLabel={`New notification. ${notification.title}. ${notification.body}`}
        accessibilityHint="Opens your notifications"
      >
        <View style={styles.iconBox}>
          <Text style={styles.icon}>{iconForType(notification.type)}</Text>
        </View>
        <View style={styles.info}>
          <Text style={styles.title} numberOfLines={1}>{notification.title}</Text>
          <Text style={styles.body} numberOfLines={2}>{notification.body}</Text>
        </View>
        <Text style={styles.now}>now</Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    zIndex: 1000,
    elevation: 12,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: 14,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    shadowColor: colors.darkBlue,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 12,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: { fontSize: typography.sizes.lg },
  info: { flex: 1 },
  title: {
    color: colors.textPrimary,
    fontSize: typography.sizes.base,
    fontWeight: '700',
  },
  body: {
    color: colors.textSecondary,
    fontSize: typography.sizes.sm,
    marginTop: 1,
  },
  now: {
    color: colors.textSecondary,
    fontSize: typography.sizes.sm,
    alignSelf: 'flex-start',
  },
});

export default NotificationToast;
