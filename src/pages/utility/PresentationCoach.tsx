
import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { LockIcon, CheckIcon } from '../../components/icons/UtilityIcons';
import { MicrophoneIcon } from '../../components/icons/ExtraIcons';
import { connectLiveSession, createBlob, analyzePresentationTranscript } from '../../services/geminiService';
import { PresentationFeedback } from '../../types';
// LiveSession and LiveServerMessage types removed from @google/genai exports
// Using any types as fallback until package is updated
type LiveSession = any;
type LiveServerMessage = any;

type Status = 'idle' | 'requesting_mic' | 'listening' | 'analyzing' | 'results' | 'error';

const ProFeatureLock: React.FC = () => (
    <div className="text-center py-16 sm:py-24 animate-fade-in-up">
        <div className="mx-auto flex-shrink-0 flex items-center justify-center h-16 w-16 rounded-full bg-yellow-900/50">
            <LockIcon className="h-9 w-9 text-yellow-500" />
        </div>
        <h1 className="mt-8 text-4xl font-extrabold tracking-tight text-light-primary sm:text-5xl">
            Unlock the Live Presentation Coach
        </h1>
        <p className="mt-4 text-2xl font-semibold text-brand-primary">
            This is a Pro Feature
        </p>
        <p className="mt-4 max-w-2xl mx-auto text-lg text-light-secondary">
            Upgrade your plan to practice your speeches with real-time transcription and get instant AI feedback on your delivery.
        </p>
        <div className="mt-8">
            <Link to="/dashboard" className="inline-flex items-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-white bg-brand-primary hover:opacity-90 transition-colors">
                Upgrade to Pro
            </Link>
        </div>
    </div>
);

const FeedbackCard: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <div className="bg-dark-primary p-4 rounded-lg border border-border-dark">
        <h4 className="text-md font-bold text-light-primary mb-2">{title}</h4>
        <div className="text-sm text-light-secondary space-y-2">{children}</div>
    </div>
);

