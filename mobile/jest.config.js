module.exports = {
  preset: "react-native",
  transformIgnorePatterns: [
    "node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|lucide-react-native|expo-sqlite|expo-modules-core|expo-blur)",
  ],
  moduleNameMapper: {
    "^expo-sqlite$": "<rootDir>/__mocks__/expo-sqlite.js",
    "^expo$": "<rootDir>/__mocks__/expo.js",
  },
  setupFilesAfterEnv: ["@testing-library/jest-native/extend-expect"],
}
