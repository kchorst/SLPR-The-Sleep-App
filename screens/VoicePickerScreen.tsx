// screens/VoicePickerScreen.tsx
import React, { useState, useEffect, useContext, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import * as Speech from 'expo-speech';
import { useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../App';
import { VoiceContext } from './VoiceContext';

type VoicePickerNavProp = StackNavigationProp<RootStackParamList, 'VoicePicker'>;

const RATES = [
  { label: 'Slow',   value: 0.7 },
  { label: 'Normal', value: 0.9 },
  { label: 'Fast',   value: 1.1 },
];

function formatVoiceName(voice: Speech.Voice): string {
  const raw = (voice.name ?? voice.identifier ?? '').toLowerCase();
  const lang = (voice.language ?? '').toLowerCase();

  let region = '';
  if (lang.startsWith('en-gb') || raw.includes('-gb') || raw.includes('gb#')) region = 'UK';
  else if (lang.startsWith('en-au') || raw.includes('-au') || raw.includes('au#')) region = 'AU';
  else if (lang.startsWith('en-in') || raw.includes('-in-') || raw.includes('india')) region = 'IN';
  else if (lang.startsWith('en')) region = 'US';

  let gender = '';
  if (raw.includes('female')) gender = 'Female';
  else if (raw.includes('male')) gender = 'Male';

  const numMatch = raw.match(/[_#-](\d+)/);
  const num = numMatch ? ` ${numMatch[1]}` : '';

  // Android system voice IDs contain '#' or match en-xx-x-pattern
  if (raw.includes('#') || /^en-[a-z]{2}-x-/.test(raw)) {
    const regionStr = region ? ` (${region})` : '';
    const genderStr = gender ? ` · ${gender}${num}` : num ? ` · Voice${num}` : '';
    return `English${regionStr}${genderStr}`;
  }

  // Named voices (iOS or nicer Android)
  let name = voice.name ?? voice.identifier ?? 'Unknown';
  name = name.split('#')[0].split('.')[0].trim();
  name = name.replace(/_/g, ' ').replace(/-language$/i, '').replace(/-local$/i, '').trim();
  name = name.replace(/\b\w/g, (c) => c.toUpperCase());
  if (region && !name.toUpperCase().includes(region)) name += ` (${region})`;
  return name;
}

export default function VoicePickerScreen({ navigation }: { navigation: VoicePickerNavProp }) {
  const { voiceId, setVoiceId, speechRate, setSpeechRate, isLoaded } = useContext(VoiceContext);

  const [voices, setVoices] = useState<Speech.Voice[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewingId, setPreviewingId] = useState<string | null>(null);
  const [showAllLanguages, setShowAllLanguages] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [isTtsAvailable, setIsTtsAvailable] = useState(true);

  const refreshVoices = async () => {
    setRefreshing(true);
    try {
      console.log('SLPR: Manually refreshing voices...');
      const available = await Speech.getAvailableVoicesAsync();
      console.log('SLPR: Refresh result - voices found:', available?.length);
      
      if (!Array.isArray(available) || available.length === 0) {
        console.warn('SLPR: No voices found during refresh, retrying...');
        // Retry after a short delay
        setTimeout(async () => {
          try {
            const retryVoices = await Speech.getAvailableVoicesAsync();
            console.log('SLPR: Retry result - voices found:', retryVoices?.length);
            if (Array.isArray(retryVoices) && retryVoices.length > 0) {
              let filtered = retryVoices;
              if (!showAllLanguages) {
                const english = retryVoices.filter((v) => {
                  const lang = v.language?.toLowerCase();
                  return lang && (lang.startsWith('en-') || lang === 'en');
                });
                filtered = english.length > 0 ? english : retryVoices;
              }
              setVoices(filtered);
              console.log('SLPR: Retry successful, set voices count:', filtered.length);
            } else {
              setVoices([]);
            }
          } catch (retryError) {
            console.error('SLPR: Retry failed', retryError);
            setVoices([]);
          }
        }, 1000);
        return;
      }
      
      let filtered = available;
      if (!showAllLanguages) {
        console.log('SLPR: Filtering for English voices in refresh...');
        const english = available.filter((v) => {
          const lang = v.language?.toLowerCase();
          const isEnglish = lang && (lang.startsWith('en-') || lang === 'en');
          return isEnglish;
        });
        console.log(`SLPR: English voices found in refresh: ${english.length}`);
        filtered = english.length > 0 ? english : available;
      }
      
      setVoices(filtered);
      console.log('SLPR: Set voices count after refresh:', filtered.length);
    } catch (error) {
      console.error('SLPR: Failed to refresh voices', error);
      setVoices([]);
    } finally {
      setRefreshing(false);
    }
  };

  // Stop preview when leaving screen
  useFocusEffect(
    useCallback(() => {
      return () => {
        Speech.stop();
        setPreviewingId(null);
      };
    }, [])
  );

  useEffect(() => {
    if (!isLoaded) return;
    
    const loadVoices = async () => {
      try {
        console.log('SLPR: Starting voice load process...');
        setLoading(true);
        
        // Add a small delay to ensure TTS service is ready after app restart
        await new Promise(resolve => setTimeout(resolve, 500));
        
        console.log('SLPR: Delay completed, now fetching voices...');
        const available = await Speech.getAvailableVoicesAsync();
        console.log('SLPR: Initial voice load - available voices:', available?.length);
        
        if (!Array.isArray(available) || available.length === 0) {
          console.warn('SLPR: No voices available from expo-speech');
          setVoices([]);
          setIsTtsAvailable(false);
          setLoading(false);
          return;
        }
        
        let filtered = available;
        if (!showAllLanguages) {
          console.log('SLPR: Filtering for English voices...');
          const english = available.filter((v) => {
            const lang = v.language?.toLowerCase();
            const isEnglish = lang && (lang.startsWith('en-') || lang === 'en');
            if (isEnglish) {
              console.log(`SLPR: Found English voice: ${v.name} (${v.language})`);
            }
            return isEnglish;
          });
          console.log(`SLPR: English voices found: ${english.length}`);
          filtered = english.length > 0 ? english : available;
        }
        
        console.log('SLPR: Setting voices array, count:', filtered.length);
        setVoices(filtered);
        setIsTtsAvailable(filtered.length > 0);
        
        if (!voiceId && filtered.length > 0) {
          const firstVoice = filtered[0];
          console.log('SLPR: Setting default voice to:', firstVoice.name);
          setVoiceId(firstVoice.identifier);
        }
        
        console.log('SLPR: Voice load completed successfully');
      } catch (error) {
        console.error('SLPR: Failed to load voices', error);
        setVoices([]);
        setIsTtsAvailable(false);
      } finally {
        setLoading(false);
      }
    };
    
    loadVoices();
  }, [isLoaded, showAllLanguages, voiceId, setVoiceId]);

  const handleVoiceTap = (identifier: string) => {
    if (previewingId === identifier) {
      Speech.stop();
      setPreviewingId(null);
      return;
    }
    Speech.stop();
    setVoiceId(identifier);
    setPreviewingId(identifier);
    Speech.speak('Close your eyes and visualise each word.', {
      voice: identifier,
      rate: speechRate,
      onDone: () => setPreviewingId(null),
      onError: () => setPreviewingId(null),
    });
  };

  const handleRateSelect = (rate: number) => {
    setSpeechRate(rate);
    // If currently previewing, re-preview at new rate
    if (previewingId) {
      Speech.stop();
      Speech.speak('Close your eyes and visualise each word.', {
        voice: previewingId,
        rate,
        onDone: () => setPreviewingId(null),
        onError: () => setPreviewingId(null),
      });
    }
  };

  const renderVoice = ({ item }: { item: Speech.Voice }) => {
    const isSel = voiceId === item.identifier;
    const isPreviewing = previewingId === item.identifier;
    return (
      <TouchableOpacity
        style={[styles.voiceRow, isSel && styles.voiceRowSelected]}
        onPress={() => handleVoiceTap(item.identifier)}
        activeOpacity={0.7}
      >
        <View style={styles.voiceInfo}>
          <Text style={[styles.voiceName, isSel && styles.voiceNameSelected]}>
            {formatVoiceName(item)}
          </Text>
          {isPreviewing && (
            <Text style={styles.playingLabel}>▶ playing · tap to stop</Text>
          )}
        </View>
        {isSel && !isPreviewing && (
          <Text style={styles.checkmark}>✓</Text>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>

        {/* Header */}
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backLink}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.header}>Voice</Text>
          <TouchableOpacity 
            onPress={refreshVoices} 
            disabled={refreshing}
            style={styles.refreshButton}
          >
            <Text style={styles.refreshText}>
              {refreshing ? '...' : '↻'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Rate chips */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Speech rate</Text>
          <View style={styles.chipRow}>
            {RATES.map((r) => (
              <TouchableOpacity
                key={r.label}
                style={[styles.chipBox, speechRate === r.value && styles.chipSelected]}
                onPress={() => handleRateSelect(r.value)}
              >
                <Text style={[styles.chipText, speechRate === r.value && styles.chipTextSelected]}>
                  {r.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <Text style={styles.sectionLabel}>Available voices · tap to preview</Text>
        
        {/* Language toggle */}
        <View style={styles.languageToggleRow}>
          <TouchableOpacity
            style={[styles.languageToggle, !showAllLanguages && styles.languageToggleActive]}
            onPress={() => setShowAllLanguages(false)}
          >
            <Text style={[styles.languageToggleText, !showAllLanguages && styles.languageToggleTextActive]}>
              English
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.languageToggle, showAllLanguages && styles.languageToggleActive]}
            onPress={() => setShowAllLanguages(true)}
          >
            <Text style={[styles.languageToggleText, showAllLanguages && styles.languageToggleTextActive]}>
              All Languages
            </Text>
          </TouchableOpacity>
        </View>

        {loading || !isLoaded ? (
          <View style={styles.centered}>
            <ActivityIndicator color="#1a56ff" />
            <Text style={styles.hint}>Loading voices…</Text>
          </View>
        ) : !isTtsAvailable ? (
          <View style={styles.centered}>
            <Text style={styles.hint}>
              Text-to-speech is not available on this device.{'\n\n'}
              Please install TTS voice data:{'\n\n'}
              Android Settings → General Management → Language & Input → Text-to-Speech Output → Install voice data{'\n\n'}
              Then restart the app.
            </Text>
          </View>
        ) : voices.length === 0 ? (
          <View style={styles.centered}>
            <Text style={styles.hint}>
              No TTS voices found on your device.{'\n\n'}
              Please install voice data:{'\n\n'}
              Android Settings → General Management → Language & Input → Text-to-Speech Output → Install voice data{'\n\n'}
              Then restart the app.
            </Text>
          </View>
        ) : (
          <FlatList
            data={voices}
            keyExtractor={(v) => v.identifier}
            renderItem={renderVoice}
            style={styles.list}
            contentContainerStyle={styles.listContent}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
          />
        )}

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#000' },
  container: { flex: 1, paddingTop: 12 },

  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  header: { fontSize: 22, fontWeight: '700', color: '#fff', letterSpacing: 2 },
  backLink: { color: '#555', fontSize: 15, width: 48 },
  refreshButton: { 
    width: 48, 
    alignItems: 'center', 
    justifyContent: 'center',
    paddingVertical: 4
  },
  refreshText: { 
    color: '#1a56ff', 
    fontSize: 20, 
    fontWeight: '300' 
  },

  section: { paddingHorizontal: 20, marginBottom: 24 },
  sectionLabel: {
    color: '#555', fontSize: 11, letterSpacing: 2,
    textTransform: 'uppercase', marginBottom: 10,
    paddingHorizontal: 20,
  },

  chipRow: { flexDirection: 'row', gap: 10 },
  chipBox: {
    flex: 1, paddingVertical: 12, alignItems: 'center',
    borderRadius: 8, borderWidth: 1, borderColor: '#333', backgroundColor: '#111',
  },
  chipSelected: { backgroundColor: '#1a56ff', borderColor: '#1a56ff' },
  chipText: { color: '#888', fontSize: 15, fontWeight: '600' },
  chipTextSelected: { color: '#fff' },

  list: { flex: 1 },
  listContent: { paddingHorizontal: 20, paddingBottom: 32 },
  separator: { height: 1, backgroundColor: '#111' },

  voiceRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 16, paddingHorizontal: 16,
    backgroundColor: '#0a0a0a', borderRadius: 8,
  },
  voiceRowSelected: { backgroundColor: '#0d2a6e' },
  voiceInfo: { flex: 1 },
  voiceName: { color: '#888', fontSize: 16 },
  voiceNameSelected: { color: '#fff', fontWeight: '600' },
  playingLabel: { color: '#1a56ff', fontSize: 12, marginTop: 3 },
  checkmark: { color: '#1a56ff', fontSize: 18, fontWeight: '700', marginLeft: 12 },

  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  hint: { color: '#444', fontSize: 14, textAlign: 'center', lineHeight: 22, marginTop: 12 },

  languageToggleRow: {
    flexDirection: 'row',
    backgroundColor: '#111',
    borderRadius: 8,
    padding: 4,
    marginBottom: 16,
    marginHorizontal: 20,
  },
  languageToggle: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  languageToggleActive: {
    backgroundColor: '#1a56ff',
  },
  languageToggleText: {
    color: '#888',
    fontSize: 13,
    fontWeight: '600',
  },
  languageToggleTextActive: {
    color: '#fff',
  },
});
