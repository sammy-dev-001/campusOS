import { Stack } from 'expo-router';
import { View, Text } from 'react-native';

export default function WebLayout() {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text style={{ fontSize: 24, marginBottom: 20 }}>Welcome to EduFi Web</Text>
      <Text>This is a test page to verify web setup is working.</Text>

      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack>
    </View>
  );
}
