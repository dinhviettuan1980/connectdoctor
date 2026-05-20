const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");
const path = require("path");

const config = getDefaultConfig(__dirname);

// Exclude the Cloud Functions directory entirely — it has its own package.json
// and dependencies (firebase-admin, firebase-functions) that Metro cannot resolve.
const functionsDir = path.resolve(__dirname, "functions");
config.resolver.blockList = [new RegExp(`^${functionsDir.replace(/[\\]/g, "\\\\")}.*`)];

module.exports = withNativeWind(config, { input: "./global.css" });
