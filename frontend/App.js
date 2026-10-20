/**
 * AgriScan AI — App entry point (React Native shell)
 *
 * This is the navigation shell. Each HTML screen is converted 1:1 to a
 * `code.js` inside its own flat folder (home/ scan/ camera/ result/ history/)
 * and routed in here by the bottom navigation bar. Shared helpers (theme,
 * icons, AppHeader, BottomNav, ProgressCircle) live as flat modules in
 * frontend/ — App.js is the single entry point that wires them together.
 *
 * Original student-list App.js was replaced by the AgriScan design-system shell
 * per the HTML→JS conversion request.
 */
import React, { useState, Component, useEffect } from "react";
import { StatusBar, View, Text } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { colors, typography } from "./theme";
import BottomNav from "./BottomNav";
import AppHeader from "./AppHeader";
import { useFonts } from "./useFonts";
import { verifySession, onAuthStateChanged } from "./auth";
import LoginScreen from "./LoginScreen";

// Splash screen is handled natively via the SplashTheme (android
// windowBackground drawable + delayed background clear in MainActivity.onCreate).
// No JS splash-screen package is needed — this avoids the old Android Support
// Library conflict that react-native-splash-screen v3 introduced.

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error, info) {
    console.error("App ErrorBoundary caught:", error, info);
  }
  render() {
    if (this.state.hasError) {
      // NOTE: this fallback is rendered by ErrorBoundary, which sits OUTSIDE
      // <SafeAreaProvider> in App.js. Do NOT use <SafeAreaView> here (it calls
      // useSafeAreaInsets and would re-throw "No safe area value available",
      // wiping the whole React tree on web). A plain <View> fallback keeps the
      // boundary robust and guarantees we always see the *real* error instead
      // of a masked secondary crash.
      return (
        <View
          style={{
            flex: 1,
            backgroundColor: colors.paper,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text
            style={[typography.headline.sm, { color: colors["on-surface"] }]}
          >
            Đã xảy ra lỗi
          </Text>
          <Text
            style={[typography.body.sm, { color: colors.muted, marginTop: 8 }]}
          >
            Vui lòng khởi động lại ứng dụng.
          </Text>
        </View>
      );
    }
    return this.props.children;
  }
}

// Converted screens (each is the RN port of its HTML `code.html`)
import HomeScreen from "./home/code";
import CameraScreen from "./camera/code";
import ScanScreen from "./scan/code";
import ResultScreen from "./result/code";
import HistoryScreen from "./history/code";
import ChatScreen from "./chat/code";

// Maps a screen key -> the bottom-tab that should appear "active"
const SCREEN_TO_TAB = {
  home: "home",
  camera: "scan",
  scan: "scan",
  result: "scan",
  history: "history",
  guides: "guides",
  chat: "chat",
  settings: "settings",
};

// Real screens for the remaining nav tabs (were placeholders before)
import GuidesScreen from "./guides/code";
import SettingsScreen from "./settings/code";

// ── Auth gate ───────────────────────────────────────────────────────────
// The Google OAuth flow is fully implemented (auth.js + LoginScreen +
// /auth/google backend). The gate is OFF by default so the app is usable
// without Google credentials; flip it on for production by setting
// REQUIRE_AUTH=true in .env (consumed by react-native-config at build time)
// once GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET are configured. NO fake user
// is ever injected.
function isAuthRequired() {
  try {
    const Config = require('react-native-config');
    return Config && Config.REQUIRE_AUTH === 'true';
  } catch {
    return false;
  }
}
const REQUIRE_AUTH = isAuthRequired();

export default function App() {
  const { loaded: fontsLoaded } = useFonts();
  const [screen, setScreen] = useState("home");
  const [params, setParams] = useState({});
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(!REQUIRE_AUTH);

  // Check persisted session on startup (only when the gate is on)
  useEffect(() => {
    if (!REQUIRE_AUTH) return;
    verifySession().then((u) => {
      setUser(u);
      setAuthReady(true);
    });
  }, []);

  // Subscribe to auth changes (only when the gate is on)
  useEffect(() => {
    if (!REQUIRE_AUTH) return;
    const unsub = onAuthStateChanged((u) => setUser(u));
    return unsub;
  }, []);

  // Passed to every screen so they can navigate and pass data without external router.
  const navigation = {
    screen,
    params,
    navigate: (nextScreen, nextParams = {}) => {
      setParams(nextParams);
      setScreen(nextScreen);
    },
  };

  let ActiveScreen;
  switch (screen) {
    case "home":
      ActiveScreen = HomeScreen;
      break;
    case "camera":
      ActiveScreen = CameraScreen;
      break;
    case "scan":
      ActiveScreen = ScanScreen;
      break;
    case "result":
      ActiveScreen = ResultScreen;
      break;
    case "history":
      ActiveScreen = HistoryScreen;
      break;
    case "guides":
      ActiveScreen = GuidesScreen;
      break;
    case "settings":
      ActiveScreen = SettingsScreen;
      break;
    case "chat":
      ActiveScreen = ChatScreen;
      break;
    default:
      ActiveScreen = HomeScreen;
  }

  // When the auth gate is OFF (requireAuth not set — the default), the app is
  // usable without Google credentials, so render the Home screen directly.
  // Only fall back to Login when auth is actually required AND we have no
  // verified session yet.
  if (REQUIRE_AUTH && (!authReady || !user)) {
    const loginNav = {
      navigate: (nextScreen, nextParams = {}) => {
        setParams(nextParams);
        setScreen(nextScreen);
      },
      screen: "login",
      params: {},
    };
    return (
      <SafeAreaProvider>
        <ErrorBoundary>
          <SafeAreaView style={{ flex: 1, backgroundColor: colors.paper }}>
            <StatusBar barStyle="dark-content" backgroundColor={colors.paper} />
            <LoginScreen navigation={loginNav} />
          </SafeAreaView>
        </ErrorBoundary>
      </SafeAreaProvider>
    );
  }

  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
          <StatusBar barStyle="dark-content" backgroundColor={colors.paper} />
          <ActiveScreen navigation={navigation} route={{ params }} />
          {/* BottomNav is hidden on the full-screen task flows (camera / scan /
              chat) so it cannot overlap the camera shutter and the analysis
              preview sheet's "Phân tích ngay" button, or the chat
              composer (z-index stacking bug that
              intercepted taps). It stays available on the tabbed routes.
              Result is shown because users often want to navigate elsewhere
              after viewing a diagnosis. */}
          {screen !== "camera" &&
          screen !== "scan" &&
          screen !== "chat" ? (
            <BottomNav
              activeTab={SCREEN_TO_TAB[screen] || "home"}
              onTabPress={(tab) => {
                setParams({});
                setScreen(tab);
              }}
            />
          ) : null}
        </SafeAreaView>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}
