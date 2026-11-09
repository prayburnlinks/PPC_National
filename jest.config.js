module.exports = {
  preset: 'jest-expo',
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|firebase)',
  ],
  moduleNameMapper: {
    '^.*firebase-config$': '<rootDir>/__mocks__/firebase-config.js',
    '^firebase/functions$': '<rootDir>/__mocks__/firebase-functions.js',
    // pushNotificationService keeps the device's token in AsyncStorage, and the
    // real module throws without its native half.
    '^@react-native-async-storage/async-storage$':
      '<rootDir>/node_modules/@react-native-async-storage/async-storage/jest/async-storage-mock.js',
  },
  collectCoverageFrom: [
    'services/**/*.js',
    'screens/**/*.js',
    'constants/**/*.js',
    '!**/__tests__/**',
  ],
  reporters: [
    'default',
    ['jest-junit', { outputDirectory: 'test-results', outputName: 'junit.xml' }],
  ],
};
