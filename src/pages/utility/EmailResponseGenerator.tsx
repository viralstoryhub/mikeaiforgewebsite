
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { generateContent } from '../../services/geminiService';
import { useToast } from '../../contexts/ToastContext';
import { useAuth } from '../../contexts/AuthContext';
import { ResultListSkeleton } from '../../components/Skeletons';
import PersonaSelector from '../../components/PersonaSelector';
import { useUtilityHistory, type HistoryItem } from '../../hooks/useUtilityHistory';
import UtilityHistoryPanel from '../../components/UtilityHistoryPanel';

const FREE_TIER_LIMIT = 3;
const UTILITY_SLUG = 'email-response-generator';
const STORAGE_KEY = `formState_${UTILITY_SLUG}`;

const EmailResponseGenerator: React.FC = () => {
  const [receivedEmail, setReceivedEmail] = useState('');
  const [tone, setTone] = useState('professional');
  const [context, setContext] = useState('');
  const [selectedPersonaId, setSelectedPersonaId] = useState<string>('default');
  const [result, setResult] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { addToast } = useToast();
  const auth = useAuth();
  const { addHistoryItem } = useUtilityHistory(UTILITY_SLUG);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const savedState = localStorage.getItem(STORAGE_KEY);
      if (savedState) {
        const parsed = JSON.parse(savedState);
        setReceivedEmail(parsed.receivedEmail || '');
        setTone(parsed.tone || 'professional');
        setContext(parsed.context || '');
      }
    } catch (err) {
      console.error("Failed to parse form state from localStorage", err);
    }
  }, []);

  // Save to localStorage on change
  useEffect(() => {
    try {
      const stateToSave = JSON.stringify({ receivedEmail, tone, context });
      localStorage.setItem(STORAGE_KEY, stateToSave);
    } catch (err) {
      console.error("Failed to save form state to localStorage", err);
    }
  }, [receivedEmail, tone, context]);

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

    if (!receivedEmail.trim()) {
      setError('Please paste the email you received.');
      return;
    }
    setError(null);

    setIsLoading(true);
    setResult('');
    
    try {
      const selectedPersona = auth?.currentUser?.personas?.find(p => p.id === selectedPersonaId);
      const systemInstruction = selectedPersona ? selectedPersona.description : undefined;

      const prompt = `You are an expert email writer. Generate a ${tone} email response to the following email.

${context ? `Context/Additional Info: ${context}\n` : ''}
Email Received:
"""
${receivedEmail}
"""

Generate a complete, well-structured email response that:
- Matches the ${tone} tone
- Addresses all points from the original email
- Is clear, concise, and professional
- Includes appropriate greeting and closing
- Is ready to send (no placeholders)

Return ONLY the email response, no additional commentary.`;

      const generatedResponse = await generateContent(prompt, systemInstruction);
      setResult(generatedResponse);

      // Save to history
      addHistoryItem({
        utilitySlug: UTILITY_SLUG,
        inputs: { receivedEmail, tone, context },
        output: generatedResponse,
        title: `${tone.charAt(0).toUpperCase() + tone.slice(1)} response`,
      });

      if (auth?.currentUser && auth.recordUtilityUsage) {
        await auth.recordUtilityUsage(UTILITY_SLUG);
      }
      localStorage.removeItem(STORAGE_KEY);

    } catch (err: any) {
      const errorMessage = err.message || 'An error occurred while generating the email response. Please try again.';
      setError(errorMessage);
      addToast(errorMessage, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyToClipboard = () => {
    navigator.clipboard.writeText(result);
    addToast('Email response copied to clipboard!', 'success');
  };

  const handleRestoreHistory = (item: HistoryItem) => {
    setReceivedEmail(item.inputs.receivedEmail || '');
    setTone(item.inputs.tone || 'professional');
    setContext(item.inputs.context || '');
    setResult(item.output);
    addToast('History item restored!', 'success');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="max-w-4xl mx-auto animate-fade-in-up">
      <div className="flex items-center space-x-3 mb-6">
        <svg className="w-8 h-8 text-brand-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
        <h1 className="text-3xl font-bold text-light-primary">Email Response Generator</h1>
      </div>
      <p className="mb-6 text-light-secondary">
        Paste any email you received and get a professional response draft in seconds. Choose your tone and add context for better results.
      </p>

      {/* History Panel */}
      <div className="mb-6">
        <UtilityHistoryPanel 
          utilitySlug={UTILITY_SLUG} 
          onRestore={handleRestoreHistory}
        />
      </div>

      <form onSubmit={handleSubmit} className="p-6 bg-dark-secondary rounded-lg border border-border-dark space-y-4">
        <div>
          <label htmlFor="receivedEmail" className="block text-sm font-medium text-light-secondary mb-2">
            Email You Received <span className="text-red-500">*</span>
          </label>
          <textarea
            id="receivedEmail"
            value={receivedEmail}
            onChange={(e) => setReceivedEmail(e.target.value)}
            placeholder="Paste the email you need to respond to here..."
            rows={8}
            className="w-full px-3 py-2 bg-dark-primary border border-border-dark rounded-md shadow-sm focus:outline-none focus:ring-brand-primary focus:border-brand-primary text-light-primary resize-y"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="tone" className="block text-sm font-medium text-light-secondary mb-2">
              Response Tone
            </label>
            <select
              id="tone"
              value={tone}
              onChange={(e) => setTone(e.target.value)}
              className="w-full px-3 py-2 bg-dark-primary border border-border-dark rounded-md shadow-sm focus:outline-none focus:ring-brand-primary focus:border-brand-primary text-light-primary"
            >
              <option value="professional">Professional</option>
              <option value="friendly">Friendly</option>
              <option value="formal">Formal</option>
              <option value="casual">Casual</option>
              <option value="empathetic">Empathetic</option>
              <option value="enthusiastic">Enthusiastic</option>
            </select>
          </div>

          <div>
            <label htmlFor="context" className="block text-sm font-medium text-light-secondary mb-2">
              Additional Context (Optional)
            </label>
            <input
              type="text"
              id="context"
              value={context}
              onChange={(e) => setContext(e.target.value)}
              placeholder="e.g., Need to decline politely"
              className="w-full px-3 py-2 bg-dark-primary border border-border-dark rounded-md shadow-sm focus:outline-none focus:ring-brand-primary focus:border-brand-primary text-light-primary"
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
            {isLoading ? 'Generating Response...' : 'Generate Email Response'}
          </button>
        </div>
      </form>

      {isLoading && (
        <div className="mt-8">
          <h2 className="text-2xl font-bold mb-4 text-light-primary">Generating Your Response...</h2>
          <ResultListSkeleton count={3} />
        </div>
      )}

      {result && (
        <div className="mt-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-light-primary">Your Email Response</h2>
            <button
              onClick={handleCopyToClipboard}
              className="flex items-center gap-2 px-4 py-2 bg-brand-primary text-white rounded-md hover:opacity-90 transition-opacity"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              Copy Email
            </button>
          </div>
          <div className="p-6 bg-dark-secondary rounded-lg border border-border-dark">
            <pre className="whitespace-pre-wrap text-light-secondary font-sans">{result}</pre>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmailResponseGenerator;