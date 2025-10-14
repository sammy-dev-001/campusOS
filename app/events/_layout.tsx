import { Stack } from 'expo-router';
import { useTheme } from 'react-native-paper';

export default function EventsLayout() {
  const theme = useTheme();
  
  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: theme.colors.background,
        },
        headerTintColor: theme.colors.onBackground,
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      <Stack.Screen 
        name="index" 
        options={{
          title: 'Events',
          headerShown: false,
        }}
      />
      <Stack.Screen 
        name="[id]" 
        options={{
          title: 'Event Details',
          headerShown: true,
          headerBackTitle: 'Back',
        }}
      />
    </Stack>
  );
}
