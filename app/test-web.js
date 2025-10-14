import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function TestWeb() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Web Test - CampusOS</Text>
      <Text>If you can see this, the web setup is working!</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  text: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
});
