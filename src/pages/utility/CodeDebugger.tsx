import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { debugCode } from '../../services/geminiService';
import { useToast } from '../../contexts/ToastContext';
import { useAuth } from '../../contexts/AuthContext';
import PersonaSelector from '../../components/PersonaSelector';

const FREE_TIER_LIMIT = 3;
const UTILITY_SLUG = 'code-debugger';
const STORAGE_KEY = `formState_${UTILITY_SLUG}`;

interface DebugResult {
  errorExplanation: string;
  rootCause: string;
  fixedCode: string;
  preventionTips: string[];
  relatedIssues: string[];
}

const CodeDebugger: React.FC = () => {
  const [code, setCode] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [language, setLanguage] = useState('javascript');
  const [selectedPersonaId, setSelectedPersonaId] = useState<string>('default');
  const [results, setResults] = useState<DebugResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { addToast } = useToast();
  const auth = useAuth();

  useEffect(() => {
    try {
      const savedState = localStorage.getItem(STORAGE_KEY);
      if (savedState) {
        const { code: savedCode, errorMessage: savedError, language: savedLang } = JSON.parse(savedState);
        setCode(savedCode || '');
        setErrorMessage(savedError || '');
        setLanguage(savedLang || 'javascript');
      }
    } catch (err) {
      console.error("Failed to parse form state from localStorage", err);
    }
  }, []);

  useEffect(() => {
    try {
      const stateToSave = JSON.stringify({ code, errorMessage, language });
      localStorage.setItem(STORAGE_KEY, stateToSave);
    } catch (err) {
       console.error("Failed to save form state to localStorage", err);
    }
  }, [code, errorMessage, language]);

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
    
    if (!code.trim() || code.trim().length < 10) {
      setError('Please enter your code (at least 10 characters).');
      return;
    }

    setError(null);
    setIsLoading(true);
    setResults(null);
    
    try {
      const selectedPersona = auth?.currentUser?.personas?.find(p => p.id === selectedPersonaId);
      const systemInstruction = selectedPersona ? selectedPersona.description : undefined;

      const generatedResults = await debugCode(code, errorMessage, language, systemInstruction);
      setResults(generatedResults);
      
      if (auth?.currentUser && auth.recordUtilityUsage) {
        await auth.recordUtilityUsage(UTILITY_SLUG);
      }
      localStorage.removeItem(STORAGE_KEY);
      addToast('Code analysis complete!', 'success');
    } catch (err: any) {
      const errorMsg = err.message || 'An error occurred while debugging your code. Please try again.';
      setError(errorMsg);
      addToast(errorMsg, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    addToast('Copied to clipboard!', 'success');
  };

  return (
    <div className="max-w-5xl mx-auto animate-fade-in-up">
      <div className="flex items-center space-x-3 mb-6">
        <svg className="w-8 h-8 text-brand-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
        </svg>
        <h1 className="text-3xl font-bold text-light-primary">Code Debugger</h1>
      </div>
      <p className="mb-6 text-light-secondary">Paste your buggy code and error message to get AI-powered debugging assistance, explanations, and fixes.</p>
      
      <form onSubmit={handleSubmit} className="p-6 bg-dark-secondary rounded-lg border border-border-dark space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="language" className="block text-sm font-medium text-light-secondary">Programming Language</label>
            <select
              id="language"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="mt-1 block w-full px-3 py-2 bg-dark-primary border border-border-dark rounded-md shadow-sm focus:outline-none focus:ring-brand-primary focus:border-brand-primary text-light-primary"
            >
              <option value="javascript">JavaScript</option>
              <option value="typescript">TypeScript</option>
              <option value="python">Python</option>
              <option value="java">Java</option>
              <option value="csharp">C#</option>
              <option value="cpp">C++</option>
              <option value="go">Go</option>
              <option value="rust">Rust</option>
              <option value="php">PHP</option>
              <option value="ruby">Ruby</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div className="flex items-end">
            <div className="text-sm text-light-secondary bg-dark-primary px-4 py-2 rounded-md border border-border-dark w-full">
              <strong>Tip:</strong> Include context like function names and variable types
            </div>
          </div>
        </div>

        <div>
          <label htmlFor="code" className="block text-sm font-medium text-light-secondary">Your Code *</label>
          <textarea
            id="code"
            rows={12}
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Paste your code here..."
            className="mt-1 block w-full px-3 py-2 bg-dark-primary border border-border-dark rounded-md shadow-sm focus:outline-none focus:ring-brand-primary focus:border-brand-primary text-light-primary font-mono text-sm"
          />
        </div>

        <div>
          <label htmlFor="error_message" className="block text-sm font-medium text-light-secondary">Error Message (Optional)</label>
          <textarea
            id="error_message"
            rows={4}
            value={errorMessage}
            onChange={(e) => setErrorMessage(e.target.value)}
            placeholder="Paste the error message or stack trace here..."
            className="mt-1 block w-full px-3 py-2 bg-dark-primary border border-border-dark rounded-md shadow-sm focus:outline-none focus:ring-brand-primary focus:border-brand-primary text-light-primary font-mono text-sm"
          />
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
            {isLoading ? 'Debugging Code...' : 'Debug My Code'}
          </button>
        </div>
      </form>

      {isLoading && (
        <div className="mt-8 text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-brand-primary"></div>
          <p className="mt-2 text-light-secondary">AI is analyzing your code...</p>
        </div>
      )}

      {results && (
        <div className="mt-8 space-y-6">
          <div className="p-6 bg-dark-secondary rounded-lg border border-border-dark">
            <h2 className="text-xl font-bold mb-3 text-light-primary flex items-center">
              <svg className="w-6 h-6 text-red-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              Error Explanation
            </h2>
            <div className="p-4 bg-dark-primary rounded-md">
              <p className="text-light-secondary whitespace-pre-wrap">{results.errorExplanation}</p>
            </div>
          </div>

          <div className="p-6 bg-dark-secondary rounded-lg border border-border-dark">
            <h2 className="text-xl font-bold mb-3 text-light-primary flex items-center">
              <svg className="w-6 h-6 text-yellow-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              Root Cause
            </h2>
            <div className="p-4 bg-dark-primary rounded-md">
              <p className="text-light-secondary whitespace-pre-wrap">{results.rootCause}</p>
            </div>
          </div>

          <div className="p-6 bg-dark-secondary rounded-lg border border-border-dark">
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-xl font-bold text-light-primary flex items-center">
                <svg className="w-6 h-6 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Fixed Code
              </h2>
              <button
                onClick={() => handleCopyToClipboard(results.fixedCode)}
                className="px-3 py-1 bg-brand-primary text-white text-sm rounded-md hover:opacity-90"
              >
                Copy Code
              </button>
            </div>
            <div className="p-4 bg-dark-primary rounded-md overflow-x-auto">
              <pre className="text-light-secondary font-mono text-sm whitespace-pre-wrap">{results.fixedCode}</pre>
            </div>
          </div>

          <div className="p-6 bg-dark-secondary rounded-lg border border-border-dark">
            <h2 className="text-xl font-bold mb-3 text-light-primary">Prevention Tips</h2>
            <ul className="space-y-2">
              {results.preventionTips.map((tip, index) => (
                <li key={index} className="flex items-start">
                  <svg className="w-5 h-5 text-brand-primary mr-3 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  <span className="text-light-secondary">{tip}</span>
                </li>
              ))}
            </ul>
          </div>

          {results.relatedIssues.length > 0 && (
            <div className="p-6 bg-dark-secondary rounded-lg border border-border-dark">
              <h2 className="text-xl font-bold mb-3 text-light-primary">Related Issues to Check</h2>
              <ul className="space-y-2">
                {results.relatedIssues.map((issue, index) => (
                  <li key={index} className="flex items-start">
                    <svg className="w-5 h-5 text-orange-500 mr-3 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-light-secondary">{issue}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CodeDebugger;