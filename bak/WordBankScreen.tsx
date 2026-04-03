// WordBankScreen.tsx
import React from 'react';
import { View, Text, StyleSheet, Button } from 'react-native';

export default function WordBankScreen({ navigation }: { navigation: any }): JSX.Element {
  return (
    <View style={styles.container}>
      <Text style={styles.header}>Word Bank</Text>
      <Text style={styles.infoText}>
        This is where you will manage your word list.
      </Text>
      <Button title="Go Back Home" onPress={() => navigation.goBack()} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0f0f0',
    padding: 20,
  },
  header: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 40,
  },
  infoText: {
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 40,
  },
});