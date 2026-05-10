const React = require('react');

const useSafeAreaInsets = () => ({ top: 0, bottom: 0, left: 0, right: 0 });
const SafeAreaProvider = ({ children }) => children;
const SafeAreaView = ({ children, style }) =>
  React.createElement('View', { style }, children);

module.exports = { useSafeAreaInsets, SafeAreaProvider, SafeAreaView };
