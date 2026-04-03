// screens/VoiceSetupScreen.tsx
import React, { useState, useEffect, useContext, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import { RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import * as Speech from 'expo-speech';
import { WordListContext } from '../WordListContext';
import { VoiceContext } from './VoiceContext';
import { RootStackParamList } from '../App';

type VoiceSetupNavProp = StackNavigationProp<RootStackParamList, 'VoiceSetup'>;
type VoiceSetupRouteProp = RouteProp<RootStackParamList, 'VoiceSetup'>;

const DURATIONS = [5, 10, 15, 20, 25, 30];

export default function VoiceSetupScreen({
  navigation,
  route,
}: {
  navigation: VoiceSetupNavProp;
  route: VoiceSetupRouteProp;
}) {
  const { wordList } = useContext(WordListContext);
  const { voiceId, setVoiceId, speechRate, setSpeechRate, isLoaded } = useContext(VoiceContext);

  const [voices, setVoices] = useState<Speech.Voice[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewingId, setPreviewingId] = useState<string | null>(null);
  const [selectedDuration, setSelectedDuration] = useState(10);
  const [isTtsAvailable, setIsTtsAvailable] = useState(true);

  useEffect(() => {
    const durationFromRoute = route?.params?.duration;
    if (typeof durationFromRoute === 'number') {
      setSelectedDuration(durationFromRoute);
    }
  }, [route?.params?.duration]);

  // Load voices on mount
  useEffect(() => {
    if (!isLoaded) return;
    
    const loadVoices = async () => {
      try {
        console.log('SLPR: VoiceSetup - loading voices...');
        setLoading(true);
        
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const available = await Speech.getAvailableVoicesAsync();
        console.log('SLPR: VoiceSetup - available voices:', available?.length);
        
        if (!Array.isArray(available) || available.length === 0) {
          setVoices([]);
          setIsTtsAvailable(false);
          setLoading(false);
          return;
        }
        
        // Filter for English voices
        const english = available.filter((v) => {
          const lang = v.language?.toLowerCase();
          return lang && (lang.startsWith('en-') || lang === 'en');
        });
        
        const filtered = english.length > 0 ? english : available;
        setVoices(filtered);
        setIsTtsAvailable(filtered.length > 0);
        
        if (!voiceId && filtered.length > 0) {
          setVoiceId(filtered[0].identifier);
        }
        
        console.log('SLPR: VoiceSetup - loaded', filtered.length, 'voices');
      } catch (error) {
        console.error('SLPR: VoiceSetup - failed to load voices', error);
        setVoices([]);
        setIsTtsAvailable(false);
      } finally {
        setLoading(false);
      }
    };
    
    loadVoices();
  }, [isLoaded, voiceId, setVoiceId]);

  const formatVoiceName = (voice: Speech.Voice): string => {
    let name = voice.name ?? voice.identifier ?? 'Unknown';
    name = name.split('#')[0].split('.')[0].trim();
    name = name.replace(/_/g, ' ').replace(/-language$/i, '').replace(/-local$/i, '').trim();
    name = name.replace(/\b\w/g, (c) => c.toUpperCase());
    
    const region = voice.language?.split('-')[1]?.toUpperCase();
    if (region && !name.toUpperCase().includes(region)) name += ` (${region})`;
    return name;
  };

  const handleVoiceTap = (identifier: string) => {
    if (previewingId === identifier) {
      Speech.stop();
      setPreviewingId(null);
      return;
    }
    
    Speech.stop();
    setVoiceId(identifier);
    setPreviewingId(identifier);
    
    // Preview the voice
    Speech.speak('This is a preview of my voice.', {
      voice: identifier,
      rate: speechRate,
      onDone: () => setPreviewingId(null),
      onError: () => setPreviewingId(null),
    });
  };

  const handleStartSession = () => {
    if (!isTtsAvailable) {
      alert('Text-to-speech is not available on this device.');
      return;
    }
    
    if (wordList.length === 0) {
      alert('Add some words to your Word Bank first.');
      return;
    }
    
    navigation.replace('Session', { duration: selectedDuration });
  };

  const renderVoice = ({ item }: { item: Speech.Voice }) => (
    <TouchableOpacity
      style={[
        styles.voiceItem,
        voiceId === item.identifier && styles.voiceSelected,
        previewingId === item.identifier && styles.voicePreviewing,
      ]}
      onPress={() => handleVoiceTap(item.identifier)}
      activeOpacity={0.8}
    >
      <View style={styles.voiceInfo}>
        <Text style={styles.voiceName}>{formatVoiceName(item)}</Text>
        <Text style={styles.voiceLang}>{item.language}</Text>
      </View>
      <View style={styles.voiceStatus}>
        {previewingId === item.identifier ? (
          <ActivityIndicator color="#1a56ff" size="small" />
        ) : (
          <Text style={styles.previewText}>
            {voiceId === item.identifier ? 'Selected' : 'Preview'}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );

  const renderDuration = (duration: number) => (
    <TouchableOpacity
      style={[
        styles.durationChip,
        selectedDuration === duration && styles.durationSelected,
      ]}
      onPress={() => setSelectedDuration(duration)}
      activeOpacity={0.8}
    >
      <Text style={[
        styles.durationText,
        selectedDuration === duration && styles.durationTextSelected,
      ]}>
        {duration} min
      </Text>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.centered}>
          <ActivityIndicator color="#1a56ff" size="large" />
          <Text style={styles.loadingText}>Loading voices...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!isTtsAvailable) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.centered}>
          <Text style={styles.errorText}>
            Text-to-speech is not available on this device.{'\n\n'}
            Please install TTS voice data in your device settings.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backLink}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Setup Session</Text>
          <View style={{ width: 48 }} />
        </View>

        <FlatList
          data={voices}
          keyExtractor={(v) => v.identifier}
          renderItem={renderVoice}
          style={styles.voiceList}
          contentContainerStyle={styles.voiceListContent}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <View style={styles.scrollContent}>
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Choose Your Voice</Text>
                <Text style={styles.sectionSubtitle}>Tap to preview, select your preferred voice</Text>
              </View>
            </View>
          }
          ListFooterComponent={
            <View style={styles.scrollContent}>
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Session Duration</Text>
                <Text style={styles.sectionSubtitle}>How long would you like your session to be?</Text>
                <View style={styles.durationGrid}>
                  {DURATIONS.map(renderDuration)}
                </View>
              </View>

              <View style={styles.section}>
                <TouchableOpacity
                  style={[styles.startButton, (!voiceId || wordList.length === 0) && styles.startButtonDisabled]}
                  onPress={handleStartSession}
                  disabled={!voiceId || wordList.length === 0}
                  activeOpacity={0.8}
                >
                  <Text style={styles.startButtonText}>
                    {wordList.length === 0 ? 'Add Words First' :
                      route?.params?.changeSettings ? 'Apply Changes' : 'Start Session'}
                  </Text>
                </TouchableOpacity>

                {wordList.length > 0 && (
                  <Text style={styles.wordCount}>
                    {wordList.length} word{wordList.length === 1 ? '' : 's'} ready
                  </Text>
                )}
              </View>
            </View>
          }
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#000',
  },
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    color: '#888',
    marginTop: 16,
    fontSize: 16,
  },
  errorText: {
    color: '#888',
    textAlign: 'center',
    fontSize: 16,
    lineHeight: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  backLink: {
    color: '#555',
    fontSize: 15,
    width: 48,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 2,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#888',
    marginBottom: 16,
    lineHeight: 20,
  },
  voiceList: {
    flex: 1,
  },
  voiceListContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  voiceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#111',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#222',
  },
  voiceSelected: {
    backgroundColor: '#1a56ff20',
    borderColor: '#1a56ff',
  },
  voicePreviewing: {
    backgroundColor: '#1a56ff10',
  },
  voiceInfo: {
    flex: 1,
  },
  voiceName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  voiceLang: {
    color: '#888',
    fontSize: 12,
    marginTop: 2,
  },
  voiceStatus: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 60,
  },
  previewText: {
    color: '#1a56ff',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  separator: {
    height: 8,
  },
  durationGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  durationChip: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#111',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#222',
  },
  durationSelected: {
    backgroundColor: '#1a56ff',
    borderColor: '#1a56ff',
  },
  durationText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  durationTextSelected: {
    color: '#fff',
  },
  startButton: {
    backgroundColor: '#1a56ff',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  startButtonDisabled: {
    backgroundColor: '#333',
  },
  startButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  wordCount: {
    color: '#888',
    textAlign: 'center',
    marginTop: 12,
    fontSize: 14,
  },
});
