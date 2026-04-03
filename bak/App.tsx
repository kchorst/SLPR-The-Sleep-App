// App.tsx

import 'react-native-gesture-handler';
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import HomeScreen from './screens/HomeScreen';
import SessionScreen from './screens/SessionScreen';
import WordBankScreen from './screens/WordBankScreen';
import { StatusBar } from 'expo-status-bar';

// Define the parameter list for your stack navigator
// This ensures type safety when navigating between screens
export type RootStackParamList = {
  // 'Home' screen does not require any navigation parameters
  Home: undefined; 
  // 'Session' screen requires a 'sessionConfig' object with duration and voiceId
  Session: { sessionConfig: { durationMinutes: number; voiceId: string | null } };
  // 'WordBank' screen does not require any navigation parameters
  WordBank: undefined; 
};

// Create a stack navigator instance with the defined parameter list
const Stack = createStackNavigator<RootStackParamList>();

// Main application component responsible for setting up navigation
export default function App() {
  return (
    // NavigationContainer manages the navigation tree and contains the navigation state
    <NavigationContainer>
      {/* Set the style of the status bar (e.g., light content for dark background) */}
      <StatusBar style="light" />
      {/* Stack.Navigator defines the navigation stack */}
      <Stack.Navigator 
        // The initial route loaded when the app starts
        initialRouteName="Home"
      >
        {/* Define the 'Home' screen */}
        <Stack.Screen
          name="Home" // The name of the route
          component={HomeScreen} // The component to render for this route
          options={{ 
            headerShown: false // Hide the header for the Home screen
          }}
        />
        {/* Define the 'Session' screen */}
        <Stack.Screen
          name="Session" // The name of the route
          component={SessionScreen} // The component to render for this route
          options={{ 
            headerShown: false // Hide the header for the Session screen
          }}
        />
        {/* Define the 'WordBank' screen */}
        <Stack.Screen
          name="WordBank" // The name of the route
          component={WordBankScreen} // The component to render for this route
          options={{ 
            headerShown: false // Hide the header for the WordBank screen
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}