/**
 * AgriScan AI — Font loading hook.
 *
 * Loads design-system fonts via expo-font before the app renders:
 *   - Geist (sans-serif)         — headings, app name, brand elements
 *   - Plus Jakarta Sans (sans)   — body text, labels, UI controls
 *
 * When expo-font or the font packages are not installed, returns
 * { loaded: true } so the app still renders using system fallback fonts.
 *
 * Install for full fidelity:
 *   npx expo install expo-font @expo-google-fonts/geist @expo-google-fonts/plus-jakarta-sans
 */
import { useEffect, useState } from 'react';

let _fontLoaders = null;

// Lazy-load expo-font + Google Fonts only if they are installed.
// This keeps the module resolvable even when the packages are absent.
async function _tryLoadFonts() {
  try {
    const font = require('expo-font');
    const geist = require('@expo-google-fonts/geist');
    const plus = require('@expo-google-fonts/plus-jakarta-sans');

    const [
      Geist_400Regular,
      Geist_500Medium,
      Geist_600SemiBold,
      Geist_700Bold,
      PlusJakartaSans_400Regular,
      PlusJakartaSans_500Medium,
      PlusJakartaSans_600SemiBold,
      PlusJakartaSans_700Bold,
    ] = await Promise.all([
      geist.Geist_400Regular,
      geist.Geist_500Medium,
      geist.Geist_600SemiBold,
      geist.Geist_700Bold,
      plus.PlusJakartaSans_400Regular,
      plus.PlusJakartaSans_500Medium,
      plus.PlusJakartaSans_600SemiBold,
      plus.PlusJakartaSans_700Bold,
    ]);

    return font.loadAsync({
      Geist: Geist_400Regular,
      'Geist-Medium': Geist_500Medium,
      'Geist-SemiBold': Geist_600SemiBold,
      'Geist-Bold': Geist_700Bold,
      'PlusJakartaSans-Regular': PlusJakartaSans_400Regular,
      'PlusJakartaSans-Medium': PlusJakartaSans_500Medium,
      'PlusJakartaSans-SemiBold': PlusJakartaSans_600SemiBold,
      'PlusJakartaSans-Bold': PlusJakartaSans_700Bold,
    });
  } catch {
    // Fonts not installed — app renders with system fallback fonts.
    return [Promise.resolve()];
  }
}

/**
 * @returns {{ loaded: boolean, error?: string }}
 */
export function useFonts() {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!loaded) {
      _tryLoadFonts()
        .then(() => setLoaded(true))
        .catch((e) => setError(e?.message ?? 'Unknown font error'));
    }
  }, [loaded]);

  return { loaded, error };
}

export default useFonts;
