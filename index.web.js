/**
 * Web entry point for AgriScan AI — used by `react-native bundle --platform web`
 * and the Playwright E2E test suite.
 *
 * In the Expo workflow the Expo dev server handled DOM mounting automatically.
 * Under React Native CLI we must explicitly call `AppRegistry.runApplication`
 * so that react-native-web renders the React tree into <div id="root">.
 */
import { AppRegistry } from 'react-native';
import { name as appName } from './app.json';
import App from './frontend/App';

AppRegistry.registerComponent(appName, () => App);

// On web, react-native-web's AppRegistry does NOT auto-render (unlike Expo's
// dev server). We must explicitly run the application on the DOM.
if (typeof document !== 'undefined') {
  const rootTag = document.getElementById('root');
  AppRegistry.runApplication(appName, { rootTag });
}
