/**
 * AgriScan AI — Font loading hook.
 *
 * In the Expo managed workflow, fonts were loaded at runtime via expo-font +
 * @expo-google-fonts/*.  In the React Native CLI workflow (this project),
 * fonts are packaged as native .ttf assets in
 * `android/app/src/main/assets/fonts/` and are available immediately at app
 * launch — no async loading required.
 *
 * This hook now simply returns { loaded: true } on native platforms so the
 * <App> component renders without delay.  On web, it also resolves immediately
 * (the browser falls back to system fonts; the same fonts can be loaded via
 * @font-face in the web entry if needed).
 *
 * The following design-system fonts must be placed in:
 *   android/app/src/main/assets/fonts/
 *   (and mirrored to ios/AgriScan/fonts/ once iOS support is added)
 *
 *   Geist-Regular.ttf          → "Geist"
 *   Geist-Medium.ttf           → "Geist-Medium"
 *   Geist-SemiBold.ttf         → "Geist-SemiBold"
 *   Geist-Bold.ttf             → "Geist-Bold"
 *   PlusJakartaSans-Regular.ttf        → "PlusJakartaSans-Regular"
 *   PlusJakartaSans-Medium.ttf         → "PlusJakartaSans-Medium"
 *   PlusJakartaSans-SemiBold.ttf       → "PlusJakartaSans-SemiBold"
 *   PlusJakartaSans-Bold.ttf           → "PlusJakartaSans-Bold"
 */
import { useEffect, useState } from 'react';

/**
 * @returns {{ loaded: boolean, error?: string }}
 */
export function useFonts() {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Native fonts (android TTF assets) are bundled at build time and
    // available synchronously — no async loading required.
    setLoaded(true);
  }, []);

  return { loaded, error };
}

export default useFonts;
