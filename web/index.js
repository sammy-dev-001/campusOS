import { registerRootComponent } from 'expo';
import { AppRegistry, Platform } from 'react-native';
import { enableScreens } from 'react-native-screens';

// Only import the entry point on the client side
if (Platform.OS !== 'web' || (typeof document !== 'undefined')) {
  // Import the main app component
  const App = require('./app/_layout').default;
  
  // Enable screens for better performance
  enableScreens();
  
  // Register the root component
  if (Platform.OS === 'web') {
    // Only access document on the client side
    if (typeof document !== 'undefined') {
      const rootTag = document.getElementById('root');
      if (rootTag) {
        rootTag.style.display = 'flex';
        rootTag.style.flex = '1';
        rootTag.style.minHeight = '100vh';
      }
    }
    
    // Register the app for web
    AppRegistry.registerComponent('main', () => App);
    
    // Run the app on web
    if (typeof document !== 'undefined') {
      AppRegistry.runApplication('main', {
        rootTag: document.getElementById('root')
      });
    }
  } else {
    // For native platforms
    registerRootComponent(App);
  }
}
