export interface HistoryItem {
  id: string;
  date: string;
  rawText: string;
  itemCount: number;
  savings: number;
  splitTotal: number;
  singleTotal: number;
  bestPlatform: string;
  results: any;
}

const STORAGE_KEY = 'artha_comparison_history';

export function getHistory(): HistoryItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error('Failed to parse history from localStorage', e);
    return [];
  }
}

export function saveToHistory(item: HistoryItem) {
  if (typeof window === 'undefined') return;
  try {
    const history = getHistory();
    // Prevent duplicate entries
    const filtered = history.filter((h) => h.id !== item.id);
    const updated = [item, ...filtered];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error('Failed to save to localStorage', e);
  }
}

export function getHistoryItem(id: string): HistoryItem | null {
  const history = getHistory();
  return history.find((h) => h.id === id) || null;
}

export function calculateAggregateSavings(): { totalSaved: number; totalLists: number } {
  const history = getHistory();
  const totalSaved = history.reduce((acc, curr) => acc + (curr.savings || 0), 0);
  return {
    totalSaved,
    totalLists: history.length,
  };
}
