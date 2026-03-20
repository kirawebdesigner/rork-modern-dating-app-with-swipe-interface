const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");
const { withRorkMetro } = require("@rork-ai/toolkit-sdk/metro");

const config = getDefaultConfig(__dirname);
const rorkConfig = withRorkMetro(config);

module.exports = {
  ...rorkConfig,
  transformer: {
    ...rorkConfig.transformer,
    babelTransformerPath: path.resolve(__dirname, "metro.transformer.js"),
  },
};
