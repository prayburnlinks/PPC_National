/**
 * Icon + IconBadge
 * One icon vocabulary for the whole app (Ionicons), replacing emoji so glyphs
 * look identical on every phone and inherit the theme colours.
 */

import React from 'react';
import { View, Text } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors, borderRadius } from '../constants/theme';

const Icon = ({ name, size = 20, color = colors.textPrimary, style }) => (
  <Ionicons name={name} size={size} color={color} style={style} accessible={false} />
);

// Tone → [background, glyph colour]
const TONES = {
  blue: [colors.blueTint, colors.blue],
  red: [colors.redTint, colors.red],
  gold: [colors.goldTint, '#8A5A00'],
  green: [colors.greenTint, colors.darkGreen],
  navy: [colors.blue, colors.white],
  crimson: [colors.red, colors.white],
  glass: ['rgba(255,255,255,0.14)', colors.white],
  white: [colors.white, colors.blue],
};

/** A tinted rounded tile holding an icon — used for menu rows, tiles and funds. */
export const IconBadge = ({ name, size = 40, tone = 'blue', shape = 'squircle', style }) => {
  const [bg, fg] = TONES[tone] || TONES.blue;
  const radius = shape === 'circle' ? borderRadius.full : Math.round(size * 0.32);
  return (
    <View
      accessible={false}
      style={[
        { width: size, height: size, borderRadius: radius, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' },
        style,
      ]}
    >
      <Ionicons name={name} size={Math.round(size * 0.5)} color={fg} />
    </View>
  );
};

export default Icon;

/** An icon followed by text on one line — replaces "📍 Venue" style emoji prefixes. */
export const IconText = ({ name, size = 14, color = colors.textSecondary, textStyle, style, children }) => (
  <View style={[{ flexDirection: 'row', alignItems: 'center', gap: 5 }, style]}>
    <Icon name={name} size={size} color={color} />
    <Text style={[textStyle, { flexShrink: 1 }]}>{children}</Text>
  </View>
);
