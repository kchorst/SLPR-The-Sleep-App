// utils/sessionHistory.ts
import AsyncStorage from '@react-native-async-storage/async-storage';

const HISTORY_KEY = '@slpr_session_history';
const MAX_ENTRIES = 20;

export interface SessionEntry {
  date: string;          // ISO timestamp
  durationMinutes: number;
}

export async function saveSession(durationMinutes: number): Promise<void> {
  try {
    const existing = await loadHistory();
    const entry: SessionEntry = {
      date: new Date().toISOString(),
      durationMinutes,
    };
    const updated = [entry, ...existing].slice(0, MAX_ENTRIES);
    await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
  } catch (e) {
    console.warn('SLPR: Failed to save session history.', e);
  }
}

export async function loadHistory(): Promise<SessionEntry[]> {
  try {
    const stored = await AsyncStorage.getItem(HISTORY_KEY);
    if (!stored) return [];
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.warn('SLPR: Failed to load session history.', e);
    return [];
  }
}

export function formatSessionDate(isoDate: string): string {
  const d = new Date(isoDate);
  const now = new Date();

  const isToday =
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear();

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday =
    d.getDate() === yesterday.getDate() &&
    d.getMonth() === yesterday.getMonth() &&
    d.getFullYear() === yesterday.getFullYear();

  const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  if (isToday)     return `Today, ${timeStr}`;
  if (isYesterday) return `Yesterday, ${timeStr}`;

  return d.toLocaleDateString([], { month: 'short', day: 'numeric' }) + `, ${timeStr}`;
}
