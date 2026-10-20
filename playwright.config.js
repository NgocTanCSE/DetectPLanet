module.exports = {
  testDir: '.',
  timeout: 60000,
  fullyParallel: false,
  use: {
    browserName: 'chromium',
    headless: true,
    baseURL: 'http://localhost:8081',
    navigationTimeout: 30000,
    actionTimeout: 15000,
  },
};
