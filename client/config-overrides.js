/**
 * Webpack configuration overrides for Create React App
 * Fixes "Cannot read properties of null (reading 'useState')" error
 * 
 * Solution from: https://github.com/facebook/react/issues/24928
 * Forces webpack to use a single React instance to prevent duplicate bundling
 */

const path = require('path');

module.exports = function override(config) {
  // Force webpack to resolve to a single React instance
  config.resolve.alias = {
    ...config.resolve.alias,
    'react': path.resolve(__dirname, 'node_modules/react'),
    'react-dom': path.resolve(__dirname, 'node_modules/react-dom')
  };
  
  return config;
};
