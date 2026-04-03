// screens/SessionScreen.tsx
import React, { useState, useEffect, useRef, useContext, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import Slider from '@react-native-community/slider';
import * as Speech from 'expo-speech';
import * as Haptics from 'expo-haptics';
import { Audio } from 'expo-av';
import { useKeepAwake } from 'expo-keep-awake';
import { useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { WordListContext } from '../WordListContext';
import { VoiceContext } from './VoiceContext';
import { RootStackParamList } from '../App';
import { saveSession } from '../utils/sessionHistory';

type SessionNavProp = StackNavigationProp<RootStackParamList, 'Session'>;
type SessionStatus = 'idle' | 'playing' | 'paused' | 'finished';

const DURATIONS = [5, 10, 15, 20, 25, 30];
const GAP_MIN = 3;
const GAP_MAX = 20;
const GAP_DEFAULT = 8;

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

export default function SessionScreen({ navigation, route }: { navigation: SessionNavProp; route: any }) {
  const { wordList } = useContext(WordListContext);
  const { voiceId, speechRate } = useContext(VoiceContext);

  // Get duration from route params or default to 10
  const initialDuration = route?.params?.duration || 10;
  
  const [status, setStatus] = useState<SessionStatus>('idle');
  const [timeRemaining, setTimeRemaining] = useState(initialDuration * 60);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [isTtsAvailable, setIsTtsAvailable] = useState(true);

  // Refs — always fresh inside callbacks
  const voiceIdRef = useRef<string | null>(voiceId);
  const speechRateRef = useRef<number>(speechRate);
  const wordGapRef = useRef(GAP_DEFAULT * 1000);
  const statusRef = useRef<SessionStatus>('idle');
  const wordsRef = useRef<string[]>([]);
  const indexRef = useRef(0);
  const mainTimerRef = useRef<NodeJS.Timeout | null>(null);
  const gapTimerRef = useRef<NodeJS.Timeout | null>(null);
  const sessionStartMinutesRef = useRef(10);

  // ── Audio session setup ─────────────────────────────────────────────────────
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

  // ── Check TTS availability ─────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const voices = await Speech.getAvailableVoicesAsync();
        const available = Array.isArray(voices) && voices.length > 0;
        setIsTtsAvailable(available);
        console.log('SLPR: SessionScreen - TTS voices available:', voices?.length || 0);
      } catch (error) {
        console.warn('SLPR: SessionScreen - TTS not available', error);
        setIsTtsAvailable(false);
      }
    })();
  }, []);

  // Keep refs in sync with context values (updated when screen regains focus)
  useEffect(() => { voiceIdRef.current = voiceId; }, [voiceId]);
  useEffect(() => { speechRateRef.current = speechRate; }, [speechRate]);

  useKeepAwake(status === 'playing' ? 'session' : undefined as any);

  const setStatusBoth = (s: SessionStatus) => {
    setStatus(s);
    statusRef.current = s;
  };

  // ── Stop everything when navigating away ─────────────────────────────────
  useFocusEffect(
    useCallback(() => {
      // Sync refs when screen comes back into focus
      voiceIdRef.current = voiceId;
      speechRateRef.current = speechRate;
      return () => {
        Speech.stop();
        if (gapTimerRef.current) { clearTimeout(gapTimerRef.current); gapTimerRef.current = null; }
        if (mainTimerRef.current) { clearInterval(mainTimerRef.current); mainTimerRef.current = null; }
        setStatusBoth('idle');
        wordsRef.current = [];
        indexRef.current = 0;
      };
    }, [voiceId, speechRate])
  );

  // ── Countdown timer ───────────────────────────────────────────────────────
  useEffect(() => {
    if (status === 'playing') {
      mainTimerRef.current = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            clearInterval(mainTimerRef.current!);
            mainTimerRef.current = null;
            endSession();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (mainTimerRef.current) { clearInterval(mainTimerRef.current); mainTimerRef.current = null; }
    }
    return () => { if (mainTimerRef.current) clearInterval(mainTimerRef.current); };
  }, [status]);

  // ── Word loop — onDone callback driven ───────────────────────────────────
  const readNextWord = useCallback(() => {
    if (statusRef.current !== 'playing') return;
    if (wordsRef.current.length === 0) return;

    if (indexRef.current >= wordsRef.current.length) {
      wordsRef.current = shuffleArray(wordList);
      indexRef.current = 0;
    }

    const word = wordsRef.current[indexRef.current];
    indexRef.current += 1;

    const opts: Speech.SpeechOptions = {
      rate: speechRateRef.current,
      onDone: () => {
        gapTimerRef.current = setTimeout(() => readNextWord(), wordGapRef.current);
      },
      onError: (error) => {
        console.warn('SLPR: Speech error', error);
        gapTimerRef.current = setTimeout(() => readNextWord(), 1500);
      },
    };
    if (voiceIdRef.current) opts.voice = voiceIdRef.current;
    Speech.speak(word, opts);
  }, [wordList]);

  const stopWordLoop = () => {
    if (gapTimerRef.current) { clearTimeout(gapTimerRef.current); gapTimerRef.current = null; }
    Speech.stop();
  };

  // ── Intro ─────────────────────────────────────────────────────────────────
  const runIntro = useCallback(() => {
    const introLines = [
      'Starting sleep session',
      'Get comfortable',
      'Close your eyes and visualise each word',
    ];
    const speakLine = (i: number) => {
      if (statusRef.current !== 'playing') return;
      if (i >= introLines.length) {
        gapTimerRef.current = setTimeout(() => {
          if (statusRef.current === 'playing') readNextWord();
        }, 1500);
        return;
      }
      const opts: Speech.SpeechOptions = {
        rate: speechRateRef.current,
        onDone: () => { gapTimerRef.current = setTimeout(() => speakLine(i + 1), 800); },
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

  // ── Session end ───────────────────────────────────────────────────────────
  const endSession = useCallback(() => {
    stopWordLoop();
    setStatusBoth('finished');
    saveSession(sessionStartMinutesRef.current);
  }, []);

  // ── Controls ──────────────────────────────────────────────────────────────
  const handlePlay = () => {
    if (!isTtsAvailable) {
      Alert.alert(
        'TTS Not Available',
        'Text-to-speech is not available on this device.\n\nPlease install TTS voice data:\n\nAndroid Settings → General Management → Language & Input → Text-to-Speech Output → Install voice data\n\nThen restart the app.',
        [{ text: 'OK' }]
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
    sessionStartMinutesRef.current = initialDuration;
    setTimeRemaining(initialDuration * 60);
    setStatusBoth('playing');
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
    if (mainTimerRef.current) { clearInterval(mainTimerRef.current); mainTimerRef.current = null; }
    setStatusBoth('idle');
    setTimeRemaining(durationMinutes * 60);
    wordsRef.current = [];
    indexRef.current = 0;
  };

  const handleDurationSelect = (minutes: number) => {
    if (status !== 'idle') return;
    setDurationMinutes(minutes);
    setTimeRemaining(minutes * 60);
  };

  const handleGapChange = (val: number) => {
    const rounded = Math.round(val);
    setWordGapSec(rounded);
    wordGapRef.current = rounded * 1000;
  };

  const statusLabel = () => {
    switch (status) {
      case 'idle':     return `${initialDuration} minute session ready`;
      case 'playing':  return `${formatTime(timeRemaining)} remaining`;
      case 'paused':   return `Paused — ${formatTime(timeRemaining)} remaining`;
      case 'finished': return 'Session complete ✓';
    }
  };

  const isActive = status === 'playing' || status === 'paused';

  // ── Dim screen while playing ──────────────────────────────────────────────
  if (status === 'playing') {
    return (
      <SafeAreaView style={styles.dimSafe}>
        <TouchableOpacity style={styles.dimContainer} activeOpacity={1} onPress={handlePause}>
          <Text style={styles.dimTime}>{formatTime(timeRemaining)}</Text>
          <Text style={styles.dimHint}>tap to pause</Text>
          <TouchableOpacity
            style={styles.dimStopBtn}
            onPress={(e) => { e.stopPropagation(); handleStop(); }}
          >
            <Text style={styles.dimStopText}>Stop</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // ── Main UI ───────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>

        <Text style={styles.header}>Session</Text>
        <Text style={styles.statusText}>{statusLabel()}</Text>

        {/* Controls */}
        <View style={styles.controls}>
          {status === 'idle' ? (
            <TouchableOpacity style={styles.playBtn} onPress={handlePlay}>
              <Text style={styles.playBtnText}>Play</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.playbackControls}>
              <TouchableOpacity style={styles.playBtn} onPress={status === 'paused' ? handleResume : handlePause}>
                <Text style={styles.playBtnText}>{status === 'paused' ? 'Resume' : 'Pause'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.stopBtn} onPress={handleStop}>
                <Text style={styles.stopBtnText}>Stop</Text>
              </TouchableOpacity>
            </View>
            >
              <Text style={styles.controlBtnText}>Play</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.controlBtn, styles.btnStop, (status === 'idle' || status === 'finished') && styles.btnDisabled]}
            onPress={handleStop}
            disabled={status === 'idle' || status === 'finished'}
          >
            <Text style={styles.controlBtnText}>Stop</Text>
          </TouchableOpacity>
        </View>

        {/* Nav */}
        <View style={styles.navRow}>
          <TouchableOpacity onPress={() => navigation.navigate('Home')}>
            <Text style={styles.navLink}>← Home</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('WordBank')}>
            <Text style={styles.navLink}>Word Bank →</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#000' },
  container: {
    alignItems: 'center',
    paddingHorizontal: 28,
    paddingTop: 48,
    paddingBottom: 40,
    gap: 16,
  },
  header: { fontSize: 36, fontWeight: '700', color: '#fff', letterSpacing: 4, marginBottom: 4 },
  statusText: { fontSize: 18, color: '#aaa', textAlign: 'center', marginBottom: 12 },

  labelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%' },
  label: { color: '#555', fontSize: 12, letterSpacing: 2, textTransform: 'uppercase' },
  labelBadge: { color: '#1a56ff', fontSize: 13, fontWeight: '600' },

  durationRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center', width: '100%' },
  chipBox: {
    paddingVertical: 10, paddingHorizontal: 16,
    borderRadius: 8, borderWidth: 1, borderColor: '#333', backgroundColor: '#111',
  },
  chipSelected:  { backgroundColor: '#1a56ff', borderColor: '#1a56ff' },
  chipDisabled:  { opacity: 0.4 },
  chipText:      { color: '#888', fontSize: 15, fontWeight: '600' },
  chipTextSelected: { color: '#fff' },

  sliderRow: { flexDirection: 'row', alignItems: 'center', width: '100%', gap: 8 },
  slider: { flex: 1 },
  sliderEdge: { color: '#555', fontSize: 12, width: 28, textAlign: 'center' },

  voiceNavRow: {
    width: '100%',
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#111', borderRadius: 10,
    borderWidth: 1, borderColor: '#222',
    paddingVertical: 16, paddingHorizontal: 18,
  },
  voiceNavSub: { color: '#555', fontSize: 13, marginTop: 3 },
  voiceNavArrow: { color: '#1a56ff', fontSize: 20, fontWeight: '300' },

  controls: { flexDirection: 'row', gap: 10, width: '100%', marginTop: 8 },
  controlBtn: { flex: 1, paddingVertical: 16, borderRadius: 10, alignItems: 'center' },
  controlBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  btnPlay: { backgroundColor: '#1a56ff' },
  btnStop: { backgroundColor: '#c0392b' },
  btnDisabled: { opacity: 0.35 },

  navRow: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginTop: 24 },
  navLink: { color: '#444', fontSize: 14 },

  dimSafe: { flex: 1, backgroundColor: '#000' },
  dimContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#050505', gap: 16 },
  dimTime: { fontSize: 72, fontWeight: '200', color: '#1a1a1a', letterSpacing: 4 },
  dimHint: { fontSize: 13, color: '#1a1a1a', letterSpacing: 2, textTransform: 'uppercase' },
  dimStopBtn: { marginTop: 32, borderWidth: 1, borderColor: '#1a1a1a', borderRadius: 8, paddingVertical: 10, paddingHorizontal: 28 },
  dimStopText: { color: '#1a1a1a', fontSize: 14, letterSpacing: 2, textTransform: 'uppercase' },
});
