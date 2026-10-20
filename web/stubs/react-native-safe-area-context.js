/**
 * Web stub for react-native-safe-area-context.
 *
 * The real package lacks a proper `.web` variant for every sub-module
 * (e.g. InitialWindow.ts unconditionally imports TurboModuleRegistry which
 * doesn't exist in react-native-web).  This stub provides a minimal
 * SafeAreaProvider / SafeAreaView / useSafeAreaInsets that always returns
 * zero insets — sufficient for the E2E test browser which has no physical
 * cutout.
 */

const React = require('react');
const { View } = require('react-native');

const defaultInsets = { top: 0, bottom: 0, left: 0, right: 0 };
const defaultFrame = { x: 0, y: 0, width: 0, height: 0 };

const SafeAreaInsetsContext = React.createContext(defaultInsets);
const SafeAreaFrameContext = React.createContext(defaultFrame);

function SafeAreaProvider({ children }) {
  return React.createElement(
    SafeAreaInsetsContext.Provider,
    { value: defaultInsets },
    React.createElement(
      SafeAreaFrameContext.Provider,
      { value: defaultFrame },
      children
    )
  );
}

const SafeAreaView = React.forwardRef(function SafeAreaView(props, ref) {
  return React.createElement(View, { ...props, ref });
});

function useSafeAreaInsets() {
  return React.useContext(SafeAreaInsetsContext);
}

function useSafeAreaFrame() {
  return React.useContext(SafeAreaFrameContext);
}

module.exports = {
  SafeAreaProvider,
  SafeAreaView,
  useSafeAreaInsets,
  useSafeAreaFrame,
  SafeAreaInsetsContext,
  SafeAreaFrameContext,
  SafeAreaConsumer: SafeAreaInsetsContext.Consumer,
  SafeAreaContext: SafeAreaInsetsContext,
  initialWindowMetrics: { insets: defaultInsets, frame: defaultFrame },
  initialWindowSafeAreaInsets: defaultInsets,
};
module.exports.default = module.exports;
