
import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../contexts/ThemeContext';
import { SunIcon, MoonIcon } from './icons/UtilityIcons';

const ThemeToggle: React.FC = () => {
  const { theme, setTheme, availableThemes } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const themeIcons: Record<string, React.ReactElement> = {
    light: <SunIcon className="w-4 h-4" />,
    dark: <MoonIcon className="w-4 h-4" />,
    neon: <span className="text-lg">⚡</span>,
    pastel: <span className="text-lg">🌸</span>,
    'high-contrast': <span className="text-lg">👁️</span>,
  };

  const themeLabels: Record<string, string> = {
    light: 'Light',
    dark: 'Dark',
    neon: 'Neon',
    pastel: 'Pastel',
    'high-contrast': 'High Contrast',
  };

  const themeColors: Record<string, string> = {
    light: 'bg-white border-gray-300',
    dark: 'bg-gray-900 border-gray-700',
    neon: 'bg-purple-900 border-green-400',
    pastel: 'bg-pink-50 border-pink-300',
    'high-contrast': 'bg-black border-yellow-400',
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-secondary focus:ring-offset-gray-100 dark:focus:ring-offset-gray-900"
        aria-label="Choose theme"
      >
        {theme === 'light' ? (
          <SunIcon className="w-5 h-5" />
        ) : theme === 'neon' ? (
          <span className="text-xl">⚡</span>
        ) : theme === 'pastel' ? (
          <span className="text-xl">🌸</span>
        ) : theme === 'high-contrast' ? (
          <span className="text-xl">👁️</span>
        ) : (
          <MoonIcon className="w-5 h-5" />
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 mt-2 w-48 rounded-lg bg-white dark:bg-gray-800 shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden z-50"
          >
            <div className="py-1">
              <div className="px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Choose Theme
              </div>
              {availableThemes.map((themeName) => (
                <button
                  key={themeName}
                  onClick={() => {
                    setTheme(themeName);
                    setIsOpen(false);
                  }}
                  className={`
                    w-full flex items-center space-x-3 px-4 py-2.5 text-sm
                    transition-colors
                    ${
                      theme === themeName
                        ? 'bg-brand-primary/10 text-brand-primary font-medium'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }
                  `}
                >
                  {/* Theme preview circle */}
                  <div
                    className={`w-5 h-5 rounded-full border-2 flex-shrink-0 ${themeColors[themeName]}`}
                  />
                  
                  {/* Theme icon */}
                  <span className="flex-shrink-0">{themeIcons[themeName]}</span>
                  
                  {/* Theme label */}
                  <span className="flex-1 text-left">{themeLabels[themeName]}</span>
                  
                  {/* Active indicator */}
                  {theme === themeName && (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="text-brand-primary"
                    >
                      ✓
                    </motion.span>
                  )}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ThemeToggle;
