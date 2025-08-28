import { View, Text, Button } from 'react-native';
import { useRouter } from 'expo-router';

export default function TestScreen() {
  const router = useRouter();
  
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text>Test Screen</Text>
      <Button 
        title="Go Back" 
        onPress={() => router.back()} 
      />
    </View>
  );
}
