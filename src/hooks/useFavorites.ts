import { useState, useEffect, useCallback } from 'react';

const FAVORITES_KEY = 'mikeaiforge_favorites';

export const useFavorites = () => {
  const [favorites, setFavorites] = useState<string[]>([]);

  // Load favorites from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(FAVORITES_KEY);
      if (stored) {
        setFavorites(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Failed to load favorites:', error);
    }
  }, []);

  // Save favorites to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
    } catch (error) {
      console.error('Failed to save favorites:', error);
    }
  }, [favorites]);

  const toggleFavorite = useCallback((utilityId: string) => {
    setFavorites((prev) => {
      if (prev.includes(utilityId)) {
        return prev.filter((id) => id !== utilityId);
      } else {
        return [...prev, utilityId];
      }
    });
  }, []);

  const isFavorite = useCallback(
    (utilityId: string) => {
      return favorites.includes(utilityId);
    },
    [favorites]
  );

  const clearFavorites = useCallback(() => {
    setFavorites([]);
  }, []);

  return {
    favorites,
    toggleFavorite,
    isFavorite,
    clearFavorites,
    favoritesCount: favorites.length,
  };
};