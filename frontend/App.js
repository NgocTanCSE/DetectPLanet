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
import React, { useState, Component, useEffect } from 'react';
import { SafeAreaView, StatusBar, View, Text } from 'react-native';

import { colors, typography } from './theme';
import BottomNav from './BottomNav';
import AppHeader from './AppHeader';
import { useFonts } from './useFonts';
import { verifySession, onAuthStateChanged } from './auth';
import LoginScreen from './LoginScreen';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error, info) {
    console.error('App ErrorBoundary caught:', error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.paper, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={[typography.headline.sm, { color: colors['on-surface'] }]}>
            Đã xảy ra lỗi
          </Text>
          <Text style={[typography.body.sm, { color: colors.muted, marginTop: 8 }]}>
            Vui lòng khởi động lại ứng dụng.
          </Text>
        </SafeAreaView>
      );
    }
    return this.props.children;
  }
}

// Converted screens (each is the RN port of its HTML `code.html`)
import HomeScreen from './home/code';
import CameraScreen from './camera/code';
import ScanScreen from './scan/code';
import ResultScreen from './result/code';
import HistoryScreen from './history/code';
import ChatScreen from './chat/code';

// Maps a screen key -> the bottom-tab that should appear "active"
const SCREEN_TO_TAB = {
  home: 'home',
  camera: 'scan',
  scan: 'scan',
  result: 'scan',
  history: 'history',
  guides: 'guides',
  chat: 'chat',
  settings: 'settings',
};

// Placeholder screens for nav items that have no dedicated HTML source yet
function PlaceholderScreen({ title, body }) {
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <AppHeader title={title} />
      <View style={{ paddingTop: 56, paddingBottom: 96, paddingHorizontal: 16, gap: 16 }}>
        <Text style={[typography.headline.sm, { color: colors['on-surface'] }]}>{title}</Text>
        <Text style={[typography.body.md, { color: colors.muted }]}>{body}</Text>
      </View>
    </View>
  );
}

function GuidesScreen() {
  return (
    <PlaceholderScreen
      title="Cẩm nang"
      body="Tài liệu cẩm nang kỹ thuật canh tác và phòng trừ sâu bệnh đang được hoàn thiện."
    />
  );
}
function SettingsScreen() {
  return (
    <PlaceholderScreen
      title="Cài đặt"
      body="Tùy chỉnh thông báo, tài khoản và đồng bộ dữ liệu nhật ký đồng ruộng."
    />
  );
}

// ── Set to false to re-enable Google login gate ──
const SKIP_AUTH = true;

export default function App() {
  const { loaded: fontsLoaded } = useFonts();
  const [screen, setScreen] = useState('home');
  const [params, setParams] = useState({});
  const [user, setUser] = useState(SKIP_AUTH ? { name: 'Dev', email: 'dev@local' } : null);
  const [authReady, setAuthReady] = useState(SKIP_AUTH ? true : false);

  // Check session on startup (skipped when SKIP_AUTH is on)
  useEffect(() => {
    if (SKIP_AUTH) return;
    verifySession().then((u) => {
      setUser(u);
      setAuthReady(true);
    });
  }, []);

  // Subscribe to auth changes (skipped when SKIP_AUTH is on)
  useEffect(() => {
    if (SKIP_AUTH) return;
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
    case 'home':
      ActiveScreen = HomeScreen;
      break;
    case 'camera':
      ActiveScreen = CameraScreen;
      break;
    case 'scan':
      ActiveScreen = ScanScreen;
      break;
    case 'result':
      ActiveScreen = ResultScreen;
      break;
    case 'history':
      ActiveScreen = HistoryScreen;
      break;
    case 'guides':
      ActiveScreen = GuidesScreen;
      break;
    case 'settings':
      ActiveScreen = SettingsScreen;
      break;
    case 'chat':
      ActiveScreen = ChatScreen;
      break;
    default:
      ActiveScreen = HomeScreen;
  }

  // Not authenticated → show Login screen
  if (!authReady || !user) {
    const loginNav = {
      navigate: (nextScreen, nextParams = {}) => {
        setParams(nextParams);
        setScreen(nextScreen);
      },
      screen: 'login',
      params: {},
    };
    return (
      <ErrorBoundary>
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.paper }}>
          <StatusBar barStyle="dark-content" backgroundColor={colors.paper} />
          <LoginScreen navigation={loginNav} />
        </SafeAreaView>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        <StatusBar barStyle="dark-content" backgroundColor={colors.paper} />
        <ActiveScreen navigation={navigation} route={{ params }} />
        <BottomNav
          activeTab={SCREEN_TO_TAB[screen] || 'home'}
          onTabPress={(tab) => {
            setParams({});
            setScreen(tab);
          }}
        />
      </SafeAreaView>
    </ErrorBoundary>
  );
}
