// Simple TTS test for debugging
// Run this in Expo CLI to test TTS functionality

import * as Speech from 'expo-speech';

async function testTTS() {
  console.log('=== TTS Test Started ===');
  
  try {
    // Test 1: Get available voices
    console.log('Getting available voices...');
    const voices = await Speech.getAvailableVoicesAsync();
    console.log(`Found ${voices.length} voices:`);
    
    if (voices.length > 0) {
      voices.forEach((voice, index) => {
        console.log(`${index + 1}. ${voice.name} (${voice.language}) - ${voice.identifier}`);
      });
      
      // Test 2: Try to speak with first available voice
      console.log('\nTesting speech with first voice...');
      const firstVoice = voices[0];
      console.log(`Using voice: ${firstVoice.name}`);
      
      await Speech.speak('Hello, this is a test of the text to speech system.', {
        voice: firstVoice.identifier,
        rate: 1.0,
        onDone: () => console.log('Speech completed successfully'),
        onError: (error) => console.error('Speech error:', error),
      });
      
    } else {
      console.log('No voices available. This is the main issue.');
      console.log('\nSOLUTION:');
      console.log('1. Go to Android Settings');
      console.log('2. General Management → Language & Input → Text-to-Speech Output');
      console.log('3. Tap on your TTS engine (Google TTS, Samsung TTS, etc.)');
      console.log('4. Install voice data for English');
      console.log('5. Restart the app');
    }
    
  } catch (error) {
    console.error('TTS Test failed:', error);
  }
  
  console.log('=== TTS Test Complete ===');
}

// Run the test
testTTS();
