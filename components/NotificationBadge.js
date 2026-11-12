import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, AccessibilityInfo, StyleSheet } from 'react-native';
import { colors } from '../constants/theme';
import { badgeLabel } from '../utils/badge';

const SIZE = 22;
const PULSE_MS = 1800;

/**
 * The red unread count that sits on a corner of the bell. A white ring keeps it
 * readable against the navy header, and an optional pulse draws the eye while
 * anything is unread. The pulse stays off for anyone who has asked their phone
 * to reduce motion. The caller positions it (`style`) and labels the control it
 * sits on, so this hides itself from screen readers.
 */
const NotificationBadge = ({ count, pulse = false, style }) => {
  const progress = useRef(new Animated.Value(0)).current;
  const visible = count > 0;

  useEffect(() => {
    if (!pulse || !visible) return undefined;
    let cancelled = false;
    let loop;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((reduceMotion) => {
        if (cancelled || reduceMotion) return;
        loop = Animated.loop(
          Animated.timing(progress, { toValue: 1, duration: PULSE_MS, useNativeDriver: true })
        );
        loop.start();
      })
      .catch(() => {});
    return () => {
      cancelled = true;
      if (loop) loop.stop();
      progress.setValue(0);
    };
  }, [pulse, visible, progress]);

  if (!visible) return null;

  return (
    <View
      style={[styles.anchor, style]}
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {pulse && (
        <Animated.View
          testID="badge-pulse"
          style={[
            styles.pulse,
            {
              opacity: progress.interpolate({ inputRange: [0, 1], outputRange: [0.55, 0] }),
              transform: [{ scale: progress.interpolate({ inputRange: [0, 1], outputRange: [1, 2.4] }) }],
            },
          ]}
        />
      )}
      <View style={styles.badge}>
        <Text style={styles.text}>{badgeLabel(count)}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  anchor: {
    position: 'absolute',
    top: -4,
    right: -4,
    height: SIZE,
    minWidth: SIZE,
  },
  pulse: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: SIZE / 2,
    backgroundColor: colors.red,
  },
  badge: {
    height: SIZE,
    minWidth: SIZE,
    paddingHorizontal: 6,
    borderRadius: SIZE / 2,
    backgroundColor: colors.red,
    borderWidth: 2,
    borderColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '800',
  },
});

export default NotificationBadge;
