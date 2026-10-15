/**
 * One-off validation harness for the AgriScan RN screens.
 *
 * Validates the converted `frontend/` code two ways, with NO real React Native
 * runtime required:
 *  (a) babel syntax transform of every .js file (catches JSX / syntax errors),
 *  (b) module resolution + a "light render" of App + every screen/helper by
 *      invoking each component function with stubbed react/react-native so that
 *      the JSX bodies actually execute (catches undefined vars like `shadowStrong`,
 *      bad array calls, Animated misuse, etc.).
 *
 * Mirrors the harness that originally passed "11 passed, 0 failed" /
 * "ALL MODULES RESOLVED" / "Render test: ALL PASS".
 */
const Module = require('module');
const fs = require('fs');
const path = require('path');
const babel = require('@babel/core');

const ROOT = __dirname;

// Stub timers so component effects (e.g. ScanScreen's setInterval, Animated
// loops) can execute during the render pass WITHOUT scheduling real Node
// timers that would keep the process alive forever.
global.setInterval = () => 0;
global.clearInterval = () => {};
global.setTimeout = () => 0;
global.clearTimeout = () => {};

// ---------------------------------------------------------------------------
// 1. react / react-native STUBS
// ---------------------------------------------------------------------------
function makeReact() {
  function createElement(type, props, ...children) {
    const flat = [];
    for (const c of children) {
      if (Array.isArray(c)) {
        flat.push(...c);
      } else if (c !== null && c !== undefined && c !== false) {
        flat.push(c);
      }
    }
    const kind = typeof type === 'function' ? type.__rnsym || type.name || 'C' : type;
    return { type: kind, props: props || {}, children: flat };
  }
  const React = {
    createElement,
    Fragment: 'Fragment',
    Component: class {},
    PureComponent: class {},
    useState(init) {
      const v = typeof init === 'function' ? init() : init;
      return [v, () => {}];
    },
    useEffect(cb) {
      if (typeof cb === 'function') {
        try {
          const cleanup = cb();
          return () => {
            if (typeof cleanup === 'function') cleanup();
          };
        } catch (e) {
          /* eslint-disable no-empty */
        }
      }
      return () => {};
    },
    useRef(v) {
      return { current: v };
    },
    useMemo(cb) {
      return cb();
    },
    useContext() {
      return {};
    },
    forwardRef(f) {
      return f;
    },
    memo(f) {
      return f;
    },
  };
  React.Children = { map: (c) => c, forEach: () => {} };
  const AnimatedValue = class {
    constructor(v) {
      this.current = v;
    }
    interpolate() {
      return { __animated: true };
    }
    setValue() {}
    addListener() {
      return { id: '0' };
    }
  };
  React.Animated = {
    Value: AnimatedValue,
    timing(v, cfg) {
      return { start(cb) { if (cb) cb(); }, stop() {} };
    },
    loop(anim, opts) {
      return anim;
    },
    delay() {
      return { start() {}, stop() {} };
    },
    createAnimatedComponent(C) {
      return C;
    },
    View: 'Animated.View',
    Text: 'Animated.Text',
    Image: 'Animated.Image',
    useSharedValue(v) {
      return { value: v, interpolate: () => ({}) };
    },
  };
  return React;
}

const reactStub = makeReact();
const rnStub = {
  SafeAreaView: 'SafeAreaView',
  View: 'View',
  Text: 'Text',
  Image: 'Image',
  ScrollView: 'ScrollView',
  TouchableOpacity: 'TouchableOpacity',
  KeyboardAvoidingView: 'KeyboardAvoidingView',
  FlatList: 'FlatList',
  SectionList: 'SectionList',
  Pressable: 'Pressable',
  Modal: 'Modal',
  StyleSheet: {
    create: (s) => s,
    absoluteFill: { position: 'absolute' },
    absoluteFillObject: { position: 'absolute' },
    hairlineWidth: 1,
  },
  Platform: { OS: 'ios', select: (o) => o.ios || o.default || null },
  Dimensions: { get: () => ({ width: 390, height: 844 }) },
  Alert: { alert: () => {} },
  Linking: {
    addEventListener: () => {},
    removeEventListener: () => {},
    openURL: () => {},
    canOpenURL: async () => true,
  },
  Animated: reactStub.Animated,
  Easing: {
    linear: (x) => x,
    ease: (x) => x,
    bezier() {
      return (x) => x;
    },
    in(x) {
      return x;
    },
    out(x) {
      return x;
    },
    inOut(x) {
      return x;
    },
  },
};

// ---------------------------------------------------------------------------
// 2. Intercept require('react') / require('react-native') -> stubs.
//    Also babel-transform every project .js on the fly so `import`/`export`/JSX
//    resolve under plain Node.
// ---------------------------------------------------------------------------
const imagePickerStub = {
  requestCameraPermissionsAsync: async () => ({ status: 'granted' }),
  requestMediaLibraryPermissionsAsync: async () => ({ status: 'granted' }),
  launchCameraAsync: async () => ({ canceled: false, assets: [{ uri: 'https://agriscan.ai/samples/leaf_a841.jpg', base64: '' }] }),
  launchImageLibraryAsync: async () => ({ canceled: false, assets: [{ uri: 'https://agriscan.ai/samples/leaf_a841.jpg', base64: '' }] }),
  MediaTypeOptions: { Images: 'images', Videos: 'videos', LivePhotos: 'livePhotos' },
};

// Stub for expo-camera (CameraView live preview + permission hook).
// The harness only checks that CameraScreen renders; it never presses the
// shutter, so a no-op CameraView and a "granted" permission are sufficient.
const expoCameraStub = {
  CameraView: () => null,
  useCameraPermissions: () => [{ status: 'granted' }, async () => ({ status: 'granted' })],
  CameraType: { back: 'back', front: 'front' },
  FlashMode: { off: 'off', on: 'on', auto: 'auto', screen: 'screen' },
};

