import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { generateResumeOptimization } from '../../services/geminiService';
import { useToast } from '../../contexts/ToastContext';
import { useAuth } from '../../contexts/AuthContext';
import PersonaSelector from '../../components/PersonaSelector';

const FREE_TIER_LIMIT = 3;
const UTILITY_SLUG = 'ai-resume-builder';
const STORAGE_KEY = `formState_${UTILITY_SLUG}`;

interface ResumeResult {
  optimizedSummary: string;
  keySkills: string[];
  tailoredExperience: string[];
  recommendations: string[];
}

const AIResumeBuilder: React.FC = () => {
  const [jobDescription, setJobDescription] = useState('');
  const [currentResume, setCurrentResume] = useState('');
  const [selectedPersonaId, setSelectedPersonaId] = useState<string>('default');
  const [results, setResults] = useState<ResumeResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { addToast } = useToast();
  const auth = useAuth();

  useEffect(() => {
    try {
      const savedState = localStorage.getItem(STORAGE_KEY);
      if (savedState) {
        const { jobDescription: savedJob, currentResume: savedResume } = JSON.parse(savedState);
        setJobDescription(savedJob || '');
        setCurrentResume(savedResume || '');
      }
    } catch (err) {
      console.error("Failed to parse form state from localStorage", err);
    }
  }, []);

  useEffect(() => {
    try {
      const stateToSave = JSON.stringify({ jobDescription, currentResume });
      localStorage.setItem(STORAGE_KEY, stateToSave);
    } catch (err) {
       console.error("Failed to save form state to localStorage", err);
    }
  }, [jobDescription, currentResume]);

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
    
    if (!jobDescription.trim() || jobDescription.trim().length < 50) {
      setError('Please enter a substantial job description (at least 50 characters).');
      return;
    }

    setError(null);
    setIsLoading(true);
    setResults(null);
    
    try {
      const selectedPersona = auth?.currentUser?.personas?.find(p => p.id === selectedPersonaId);
      const systemInstruction = selectedPersona ? selectedPersona.description : undefined;

      const generatedResults = await generateResumeOptimization(jobDescription, currentResume, systemInstruction);
      setResults(generatedResults);
      
      if (auth?.currentUser && auth.recordUtilityUsage) {
        await auth.recordUtilityUsage(UTILITY_SLUG);
      }
      localStorage.removeItem(STORAGE_KEY);
      addToast('Resume optimization complete!', 'success');
    } catch (err: any) {
      const errorMessage = err.message || 'An error occurred while optimizing your resume. Please try again.';
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
    <div className="max-w-4xl mx-auto animate-fade-in-up">
      <div className="flex items-center space-x-3 mb-6">
        <svg className="w-8 h-8 text-brand-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <h1 className="text-3xl font-bold text-light-primary">AI Resume Builder</h1>
      </div>
      <p className="mb-6 text-light-secondary">Paste a job description to get AI-powered resume optimization, tailored skills, and improvement suggestions.</p>
      
      <form onSubmit={handleSubmit} className="p-6 bg-dark-secondary rounded-lg border border-border-dark space-y-4">
        <div>
          <label htmlFor="job_description" className="block text-sm font-medium text-light-secondary">Job Description *</label>
          <textarea
            id="job_description"
            rows={6}
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
            placeholder="Paste the job description here..."
            className="mt-1 block w-full px-3 py-2 bg-dark-primary border border-border-dark rounded-md shadow-sm focus:outline-none focus:ring-brand-primary focus:border-brand-primary text-light-primary"
          />
        </div>
        
        <div>
          <label htmlFor="current_resume" className="block text-sm font-medium text-light-secondary">Current Resume (Optional)</label>
          <textarea
            id="current_resume"
            rows={8}
            value={currentResume}
            onChange={(e) => setCurrentResume(e.target.value)}
            placeholder="Paste your current resume or key experience here (optional)..."
            className="mt-1 block w-full px-3 py-2 bg-dark-primary border border-border-dark rounded-md shadow-sm focus:outline-none focus:ring-brand-primary focus:border-brand-primary text-light-primary"
          />
          <p className="mt-1 text-xs text-gray-500">Adding your current resume helps AI provide more personalized recommendations</p>
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
            {isLoading ? 'Optimizing Resume...' : 'Optimize My Resume'}
          </button>
        </div>
      </form>

      {isLoading && (
        <div className="mt-8 text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-brand-primary"></div>
          <p className="mt-2 text-light-secondary">AI is analyzing the job requirements...</p>
        </div>
      )}

      {results && (
        <div className="mt-8 space-y-6">
          <div className="p-6 bg-dark-secondary rounded-lg border border-border-dark">
            <h2 className="text-xl font-bold mb-3 text-light-primary">Optimized Professional Summary</h2>
            <div className="group relative p-4 bg-dark-primary rounded-md">
              <p className="text-light-secondary whitespace-pre-wrap">{results.optimizedSummary}</p>
              <button 
                onClick={() => handleCopyToClipboard(results.optimizedSummary)} 
                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-md hover:bg-gray-600"
              >
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </button>
            </div>
          </div>

          <div className="p-6 bg-dark-secondary rounded-lg border border-border-dark">
            <h2 className="text-xl font-bold mb-3 text-light-primary">Key Skills to Highlight</h2>
            <div className="flex flex-wrap gap-2">
              {results.keySkills.map((skill, index) => (
                <span key={index} className="px-3 py-1 bg-brand-primary/20 text-brand-primary rounded-full text-sm font-medium">
                  {skill}
                </span>
              ))}
            </div>
          </div>

          <div className="p-6 bg-dark-secondary rounded-lg border border-border-dark">
            <h2 className="text-xl font-bold mb-3 text-light-primary">Tailored Experience Bullets</h2>
            <ul className="space-y-3">
              {results.tailoredExperience.map((bullet, index) => (
                <li key={index} className="flex items-start group">
                  <span className="flex-shrink-0 w-2 h-2 bg-brand-primary rounded-full mt-2 mr-3"></span>
                  <p className="text-light-secondary flex-1">{bullet}</p>
                  <button 
                    onClick={() => handleCopyToClipboard(bullet)} 
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-md hover:bg-gray-600 ml-2"
                  >
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div className="p-6 bg-dark-secondary rounded-lg border border-border-dark">
            <h2 className="text-xl font-bold mb-3 text-light-primary">Recommendations</h2>
            <ul className="space-y-3">
              {results.recommendations.map((rec, index) => (
                <li key={index} className="flex items-start">
                  <svg className="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-light-secondary">{rec}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

export default AIResumeBuilder;