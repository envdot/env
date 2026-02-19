const path = require('path');
const ModuleScopePlugin = require('react-dev-utils/ModuleScopePlugin');

const sharedDir = path.resolve(__dirname, '../shared');

module.exports = {
  webpack: {
    configure: (webpackConfig) => {
      // Remove ModuleScopePlugin to allow imports from shared package
      webpackConfig.resolve.plugins = webpackConfig.resolve.plugins.filter(
        (plugin) => !(plugin instanceof ModuleScopePlugin)
      );

      // Find the babel-loader rule that restricts to src/
      const oneOfRule = webpackConfig.module.rules.find((rule) => rule.oneOf);
      if (oneOfRule) {
        const babelLoader = oneOfRule.oneOf.find(
          (rule) =>
            rule.loader &&
            rule.loader.includes('babel-loader') &&
            rule.include
        );
        if (babelLoader) {
          // Allow babel to transpile the shared package
          babelLoader.include = [babelLoader.include, sharedDir].flat();
        }
      }

      // Resolve @env/shared to the local directory
      webpackConfig.resolve.alias = {
        ...webpackConfig.resolve.alias,
        '@env/shared': sharedDir,
      };

      return webpackConfig;
    },
  },
};
