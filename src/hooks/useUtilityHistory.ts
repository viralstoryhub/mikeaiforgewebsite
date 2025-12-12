import { useState, useEffect, useCallback } from 'react';

const HISTORY_KEY = 'mikeaiforge_utility_history';
const MAX_HISTORY_ITEMS = 10; // Keep last 10 results per utility

export interface HistoryItem {
  id: string;
  utilitySlug: string;
  timestamp: number;
  inputs: Record<string, any>;
  output: string;
  title?: string;
}

interface HistoryData {
  [utilitySlug: string]: HistoryItem[];
}

export const useUtilityHistory = (utilitySlug?: string) => {
  const [history, setHistory] = useState<HistoryData>({});

  // Load history from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(HISTORY_KEY);
      if (stored) {
        setHistory(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Failed to load utility history:', error);
    }
  }, []);

  // Save history to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    } catch (error) {
      console.error('Failed to save utility history:', error);
    }
  }, [history]);

  const addHistoryItem = useCallback(
    (item: Omit<HistoryItem, 'id' | 'timestamp'>) => {
      const newItem: HistoryItem = {
        ...item,
        id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: Date.now(),
      };

      setHistory((prev) => {
        const utilityHistory = prev[item.utilitySlug] || [];
        const updatedHistory = [newItem, ...utilityHistory].slice(0, MAX_HISTORY_ITEMS);

        return {
          ...prev,
          [item.utilitySlug]: updatedHistory,
        };
      });

      return newItem.id;
    },
    []
  );

  const getUtilityHistory = useCallback(
    (slug: string): HistoryItem[] => {
      return history[slug] || [];
    },
    [history]
  );

  const deleteHistoryItem = useCallback((slug: string, itemId: string) => {
    setHistory((prev) => {
      const utilityHistory = prev[slug] || [];
      return {
        ...prev,
        [slug]: utilityHistory.filter((item) => item.id !== itemId),
      };
    });
  }, []);

  const clearUtilityHistory = useCallback((slug: string) => {
    setHistory((prev) => {
      const updated = { ...prev };
      delete updated[slug];
      return updated;
    });
  }, []);

  const clearAllHistory = useCallback(() => {
    setHistory({});
  }, []);

  const getTotalHistoryCount = useCallback(() => {
    return Object.values(history).reduce((sum: number, items: HistoryItem[]) => sum + items.length, 0);
  }, [history]);

  // If utilitySlug is provided, return only that utility's history
  const currentUtilityHistory = utilitySlug ? getUtilityHistory(utilitySlug) : [];

  return {
    history,
    currentUtilityHistory,
    addHistoryItem,
    getUtilityHistory,
    deleteHistoryItem,
    clearUtilityHistory,
    clearAllHistory,
    getTotalHistoryCount,
  };
};