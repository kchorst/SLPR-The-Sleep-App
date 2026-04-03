// screens/HomeScreen.tsx
import React, { useContext, useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  FlatList,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../App';
import { WordListContext } from '../WordListContext';
import { loadHistory, formatSessionDate, SessionEntry } from '../utils/sessionHistory';

type HomeNavProp = StackNavigationProp<RootStackParamList, 'Home'>;

export default function HomeScreen({ navigation }: { navigation: HomeNavProp }) {
  const { wordList } = useContext(WordListContext);
  const [history, setHistory] = useState<SessionEntry[]>([]);

  // Reload history every time the screen comes into focus
  // (so it updates immediately after returning from a session)
  useFocusEffect(
    useCallback(() => {
      loadHistory().then(setHistory);
    }, [])
  );

  const renderHistoryItem = ({ item }: { item: SessionEntry }) => (
    <View style={styles.historyRow}>
      <Text style={styles.historyDate}>{formatSessionDate(item.date)}</Text>
      <Text style={styles.historyDuration}>{item.durationMinutes} min</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>

        {/* Title */}
        <View style={styles.titleBlock}>
          <Text style={styles.title}>SLPR</Text>
          <Text style={styles.subtitle}>cognitive shuffle sleep aid</Text>
        </View>

        {/* Word bank count */}
        <Text style={styles.wordCount}>
          {wordList.length === 0
            ? 'No words in your bank yet'
            : `${wordList.length} word${wordList.length === 1 ? '' : 's'} in your bank`}
        </Text>

        {/* Primary action */}
        <TouchableOpacity
          style={[styles.button, styles.buttonPrimary]}
          onPress={() => navigation.navigate('Session')}
          activeOpacity={0.8}
        >
          <Text style={styles.buttonText}>Setup & Start Session</Text>
        </TouchableOpacity>

        {/* Secondary action */}
        <TouchableOpacity
          style={[styles.button, styles.buttonSecondary]}
          onPress={() => navigation.navigate('WordBank')}
          activeOpacity={0.8}
        >
          <Text style={[styles.buttonText, styles.buttonTextSecondary]}>
            Manage Word Bank
          </Text>
        </TouchableOpacity>

        {/* Session history */}
        {history.length > 0 && (
          <View style={styles.historyBlock}>
            <Text style={styles.historyLabel}>Recent Sessions</Text>
            <FlatList
              data={history.slice(0, 7)}
              keyExtractor={(_, i) => String(i)}
              renderItem={renderHistoryItem}
              scrollEnabled={false}
              ItemSeparatorComponent={() => <View style={styles.historySep} />}
            />
          </View>
        )}

        {/* Footer */}
        {history.length === 0 && (
          <Text style={styles.blurb}>
            At bedtime, SLPR reads your words aloud one at a time — randomised,
            with gaps — to interrupt coherent thought and help you drift off.
          </Text>
        )}

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#000' },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 16,
  },
  titleBlock: { alignItems: 'center', marginBottom: 8 },
  title: { fontSize: 64, fontWeight: '700', color: '#fff', letterSpacing: 8 },
  subtitle: { fontSize: 14, color: '#666', letterSpacing: 2, textTransform: 'uppercase', marginTop: 4 },

  wordCount: { fontSize: 14, color: '#555' },

  button: { width: '100%', paddingVertical: 18, borderRadius: 12, alignItems: 'center' },
  buttonPrimary: { backgroundColor: '#1a56ff' },
  buttonSecondary: { backgroundColor: 'transparent', borderWidth: 1, borderColor: '#333' },
  buttonText: { color: '#fff', fontSize: 18, fontWeight: '600' },
  buttonTextSecondary: { color: '#888' },

  historyBlock: {
    width: '100%',
    marginTop: 8,
  },
  historyLabel: {
    color: '#333',
    fontSize: 11,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  historyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  historyDate: { color: '#555', fontSize: 14 },
  historyDuration: { color: '#333', fontSize: 14 },
  historySep: { height: 1, backgroundColor: '#111' },

  blurb: {
    color: '#333',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
    marginTop: 8,
    paddingHorizontal: 8,
  },
});
