import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { formatCaptions } from '../../services/geminiService';
import { ClosedCaptionIcon } from '../../components/icons/UtilityIcons';
import { useToast } from '../../contexts/ToastContext';
import { useAuth } from '../../contexts/AuthContext';
import { UTILITIES_DATA } from '../../constants';

interface Results {
  srt: string;
  styleNotes: string[];
}

const FREE_TIER_LIMIT = 3;
const UTILITY_SLUG = 'captions-formatter';
const STORAGE_KEY = `formState_${UTILITY_SLUG}`;

const CaptionFormatter: React.FC = () => {
  const [rawText, setRawText] = useState('');
  const [results, setResults] = useState<Results | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { addToast } = useToast();
  const auth = useAuth();

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const savedState = localStorage.getItem(STORAGE_KEY);
      if (savedState) {
        const { rawText: savedText } = JSON.parse(savedState);
        setRawText(savedText || '');
      }
    } catch (err) {
      console.error("Failed to parse form state from localStorage", err);
    }
  }, []);

  // Save to localStorage on change
  useEffect(() => {
    try {
      const stateToSave = JSON.stringify({ rawText });
      localStorage.setItem(STORAGE_KEY, stateToSave);
    } catch (err) {
       console.error("Failed to save form state to localStorage", err);
    }
  }, [rawText]);

  const usage = auth?.currentUser?.utilityUsage?.[UTILITY_SLUG] || 0;
  const remainingUses = FREE_TIER_LIMIT - usage;
  const isFreeTier = auth?.currentUser?.subscriptionTier === 'Free';
  const limitReached = isFreeTier && remainingUses <= 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (limitReached) {
      addToast("You have reached your free limit for this utility.", 'error');
      return;
    }

    setError(null);
    if (!rawText.trim()) {
      setError('Please enter some text to format.');
      return;
    }

    setIsLoading(true);
    setResults(null);
    try {
      const generatedResults = await formatCaptions(rawText);
      setResults(generatedResults);

      if (auth?.currentUser && auth.recordUtilityUsage) {
        await auth.recordUtilityUsage(UTILITY_SLUG);
      }

      localStorage.removeItem(STORAGE_KEY);
    } catch (err: any) {
      const errorMessage = err.message || 'An error occurred while formatting. Please try again.';
      setError(errorMessage);
      addToast(errorMessage, 'error');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleCopyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    addToast('Copied to clipboard!', 'success');
  };

  return (
    <div className="max-w-3xl mx-auto animate-fade-in-up">
      <div className="flex items-center space-x-3 mb-6">
        <ClosedCaptionIcon className="w-8 h-8 text-brand-secondary" />
        <h1 className="text-3xl font-bold">Captions/Subtitle Formatter</h1>
      </div>
      <p className="mb-6 text-gray-600 dark:text-gray-400">Paste your raw transcript text. We'll clean it up and format it into a standard SRT file.</p>
      
      <form onSubmit={handleSubmit} className="p-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 space-y-4">
        <div>
          <label htmlFor="raw_text" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Raw Text or Transcript</label>
          <textarea
            id="raw_text"
            rows={8}
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            placeholder="Paste your text here..."
            className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-brand-secondary focus:border-brand-secondary"
          />
        </div>
        {error && <p className="text-red-500 text-sm">{error}</p>}
        <div className="pt-2">
            {isFreeTier && (
              <div className="text-sm text-center text-gray-500 dark:text-gray-400 mb-4">
                {limitReached ? (
                  <p>
                    You've reached your free limit. 
                    <Link to="/dashboard" className="font-semibold text-brand-secondary hover:underline ml-1">
                      Upgrade to Pro
                    </Link> 
                    {' '}for unlimited uses.
                  </p>
                ) : (
                  <p>
                    You have <strong>{remainingUses}</strong> of {FREE_TIER_LIMIT} free uses remaining.
                  </p>
                )}
              </div>
            )}
            <button
              type="submit"
              disabled={isLoading || limitReached}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-brand-primary hover:bg-brand-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-secondary disabled:bg-gray-400 dark:disabled:bg-gray-600 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Formatting...' : 'Format Captions'}
            </button>
        </div>
      </form>

      {isLoading && (
        <div className="mt-8 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-brand-secondary"></div>
            <p className="mt-2 text-gray-600 dark:text-gray-400">AI is working its magic...</p>
        </div>
      )}

      {results && (
        <div className="mt-8 space-y-6">
          <div>
            <h2 className="text-2xl font-bold mb-4">Formatted SRT</h2>
            <div className="group relative p-4 bg-gray-900 text-white rounded-md font-mono text-sm whitespace-pre-wrap">
              <code>{results.srt}</code>
              <button onClick={() => handleCopyToClipboard(results.srt)} className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-md hover:bg-gray-700">
                  <svg className="w-5 h-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
              </button>
            </div>
          </div>
          <div>
            <h2 className="text-2xl font-bold mb-4">Style Notes</h2>
            <ul className="list-disc list-inside space-y-2 p-4 bg-gray-100 dark:bg-gray-800 rounded-md">
              {results.styleNotes.map((note, index) => (
                <li key={index}>{note}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

export default CaptionFormatter;