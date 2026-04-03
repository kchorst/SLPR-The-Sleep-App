// VoiceContext.tsx
import React, { createContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Speech from 'expo-speech';

const VOICE_ID_KEY = '@slpr_voice_id';
const VOICE_RATE_KEY = '@slpr_voice_rate';

export const DEFAULT_RATE = 0.9;

interface VoiceContextType {
  voiceId: string | null;
  setVoiceId: (id: string | null) => void;
  speechRate: number;
  setSpeechRate: (rate: number) => void;
  isLoaded: boolean;
  isTtsAvailable: boolean;
}

export const VoiceContext = createContext<VoiceContextType>({
  voiceId: null,
  setVoiceId: () => {},
  speechRate: DEFAULT_RATE,
  setSpeechRate: () => {},
  isLoaded: false,
  isTtsAvailable: false,
});

export function VoiceProvider({ children }: { children: ReactNode }) {
  const [voiceId, setVoiceIdState] = useState<string | null>(null);
  const [speechRate, setSpeechRateState] = useState<number>(DEFAULT_RATE);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isTtsAvailable, setIsTtsAvailable] = useState(true); // Assume available until proven otherwise

  // Load persisted values on mount
  useEffect(() => {
    (async () => {
      try {
        const [storedId, storedRate] = await Promise.all([
          AsyncStorage.getItem(VOICE_ID_KEY),
          AsyncStorage.getItem(VOICE_RATE_KEY),
        ]);
        if (storedId) setVoiceIdState(storedId);
        if (storedRate) setSpeechRateState(parseFloat(storedRate));
        console.log('SLPR: Voice settings loaded');
      } catch (e) {
        console.warn('SLPR: Failed to load voice prefs', e);
      } finally {
        setIsLoaded(true);
        console.log('SLPR: VoiceProvider loaded');
      }
    })();
  }, []);

  const setVoiceId = (id: string | null) => {
    setVoiceIdState(id);
    if (id) {
      AsyncStorage.setItem(VOICE_ID_KEY, id).catch((error) => {
        console.warn('SLPR: Failed to save voice ID', error);
      });
    } else {
      AsyncStorage.removeItem(VOICE_ID_KEY).catch((error) => {
        console.warn('SLPR: Failed to remove voice ID', error);
      });
    }
  };

  const setSpeechRate = (rate: number) => {
    setSpeechRateState(rate);
    AsyncStorage.setItem(VOICE_RATE_KEY, String(rate)).catch((error) => {
      console.warn('SLPR: Failed to save speech rate', error);
    });
  };

  return (
    <VoiceContext.Provider value={{ voiceId, setVoiceId, speechRate, setSpeechRate, isLoaded, isTtsAvailable }}>
      {children}
    </VoiceContext.Provider>
  );
}
