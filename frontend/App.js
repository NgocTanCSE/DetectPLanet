/**
 * AgriScan AI — App entry point (React Native shell)
 *
 * Navigation shell routes screens from frontend/screens/ and shared
 * components from frontend/components/. Utilities live in frontend/utils/,
 * hooks in frontend/hooks/, services in frontend/services/.
 * App.js is the single entry point that wires them together.
 */
import React, { useState, Component, useEffect } from "react";
import {
  StatusBar,
  View,
  Text,
  BackHandler,
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { colors, typography } from "./utils/theme";
import BottomNav from "./components/layout/BottomNav";
import AppHeader from "./components/layout/AppHeader";
import { useFonts } from "./hooks/useFonts";
import { verifySession, onAuthStateChanged } from "./services/auth";
import LoginScreen from "./screens/LoginScreen";

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
import HomeScreen from "./screens/HomeScreen";
import CameraScreen from "./screens/CameraScreen";
import ScanScreen from "./screens/ScanScreen";
import ResultScreen from "./screens/ResultScreen";
import HistoryScreen from "./screens/HistoryScreen";
import ChatScreen from "./screens/ChatScreen";
import AlertScreen from "./screens/AlertScreen";

  // Maps a screen key -> the bottom-tab that should appear "active"
  const SCREEN_TO_TAB = {
    home: "home",
    camera: "scan",
    scan: "scan",
    result: "scan",
    guides: "guides",
    chat: "chat",
    settings: "settings",
    alerts: "alerts",
  };

// Real screens for the remaining nav tabs (were placeholders before)
import GuidesScreen from "./screens/GuidesScreen";
import SettingsScreen from "./screens/SettingsScreen";

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

  // BottomNav is hidden on the full-screen camera flow and on the result
  // screen (result has its own quick action bar). It stays available on all
  // other tabbed routes including scan so the user can navigate away after
  // analysis.
  const hideBottomNav = screen === "camera" || screen === "result";
  // ── Android hardware back handler ─────────────────────────────────────
  useEffect(() => {
    const handleBack = () => {
      if (screen !== "home") {
        const prevMap = {
          camera: "home",
          scan: "home",
          result: "home",
          history: "home",
          guides: "home",
          chat: "home",
          settings: "home",
          alerts: "home",
        };
        setParams({});
        setScreen(prevMap[screen] || "home");
        return true;
      }
      return false;
    };
    const subscription = BackHandler.addEventListener("hardwareBackPress", handleBack);
    return () => subscription.remove();
  }, [screen]);

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
    case "alerts":
      ActiveScreen = AlertScreen;
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
          {/* BottomNav is hidden on the full-screen task flows (camera / scan) so it
              cannot overlap the camera shutter and the analysis preview sheet's
              "Phân tích ngay" button. It stays available on ALL tabbed routes
              including chat — previously chat hid the nav bar which caused users
              to lose navigation context. The chat input row's zIndex (21) is now
              higher than the BottomNav's (20) so taps are never intercepted. */}
          {hideBottomNav ? null : (
            <BottomNav
              activeTab={SCREEN_TO_TAB[screen] || "home"}
              onTabPress={(tab) => {
                setParams({});
                setScreen(tab);
              }}
            />
          )}
        </SafeAreaView>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}
