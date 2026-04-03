// App.tsx
import 'react-native-gesture-handler';
import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { WordListProvider } from './WordListContext';
import { VoiceProvider } from './screens/VoiceContext';
import OnboardingScreen, { ONBOARDING_KEY } from './screens/OnboardingScreen';
import HomeScreen from './screens/HomeScreen';
import SimpleSessionScreen from './screens/SimpleSessionScreen';
import VoiceSetupScreen from './screens/VoiceSetupScreen';
import WordBankScreen from './screens/WordBankScreen';
import VoicePickerScreen from './screens/VoicePickerScreen';

export type RootStackParamList = {
  Onboarding: undefined;
  Home: undefined;
  Session: { duration?: number };
  VoiceSetup: { duration?: number; changeSettings?: boolean };
  WordBank: undefined;
  VoicePicker: undefined;
};

const Stack = createStackNavigator<RootStackParamList>();

export default function App() {
  const [initialRoute, setInitialRoute] = useState<'Onboarding' | 'VoiceSetup' | 'Session' | null>(null);

  useEffect(() => {
    Promise.all([
      AsyncStorage.getItem(ONBOARDING_KEY),
      AsyncStorage.getItem('@slpr_voice_id'),
    ])
      .then(([onboardingDone, voiceId]) => {
        if (onboardingDone !== 'true') {
          setInitialRoute('Onboarding');
          return;
        }

        // If onboarding is complete but no voice is selected yet, force VoiceSetup.
        setInitialRoute(voiceId ? 'Session' : 'VoiceSetup');
      })
      .catch((error) => {
        console.error('SLPR: Failed to check onboarding/voice', error);
        setInitialRoute('Onboarding');
      });
  }, []);

  if (!initialRoute) return null;

  return (
    <WordListProvider>
      <VoiceProvider>
        <NavigationContainer>
          <StatusBar style="light" />
          <Stack.Navigator initialRouteName={initialRoute} screenOptions={{ headerShown: false }}>
            <Stack.Screen name="Onboarding" component={OnboardingScreen} />
            <Stack.Screen name="Home" component={HomeScreen} />
            <Stack.Screen name="Session" component={SimpleSessionScreen} />
            <Stack.Screen name="VoiceSetup" component={VoiceSetupScreen} />
            <Stack.Screen name="WordBank" component={WordBankScreen} />
            <Stack.Screen name="VoicePicker" component={VoicePickerScreen} />
          </Stack.Navigator>
        </NavigationContainer>
      </VoiceProvider>
    </WordListProvider>
  );
}
