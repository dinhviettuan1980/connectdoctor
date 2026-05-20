const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");
const path = require("path");

const config = getDefaultConfig(__dirname);

// Exclude Cloud Functions folder — its node_modules would be scanned by Metro
// and significantly slow down startup (243 extra packages).
config.resolver.blockList = [
  /functions[\\/]node_modules[\\/].*/,
  /functions[\\/]lib[\\/].*/,
];

module.exports = withNativeWind(config, { input: "./global.css" });