const PresentationCoach: React.FC = () => {
    const { currentUser } = useAuth();
    const { addToast } = useToast();

    const [status, setStatus] = useState<Status>('idle');
    const [transcript, setTranscript] = useState('');
    const [feedback, setFeedback] = useState<PresentationFeedback | null>(null);
    const [errorMessage, setErrorMessage] = useState('');

    const sessionPromiseRef = useRef<Promise<LiveSession> | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
    const mediaStreamSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
    const mediaStreamRef = useRef<MediaStream | null>(null);
    
    const isPro = currentUser?.subscriptionTier === 'Pro';
    
    const cleanupAudio = () => {
        mediaStreamRef.current?.getTracks().forEach(track => track.stop());
        scriptProcessorRef.current?.disconnect();
        mediaStreamSourceRef.current?.disconnect();
        audioContextRef.current?.close();
        mediaStreamRef.current = null;
        scriptProcessorRef.current = null;
        mediaStreamSourceRef.current = null;
        audioContextRef.current = null;
    };

    const startCoaching = async () => {
        setTranscript('');
        setFeedback(null);
        setErrorMessage('');
        setStatus('requesting_mic');

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaStreamRef.current = stream;
            
            audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
            scriptProcessorRef.current = audioContextRef.current.createScriptProcessor(4096, 1, 1);
            mediaStreamSourceRef.current = audioContextRef.current.createMediaStreamSource(stream);

            sessionPromiseRef.current = connectLiveSession({
                onopen: () => {
                    if(!scriptProcessorRef.current || !mediaStreamSourceRef.current || !audioContextRef.current) return;
                    
                    scriptProcessorRef.current.onaudioprocess = (audioProcessingEvent) => {
                        const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
                        const pcmBlob = createBlob(inputData);
                        sessionPromiseRef.current?.then((session) => {
                            session.sendRealtimeInput({ media: pcmBlob });
                        });
                    };
                    mediaStreamSourceRef.current.connect(scriptProcessorRef.current);
                    scriptProcessorRef.current.connect(audioContextRef.current.destination);
                    setStatus('listening');
                },
                onmessage: (message: LiveServerMessage) => {
                    if (message.serverContent?.inputTranscription) {
                        const text = message.serverContent.inputTranscription.text;
                        setTranscript(prev => prev + text);
                    }
                },
                onerror: (e: ErrorEvent) => {
                    console.error('Live session error:', e);
                    setErrorMessage('A connection error occurred. Please try again.');
                    setStatus('error');
                    cleanupAudio();
                },
                onclose: (e: CloseEvent) => {
                    console.log('Live session closed.');
                    cleanupAudio();
                },
            });

        } catch (err) {
            console.error('Failed to get user media:', err);
            setErrorMessage('Could not access the microphone. Please grant permission and try again.');
            setStatus('error');
        }
    };

    const stopAndAnalyze = async () => {
        setStatus('analyzing');
        cleanupAudio();
        
        if (sessionPromiseRef.current) {
            const session = await sessionPromiseRef.current;
            session.close();
            sessionPromiseRef.current = null;
        }

        if (transcript.trim().length < 20) {
            setErrorMessage("Your speech was too short to provide meaningful feedback. Please try again and speak for a bit longer.");
            setStatus('error');
            return;
        }

        try {
            const analysis = await analyzePresentationTranscript(transcript);
            setFeedback(analysis);
            setStatus('results');
        } catch (err: any) {
            console.error("Failed to analyze transcript:", err);
            setErrorMessage("The AI couldn't analyze your speech. Please try again.");
            setStatus('error');
        }
    };

    const reset = () => {
        cleanupAudio();
        setTranscript('');
        setFeedback(null);
        setErrorMessage('');
        setStatus('idle');
    };

    useEffect(() => {
        // Cleanup on unmount
        return () => {
            cleanupAudio();
            if (sessionPromiseRef.current) {
                 sessionPromiseRef.current.then(session => session.close());
            }
        };
    }, []);

    if (!isPro) {
        return <ProFeatureLock />;
    }

    return (
        <div className="max-w-4xl mx-auto animate-fade-in-up">
            <div className="flex items-center space-x-3 mb-6">
                <MicrophoneIcon className="w-8 h-8 text-brand-primary" />
                <h1 className="text-3xl font-bold text-light-primary">Live Presentation Coach</h1>
            </div>
            <p className="mb-6 text-light-secondary">Practice your speech with real-time transcription and get instant AI feedback on your delivery. Your audio is not stored.</p>

            <div className="p-6 bg-dark-secondary rounded-lg border border-border-dark min-h-[400px] flex flex-col justify-center">
                {status === 'idle' && (
                    <div className="text-center">
                        <MicrophoneIcon className="w-20 h-20 mx-auto text-gray-500" />
                        <h2 className="text-2xl font-bold mt-4 text-light-primary">Ready to practice?</h2>
                        <p className="text-light-secondary mt-2">Click the button below to start your coaching session.</p>
                        <button onClick={startCoaching} className="mt-6 bg-brand-primary text-white font-semibold px-8 py-3 rounded-lg shadow-lg hover:opacity-90 transition-opacity">
                            Start Coaching
                        </button>
                    </div>
                )}
                
                {status === 'requesting_mic' && (
                    <div className="text-center text-light-secondary">
                        <p>Waiting for microphone permission...</p>
                    </div>
                )}

                {status === 'listening' && (
                    <div className="flex flex-col h-full space-y-4">
                        <div className="flex items-center justify-center text-red-400 space-x-2">
                           <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                           <span className="font-semibold">Listening...</span>
                        </div>
                        <div className="flex-grow p-4 bg-dark-primary rounded-md border border-border-dark min-h-[200px] text-light-secondary">
                            {transcript || <span className="text-gray-500">Your speech will appear here in real-time...</span>}
                        </div>
                        <button onClick={stopAndAnalyze} className="w-full bg-red-600 text-white font-semibold px-6 py-3 rounded-lg hover:bg-red-700 transition-colors">
                            Stop & Analyze
                        </button>
                    </div>
                )}
                
                 {(status === 'analyzing') && (
                     <div className="text-center">
                        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-brand-primary mb-4"></div>
                        <p className="text-light-secondary font-semibold">Analyzing your presentation...</p>
                    </div>
                )}
                
                {status === 'error' && (
                    <div className="text-center">
                        <h2 className="text-2xl font-bold text-red-400">An Error Occurred</h2>
                        <p className="text-light-secondary mt-2">{errorMessage}</p>
                        <button onClick={reset} className="mt-6 bg-brand-primary text-white font-semibold px-6 py-2 rounded-lg hover:opacity-90">
                            Try Again
                        </button>
                    </div>
                )}

                {status === 'results' && feedback && (
                    <div className="space-y-6">
                        <div className="text-center">
                            <h2 className="text-2xl font-bold text-light-primary">Your Feedback</h2>
                            <div className="mt-2 text-6xl font-extrabold text-brand-primary">{feedback.overallScore}<span className="text-3xl text-gray-500">/10</span></div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FeedbackCard title="Clarity"><p>{feedback.feedback.clarity}</p></FeedbackCard>
                            <FeedbackCard title="Pacing"><p>{feedback.feedback.pacing}</p></FeedbackCard>
                            <FeedbackCard title="Filler Words"><p>{feedback.feedback.fillerWords}</p></FeedbackCard>
                            <FeedbackCard title="Engagement"><p>{feedback.feedback.engagement}</p></FeedbackCard>
                        </div>
                         {feedback.fillerWordCount.length > 0 && (
                            <FeedbackCard title="Filler Words Detected">
                                <div className="flex flex-wrap gap-x-4 gap-y-1">
                                    {feedback.fillerWordCount.map(item => (
                                        <p key={item.word}><strong>{item.word}:</strong> {item.count}</p>
                                    ))}
                                </div>
                            </FeedbackCard>
                        )}
                         <FeedbackCard title="Suggestions for Improvement">
                            <ul className="list-disc list-inside space-y-2">
                               {feedback.suggestions.map((s, i) => <li key={i}>{s}</li>)}
                            </ul>
                        </FeedbackCard>
                        <button onClick={reset} className="w-full bg-brand-primary text-white font-semibold px-6 py-3 rounded-lg hover:opacity-90">
                            Practice Again
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PresentationCoach;
