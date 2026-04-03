// screens/OnboardingScreen.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../App';

export const ONBOARDING_KEY = '@slpr_onboarding_done';

type OnboardingNavProp = StackNavigationProp<RootStackParamList, 'Onboarding'>;

const SLIDES = [
  {
    title: 'Welcome to SLPR',
    body: "SLPR is a cognitive shuffle sleep aid based on Dr. Luc Beaudoin's research.\n\nIt helps you fall asleep by preventing coherent thought — the kind that keeps you awake.",
  },
  {
    title: 'How it works',
    body: 'Your brain struggles to build a narrative from random, unrelated images.\n\nSLPR reads concrete, imageable words aloud — one at a time, with gaps — so your mind wanders without catching on any single thread.',
  },
  {
    title: 'Your word bank',
    body: 'You start with 50 default words like apple, ladder, and candle.\n\nAdd your own, remove ones you dislike, or preview how each sounds. The words are yours.',
  },
  {
    title: 'Starting a session',
    body: "Pick a duration, choose a voice, set your word gap, and tap Play.\n\nThe screen dims to near-black so it won't disturb you. Tap anywhere to pause. Just let the words wash over you.",
  },
];

export default function OnboardingScreen({ navigation }: { navigation: OnboardingNavProp }) {
  const [page, setPage] = useState(0);

  const handleNext = () => {
    if (page < SLIDES.length - 1) {
      setPage(page + 1);
    }
  };

  const handleDone = async () => {
    try {
      await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
      navigation.replace('Home');
    } catch (error) {
      console.error('SLPR: Failed to save onboarding', error);
    }
  };

  const isLast = page === SLIDES.length - 1;
  const slide = SLIDES[page];

  return (
    <View style={styles.container}>

      {/* Slide content */}
      <View style={styles.slide}>
        <Text style={styles.slideNumber}>{page + 1} / {SLIDES.length}</Text>
        <Text style={styles.title}>{slide.title}</Text>
        <Text style={styles.body}>{slide.body}</Text>
      </View>

      {/* Dots */}
      <View style={styles.dots}>
        {SLIDES.map((_, i) => (
          <View key={i} style={[styles.dot, i === page && styles.dotActive]} />
        ))}
      </View>

      {/* Buttons */}
      <View style={styles.buttonRow}>
        <TouchableOpacity onPress={handleDone} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>

        {isLast ? (
          <TouchableOpacity style={styles.doneBtn} onPress={handleDone}>
            <Text style={styles.doneBtnText}>Get Started</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity 
            style={styles.nextBtn} 
            onPress={handleNext}
            hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
          >
            <Text style={styles.nextBtnText}>Next →</Text>
          </TouchableOpacity>
        )}
      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'space-between',
  },
  slide: {
    flex: 1,
    alignItems: 'flex-start',
    justifyContent: 'center',
    paddingHorizontal: 40,
    gap: 24,
  },
  slideNumber: {
    color: '#333',
    fontSize: 12,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#fff',
    lineHeight: 40,
  },
  body: {
    fontSize: 17,
    color: '#888',
    lineHeight: 28,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    paddingBottom: 24,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#222',
  },
  dotActive: {
    backgroundColor: '#1a56ff',
    width: 20,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingBottom: 48,
  },
  skipText: { color: '#333', fontSize: 15 },
  nextBtn: {
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#1a56ff',
    backgroundColor: '#1a56ff',
  },
  nextBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  doneBtn: {
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 10,
    backgroundColor: '#1a56ff',
  },
  doneBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
