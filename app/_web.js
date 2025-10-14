import 'expo-router/entry';
import { Platform } from 'react-native';
import { enableScreens } from 'react-native-screens';

// Enable screens for better performance
enableScreens();

// Set up the root element
if (Platform.OS === 'web') {
  const rootTag = document.getElementById('root');
  if (rootTag) {
    rootTag.style.display = 'flex';
    rootTag.style.flex = '1';
    rootTag.style.minHeight = '100vh';
  }
}
