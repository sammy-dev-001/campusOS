// Minimal web entry point
import { AppRegistry, Platform } from 'react-native';
import App from '../app/test'; // Import our test component

// Only run in browser environment
if (Platform.OS === 'web') {
  const rootTag = document.getElementById('root');
  
  if (rootTag) {
    // Simple styles for the root element
    rootTag.style.display = 'flex';
    rootTag.style.flex = '1';
    rootTag.style.minHeight = '100vh';
    
    // Register and run the app
    AppRegistry.registerComponent('App', () => App);
    AppRegistry.runApplication('App', { rootTag });
  } else {
    console.error('Could not find root element');
  }
}
