// WordListScreen.tsx
import React, { useState, useContext, useEffect } from 'react';
import { View, Text, StyleSheet, Button, FlatList, TextInput, TouchableOpacity, Alert, Platform } from 'react-native';
import * as Speech from 'expo-speech';
import { WordListContext } from './WordListContext';

export default function WordListScreen({ navigation }: { navigation: any }): JSX.Element {
  const { wordList, setWordList } = useContext(WordListContext);
  const [newWord, setNewWord] = useState('');

  // Log component mount/unmount to check for unexpected remounts
  useEffect(() => {
    console.log("WordListScreen: COMPONENT MOUNTED.");
    return () => {
      console.log("WordListScreen: COMPONENT UNMOUNTED.");
    };
  }, []); // Empty dependency array for mount/unmount lifecycle

  // Debug log to see the wordList state when this screen renders
  useEffect(() => {
    console.log("WordListScreen: Current wordList state on render (from context):", wordList);
  }, [wordList]); // Log whenever wordList changes

  const handleAddWord = () => {
    console.log("WordListScreen: handleAddWord called. newWord value (before trim):", newWord);
    console.log("WordListScreen: newWord.trim().length is:", newWord.trim().length);

    if (newWord.trim().length > 0) {
      setWordList(prevList => {
        const updatedList = [newWord.trim(), ...prevList];
        console.log("WordListScreen: Word successfully added. Updated list (inside setWordList callback):", updatedList); // This log should now appear first
        return updatedList;
      });
      setNewWord('');
      console.log("WordListScreen: Input field cleared."); // This log should appear after the list update log
    } else {
      console.log("WordListScreen: Attempted to add an empty or whitespace-only word. Alerting user.");
      Alert.alert('Empty Word', 'Please enter a word to add.');
    }
  };

  const handlePlayWord = (word: string) => {
    Speech.speak(word);
    console.log(`Playing: ${word}`);
  };

  const handleDeleteWord = (wordToDelete: string) => {
    Alert.alert(
      'Delete Word',
      `Are you sure you want to delete "${wordToDelete}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          onPress: () => {
            setWordList(prevList => {
                const updatedList = prevList.filter(word => word !== wordToDelete);
                console.log(`WordListScreen: Deleted word "${wordToDelete}". Updated list:`, updatedList);
                return updatedList;
            });
          },
          style: 'destructive',
        },
      ],
      { cancelable: true }
    );
  };

  const renderWordItem = ({ item }: { item: string }) => (
    <View style={styles.wordItem}>
      <Text style={styles.wordItemText}>{item}</Text>
      <View style={styles.wordItemButtons}>
        <TouchableOpacity style={styles.playWordButton} onPress={() => handlePlayWord(item)}>
          <Text style={styles.playWordButtonText}>Play</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.deleteWordButton} onPress={() => handleDeleteWord(item)}>
          <Text style={styles.deleteWordButtonText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Manage Word List</Text>

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.textInput}
          placeholder="Add new word"
          placeholderTextColor="#aaa"
          value={newWord}
          onChangeText={(text) => {
            setNewWord(text);
            console.log("WordListScreen: TextInput onChangeText. Current newWord state:", text);
          }}
          onSubmitEditing={handleAddWord}
        />
        <TouchableOpacity style={styles.addButton} onPress={handleAddWord}>
          <Text style={styles.addButtonText}>Add Word</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        style={styles.wordList}
        data={wordList}
        renderItem={renderWordItem}
        keyExtractor={(item, index) => item + index}
        ListEmptyComponent={<Text style={styles.emptyListText}>No words yet. Add some!</Text>}
      />

      <View style={styles.separator} />

      <Button title="Go to Session Set Up" onPress={() => navigation.navigate('Session')} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: 'black',
    padding: 20,
    paddingTop: 60,
  },
  header: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 20,
    color: 'white',
  },
  inputContainer: {
    flexDirection: 'row',
    marginBottom: 20,
    width: '100%',
    paddingHorizontal: 10,
  },
  textInput: {
    flex: 1,
    height: 45,
    borderColor: '#666',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 15,
    backgroundColor: '#333',
    color: 'white',
    fontSize: 16,
    marginRight: 10,
  },
  addButton: {
    backgroundColor: '#28a745',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 8,
    justifyContent: 'center',
  },
  addButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  wordList: {
    width: '100%',
    flex: 1,
  },
  wordItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    paddingVertical: 15,
    paddingHorizontal: 15,
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#444',
  },
  wordItemText: {
    fontSize: 18,
    color: 'white',
    flex: 1,
    marginRight: 10,
  },
  wordItemButtons: {
    flexDirection: 'row',
  },
  playWordButton: {
    backgroundColor: '#007bff',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 5,
    marginLeft: 8,
  },
  playWordButtonText: {
    color: 'white',
    fontSize: 14,
  },
  deleteWordButton: {
    backgroundColor: '#dc3545',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 5,
    marginLeft: 8,
  },
  deleteWordButtonText: {
    color: 'white',
    fontSize: 14,
  },
  emptyListText: {
    color: '#aaa',
    textAlign: 'center',
    marginTop: 50,
    fontSize: 16,
  },
  separator: {
    height: 1,
    backgroundColor: '#555',
    width: '80%',
    marginVertical: 20,
  },
});