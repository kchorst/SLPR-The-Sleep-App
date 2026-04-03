// WordListContext.tsx
import { createContext } from 'react';

// Define the type for the context value
interface WordListContextType {
  wordList: string[];
  setWordList: React.Dispatch<React.SetStateAction<string[]>>;
}

// Create the Context with an initial (dummy) value
export const WordListContext = createContext<WordListContextType>({
  wordList: [],
  setWordList: () => {}, // Dummy function for initial context value
});