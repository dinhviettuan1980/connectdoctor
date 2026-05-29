const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");
const path = require("path");

const config = getDefaultConfig(__dirname);

// Metro normalizes paths to forward slashes on Windows, so the blockList
// regex must use forward slashes too.
const functionsDir = path.resolve(__dirname, "functions").replace(/\\/g, "/");
config.resolver.blockList = [new RegExp(`^${functionsDir}(/.*)?$`)];

// On web, redirect native-only modules to empty mocks so the bundle doesn't crash.
const WEB_MOCKS = {
  "react-native-ble-plx": path.resolve(__dirname, "lib/ble-plx-mock.js"),
};

const originalResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === "web" && WEB_MOCKS[moduleName]) {
    return { filePath: WEB_MOCKS[moduleName], type: "sourceFile" };
  }
  if (originalResolveRequest) {
    return originalResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = withNativeWind(config, { input: "./global.css" });
