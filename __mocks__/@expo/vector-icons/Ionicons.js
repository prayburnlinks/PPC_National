// Icons render as an empty View in tests (testID "icon-<name>") so tests stay
// deterministic — the real component loads its font asynchronously.
const React = require('react');
const { View } = require('react-native');

const Ionicons = ({ name, size, color, style }) =>
  React.createElement(View, { testID: `icon-${name}`, style: [{ width: size, height: size }, style], accessible: false });
Ionicons.font = {};

module.exports = { __esModule: true, default: Ionicons };
