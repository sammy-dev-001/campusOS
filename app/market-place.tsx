import { StyleSheet } from 'react-native';

import { ThemedText } from '../components/ThemedText';
import { ThemedView } from '../components/ThemedView';

export default function MarketPlaceScreen() {
  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title">Campus Market Place</ThemedText>
      <ThemedText>This screen is under construction.</ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
}); 