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
import { useFonts } from "./hooks/useFonts";
import { verifySession, onAuthStateChanged } from "./services/auth";
import LoginScreen from "./screens/LoginScreen";
import ScreenTransition from "./components/motion/ScreenTransition";

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
import ReportScreen from "./screens/ReportScreen";
import NotificationsScreen from "./screens/NotificationsScreen";

  // Maps a screen key -> the bottom-tab that should appear "active".
  // The 4 tabs are home / scan / chat / settings. Lịch sử (history),
  // Cảnh báo (alerts) và Cẩm nang (guides) are sub-screens reached from
  // Trang chủ + Cài đặt, so they keep "home" highlighted on the nav bar.
  const SCREEN_TO_TAB = {
    home: "home",
    camera: "scan",
    scan: "scan",
    result: "scan",
    guides: "home",
    chat: "chat",
    settings: "settings",
    alerts: "home",
    history: "home",
    report: "home",
    notifications: "home",
  };

// Real screens for the remaining nav tabs (were placeholders before)
import GuidesScreen from "./screens/GuidesScreen";
import SettingsScreen from "./screens/SettingsScreen";

// ── Chuyển trang ─────────────────────────────────────────────────────────
// Mỗi màn thuộc một "cột" tab; so sánh chỉ số để biết nên trượt sang phải
// (đi sâu) hay sang trái (quay lại). Màn không có trong bảng (Lịch sử, Cảnh
// báo, Cẩm nang, Báo dịch, Thông báo) được coi là màn con.
const SCREEN_TAB_INDEX = {
  home: 0,
  scan: 1,
  camera: 1,
  result: 1,
  chat: 2,
  settings: 3,
};

function getTransitionDirection(from, to) {
  if (from === to) return "tab";
  const fromIdx = SCREEN_TAB_INDEX[from];
  const toIdx = SCREEN_TAB_INDEX[to];
  // Tab -> màn con, hoặc màn con -> màn con khác: đi sâu.
  if (toIdx === undefined) return "forward";
  // Màn con -> tab: quay lại.
  if (fromIdx === undefined) return "back";
  // Đổi tab: theo thứ tự trái -> phải.
  return toIdx > fromIdx ? "forward" : "back";
}

// ── Auth gate ───────────────────────────────────────────────────────────
// Mặc định app mở thẳng Trang chủ và cho phép dùng như khách; người dùng tự
// đăng nhập Google trong Cài đặt khi muốn đồng bộ nhật ký / gửi báo dịch.
//
// Đặt REQUIRE_LOGIN=true trong .env nếu muốn chặn ngay ở màn Login (dùng khi
// cần buộc định danh, ví dụ chạy thử nghiệm báo cáo cộng đồng). JS đọc biến
// này lúc chạy nên chỉ cần reload Metro, không phải build lại APK.
function isAuthRequired() {
  try {
    const Config = require('react-native-config');
    if (Config && Config.REQUIRE_LOGIN === 'true') return true;
  } catch {
    /* react-native-config chưa cài → không chặn người dùng */
  }
  return false;
}
const REQUIRE_LOGIN = isAuthRequired();

export default function App() {
  const { loaded: fontsLoaded } = useFonts();
  const [screen, setScreen] = useState("home");
  const [params, setParams] = useState({});
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(!REQUIRE_LOGIN);
  // Hướng chuyển trang: 'forward' (đi sâu), 'back' (quay lại), 'tab' (đổi tab).
  // Dùng cho <ScreenTransition> để trượt đúng chiều.
  const [transitionDir, setTransitionDir] = useState("tab");

  const goTo = (nextScreen, nextParams = {}) => {
    setTransitionDir(getTransitionDirection(screen, nextScreen));
    setParams(nextParams);
    setScreen(nextScreen);
  };

  // BottomNav is hidden on the full-screen camera flow and on the result
  // screen (result has its own quick action bar). It stays available on all
  // other tabbed routes including scan so the user can navigate away after
  // analysis.
  // Only the full-screen task flows (đang phân tích / kết quả) hide the nav.
  // The camera screen is a form (not a live viewfinder), so the 4 tabs stay
  // reachable there instead of leaving the user with a single back arrow.
  const hideBottomNav = screen === "scan" || screen === "result";
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
          report: "alerts",
          notifications: "home",
        };
        setParams({});
        const target = prevMap[screen] || "home";
        setTransitionDir(getTransitionDirection(screen, target));
        setScreen(target);
        return true;
      }
      return false;
    };
    const subscription = BackHandler.addEventListener("hardwareBackPress", handleBack);
    return () => subscription.remove();
  }, [screen]);

  // Khôi phục phiên đã lưu (nếu có). Khi không bắt buộc đăng nhập, việc này
  // chỉ để Trang chủ / Cài đặt hiện đúng tên và avatar.
  useEffect(() => {
    verifySession().then((u) => {
      setUser(u);
      setAuthReady(true);
    });
  }, []);

  // Đồng bộ trạng thái đăng nhập giữa các màn hình (đăng nhập / đăng xuất).
  useEffect(() => {
    const unsub = onAuthStateChanged((u) => setUser(u));
    return unsub;
  }, []);

  // Passed to every screen so they can navigate and pass data without external router.
  const navigation = {
    screen,
    params,
    navigate: (nextScreen, nextParams = {}) => {
      goTo(nextScreen, nextParams);
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
    case "report":
      ActiveScreen = ReportScreen;
      break;
    case "notifications":
      ActiveScreen = NotificationsScreen;
      break;
    default:
      ActiveScreen = HomeScreen;
  }

  // When the auth gate is OFF (requireAuth not set — the default), the app is
  // usable without Google credentials, so render the Home screen directly.
  // Only fall back to Login when auth is actually required AND we have no
  // verified session yet.
  if (REQUIRE_LOGIN && (!authReady || !user)) {
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
          <ScreenTransition key={screen} direction={transitionDir}>
            <ActiveScreen navigation={navigation} route={{ params }} />
          </ScreenTransition>
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
                goTo(tab);
              }}
            />
          )}
        </SafeAreaView>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}
