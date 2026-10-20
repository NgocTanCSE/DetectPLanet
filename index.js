/**
 * AgriScan AI — React Native CLI entry point
 *
 * Previously used Expo's registerRootComponent.
 * Now uses React Native's AppRegistry directly.
 */

import { AppRegistry } from 'react-native';
import App from './frontend/App';
import { name as appName } from './app.json';

AppRegistry.registerComponent(appName, () => App);
