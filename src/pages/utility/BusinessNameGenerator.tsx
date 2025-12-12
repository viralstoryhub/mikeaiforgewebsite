
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { generateContent } from '../../services/geminiService';
import { useToast } from '../../contexts/ToastContext';
import { useAuth } from '../../contexts/AuthContext';
import { ResultListSkeleton } from '../../components/Skeletons';
import PersonaSelector from '../../components/PersonaSelector';

const FREE_TIER_LIMIT = 3;
const UTILITY_SLUG = 'business-name-generator';
const STORAGE_KEY = `formState_${UTILITY_SLUG}`;

interface BusinessNameResult {
  name: string;
  tagline: string;
  domain: string;
}

const BusinessNameGenerator: React.FC = () => {
  const [businessDescription, setBusinessDescription] = useState('');
  const [industry, setIndustry] = useState('');
  const [keywords, setKeywords] = useState('');
  const [selectedPersonaId, setSelectedPersonaId] = useState<string>('default');
  const [results, setResults] = useState<BusinessNameResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { addToast } = useToast();
  const auth = useAuth();

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const savedState = localStorage.getItem(STORAGE_KEY);
      if (savedState) {
        const parsed = JSON.parse(savedState);
        setBusinessDescription(parsed.businessDescription || '');
        setIndustry(parsed.industry || '');
        setKeywords(parsed.keywords || '');
      }
    } catch (err) {
      console.error("Failed to parse form state from localStorage", err);
    }
  }, []);

  // Save to localStorage on change
  useEffect(() => {
    try {
      const stateToSave = JSON.stringify({ businessDescription, industry, keywords });
      localStorage.setItem(STORAGE_KEY, stateToSave);
    } catch (err) {
      console.error("Failed to save form state to localStorage", err);
    }
  }, [businessDescription, industry, keywords]);

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

    if (!businessDescription.trim()) {
      setError('Please describe your business idea.');
      return;
    }
    setError(null);

    setIsLoading(true);
    setResults([]);
    
    try {
      const selectedPersona = auth?.currentUser?.personas?.find(p => p.id === selectedPersonaId);
      const systemInstruction = selectedPersona ? selectedPersona.description : undefined;

      const prompt = `You are an expert brand naming consultant. Generate 15 creative, memorable business names based on this information:

Business Description: ${businessDescription}
${industry ? `Industry: ${industry}` : ''}
${keywords ? `Keywords to consider: ${keywords}` : ''}

Generate 15 business name suggestions. For each name:
1. Create a unique, brandable business name
2. Write a short tagline (max 60 characters)
3. Suggest a .com domain name (make it available-sounding, short and memorable)

Requirements:
- Names should be easy to pronounce and spell
- Mix of descriptive, abstract, and compound names
- Consider modern naming trends
- Ensure names are appropriate and professional

Format your response as JSON array:
[
  {
    "name": "Business Name",
    "tagline": "Short tagline",
    "domain": "suggested-domain.com"
  }
]

Return ONLY valid JSON array, no markdown formatting or additional text.`;

      const generatedResponse = await generateContent(prompt, systemInstruction);
      
      // Clean up response and parse JSON
      let cleanedResponse = generatedResponse.trim();
      if (cleanedResponse.startsWith('```json')) {
        cleanedResponse = cleanedResponse.replace(/```json\n?/, '').replace(/\n?```$/, '');
      } else if (cleanedResponse.startsWith('```')) {
        cleanedResponse = cleanedResponse.replace(/```\n?/, '').replace(/\n?```$/, '');
      }
      
      const parsed = JSON.parse(cleanedResponse);
      setResults(Array.isArray(parsed) ? parsed : []);

      if (auth?.currentUser && auth.recordUtilityUsage) {
        await auth.recordUtilityUsage(UTILITY_SLUG);
      }
      localStorage.removeItem(STORAGE_KEY);

    } catch (err: any) {
      const errorMessage = err.message || 'An error occurred while generating business names. Please try again.';
      setError(errorMessage);
      addToast(errorMessage, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyName = (name: string) => {
    navigator.clipboard.writeText(name);
    addToast('Business name copied!', 'success');
  };

  const handleCopyAll = (item: BusinessNameResult) => {
    const text = `${item.name}\n${item.tagline}\nDomain: ${item.domain}`;
    navigator.clipboard.writeText(text);
    addToast('All details copied!', 'success');
  };

  return (
    <div className="max-w-4xl mx-auto animate-fade-in-up">
      <div className="flex items-center space-x-3 mb-6">
        <svg className="w-8 h-8 text-brand-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
        <h1 className="text-3xl font-bold text-light-primary">Business Name Generator</h1>
      </div>
      <p className="mb-6 text-light-secondary">
        Describe your business idea and get 15 creative, brandable business names with taglines and domain suggestions.
      </p>

      <form onSubmit={handleSubmit} className="p-6 bg-dark-secondary rounded-lg border border-border-dark space-y-4">
        <div>
          <label htmlFor="businessDescription" className="block text-sm font-medium text-light-secondary mb-2">
            Business Description <span className="text-red-500">*</span>
          </label>
          <textarea
            id="businessDescription"
            value={businessDescription}
            onChange={(e) => setBusinessDescription(e.target.value)}
            placeholder="Describe what your business does, who it serves, and what makes it unique...&#10;&#10;Example: An AI-powered platform that helps content creators automate video editing and repurpose content for social media"
            rows={5}
            className="w-full px-3 py-2 bg-dark-primary border border-border-dark rounded-md shadow-sm focus:outline-none focus:ring-brand-primary focus:border-brand-primary text-light-primary resize-y"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="industry" className="block text-sm font-medium text-light-secondary mb-2">
              Industry (Optional)
            </label>
            <input
              type="text"
              id="industry"
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
              placeholder="e.g., SaaS, E-commerce, Consulting"
              className="w-full px-3 py-2 bg-dark-primary border border-border-dark rounded-md shadow-sm focus:outline-none focus:ring-brand-primary focus:border-brand-primary text-light-primary"
            />
          </div>

          <div>
            <label htmlFor="keywords" className="block text-sm font-medium text-light-secondary mb-2">
              Keywords (Optional)
            </label>
            <input
              type="text"
              id="keywords"
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              placeholder="e.g., fast, smart, flow, hub"
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
            {isLoading ? 'Generating Names...' : 'Generate Business Names'}
          </button>
        </div>
      </form>

      {isLoading && (
        <div className="mt-8">
          <h2 className="text-2xl font-bold mb-4 text-light-primary">Generating Creative Names...</h2>
          <ResultListSkeleton count={5} />
        </div>
      )}

      {results.length > 0 && (
        <div className="mt-8">
          <h2 className="text-2xl font-bold mb-4 text-light-primary">Your Business Name Ideas ({results.length})</h2>
          <div className="space-y-3">
            {results.map((result, index) => (
              <div
                key={index}
                className="group p-5 bg-dark-secondary rounded-lg border border-border-dark hover:border-brand-primary/50 transition-all duration-300"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-bold text-brand-primary">{result.name}</h3>
                      <button
                        onClick={() => handleCopyName(result.name)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-md hover:bg-dark-primary"
                        title="Copy name"
                      >
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                      </button>
                    </div>
                    <p className="text-sm text-light-secondary italic mb-2">{result.tagline}</p>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-brand-primary/10 text-brand-primary border border-brand-primary/20">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                        </svg>
                        {result.domain}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleCopyAll(result)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-2 px-3 py-2 bg-brand-primary text-white rounded-md hover:opacity-90 text-sm"
                    title="Copy all details"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    Copy All
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="text-sm text-light-secondary">
                <p className="font-semibold text-blue-400 mb-1">💡 Pro Tip</p>
                <p>Before finalizing, check domain availability on services like Namecheap or GoDaddy. Also search for trademark conflicts and social media handle availability.</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BusinessNameGenerator;