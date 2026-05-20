const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");
const path = require("path");

const config = getDefaultConfig(__dirname);

// Metro normalizes paths to forward slashes on Windows, so the blockList
// regex must use forward slashes too.
const functionsDir = path.resolve(__dirname, "functions").replace(/\\/g, "/");
config.resolver.blockList = [new RegExp(`^${functionsDir}(/.*)?$`)];

module.exports = withNativeWind(config, { input: "./global.css" });
