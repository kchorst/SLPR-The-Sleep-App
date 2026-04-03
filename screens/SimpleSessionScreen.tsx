// screens/SimpleSessionScreen.tsx
import React, { useState, useEffect, useContext, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { NavigationProp } from '@react-navigation/native';
import * as Speech from 'expo-speech';
import * as Haptics from 'expo-haptics';
import { Audio } from 'expo-av';
import { useKeepAwake } from 'expo-keep-awake';
import { WordListContext } from '../WordListContext';
import { VoiceContext } from './VoiceContext';
import { RootStackParamList } from '../App';
import { saveSession } from '../utils/sessionHistory';

type SimpleSessionNavProp = NavigationProp<RootStackParamList, 'Session'>;

type SessionStatus = 'setup' | 'intro' | 'playing' | 'paused' | 'finished';

const GAP_DEFAULT = 8; // seconds

function shuffleArray<T>(array: T[]): T[] {
  const a = [...array];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function formatTime(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

export default function SimpleSessionScreen({ navigation, route }: { navigation: SimpleSessionNavProp; route: any }) {
  const { wordList } = useContext(WordListContext);
  const { voiceId, speechRate } = useContext(VoiceContext);

  // Get duration from route params or default to 10
  const initialDuration = route?.params?.duration || 10;
  
  const [status, setStatus] = useState<SessionStatus>('setup');
  const [timeRemaining, setTimeRemaining] = useState(initialDuration * 60);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [isTtsAvailable, setIsTtsAvailable] = useState(true);
  const [currentVoiceName, setCurrentVoiceName] = useState<string>('Loading...');
  const [sessionDuration, setSessionDuration] = useState(initialDuration);

  // Refs
  const voiceIdRef = useRef<string | null>(voiceId);
  const speechRateRef = useRef<number>(speechRate);
  const statusRef = useRef<SessionStatus>('setup');
  const wordsRef = useRef<string[]>([]);
  const indexRef = useRef(0);
  const mainTimerRef = useRef<NodeJS.Timeout | null>(null);
  const gapTimerRef = useRef<NodeJS.Timeout | null>(null);
  const sessionStartMinutesRef = useRef(initialDuration);
  const hasRedirectedToVoiceSetupRef = useRef(false);

  // Keep refs in sync with context values
  useEffect(() => { voiceIdRef.current = voiceId; }, [voiceId]);
  useEffect(() => { speechRateRef.current = speechRate; }, [speechRate]);

  useKeepAwake(status === 'playing' ? 'session' : undefined as any);

  const setStatusBoth = (s: SessionStatus) => {
    setStatus(s);
    statusRef.current = s;
  };

  // Audio session setup
  useEffect(() => {
    (async () => {
      try {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          staysActiveInBackground: true,
          playsInSilentModeIOS: true,
          shouldDuckAndroid: true,
          playThroughEarpieceAndroid: false,
        });
        console.log('SLPR: Audio mode set successfully');
      } catch (error) {
        console.warn('SLPR: Failed to set audio mode', error);
        setAudioError('Audio setup failed. TTS may not work properly.');
      }
    })();
  }, []);

  // Check TTS availability and get current voice name
  useEffect(() => {
    const loadVoiceInfo = async () => {
      try {
        const voices = await Speech.getAvailableVoicesAsync();
        const available = Array.isArray(voices) && voices.length > 0;
        setIsTtsAvailable(available);
        
        if (available && voiceId) {
          const currentVoice = voices.find(v => v.identifier === voiceId);
          if (currentVoice) {
            let name = currentVoice.name ?? currentVoice.identifier ?? 'Unknown';
            name = name.split('#')[0].split('.')[0].trim();
            name = name.replace(/_/g, ' ').replace(/-language$/i, '').trim();
            name = name.replace(/\b\w/g, (c) => c.toUpperCase());
            setCurrentVoiceName(name);
            console.log('SLPR: Current voice set to:', name);
          } else {
            console.warn('SLPR: Voice not found, forcing voice selection');
            setCurrentVoiceName('No Voice Selected');
            if (!hasRedirectedToVoiceSetupRef.current) {
              hasRedirectedToVoiceSetupRef.current = true;
              setTimeout(() => {
                navigation.navigate('VoiceSetup', { duration: sessionDuration, changeSettings: true });
              }, 300);
            }
          }
        } else if (available && !voiceId) {
          console.log('SLPR: No voice selected, forcing voice selection');
          setCurrentVoiceName('No Voice Selected');

          if (!hasRedirectedToVoiceSetupRef.current) {
            hasRedirectedToVoiceSetupRef.current = true;
            setTimeout(() => {
              navigation.navigate('VoiceSetup', { duration: sessionDuration, changeSettings: true });
            }, 300);
          }
        } else {
          setCurrentVoiceName('No Voice Available');
        }
      } catch (error) {
        console.warn('SLPR: SessionScreen - TTS not available', error);
        setIsTtsAvailable(false);
        setCurrentVoiceName('Error Loading Voice');
      }
    };
    
    loadVoiceInfo();
  }, [voiceId]);

  // Refresh voice info when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      const refreshVoiceInfo = async () => {
        try {
          const voices = await Speech.getAvailableVoicesAsync();
          const available = Array.isArray(voices) && voices.length > 0;
          setIsTtsAvailable(available);
          
          if (available && voiceId) {
            const currentVoice = voices.find(v => v.identifier === voiceId);
            if (currentVoice) {
              let name = currentVoice.name ?? currentVoice.identifier ?? 'Unknown';
              name = name.split('#')[0].split('.')[0].trim();
              name = name.replace(/_/g, ' ').replace(/-language$/i, '').trim();
              name = name.replace(/\b\w/g, (c) => c.toUpperCase());
              setCurrentVoiceName(name);
              console.log('SLPR: Refreshed voice name:', name);
            }
          }
        } catch (error) {
          console.warn('SLPR: Failed to refresh voice info', error);
        }
      };
      
      refreshVoiceInfo();
    }, [voiceId])
  );

  // Word loop logic
  const readNextWord = useCallback(() => {
    if (indexRef.current >= wordsRef.current.length) {
      indexRef.current = 0;
      wordsRef.current = shuffleArray(wordList);
    }
    const word = wordsRef.current[indexRef.current];
    indexRef.current++;

    const opts: Speech.SpeechOptions = {
      rate: speechRateRef.current,
      onDone: () => {
        if (statusRef.current === 'playing') {
          gapTimerRef.current = setTimeout(() => readNextWord(), GAP_DEFAULT * 1000);
        }
      },
      onError: (error) => {
        console.warn('SLPR: Speech error', error);
        if (statusRef.current === 'playing') {
          readNextWord();
        }
      },
    };
    if (voiceIdRef.current) opts.voice = voiceIdRef.current;
    Speech.speak(word, opts);
  }, [wordList]);

  const stopWordLoop = useCallback(() => {
    Speech.stop();
    if (mainTimerRef.current) {
      clearInterval(mainTimerRef.current);
      mainTimerRef.current = null;
    }
    if (gapTimerRef.current) {
      clearTimeout(gapTimerRef.current);
      gapTimerRef.current = null;
    }
  }, []);

  const runIntro = useCallback(() => {
    const introLines = [
      'Starting your cognitive shuffle session.',
      'Get comfortable and let the words wash over you.',
      'Tap anywhere to pause.',
    ];
    let i = 0;
    const speakLine = (i: number) => {
      if (i >= introLines.length) {
        console.log('SLPR: Intro complete, starting timer and word loop');
        setStatusBoth('playing');
        readNextWord();
        return;
      }
      const opts: Speech.SpeechOptions = {
        rate: speechRateRef.current,
        onDone: () => { 
          gapTimerRef.current = setTimeout(() => speakLine(i + 1), 800); 
        },
        onError: (error) => {
          console.warn('SLPR: Intro speech error', error);
          speakLine(i + 1);
        },
      };
      if (voiceIdRef.current) opts.voice = voiceIdRef.current;
      Speech.speak(introLines[i], opts);
    };
    speakLine(0);
  }, [readNextWord]);

  // Session end
  const endSession = useCallback(() => {
    stopWordLoop();
    setStatusBoth('finished');
    saveSession(sessionStartMinutesRef.current);
  }, []);

  // Controls
  const handlePlay = () => {
    if (!isTtsAvailable) {
      Alert.alert(
        'TTS Not Available',
        'Text-to-speech is not available on this device.\n\nPlease install TTS voice data in your device settings.',
        [{ text: 'OK' }]
      );
      return;
    }
    
    if (!voiceId) {
      Alert.alert(
        'No Voice Selected',
        'Please select a voice first.',
        [{ text: 'Select Voice', onPress: () => navigation.navigate('VoiceSetup', { duration: sessionDuration, changeSettings: true }) },
         { text: 'Cancel' }]
      );
      return;
    }
    
    if (wordList.length === 0) {
      Alert.alert('No Words', 'Add some words to your Word Bank first.',
        [{ text: 'Go to Word Bank', onPress: () => navigation.navigate('WordBank') },
         { text: 'Cancel' }]);
      return;
    }
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    wordsRef.current = shuffleArray(wordList);
    indexRef.current = 0;
    sessionStartMinutesRef.current = sessionDuration;
    setTimeRemaining(sessionDuration * 60);
    setStatusBoth('intro');
    setAudioError(null);
    runIntro();
  };

  const handlePause = () => {
    if (statusRef.current !== 'playing') return;
    stopWordLoop();
    setStatusBoth('paused');
  };

  const handleResume = () => {
    if (statusRef.current !== 'paused') return;
    setStatusBoth('playing');
    readNextWord();
  };

  const handleStop = () => {
    stopWordLoop();
    setStatusBoth('setup');
    setTimeRemaining(sessionDuration * 60);
  };

  const handleChangeSettings = () => {
    navigation.navigate('VoiceSetup', { duration: sessionDuration, changeSettings: true });
  };

  // Timer (starts only after intro)
  useEffect(() => {
    if (status === 'playing') {
      mainTimerRef.current = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            endSession();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (mainTimerRef.current) {
        clearInterval(mainTimerRef.current);
        mainTimerRef.current = null;
      }
    }
    return () => {
      if (mainTimerRef.current) {
        clearInterval(mainTimerRef.current);
      }
    };
  }, [status, endSession]);

  // Dim screen during intro/playing
  if (status === 'playing' || status === 'intro') {
    return (
      <SafeAreaView style={styles.dimSafe}>
        <TouchableOpacity
          style={styles.dimContainer}
          activeOpacity={1}
          onPress={status === 'playing' ? handlePause : undefined}
        >
          <Text style={styles.dimTime}>
            {status === 'intro' ? 'Starting…' : formatTime(timeRemaining)}
          </Text>
          <Text style={styles.dimHint}>
            {status === 'intro' ? 'listen and get comfortable' : 'tap to pause'}
          </Text>
          <View style={styles.dimControls}>
            {status === 'playing' && (
              <TouchableOpacity
                style={styles.dimPauseBtn}
                onPress={(e) => { e.stopPropagation(); handlePause(); }}
              >
                <Text style={styles.dimPauseText}>Pause</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={styles.dimStopBtn}
              onPress={(e) => { e.stopPropagation(); handleStop(); }}
            >
              <Text style={styles.dimStopText}>Stop</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // Main UI
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>

        <Text style={styles.header}>Sleep Session</Text>
        
        {/* Current Setup */}
        <View style={styles.setupSection}>
          <Text style={styles.setupLabel}>Current Setup</Text>
          
          <View style={styles.setupItem}>
            <Text style={styles.setupItemLabel}>Voice</Text>
            <Text style={styles.setupItemValue}>{currentVoiceName}</Text>
          </View>
          
          <View style={styles.setupItem}>
            <Text style={styles.setupItemLabel}>Duration</Text>
            <Text style={styles.setupItemValue}>{sessionDuration} minutes</Text>
          </View>
          
          <View style={styles.setupItem}>
            <Text style={styles.setupItemLabel}>Word Gap</Text>
            <Text style={styles.setupItemValue}>{GAP_DEFAULT} seconds</Text>
          </View>
          
          <TouchableOpacity 
            style={styles.changeSettingsBtn}
            onPress={handleChangeSettings}
          >
            <Text style={styles.changeSettingsText}>Change Settings</Text>
          </TouchableOpacity>
        </View>

        {/* Word Bank */}
        <View style={styles.wordBankSection}>
          <Text style={styles.wordBankLabel}>Word Bank</Text>
          <Text style={styles.wordBankCount}>{wordList.length} word{wordList.length === 1 ? '' : 's'}</Text>
          <TouchableOpacity 
            style={styles.wordBankButton} 
            onPress={() => navigation.navigate('WordBank')}
          >
            <Text style={styles.wordBankButtonText}>Manage Words</Text>
          </TouchableOpacity>
        </View>

        {/* Controls */}
        <View style={styles.controls}>
          {status === 'setup' ? (
            <TouchableOpacity style={styles.playBtn} onPress={handlePlay}>
              <Text style={styles.playBtnText}>Start Session</Text>
            </TouchableOpacity>
          ) : status === 'paused' ? (
            <View style={styles.playbackControls}>
              <TouchableOpacity style={styles.playBtn} onPress={handleResume}>
                <Text style={styles.playBtnText}>Resume</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.stopBtn} onPress={handleStop}>
                <Text style={styles.stopBtnText}>Stop</Text>
              </TouchableOpacity>
            </View>
          ) : status === 'finished' ? (
            <View style={styles.finishedSection}>
              <Text style={styles.finishedText}>Session Complete ✓</Text>
              <TouchableOpacity style={styles.playBtn} onPress={handlePlay}>
                <Text style={styles.playBtnText}>Start New Session</Text>
              </TouchableOpacity>
            </View>
          ) : null}
        </View>

        {audioError && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{audioError}</Text>
          </View>
        )}

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
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 40,
    paddingBottom: 40,
    gap: 32,
  },
  header: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 2,
    marginBottom: 8,
  },
  setupSection: {
    width: '100%',
    backgroundColor: '#111',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#222',
  },
  setupLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 16,
  },
  setupItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  setupItemLabel: {
    fontSize: 16,
    color: '#888',
  },
  setupItemValue: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '500',
  },
  changeSettingsBtn: {
    marginTop: 16,
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: '#1a56ff20',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1a56ff',
    alignItems: 'center',
  },
  changeSettingsText: {
    color: '#1a56ff',
    fontSize: 16,
    fontWeight: '600',
  },
  wordBankSection: {
    width: '100%',
    backgroundColor: '#111',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#222',
  },
  wordBankLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 8,
  },
  wordBankCount: {
    fontSize: 14,
    color: '#888',
    marginBottom: 16,
  },
  wordBankButton: {
    backgroundColor: '#333',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  wordBankButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  controls: {
    width: '100%',
    gap: 16,
  },
  playBtn: {
    backgroundColor: '#1a56ff',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    alignItems: 'center',
  },
  playBtnText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  playbackControls: {
    flexDirection: 'row',
    gap: 16,
  },
  stopBtn: {
    backgroundColor: '#333',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    alignItems: 'center',
    flex: 1,
  },
  stopBtnText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  finishedSection: {
    alignItems: 'center',
    gap: 16,
  },
  finishedText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1a56ff',
    textAlign: 'center',
  },
  errorBox: {
    backgroundColor: '#ff333320',
    borderWidth: 1,
    borderColor: '#ff3333',
    borderRadius: 8,
    padding: 12,
    width: '100%',
  },
  errorText: {
    color: '#ff6666',
    fontSize: 14,
    textAlign: 'center',
  },
  // Dim screen styles
  dimSafe: {
    flex: 1,
    backgroundColor: '#000',
  },
  dimContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dimTime: {
    fontSize: 48,
    fontWeight: '300',
    color: '#fff',
    marginBottom: 8,
  },
  dimHint: {
    fontSize: 16,
    color: '#666',
    marginBottom: 40,
  },
  dimControls: {
    flexDirection: 'row',
    gap: 16,
  },
  dimPauseBtn: {
    backgroundColor: '#1a56ff',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  dimPauseText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  dimStopBtn: {
    backgroundColor: '#ff3333',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  dimStopText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
