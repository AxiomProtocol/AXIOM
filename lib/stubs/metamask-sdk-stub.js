// Stub module for @metamask/sdk
// The MetaMask SDK has a broken uuid/dist/esm-browser import that fails during build.
// Our app uses window.ethereum (injected provider) directly instead.
// This stub prevents webpack from trying to resolve the real SDK and its broken dependencies.
module.exports = {};
module.exports.default = function MetaMaskSDK() {
  throw new Error('MetaMask SDK is not available. Use window.ethereum instead.');
};
