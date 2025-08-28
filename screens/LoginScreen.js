import { Button, Text, View } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';

export default function LoginScreen({ navigation }) {
  const { theme } = useTheme();
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.background }}>
      <Text style={{ color: theme.text }}>Login Screen</Text>
      <Button title="Go to Home" onPress={() => navigation.navigate('Home')} />
    </View>
  );
}
