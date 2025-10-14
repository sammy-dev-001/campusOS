const createExpoWebpackConfig = require('@expo/webpack-config');
const path = require('path');

// Suppress Chrome extension error and other known warnings
if (typeof window !== 'undefined') {
  const originalConsoleError = console.error;
  console.error = (...args) => {
    const errorMsg = args[0]?.message || '';
    if (errorMsg.includes('The message port closed before a response was received') ||
        errorMsg.includes('shadow*') ||
        errorMsg.includes('textShadow*') ||
        errorMsg.includes('pointerEvents is deprecated') ||
        errorMsg.includes('document is not defined')) {
      return; // Suppress these warnings
    }
    originalConsoleError.apply(console, args);
  };
}

module.exports = async function (env, argv) {
  const config = await createExpoWebpackConfig(
    {
      ...env,
      entry: {
        app: [
          // Use the web entry point
          './app/index.web.js',
        ],
      },
      babel: {
        dangerouslyAddModulePathsToTranspile: [
          '@expo/vector-icons',
          'react-native-reanimated',
          'react-native-gesture-handler',
          'expo-router',
        ],
      },
    },
    argv
  );

  // Add fallback for Node.js core modules
  config.resolve.fallback = {
    ...config.resolve.fallback,
    fs: false,
    path: false,
    crypto: false,
  };

  // Add support for .web.js files
  config.resolve.extensions = [
    '.web.js',
    '.web.jsx',
    '.web.ts',
    '.web.tsx',
    ...config.resolve.extensions,
  ];

  // Add alias for react-native-web
  config.resolve.alias = {
    ...config.resolve.alias,
    'react-native$': 'react-native-web',
    'react-native-web$': 'react-native-web',
    'react-native/Libraries/Components/View/ViewStylePropTypes$':
      'react-native-web/dist/exports/View/ViewStylePropTypes',
    'react-native/Libraries/EventEmitter/RCTDeviceEventEmitter$':
      'react-native-web/dist/vendor/react-native/NativeEventEmitter/RCTDeviceEventEmitter',
    'react-native/Libraries/vendor/emitter/EventEmitter$':
      'react-native-web/dist/vendor/react-native/emitter/EventEmitter',
    'react-native/Libraries/vendor/emitter/EventSubscriptionVendor$':
      'react-native-web/dist/vendor/react-native/emitter/EventSubscriptionVendor',
  };

  if (env.platform === 'web') {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      path: false,
      crypto: false,
    };
    
    // Add support for .web.js files
    config.resolve.extensions = [
      '.web.js',
      '.web.jsx',
      '.web.ts',
      '.web.tsx',
      ...config.resolve.extensions,
    ];
    
    // Add alias for react-native-web
    config.resolve.alias = {
      ...config.resolve.alias,
      'react-native$': 'react-native-web',
    };
  }
  
  // Customize the config before returning it
  return config;
};
