const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Firebase 10 resolves to mismatched builds (and two copies of @firebase/app)
// when package exports are on, which breaks auth registration. React Native 0.88
// needs exports on for everything else, so only Firebase resolves without them.
const isFirebase = (name, origin = '') =>
  /^(@firebase\/|firebase(\/|$))/.test(name) ||
  /\/node_modules\/(@firebase|firebase)\//.test(origin);

config.resolver.resolveRequest = (context, moduleName, platform) => {
  const ctx = isFirebase(moduleName, context.originModulePath)
    ? { ...context, unstable_enablePackageExports: false }
    : context;
  return ctx.resolveRequest === config.resolver.resolveRequest
    ? require('metro-resolver').resolve({ ...ctx, resolveRequest: undefined }, moduleName, platform)
    : ctx.resolveRequest(ctx, moduleName, platform);
};

module.exports = config;
