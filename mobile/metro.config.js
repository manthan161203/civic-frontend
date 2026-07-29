// Metro configuration.
//
// Exists solely so Metro can resolve `@civic/api-types`, which lives at
// ../packages/api-types — outside this project's root. Metro does not follow a
// symlink out of the project directory by default, so it has to be told to
// watch the workspace root as well.
//
// Note what is deliberately NOT set: `resolver.disableHierarchicalLookup`.
// That is the standard recipe for a hoisted monorepo, but this repo is not
// one — each app keeps its own complete `node_modules`. Turning it on stops
// Metro walking up for transitively-nested dependencies, and the bundle fails
// on things like `semver/functions/satisfies` inside react-native-reanimated.
//
// Everything else is Expo's defaults.
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '..');

const config = getDefaultConfig(projectRoot);

// Watch the workspace so edits to the shared package trigger a rebuild.
config.watchFolders = [workspaceRoot];

// Resolve from this app first, then the workspace root.
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

module.exports = config;
