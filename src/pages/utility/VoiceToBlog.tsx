import React, { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { generateBlogFromTranscript } from '../../services/geminiService';
import { useToast } from '../../contexts/ToastContext';
import { useAuth } from '../../contexts/AuthContext';
import PersonaSelector from '../../components/PersonaSelector';

const FREE_TIER_LIMIT = 3;
const UTILITY_SLUG = 'voice-to-blog';

interface BlogResult {
  title: string;
  introduction: string;
  body: string;
  conclusion: string;
  tags: string[];
}

const VoiceToBlog: React.FC = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [selectedPersonaId, setSelectedPersonaId] = useState<string>('default');
  const [results, setResults] = useState<BlogResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const { addToast } = useToast();
  const auth = useAuth();

  const usage = auth?.currentUser?.utilityUsage?.[UTILITY_SLUG] || 0;
  const remainingUses = FREE_TIER_LIMIT - usage;
  const isFreeTier = auth?.currentUser?.subscriptionTier === 'Free';
  const limitReached = isFreeTier && remainingUses <= 0;

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
        await transcribeAudio(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      addToast('Recording started. Speak your blog content!', 'success');
    } catch (err: any) {
      setError('Microphone access denied. Please allow microphone access.');
      addToast('Microphone access denied', 'error');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      addToast('Recording stopped. Transcribing...', 'info');
    }
  };

  const transcribeAudio = async (audioBlob: Blob) => {
    setIsLoading(true);
    try {
      // Convert to base64
      const reader = new FileReader();
      reader.readAsDataURL(audioBlob);
      reader.onloadend = async () => {
        const base64Audio = reader.result?.toString().split(',')[1];
        if (base64Audio) {
          // Transcribe using Gemini (assuming transcribeAudio function exists)
          const { transcribeAudio: geminiTranscribe } = await import('../../services/geminiService');
          const transcriptionResult = await geminiTranscribe(base64Audio, 'audio/webm');
          setTranscript(transcriptionResult);
          addToast('Transcription complete!', 'success');
        }
      };
    } catch (err: any) {
      setError('Transcription failed. Please try again.');
      addToast('Transcription failed', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (limitReached) {
      addToast("You have reached your free limit for this utility.", 'error');
      return;
    }
    
    if (!transcript.trim() || transcript.trim().length < 100) {
      setError('Please record at least 100 characters of speech or paste a transcript.');
      return;
    }

    setError(null);
    setIsLoading(true);
    setResults(null);
    
    try {
      const selectedPersona = auth?.currentUser?.personas?.find(p => p.id === selectedPersonaId);
      const systemInstruction = selectedPersona ? selectedPersona.description : undefined;

      const generatedResults = await generateBlogFromTranscript(transcript, systemInstruction);
      setResults(generatedResults);
      
      if (auth?.currentUser && auth.recordUtilityUsage) {
        await auth.recordUtilityUsage(UTILITY_SLUG);
      }
      addToast('Blog post generated successfully!', 'success');
    } catch (err: any) {
      const errorMessage = err.message || 'An error occurred while generating the blog. Please try again.';
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

  const fullBlogPost = results ? `# ${results.title}\n\n${results.introduction}\n\n${results.body}\n\n${results.conclusion}` : '';

  return (
    <div className="max-w-4xl mx-auto animate-fade-in-up">
      <div className="flex items-center space-x-3 mb-6">
        <svg className="w-8 h-8 text-brand-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
        </svg>
        <h1 className="text-3xl font-bold text-light-primary">Voice-to-Blog Generator</h1>
      </div>
      <p className="mb-6 text-light-secondary">Record your thoughts or paste a transcript, and AI will transform it into a professional blog post.</p>
      
      <form onSubmit={handleSubmit} className="p-6 bg-dark-secondary rounded-lg border border-border-dark space-y-4">
        <div className="flex items-center justify-center space-x-4 p-6 bg-dark-primary rounded-lg">
          <button
            type="button"
            onClick={isRecording ? stopRecording : startRecording}
            className={`px-6 py-3 rounded-full font-medium text-white transition-all ${
              isRecording 
                ? 'bg-red-500 hover:bg-red-600 animate-pulse' 
                : 'bg-brand-primary hover:opacity-90'
            }`}
          >
            {isRecording ? (
              <>
                <span className="inline-block w-3 h-3 bg-white rounded-full mr-2"></span>
                Stop Recording
              </>
            ) : (
              <>
                <svg className="inline-block w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
                </svg>
                Start Recording
              </>
            )}
          </button>
        </div>

        <div>
          <label htmlFor="transcript" className="block text-sm font-medium text-light-secondary">
            Transcript {isRecording ? '(Recording...)' : '(Or paste text here)'}
          </label>
          <textarea
            id="transcript"
            rows={10}
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
            placeholder="Your recorded speech will appear here, or you can paste your own transcript..."
            className="mt-1 block w-full px-3 py-2 bg-dark-primary border border-border-dark rounded-md shadow-sm focus:outline-none focus:ring-brand-primary focus:border-brand-primary text-light-primary"
            disabled={isRecording}
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
            disabled={isLoading || limitReached || !transcript.trim()}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-brand-primary hover:opacity-90 transition-opacity focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-primary disabled:bg-gray-600 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Generating Blog...' : 'Generate Blog Post'}
          </button>
        </div>
      </form>

      {isLoading && (
        <div className="mt-8 text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-brand-primary"></div>
          <p className="mt-2 text-light-secondary">AI is crafting your blog post...</p>
        </div>
      )}

      {results && (
        <div className="mt-8 space-y-6">
          <div className="flex justify-end">
            <button
              onClick={() => handleCopyToClipboard(fullBlogPost)}
              className="px-4 py-2 bg-brand-primary text-white rounded-md hover:opacity-90 transition-opacity"
            >
              Copy Full Blog Post
            </button>
          </div>

          <div className="p-6 bg-dark-secondary rounded-lg border border-border-dark">
            <h2 className="text-2xl font-bold mb-3 text-light-primary">{results.title}</h2>
            <div className="flex flex-wrap gap-2 mb-4">
              {results.tags.map((tag, index) => (
                <span key={index} className="px-2 py-1 bg-brand-primary/20 text-brand-primary rounded text-xs">
                  #{tag}
                </span>
              ))}
            </div>
          </div>

          <div className="p-6 bg-dark-secondary rounded-lg border border-border-dark">
            <h3 className="text-lg font-bold mb-2 text-light-primary">Introduction</h3>
            <div className="group relative">
              <p className="text-light-secondary whitespace-pre-wrap">{results.introduction}</p>
              <button 
                onClick={() => handleCopyToClipboard(results.introduction)} 
                className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-md hover:bg-gray-600"
              >
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </button>
            </div>
          </div>

          <div className="p-6 bg-dark-secondary rounded-lg border border-border-dark">
            <h3 className="text-lg font-bold mb-2 text-light-primary">Body</h3>
            <div className="group relative">
              <div className="text-light-secondary whitespace-pre-wrap prose prose-invert max-w-none">{results.body}</div>
              <button 
                onClick={() => handleCopyToClipboard(results.body)} 
                className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-md hover:bg-gray-600"
              >
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </button>
            </div>
          </div>

          <div className="p-6 bg-dark-secondary rounded-lg border border-border-dark">
            <h3 className="text-lg font-bold mb-2 text-light-primary">Conclusion</h3>
            <div className="group relative">
              <p className="text-light-secondary whitespace-pre-wrap">{results.conclusion}</p>
              <button 
                onClick={() => handleCopyToClipboard(results.conclusion)} 
                className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-md hover:bg-gray-600"
              >
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VoiceToBlog;