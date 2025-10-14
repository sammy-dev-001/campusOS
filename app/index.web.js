// Web entry point for the application
import { registerRootComponent } from 'expo';
import { AppRegistry, Platform } from 'react-native';
import App from './_layout';

// Only run in browser environment
if (Platform.OS === 'web') {
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
    AppRegistry.runApplication('main', {
      rootTag,
      hydrate: true
    });
  } else {
    console.error('Could not find root element');
  }
} else {
  // For native platforms
  registerRootComponent(App);
}
