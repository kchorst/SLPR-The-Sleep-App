// SessionScreen.tsx
import React, { useState, useEffect, useRef, useContext } from 'react';
import { View, Text, StyleSheet, Button, TouchableOpacity, Alert } from 'react-native';
import * as Speech from 'expo-speech';
import { WordListContext } from './WordListContext';
// import { Picker } from '@react-native-picker/picker'; // No longer needed for duration picker

// Define session status types for clarity
type SessionStatus = 'idle' | 'configured' | 'playing' | 'paused' | 'finished';

export default function SessionScreen({ navigation }: { navigation: any }): JSX.Element {
  const [sessionDuration, setSessionDuration] = useState(5); // State for selected duration
  const [sessionStatus, setSessionStatus] = useState<SessionStatus>('idle');
  const [timeRemaining, setTimeRemaining] = useState(sessionDuration * 60);
  const [shuffledWords, setShuffledWords] = useState<string[]>([]);
  const [currentWordIndex, setCurrentWordIndex] = useState(0);

  const mainTimerRef = useRef<NodeJS.Timeout | null>(null);
  const wordReadTimerRef = useRef<NodeJS.Timeout | null>(null);

  const { wordList } = useContext(WordListContext);

  const shuffleArray = (array: string[]) => {
    const newArray = [...array];
    let currentIndex = newArray.length, randomIndex;
    while (currentIndex !== 0) {
      randomIndex = Math.floor(Math.random() * currentIndex);
      currentIndex--;
      [newArray[currentIndex], newArray[randomIndex]] = [
        newArray[randomIndex], newArray[currentIndex]];
    }
    return newArray;
  };

  useEffect(() => {
    if (sessionStatus === 'playing') {
      mainTimerRef.current = setInterval(() => {
        setTimeRemaining((prevTime) => {
          if (prevTime <= 1) {
            clearInterval(mainTimerRef.current!);
            setSessionStatus('finished');
            handleStopSession(false);
            return 0;
          }
          return prevTime - 1;
        });
      }, 1000);
    } else {
      if (mainTimerRef.current) {
        clearInterval(mainTimerRef.current);
        mainTimerRef.current = null;
      }
    }
    return () => {
      if (mainTimerRef.current) clearInterval(mainTimerRef.current);
      if (wordReadTimerRef.current) clearTimeout(wordReadTimerRef.current);
    };
  }, [sessionStatus]);

  const startReadingWordsSequence = async () => {
    if (wordList.length === 0) {
      Alert.alert("No Words", "Please add words to your word list first. Go to 'Manage Word List'.");
      setSessionStatus('configured');
      return;
    }
    
    await Speech.speak('Starting Sleeper Session');
    await new Promise(resolve => setTimeout(resolve, 2000));
    await Speech.speak('Get Comfortable');
    await new Promise(resolve => setTimeout(resolve, 2000));
    await Speech.speak('Close your Eyes and Visualize the following words...');
    await new Promise(resolve => setTimeout(resolve, 2000));

    const newShuffledWords = shuffleArray(wordList);
    setShuffledWords(newShuffledWords);
    setCurrentWordIndex(0);
    readNextWord(0, newShuffledWords);
  };

  const readNextWord = (index: number, words: string[]) => {
    if (sessionStatus !== 'playing' || index >= words.length || timeRemaining <= 0) {
      if (index >= words.length && sessionStatus === 'playing') {
          console.log("All words read. Session continues until timer ends.");
      }
      return;
    }
    
    const wordToSpeak = words[index];
    Speech.speak(wordToSpeak);

    wordReadTimerRef.current = setTimeout(() => {
      readNextWord(index + 1, words);
    }, 8000);
  };

  const handlePlaySession = () => {
    if (sessionStatus === 'idle' || sessionStatus === 'configured' || sessionStatus === 'paused' || sessionStatus === 'finished') {
        if (timeRemaining === 0 && sessionDuration > 0) {
            setTimeRemaining(sessionDuration * 60);
        }
        setSessionStatus('playing');
        startReadingWordsSequence();
    }
  };

  const handleStopSession = (resetDuration: boolean = true) => {
    setSessionStatus('idle');
    if (resetDuration) {
        setTimeRemaining(sessionDuration * 60);
    }
    if (mainTimerRef.current) {
        clearInterval(mainTimerRef.current);
        mainTimerRef.current = null;
    }
    if (wordReadTimerRef.current) {
        clearTimeout(wordReadTimerRef.current);
        wordReadTimerRef.current = null;
    }
    setShuffledWords([]);
    setCurrentWordIndex(0);
  };

  const handlePauseSession = () => {
    if (sessionStatus === 'playing') {
      setSessionStatus('paused');
      if (wordReadTimerRef.current) {
        clearTimeout(wordReadTimerRef.current);
        wordReadTimerRef.current = null;
      }
    }
  };

  const formatTime = (totalSeconds: number) => {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  let currentStatusText = '';
  if (sessionStatus === 'idle') {
      currentStatusText = `Choose a duration to start.`;
  } else if (sessionStatus === 'configured') {
      currentStatusText = `Session Ready: ${sessionDuration} min`;
  } else if (sessionStatus === 'playing') {
      currentStatusText = `Session In Progress: ${formatTime(timeRemaining)} left`;
  } else if (sessionStatus === 'paused') {
      currentStatusText = `Session Paused: ${formatTime(timeRemaining)} left`;
  } else if (sessionStatus === 'finished') {
      currentStatusText = `Session Finished!`;
  }

  const durations = [5, 10, 15, 20, 25, 30]; // Array of available durations in minutes

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Session Setup</Text>
      <Text style={styles.currentStatusText}>{currentStatusText}</Text>
      
      <Text style={styles.pickerLabel}>Session Duration:</Text>
      <View style={styles.durationSelectorContainer}>
        {durations.map((duration) => (
          <TouchableOpacity
            key={duration}
            style={[
              styles.durationBox,
              sessionDuration === duration && styles.selectedDurationBox,
            ]}
            onPress={() => {
              setSessionDuration(duration);
              setTimeRemaining(duration * 60); // Reset time remaining when duration changes
              setSessionStatus('configured');
            }}
          >
            <Text style={[
              styles.durationText,
              sessionDuration === duration && styles.selectedDurationText,
            ]}>
              {duration} min
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.sessionControlsContainer}>
        <TouchableOpacity
          style={[
            styles.sessionControlButton, 
            styles.playButton, 
            (sessionStatus === 'playing' || sessionStatus === 'finished' || (sessionStatus === 'idle' && sessionDuration === 0)) && styles.disabledControl
          ]}
          onPress={handlePlaySession}
          disabled={sessionStatus === 'playing' || sessionStatus === 'finished' || (sessionStatus === 'idle' && sessionDuration === 0)}
        >
          <Text style={styles.sessionControlButtonText}>Play</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.sessionControlButton, 
            styles.pauseButton, 
            (sessionStatus !== 'playing') && styles.disabledControl
          ]}
          onPress={handlePauseSession}
          disabled={sessionStatus !== 'playing'}
        >
          <Text style={styles.sessionControlButtonText}>Pause</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.sessionControlButton, 
            styles.stopButton, 
            (sessionStatus === 'idle' || sessionStatus === 'finished') && styles.disabledControl
          ]}
          onPress={() => handleStopSession(true)}
          disabled={sessionStatus === 'idle' || sessionStatus === 'finished'}
        >
          <Text style={styles.sessionControlButtonText}>Stop</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.separator} />

      <Button title={"Go Back Home"} onPress={() => navigation.goBack()} /> 

      <View style={styles.separator} />

      <Button title={"Go to Word List"} onPress={() => navigation.navigate('WordList')} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: 'black',
    padding: 20,
    paddingTop: 60,
  },
  header: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 30,
    color: 'white',
  },
  currentStatusText: {
    fontSize: 20,
    marginBottom: 20,
    fontWeight: '500',
    color: '#dddddd',
    textAlign: 'center',
  },
  pickerLabel: { // Renamed from pickerLabel to be more generic, but keeping it for now
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10, // Added margin for spacing above the boxes
    // Removed marginLeft and marginRight as it's no longer in a row with picker
  },
  // Removed pickerContainer, picker, pickerItem styles as they are no longer used by the Picker component

  durationSelectorContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap', // Allow items to wrap to next line if too many
    justifyContent: 'center',
    marginBottom: 40,
    width: '100%',
    paddingHorizontal: 10,
  },
  durationBox: {
    backgroundColor: '#333',
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 8,
    margin: 5, // Space between boxes
    borderWidth: 1,
    borderColor: '#555',
  },
  selectedDurationBox: {
    backgroundColor: '#007bff', // Highlight color for selected duration
    borderColor: '#007bff',
  },
  durationText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  selectedDurationText: {
    color: 'white', // Can change to a different color if needed
  },
  sessionControlsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '90%',
    marginTop: 20,
    marginBottom: 10,
  },
  sessionControlButton: {
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    marginHorizontal: 5,
  },
  sessionControlButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  playButton: {
    backgroundColor: 'green',
  },
  pauseButton: {
    backgroundColor: 'blue',
  },
  stopButton: {
    backgroundColor: 'red',
  },
  disabledControl: {
    opacity: 0.5,
  },
  separator: {
    height: 1,
    backgroundColor: '#555',
    width: '80%',
    marginVertical: 20,
  },
});