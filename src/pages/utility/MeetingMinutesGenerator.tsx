
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { generateContent } from '../../services/geminiService';
import { useToast } from '../../contexts/ToastContext';
import { useAuth } from '../../contexts/AuthContext';
import { ResultListSkeleton } from '../../components/Skeletons';
import PersonaSelector from '../../components/PersonaSelector';

const FREE_TIER_LIMIT = 3;
const UTILITY_SLUG = 'meeting-minutes-generator';
const STORAGE_KEY = `formState_${UTILITY_SLUG}`;

const MeetingMinutesGenerator: React.FC = () => {
  const [transcript, setTranscript] = useState('');
  const [meetingTitle, setMeetingTitle] = useState('');
  const [selectedPersonaId, setSelectedPersonaId] = useState<string>('default');
  const [result, setResult] = useState<{
    summary: string;
    keyPoints: string[];
    actionItems: string[];
    decisions: string[];
  } | null>(null);
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
        setTranscript(parsed.transcript || '');
        setMeetingTitle(parsed.meetingTitle || '');
      }
    } catch (err) {
      console.error("Failed to parse form state from localStorage", err);
    }
  }, []);

  // Save to localStorage on change
  useEffect(() => {
    try {
      const stateToSave = JSON.stringify({ transcript, meetingTitle });
      localStorage.setItem(STORAGE_KEY, stateToSave);
    } catch (err) {
      console.error("Failed to save form state to localStorage", err);
    }
  }, [transcript, meetingTitle]);

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

    if (!transcript.trim()) {
      setError('Please provide the meeting transcript or recording text.');
      return;
    }
    setError(null);

    setIsLoading(true);
    setResult(null);
    
    try {
      const selectedPersona = auth?.currentUser?.personas?.find(p => p.id === selectedPersonaId);
      const systemInstruction = selectedPersona ? selectedPersona.description : undefined;

      const prompt = `You are an expert meeting facilitator and note-taker. Analyze this meeting transcript and generate structured meeting minutes.

${meetingTitle ? `Meeting Title: ${meetingTitle}\n` : ''}
Transcript:
"""
${transcript}
"""

Generate a comprehensive meeting minutes document with these sections:

1. EXECUTIVE SUMMARY: A brief 2-3 sentence overview of the meeting
2. KEY DISCUSSION POINTS: List 3-7 main topics discussed
3. ACTION ITEMS: List all tasks mentioned with implied owners (format: "Task description - Owner/Team")
4. DECISIONS MADE: List all decisions or conclusions reached

Format your response as JSON with this structure:
{
  "summary": "executive summary text",
  "keyPoints": ["point 1", "point 2", ...],
  "actionItems": ["action item 1 - Owner", "action item 2 - Owner", ...],
  "decisions": ["decision 1", "decision 2", ...]
}

Return ONLY valid JSON, no markdown formatting or additional text.`;

      const generatedResponse = await generateContent(prompt, systemInstruction);
      
      // Clean up response and parse JSON
      let cleanedResponse = generatedResponse.trim();
      if (cleanedResponse.startsWith('```json')) {
        cleanedResponse = cleanedResponse.replace(/```json\n?/, '').replace(/\n?```$/, '');
      } else if (cleanedResponse.startsWith('```')) {
        cleanedResponse = cleanedResponse.replace(/```\n?/, '').replace(/\n?```$/, '');
      }
      
      const parsed = JSON.parse(cleanedResponse);
      setResult(parsed);

      if (auth?.currentUser && auth.recordUtilityUsage) {
        await auth.recordUtilityUsage(UTILITY_SLUG);
      }
      localStorage.removeItem(STORAGE_KEY);

    } catch (err: any) {
      const errorMessage = err.message || 'An error occurred while generating meeting minutes. Please try again.';
      setError(errorMessage);
      addToast(errorMessage, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyToClipboard = () => {
    if (!result) return;
    
    const formattedText = `MEETING MINUTES${meetingTitle ? `: ${meetingTitle}` : ''}
    
EXECUTIVE SUMMARY
${result.summary}

KEY DISCUSSION POINTS
${result.keyPoints.map((point, i) => `${i + 1}. ${point}`).join('\n')}

ACTION ITEMS
${result.actionItems.map((item, i) => `${i + 1}. ${item}`).join('\n')}

DECISIONS MADE
${result.decisions.map((decision, i) => `${i + 1}. ${decision}`).join('\n')}`;

    navigator.clipboard.writeText(formattedText);
    addToast('Meeting minutes copied to clipboard!', 'success');
  };

  return (
    <div className="max-w-4xl mx-auto animate-fade-in-up">
      <div className="flex items-center space-x-3 mb-6">
        <svg className="w-8 h-8 text-brand-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <h1 className="text-3xl font-bold text-light-primary">Meeting Minutes Generator</h1>
      </div>
      <p className="mb-6 text-light-secondary">
        Upload or paste your meeting transcript and get formatted meeting minutes with action items, decisions, and key discussion points.
      </p>

      <form onSubmit={handleSubmit} className="p-6 bg-dark-secondary rounded-lg border border-border-dark space-y-4">
        <div>
          <label htmlFor="meetingTitle" className="block text-sm font-medium text-light-secondary mb-2">
            Meeting Title (Optional)
          </label>
          <input
            type="text"
            id="meetingTitle"
            value={meetingTitle}
            onChange={(e) => setMeetingTitle(e.target.value)}
            placeholder="e.g., Q4 Planning Meeting"
            className="w-full px-3 py-2 bg-dark-primary border border-border-dark rounded-md shadow-sm focus:outline-none focus:ring-brand-primary focus:border-brand-primary text-light-primary"
          />
        </div>

        <div>
          <label htmlFor="transcript" className="block text-sm font-medium text-light-secondary mb-2">
            Meeting Transcript or Notes <span className="text-red-500">*</span>
          </label>
          <textarea
            id="transcript"
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
            placeholder="Paste your meeting transcript, recording text, or notes here...&#10;&#10;Tip: Include speaker names if available (e.g., 'John: Let's discuss the Q4 goals...')"
            rows={12}
            className="w-full px-3 py-2 bg-dark-primary border border-border-dark rounded-md shadow-sm focus:outline-none focus:ring-brand-primary focus:border-brand-primary text-light-primary resize-y"
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
            {isLoading ? 'Generating Minutes...' : 'Generate Meeting Minutes'}
          </button>
        </div>
      </form>

      {isLoading && (
        <div className="mt-8">
          <h2 className="text-2xl font-bold mb-4 text-light-primary">Analyzing Meeting...</h2>
          <ResultListSkeleton count={4} />
        </div>
      )}

      {result && (
        <div className="mt-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-light-primary">Meeting Minutes</h2>
            <button
              onClick={handleCopyToClipboard}
              className="flex items-center gap-2 px-4 py-2 bg-brand-primary text-white rounded-md hover:opacity-90 transition-opacity"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              Copy Minutes
            </button>
          </div>

          <div className="space-y-6">
            {/* Executive Summary */}
            <div className="p-6 bg-dark-secondary rounded-lg border border-border-dark">
              <h3 className="text-lg font-bold text-brand-primary mb-3 flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Executive Summary
              </h3>
              <p className="text-light-secondary">{result.summary}</p>
            </div>

            {/* Key Discussion Points */}
            <div className="p-6 bg-dark-secondary rounded-lg border border-border-dark">
              <h3 className="text-lg font-bold text-brand-primary mb-3 flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
                Key Discussion Points
              </h3>
              <ul className="space-y-2">
                {result.keyPoints.map((point, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="text-brand-primary font-bold min-w-[24px]">{i + 1}.</span>
                    <span className="text-light-secondary flex-1">{point}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Action Items */}
            <div className="p-6 bg-dark-secondary rounded-lg border border-green-500/30 bg-green-500/5">
              <h3 className="text-lg font-bold text-green-400 mb-3 flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
                Action Items
              </h3>
              <ul className="space-y-2">
                {result.actionItems.map((item, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <input type="checkbox" className="mt-1 w-4 h-4 text-brand-primary bg-dark-primary border-border-dark rounded focus:ring-brand-primary" />
                    <span className="text-light-secondary flex-1">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Decisions Made */}
            <div className="p-6 bg-dark-secondary rounded-lg border border-purple-500/30 bg-purple-500/5">
              <h3 className="text-lg font-bold text-purple-400 mb-3 flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Decisions Made
              </h3>
              <ul className="space-y-2">
                {result.decisions.map((decision, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="text-purple-400 font-bold min-w-[24px]">{i + 1}.</span>
                    <span className="text-light-secondary flex-1">{decision}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MeetingMinutesGenerator;