module.exports = function babelConfig(api) {
  api.cache(true);

  const plugins = ["nativewind/babel", "react-native-reanimated/plugin"];

  if (process.env.NODE_ENV === "production") {
    plugins.unshift(["transform-remove-console", { exclude: ["error", "warn"] }]);
  }

  return {
    presets: ["babel-preset-expo"],
    plugins,
  };
};
