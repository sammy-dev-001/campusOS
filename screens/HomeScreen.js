import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.gridContainer}>
        {/* Top Row */}
        <View style={styles.row}>
          <View style={styles.spacer} />
          <TouchableOpacity style={styles.squareButton}>
            <Ionicons name="people-outline" size={28} color="#fff" style={{ marginBottom: 6 }} />
            <Text style={styles.buttonText}>Tutor or{"\n"}Study Group</Text>
          </TouchableOpacity>
          <View style={styles.spacer} />
        </View>
        {/* Middle Row */}
        <View style={styles.row}>
          <TouchableOpacity style={styles.squareButton}>
            <Feather name="file-text" size={28} color="#fff" style={{ marginBottom: 6 }} />
            <Text style={styles.buttonText}>Notes and{"\n"}Past questions</Text>
          </TouchableOpacity>
          <View style={styles.circleButtonBorder}>
            <TouchableOpacity style={styles.circleButton}>
              <MaterialCommunityIcons name="cart-outline" size={38} color="#fff" />
              <Text style={styles.centerText}>Campus</Text>
              <Text style={styles.centerSubText}>market place</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={styles.squareButton}>
            <MaterialCommunityIcons name="poll" size={28} color="#fff" style={{ marginBottom: 6 }} />
            <Text style={styles.buttonText}>Polls{"\n"}and surveys</Text>
          </TouchableOpacity>
        </View>
        {/* Bottom Row */}
        <View style={styles.row}>
          <View style={styles.spacer} />
          <TouchableOpacity style={styles.squareButton}>
            <Ionicons name="calendar-outline" size={28} color="#fff" style={{ marginBottom: 6 }} />
            <Text style={styles.buttonText}>Time{"\n"}Table</Text>
          </TouchableOpacity>
          <View style={styles.spacer} />
        </View>g
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#181C23',
    justifyContent: 'center',
    alignItems: 'center',
  },
  gridContainer: {
    width: 300,
    height: 300,
    justifyContent: 'center',
    alignItems: 'center',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 2,
  },
  spacer: {
    width: 80,
    height: 80,
  },
  squareButton: {
    width: 80,
    height: 80,
    backgroundColor: '#232733',
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    margin: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  buttonText: {
    color: '#fff',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 16,
    fontWeight: '500',
  },
  circleButtonBorder: {
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'red', // DEBUG: test color
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 8,
  },
  circleButton: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#2EC6FF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  centerText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 4,
  },
  centerSubText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '500',
    opacity: 0.8,
    marginTop: -2,
  },
});
