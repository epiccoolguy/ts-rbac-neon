/** @type {import('@babel/core').ConfigFunction} */
function config(api) {
  api.cache(true);

  return {
    presets: [
      ["@babel/preset-env", { targets: { node: "current" } }],
      "@babel/preset-typescript",
    ],
  };
}

export default config;
