// This is a minimal web entry point
import { AppRegistry, Platform } from 'react-native';
import { enableScreens } from 'react-native-screens';

// Only run in browser environment
if (Platform.OS === 'web' && typeof document !== 'undefined') {
  // Import the app component
  const App = require('./_layout').default;
  
  // Enable screens for better performance
  enableScreens();
  
  // Register the app
  AppRegistry.registerComponent('main', () => App);
  
  // Get the root element
  const rootTag = document.getElementById('root');
  if (rootTag) {
    // Apply basic styles
    rootTag.style.display = 'flex';
    rootTag.style.flex = '1';
    rootTag.style.minHeight = '100vh';
    
    // Run the app
    AppRegistry.runApplication('main', { rootTag });
  } else {
    console.error('Could not find root element with id "root"');
  }
}
