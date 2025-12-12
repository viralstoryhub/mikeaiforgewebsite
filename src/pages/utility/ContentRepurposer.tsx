import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { repurposeTranscript } from '../../services/geminiService';
import { RepurposedContent } from '../../types';
import { SparklesIcon } from '../../components/icons/ExtraIcons';
import { useToast } from '../../contexts/ToastContext';
import { useAuth } from '../../contexts/AuthContext';
import PersonaSelector from '../../components/PersonaSelector';

const FREE_TIER_LIMIT = 3;
const UTILITY_SLUG = 'content-repurposer';
const STORAGE_KEY = `formState_${UTILITY_SLUG}`;

const ContentRepurposer: React.FC = () => {
  const [rawText, setRawText] = useState('');
  const [selectedPersonaId, setSelectedPersonaId] = useState<string>('default');
  const [results, setResults] = useState<RepurposedContent | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { addToast } = useToast();
  const auth = useAuth();

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
    if (!rawText.trim() || rawText.trim().length < 50) {
      setError('Please enter a substantial amount of text (at least 50 characters) to repurpose.');
      return;
    }

    setIsLoading(true);
    setResults(null);
    try {
      const selectedPersona = auth?.currentUser?.personas?.find(p => p.id === selectedPersonaId);
      const systemInstruction = selectedPersona ? selectedPersona.description : undefined;

      const generatedResults = await repurposeTranscript(rawText, systemInstruction);
      setResults(generatedResults);

      if (auth?.currentUser && auth.recordUtilityUsage) {
        await auth.recordUtilityUsage(UTILITY_SLUG);
      }
      localStorage.removeItem(STORAGE_KEY);
    } catch (err: any) {
      const errorMessage = err.message || 'An error occurred while repurposing content. Please try again.';
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
        <SparklesIcon className="w-8 h-8 text-brand-secondary" />
        <h1 className="text-3xl font-bold">Content Repurposer</h1>
      </div>
      <p className="mb-6 text-gray-600 dark:text-gray-400">Paste a long transcript or text to instantly generate a summary, key takeaways, and social media posts.</p>
      
      <form onSubmit={handleSubmit} className="p-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 space-y-4">
        <div>
          <label htmlFor="raw_text" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Transcript or Article Text</label>
          <textarea
            id="raw_text"
            rows={10}
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            placeholder="Paste your content here..."
            className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-brand-secondary focus:border-brand-secondary"
          />
        </div>
        <div>
           <PersonaSelector selectedPersonaId={selectedPersonaId} onChange={setSelectedPersonaId} />
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
              {isLoading ? 'Repurposing...' : 'Generate Content'}
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
          <div className="p-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-bold mb-3">Summary</h2>
            <div className="group relative p-4 bg-gray-100 dark:bg-gray-900 rounded-md">
              <p className="text-gray-800 dark:text-gray-200 whitespace-pre-wrap">{results.summary}</p>
              <button onClick={() => handleCopyToClipboard(results.summary)} className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-md hover:bg-gray-300 dark:hover:bg-gray-700">
                  <svg className="w-5 h-5 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
              </button>
            </div>
          </div>

          <div className="p-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-bold mb-3">Key Takeaways</h2>
            <ul className="list-disc list-inside space-y-2">
              {results.keyTakeaways.map((takeaway, index) => (
                <li key={index} className="text-gray-800 dark:text-gray-200">{takeaway}</li>
              ))}
            </ul>
          </div>

           <div className="space-y-4">
            {results.socialPosts.map((post, index) => (
                <div key={index} className="p-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                    <h2 className="text-xl font-bold mb-3">{post.platform} Post</h2>
                     <div className="group relative p-4 bg-gray-100 dark:bg-gray-900 rounded-md">
                        <p className="text-gray-800 dark:text-gray-200 whitespace-pre-wrap">{post.content}</p>
                        <button onClick={() => handleCopyToClipboard(post.content)} className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-md hover:bg-gray-300 dark:hover:bg-gray-700">
                            <svg className="w-5 h-5 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                        </button>
                    </div>
                </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ContentRepurposer;