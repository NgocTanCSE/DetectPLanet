#!/usr/bin/env node
/**
 * Guard: the AppRegistry component name registered from JS must match the name
 * the native host asks for, otherwise the app crashes at startup with
 *   "X" has not been registered. This can happen if ...
 *
 * JS side  : index.js -> AppRegistry.registerComponent(name from app.json)
 * Native   : MainActivity.getMainComponentName()
 *
 * Run with: npm run check:name
 */

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const appJsonPath = path.join(root, 'app.json');
const mainActivityPath = path.join(
  root,
  'android/app/src/main/java/com/agriscan/ai/MainActivity.kt',
);

const readRequired = (file) => {
  if (!fs.existsSync(file)) {
    console.error(`✗ Missing file: ${path.relative(root, file)}`);
    process.exit(1);
  }
  return fs.readFileSync(file, 'utf8');
};

const jsName = JSON.parse(readRequired(appJsonPath)).name;
const match = readRequired(mainActivityPath).match(
  /getMainComponentName\(\): String = "([^"]+)"/,
);

if (!match) {
  console.error(
    '✗ Could not find getMainComponentName() in MainActivity.kt',
  );
  process.exit(1);
}

const nativeName = match[1];

if (jsName !== nativeName) {
  console.error(
    [
      '✗ AppRegistry name mismatch — the app would crash with "not registered".',
      `    app.json name                        : ${JSON.stringify(jsName)}`,
      `    MainActivity.getMainComponentName()  : ${JSON.stringify(nativeName)}`,
      '  Fix: restore "name" in app.json, or update MainActivity.kt to match.',
      '  Use app.json "displayName" / res/values/strings.xml (app_name) to rename the app.',
    ].join('\n'),
  );
  process.exit(1);
}

console.log(`✓ AppRegistry name matches native: ${JSON.stringify(jsName)}`);
