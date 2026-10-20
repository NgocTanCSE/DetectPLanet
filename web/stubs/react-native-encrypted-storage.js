/**
 * Web stub for react-native-encrypted-storage.
 * Uses localStorage as an insecure-but-functional substitute on web.
 */
const storage =
  typeof window !== 'undefined'
    ? window.localStorage
    : {
        _data: {} as Record<string, string>,
        getItem(k: string) {
          return this._data[k] ?? null;
        },
        setItem(k: string, v: string) {
          this._data[k] = v;
        },
        removeItem(k: string) {
          delete this._data[k];
        },
      };

const AsyncStorage = {
  getItem: async (key: string) => storage.getItem(key),
  setItem: async (key: string, value: string) =>
    storage.setItem(key, value),
  removeItem: async (key: string) => storage.removeItem(key),
};

module.exports = AsyncStorage;
module.exports.default = AsyncStorage;
