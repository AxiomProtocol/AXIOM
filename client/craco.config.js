const path = require('path');

module.exports = {
  babel: {
    loaderOptions: (babelLoaderOptions) => {
      // Remove react-refresh/babel plugin from ALL locations in production builds
      if (process.env.NODE_ENV === 'production') {
        const reactRefreshPlugin = require.resolve('react-refresh/babel');
        
        // Helper function to filter React Refresh from plugin arrays
        const filterReactRefresh = (plugins) => {
          if (!plugins) return plugins;
          return plugins.filter(plugin => {
            if (plugin === reactRefreshPlugin) return false;
            if (Array.isArray(plugin) && plugin[0] === reactRefreshPlugin) return false;
            return true;
          });
        };
        
        // Filter top-level plugins
        if (babelLoaderOptions.plugins) {
          babelLoaderOptions.plugins = filterReactRefresh(babelLoaderOptions.plugins);
        }
        
        // Filter nested plugins in overrides
        if (babelLoaderOptions.overrides) {
          babelLoaderOptions.overrides = babelLoaderOptions.overrides.map(override => {
            if (override.plugins) {
              override.plugins = filterReactRefresh(override.plugins);
            }
            return override;
          });
        }
      }
      return babelLoaderOptions;
    },
  },
  webpack: {
    alias: {
      '@': path.resolve(__dirname, 'src/'),
    },
    configure: (webpackConfig) => {
      // Disable TypeScript type checking for faster builds
      webpackConfig.plugins = webpackConfig.plugins.filter(
        plugin => plugin.constructor.name !== 'ForkTsCheckerWebpackPlugin'
      );
      
      return webpackConfig;
    },
  },
  typescript: {
    enableTypeChecking: false
  }
};
