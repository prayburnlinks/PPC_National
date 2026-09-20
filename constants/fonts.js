/**
 * Font loading
 * Loads the Ionicons glyph font used by components/Icon.js.
 * Call useAppFonts() once at the app root and hold rendering until it is true.
 * If the font fails to load we still return true so the app never gets stuck.
 */

import { useFonts } from 'expo-font';
import Ionicons from '@expo/vector-icons/Ionicons';

export const FONT_ASSETS = { ...Ionicons.font };

export const useAppFonts = () => {
  const [loaded, error] = useFonts(FONT_ASSETS);
  return loaded || !!error;
};
