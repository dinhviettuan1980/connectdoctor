// react-native-css-interop v0.2.4 unconditionally requires react-native-worklets/plugin
// which only ships with reanimated 4. This stub satisfies the require without pulling
// in the full package.
const fs = require("fs");
const path = require("path");

const dir = path.join(__dirname, "../node_modules/react-native-worklets");
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

const write = (file, content) => {
  const p = path.join(dir, file);
  if (!fs.existsSync(p)) fs.writeFileSync(p, content);
};

write("package.json", JSON.stringify({ name: "react-native-worklets", version: "0.0.1", main: "index.js" }));
write("index.js", "module.exports = {};\n");
write("plugin.js", "module.exports = function () { return { visitor: {} }; };\n");
