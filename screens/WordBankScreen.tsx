// screens/WordBankScreen.tsx
import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  Alert,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import * as Speech from 'expo-speech';
import { StackNavigationProp } from '@react-navigation/stack';
import { WordListContext } from '../WordListContext';
import { VoiceContext } from './VoiceContext';
import { RootStackParamList } from '../App';

type WordBankNavProp = StackNavigationProp<RootStackParamList, 'WordBank'>;

export default function WordBankScreen({ navigation }: { navigation: WordBankNavProp }) {
  const { wordList, setWordList } = useContext(WordListContext);
  const { voiceId, speechRate } = useContext(VoiceContext);
  const [newWord, setNewWord] = useState('');
  const [isTtsAvailable, setIsTtsAvailable] = useState(true);

  // Check TTS availability on mount
  useEffect(() => {
    (async () => {
      try {
        const voices = await Speech.getAvailableVoicesAsync();
        const available = Array.isArray(voices) && voices.length > 0;
        setIsTtsAvailable(available);
        console.log('SLPR: WordBankScreen - TTS voices available:', voices?.length || 0);
      } catch (error) {
        console.warn('SLPR: WordBankScreen - TTS not available', error);
        setIsTtsAvailable(false);
      }
    })();
  }, []);

  const handleAdd = () => {
    const trimmed = newWord.trim().toLowerCase();
    if (!trimmed) {
      Alert.alert('Empty word', 'Type a word before adding.');
      return;
    }
    if (wordList.includes(trimmed)) {
      Alert.alert('Duplicate', `"${trimmed}" is already in your bank.`);
      return;
    }
    setWordList((prev) => [trimmed, ...prev]);
    setNewWord('');
  };

  const handlePreview = (word: string) => {
    if (!isTtsAvailable) {
      Alert.alert(
        'TTS Not Available',
        'Text-to-speech is not available on this device.',
        [{ text: 'OK' }]
      );
      return;
    }
    
    Speech.stop();
    const opts: Speech.SpeechOptions = { 
      rate: speechRate,
      onError: (error) => {
        console.warn('SLPR: Word preview error', error);
      }
    };
    if (voiceId) opts.voice = voiceId;
    Speech.speak(word, opts);
  };

  const handleDelete = (word: string) => {
    Alert.alert(
      'Remove word',
      `Remove "${word}" from your bank?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => setWordList((prev) => prev.filter((w) => w !== word)),
        },
      ]
    );
  };

  const handleReset = () => {
    Alert.alert(
      'Reset word bank',
      'This will delete all your words and restore the 50 defaults. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: () => setWordList([]),
        },
      ]
    );
  };

  const renderItem = ({ item }: { item: string }) => (
    <View style={styles.row}>
      <Text style={styles.word}>{item}</Text>
      <View style={styles.rowButtons}>
        <TouchableOpacity style={styles.previewBtn} onPress={() => handlePreview(item)}>
          <Text style={styles.previewBtnText}>▶</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(item)}>
          <Text style={styles.deleteBtnText}>✕</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.container}>

          <View style={styles.headerRow}>
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Text style={styles.backLink}>← Back</Text>
            </TouchableOpacity>
            <Text style={styles.header}>Word Bank</Text>
            <TouchableOpacity onPress={handleReset}>
              <Text style={styles.resetLink}>Reset</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.count}>
            {wordList.length} word{wordList.length !== 1 ? 's' : ''}
          </Text>

          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              placeholder="Add a word…"
              placeholderTextColor="#555"
              value={newWord}
              onChangeText={setNewWord}
              onSubmitEditing={handleAdd}
              autoCapitalize="none"
              returnKeyType="done"
            />
            <TouchableOpacity style={styles.addBtn} onPress={handleAdd}>
              <Text style={styles.addBtnText}>Add</Text>
            </TouchableOpacity>
          </View>

          <FlatList
            data={wordList}
            keyExtractor={(item, index) => `${item}-${index}`}
            renderItem={renderItem}
            style={styles.list}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={
              <Text style={styles.emptyText}>No words yet. Add your first word above.</Text>
            }
          />

        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#000' },
  flex: { flex: 1 },
  container: { flex: 1, paddingHorizontal: 20, paddingTop: 12 },
  headerRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4,
  },
  header: { fontSize: 22, fontWeight: '700', color: '#fff', letterSpacing: 2 },
  backLink: { color: '#555', fontSize: 15 },
  resetLink: { color: '#555', fontSize: 14 },
  count: { color: '#444', fontSize: 13, textAlign: 'center', marginBottom: 16 },
  inputRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  input: {
    flex: 1, backgroundColor: '#111', color: '#fff',
    borderWidth: 1, borderColor: '#333', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 16,
  },
  addBtn: { backgroundColor: '#1a56ff', borderRadius: 10, paddingHorizontal: 20, justifyContent: 'center' },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  list: { flex: 1 },
  row: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#111', borderRadius: 10,
    paddingVertical: 14, paddingHorizontal: 16,
    marginBottom: 8, borderWidth: 1, borderColor: '#222',
  },
  word: { color: '#fff', fontSize: 17, flex: 1 },
  rowButtons: { flexDirection: 'row', gap: 8 },
  previewBtn: { backgroundColor: '#1a3a7a', borderRadius: 6, paddingVertical: 7, paddingHorizontal: 12 },
  previewBtnText: { color: '#fff', fontSize: 14 },
  deleteBtn: { backgroundColor: '#3a1a1a', borderRadius: 6, paddingVertical: 7, paddingHorizontal: 12 },
  deleteBtnText: { color: '#c0392b', fontSize: 14, fontWeight: '700' },
  emptyText: { color: '#444', textAlign: 'center', marginTop: 60, fontSize: 15, lineHeight: 24 },
});
