import { StyleSheet } from 'react-native';

import { ThemedText } from '../components/ThemedText';
import { ThemedView } from '../components/ThemedView';

export default function AboutScreen() {
  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title">About EduFi</ThemedText>
      <ThemedText>Version 1.0.0</ThemedText>
      <ThemedText>EduFi is your all-in-one student finance and campus companion.</ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
}); 