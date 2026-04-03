// WordListContext.tsx
import React, { createContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@slpr_word_list';

const DEFAULT_WORDS: string[] = [
  'apple', 'ladder', 'candle', 'bucket', 'feather',
  'lantern', 'pebble', 'hammer', 'acorn', 'barrel',
  'shovel', 'blanket', 'kettle', 'marble', 'anchor',
  'chimney', 'walnut', 'compass', 'bottle', 'saddle',
  'pillow', 'wagon', 'broom', 'copper', 'doorknob',
  'fishhook', 'glove', 'haystack', 'inkwell', 'jar',
  'keyhole', 'lemon', 'mitten', 'needle', 'oven',
  'pinecone', 'quilt', 'ribbon', 'scissors', 'thimble',
  'umbrella', 'vase', 'wheelbarrow', 'yarn', 'zipper',
  'boot', 'cactus', 'drawer', 'envelope', 'faucet',
];

interface WordListContextType {
  wordList: string[];
  setWordList: React.Dispatch<React.SetStateAction<string[]>>;
  isLoaded: boolean;
}

export const WordListContext = createContext<WordListContextType>({
  wordList: [],
  setWordList: () => {},
  isLoaded: false,
});

export function WordListProvider({ children }: { children: ReactNode }) {
  const [wordList, setWordList] = useState<string[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from AsyncStorage on mount; fall back to default word bank
  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored !== null) {
          const parsed = JSON.parse(stored);
          setWordList(Array.isArray(parsed) ? parsed : DEFAULT_WORDS);
        } else {
          setWordList(DEFAULT_WORDS);
        }
      } catch (e) {
        console.warn('SLPR: Failed to load word list from storage.', e);
        setWordList(DEFAULT_WORDS);
      } finally {
        setIsLoaded(true);
      }
    })();
  }, []);

  // Persist to AsyncStorage whenever the list changes (after initial load)
  useEffect(() => {
    if (!isLoaded) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(wordList)).catch((e) =>
      console.warn('SLPR: Failed to save word list.', e)
    );
  }, [wordList, isLoaded]);

  return (
    <WordListContext.Provider value={{ wordList, setWordList, isLoaded }}>
      {children}
    </WordListContext.Provider>
  );
}