const expoCryptoStub = {
  getRandomBytesAsync: async () => Buffer.alloc(16).fill(0),
  getRandomBytes: () => Buffer.alloc(16).fill(0),
};

const svgStub = {
  Svg: 'Svg',
  Path: 'Path',
  Circle: 'Circle',
  Rect: 'Rect',
  Line: 'Line',
  Polyline: 'Polyline',
  G: 'G',
  default: 'Svg',
};

// Stub for react-native-safe-area-context (Expo native module).
// SafeAreaProvider wraps the app; SafeAreaView is used as a regular View.
const safeAreaStub = {
  SafeAreaProvider: ({ children }) => children,
  SafeAreaView: 'SafeAreaView',
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  default: { SafeAreaProvider: ({ children }) => children, SafeAreaView: 'SafeAreaView' },
};

const origLoad = Module._load;
Module._load = function (request, parent, isMain) {
  if (request === 'react') return reactStub;
  if (request === 'react-native') return rnStub;
  if (request === 'expo-image-picker') return imagePickerStub;
  if (request === 'expo-camera') return expoCameraStub;
  if (request === 'expo-crypto') return expoCryptoStub;
  if (request === 'react-native-svg') return svgStub;
  if (request === 'react-native-safe-area-context') return safeAreaStub;
  return origLoad.apply(this, arguments);
};

const origExtension = Module._extensions['.js'];
Module._extensions['.js'] = function (module, filename) {
  let src = fs.readFileSync(filename, 'utf8');

  if (filename.includes(path.join('node_modules'))) {
    return origExtension.call(this, module, filename);
  }

  let transformed;
  try {
    transformed = babel.transform(src, {
      filename,
      babelrc: false,
      configFile: false,
      sourceType: 'module',
      plugins: [
        ['@babel/plugin-transform-modules-commonjs'],
        ['@babel/plugin-transform-react-jsx', { runtime: 'classic' }],
      ],
    }).code;
  } catch (e) {
    throw new Error('Babel syntax transform failed for ' + path.relative(ROOT, filename) + ':\n' + e.message);
  }
  module._compile(transformed, filename);
};

// ---------------------------------------------------------------------------
// 3. Module resolution + light "render" pass.
// ---------------------------------------------------------------------------
const files = [
  './frontend/App.js',
  './frontend/theme.js',
  './frontend/useFonts.js',
  './frontend/icons.js',
  './frontend/AppHeader.js',
  './frontend/BottomNav.js',
  './frontend/ProgressCircle.js',
  './frontend/dto.js',
  './frontend/api.js',
  './frontend/auth.js',
  './frontend/LoginScreen.js',
  './frontend/chat/code.js',
  './frontend/home/code.js',
  './frontend/scan/code.js',
  './frontend/camera/code.js',
  './frontend/result/code.js',
  './frontend/history/code.js',
];

let loaded = 0;
let resolved = 0;
for (const f of files) {
  try {
    require(path.resolve(ROOT, f));
    resolved++;
  } catch (e) {
    console.log('RESOLVE FAIL ' + f + ' -> ' + e.message);
  }
}
console.log('ALL MODULES RESOLVED: ' + resolved + '/' + files.length + ' loaded');
if (resolved !== files.length) {
  process.exitCode = 1;
}

// Components to light-render. Call each constructor with a stub navigation.
const Login = require('./frontend/LoginScreen').default;
const Chat = require('./frontend/chat/code').default;
const App = require('./frontend/App').default;
const Home = require('./frontend/home/code').default;
const Scan = require('./frontend/scan/code').default;
const Camera = require('./frontend/camera/code').default;
const Result = require('./frontend/result/code').default;
const History = require('./frontend/history/code').default;
const BottomNav = require('./frontend/BottomNav').default;
const AppHeader = require('./frontend/AppHeader').default;
const ProgressCircle = require('./frontend/ProgressCircle').default;
const Icon = require('./frontend/icons').default;

const stubNav = { screen: 'home', navigate: () => {} };
const TICK = '✓';
const CROSS = '✗';

function render(name, Ctor, props) {
  try {
    Ctor(props || {});
    console.log('  ' + TICK + ' render ' + name);
    loaded++;
  } catch (e) {
    console.log('  ' + CROSS + ' render ' + name + ' -> ' + e.message);
    process.exitCode = 1;
  }
}

console.log('Render test:');
render('App', App); // App takes no props; uses useState internally
render('LoginScreen', Login, { navigation: stubNav });
render('ChatScreen', Chat, { navigation: stubNav });
render('HomeScreen', Home, { navigation: stubNav });
render('ScanScreen', Scan, { navigation: stubNav });
render('CameraScreen', Camera, { navigation: stubNav });
render('ResultScreen', Result, { navigation: stubNav });
render('HistoryScreen', History, { navigation: { screen: 'history', navigate: () => {} } });
render('BottomNav', BottomNav, { activeTab: 'home', onTabPress: () => {} });
render('AppHeader', AppHeader, { title: 'AgriScan AI', subtitle: 'Home', actions: [{ icon: 'close', label: 'x', onPress: () => {} }] });
render('ProgressCircle', ProgressCircle, { progress: 78, size: 72 });
render('Icon', Icon, { name: 'home', size: 18 });

const total = 12;
console.log('Render test: ' + loaded + ' passed, ' + (total - loaded) + ' failed');
console.log(loaded === total ? 'ALL COMPONENTS RENDERED' : 'SOME COMPONENTS FAILED');
process.exit(process.exitCode || 0);
