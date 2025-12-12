
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { generateTitlesAndHooks } from '../../services/geminiService';
import { TitleIcon } from '../../components/icons/UtilityIcons';
import { useToast } from '../../contexts/ToastContext';
import { ResultListSkeleton } from '../../components/Skeletons';
import { useAuth } from '../../contexts/AuthContext';
import { UTILITIES_DATA } from '../../constants';
import PersonaSelector from '../../components/PersonaSelector';

const FREE_TIER_LIMIT = 3;
const UTILITY_SLUG = 'titles-hooks-generator';
const STORAGE_KEY = `formState_${UTILITY_SLUG}`;

const TitlesHooksGenerator: React.FC = () => {
  const [topic, setTopic] = useState('');
  const [audience, setAudience] = useState('');
  const [selectedPersonaId, setSelectedPersonaId] = useState<string>('default');
  const [results, setResults] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { addToast } = useToast();
  const auth = useAuth();
  
  // Load from localStorage on mount
  useEffect(() => {
    try {
      const savedState = localStorage.getItem(STORAGE_KEY);
      if (savedState) {
        const { topic: savedTopic, audience: savedAudience } = JSON.parse(savedState);
        setTopic(savedTopic || '');
        setAudience(savedAudience || '');
      }
    } catch (err) {
      console.error("Failed to parse form state from localStorage", err);
    }
  }, []);

  // Save to localStorage on change
  useEffect(() => {
    try {
      const stateToSave = JSON.stringify({ topic, audience });
      localStorage.setItem(STORAGE_KEY, stateToSave);
    } catch (err) {
       console.error("Failed to save form state to localStorage", err);
    }
  }, [topic, audience]);

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
    
    if (!topic || !audience) {
      setError('Please fill out both topic and audience.');
      return;
    }
    setError(null);

    setIsLoading(true);
    setResults([]);
    try {
      const selectedPersona = auth?.currentUser?.personas?.find(p => p.id === selectedPersonaId);
      const systemInstruction = selectedPersona ? selectedPersona.description : undefined;

      const generatedResults = await generateTitlesAndHooks(topic, audience, systemInstruction);
      setResults(generatedResults);
      
      if (auth?.currentUser && auth.recordUtilityUsage) {
          await auth.recordUtilityUsage(UTILITY_SLUG);
      }
      localStorage.removeItem(STORAGE_KEY);

    } catch (err: any) {
      const errorMessage = err.message || 'An error occurred while generating titles. Please try again.';
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
        <TitleIcon className="w-8 h-8 text-brand-primary" />
        <h1 className="text-3xl font-bold text-light-primary">Titles/Hooks Generator</h1>
      </div>
      <p className="mb-6 text-light-secondary">Enter a topic and target audience to generate 10 compelling titles and hooks for your content.</p>
      
      <form onSubmit={handleSubmit} className="p-6 bg-dark-secondary rounded-lg border border-border-dark space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="topic" className="block text-sm font-medium text-light-secondary">Topic</label>
            <input
              type="text"
              id="topic"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g., Advanced React Patterns"
              className="mt-1 block w-full px-3 py-2 bg-dark-primary border border-border-dark rounded-md shadow-sm focus:outline-none focus:ring-brand-primary focus:border-brand-primary text-light-primary"
            />
          </div>
          <div>
            <label htmlFor="audience" className="block text-sm font-medium text-light-secondary">Audience</label>
            <input
              type="text"
              id="audience"
              value={audience}
              onChange={(e) => setAudience(e.target.value)}
              placeholder="e.g., Senior Frontend Developers"
              className="mt-1 block w-full px-3 py-2 bg-dark-primary border border-border-dark rounded-md shadow-sm focus:outline-none focus:ring-brand-primary focus:border-brand-primary text-light-primary"
            />
          </div>
        </div>
        <div>
          <PersonaSelector selectedPersonaId={selectedPersonaId} onChange={setSelectedPersonaId} />
        </div>
        {error && <p className="text-red-500 text-sm">{error}</p>}
        
        <div className="pt-2">
            {isFreeTier && (
              <div className="text-sm text-center text-gray-500 mb-4">
                {limitReached ? (
                  <p>
                    You've reached your free limit. 
                    <Link to="/dashboard" className="font-semibold text-brand-primary hover:underline ml-1">
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
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-brand-primary hover:opacity-90 transition-opacity focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-primary disabled:bg-gray-600 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Generating...' : 'Generate'}
            </button>
        </div>
      </form>

      {isLoading && (
        <div className="mt-8">
            <h2 className="text-2xl font-bold mb-4 text-light-primary">Results</h2>
            <ResultListSkeleton count={5} />
        </div>
      )}

      {results.length > 0 && (
        <div className="mt-8">
          <h2 className="text-2xl font-bold mb-4 text-light-primary">Results</h2>
          <div className="space-y-3">
            {results.map((result, index) => (
              <div key={index} className="group flex justify-between items-center p-4 bg-dark-secondary rounded-md">
                <p className="text-light-secondary">{result}</p>
                <button onClick={() => handleCopyToClipboard(result)} className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-md hover:bg-gray-600">
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default TitlesHooksGenerator;
