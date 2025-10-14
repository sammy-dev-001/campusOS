import { Stack } from 'expo-router';

export default function ForumCategoryLayout() {
  return (
    <Stack>
      <Stack.Screen 
        name="index" 
        options={{ 
          title: 'Forum Categories',
          headerShown: true,
        }} 
      />
    </Stack>
  );
}
