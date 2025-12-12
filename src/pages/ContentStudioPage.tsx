
import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Link } from 'react-router-dom';
import { FilmIcon, DocumentTextIcon, MegaphoneIcon, SparklesIcon } from '../components/icons/ExtraIcons';
import { LockIcon, CloseIcon } from '../components/icons/UtilityIcons';
import { useToast } from '../contexts/ToastContext';
import { transcribeAudio } from '../services/geminiService';
import { repurposeTranscript } from '../services/geminiService';
import { RepurposedContent } from '../types';
import { useAudioProcessor } from '../hooks/useAudioProcessor';

type Step = 'upload' | 'transcribing' | 'review' | 'repurposing' | 'results';

const StepIndicator: React.FC<{ currentStep: Step }> = ({ currentStep }) => {
    const steps = [
        { id: 'upload', name: 'Upload' },
        { id: 'review', name: 'Transcribe & Review' },
        { id: 'results', name: 'Repurpose' },
    ];

    const getStepStatus = (stepId: string) => {
        const stepOrder = ['upload', 'transcribing', 'review', 'repurposing', 'results'];
        const currentIndex = stepOrder.indexOf(currentStep);
        const stepIndex = stepOrder.indexOf(stepId);
        
        if (stepId === 'review' && (currentStep === 'transcribing' || currentStep === 'review')) {
             return 'current';
        }
        if (stepId === 'results' && (currentStep === 'repurposing' || currentStep === 'results')) {
             return 'current';
        }
        if (currentIndex > stepIndex) return 'complete';
        if (currentIndex === stepIndex) return 'current';
        return 'upcoming';
    };

    return (
        <nav aria-label="Progress">
            <ol role="list" className="flex items-center">
                {steps.map((step, stepIdx) => (
                    <li key={step.name} className={`relative ${stepIdx !== steps.length - 1 ? 'pr-8 sm:pr-20' : ''}`}>
                        {(() => {
                            const status = getStepStatus(step.id);
                            if (status === 'complete') {
                                return (
                                    <>
                                        <div className="absolute inset-0 flex items-center" aria-hidden="true">
                                            <div className="h-0.5 w-full bg-brand-primary" />
                                        </div>
                                        <div className="relative flex h-8 w-8 items-center justify-center rounded-full bg-brand-primary">
                                            <svg className="h-5 w-5 text-white" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                                <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.052-.143z" clipRule="evenodd" />
                                            </svg>
                                        </div>
                                    </>
                                );
                            } else if (status === 'current') {
                                return (
                                    <>
                                        <div className="absolute inset-0 flex items-center" aria-hidden="true">
                                            <div className="h-0.5 w-full bg-gray-700" />
                                        </div>
                                        <div className="relative flex h-8 w-8 items-center justify-center rounded-full border-2 border-brand-primary bg-dark-secondary">
                                            <span className="h-2.5 w-2.5 rounded-full bg-brand-primary" aria-hidden="true" />
                                        </div>
                                        <span className="absolute -bottom-6 text-xs font-semibold text-brand-primary">{step.name}</span>
                                    </>
                                );
                            } else {
                                return (
                                    <>
                                        <div className="absolute inset-0 flex items-center" aria-hidden="true">
                                            <div className="h-0.5 w-full bg-gray-700" />
                                        </div>
                                        <div className="group relative flex h-8 w-8 items-center justify-center rounded-full border-2 border-gray-600 bg-dark-secondary">
                                             <span className="h-2.5 w-2.5 rounded-full bg-transparent" />
                                        </div>
                                         <span className="absolute -bottom-6 text-xs font-medium text-gray-500">{step.name}</span>
                                    </>
                                );
                            }
                        })()}
                    </li>
                ))}
            </ol>
        </nav>
    );
};


const ProAccessView: React.FC = () => {
    const [currentStep, setCurrentStep] = useState<Step>('upload');
    const [file, setFile] = useState<File | null>(null);
    const [transcript, setTranscript] = useState<string>('');
    const [repurposedContent, setRepurposedContent] = useState<RepurposedContent | null>(null);
    
    const { addToast } = useToast();
    const { 
      processFile, 
      isLoading: isProcessingAudio, 
      loadingMessage, 
      error: processingError 
    } = useAudioProcessor();

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (!selectedFile) return;

        if (selectedFile.size > 50 * 1024 * 1024) { // 50MB limit
            addToast('File size is too large (max 50MB)', 'error');
            return;
        }
        
        setFile(selectedFile);
        setCurrentStep('transcribing');

        const { base64Data, mimeType, error } = await processFile(selectedFile);

        if (error || !base64Data) {
            addToast(error || 'Failed to process file.', 'error');
            setCurrentStep('upload');
            return;
        }

        try {
            const result = await transcribeAudio(base64Data, mimeType);
            setTranscript(result);
            setCurrentStep('review');
        } catch (err: any) {
            addToast(err.message || 'Failed to transcribe audio.', 'error');
            setCurrentStep('upload');
        }
    };

    const handleRepurpose = async () => {
        if (!transcript.trim()) {
            addToast('Transcript cannot be empty.', 'error');
            return;
        }
        setCurrentStep('repurposing');
        try {
            const results = await repurposeTranscript(transcript);
            setRepurposedContent(results);
            setCurrentStep('results');
        } catch (err: any) {
            addToast(err.message || 'Failed to repurpose content.', 'error');
            setCurrentStep('review');
        }
    };
    
    const reset = () => {
        setCurrentStep('upload');
        setFile(null);
        setTranscript('');
        setRepurposedContent(null);
        const fileInput = document.getElementById('file-upload') as HTMLInputElement;
        if(fileInput) fileInput.value = '';
    };

    const handleCopyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        addToast('Copied to clipboard!', 'success');
    };

    return (
        <div className="max-w-4xl mx-auto">
            <div className="text-center mb-8">
                <h1 className="text-4xl font-extrabold tracking-tight text-light-primary sm:text-5xl">Content Automation Studio</h1>
                <p className="mt-3 max-w-2xl mx-auto text-xl text-light-secondary sm:mt-4">
                   Turn one piece of content into many with our AI-powered pipeline.
                </p>
            </div>

            <div className="p-6 bg-dark-secondary rounded-lg border border-border-dark">
                <div className="mb-12 flex justify-center">
                    <StepIndicator currentStep={currentStep} />
                </div>

                {currentStep === 'upload' && (
                    <div className="p-8 border-2 border-dashed border-gray-600 rounded-lg text-center animate-fade-in-up">
                        <label htmlFor="file-upload" className="cursor-pointer">
                            <FilmIcon className="w-12 h-12 mx-auto text-gray-400" />
                            <h3 className="mt-2 text-lg font-medium text-light-primary">Upload a video or audio file</h3>
                            <p className="mt-1 text-sm text-gray-400">MP3, MP4, WAV, etc. (Max 50MB)</p>
                            <input id="file-upload" name="file-upload" type="file" className="sr-only" onChange={handleFileChange} accept="video/*,audio/*"/>
                        </label>
                    </div>
                )}
                
                {(currentStep === 'transcribing' || isProcessingAudio) && (
                     <div className="text-center p-8 animate-fade-in-up">
                        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-brand-primary mb-4"></div>
                        <p className="text-light-secondary font-semibold">{loadingMessage || 'Transcribing...'}</p>
                        <p className="text-sm text-gray-400 mt-2">This may take a moment for larger files.</p>
                    </div>
                )}

                {currentStep === 'review' && (
                    <div className="animate-fade-in-up space-y-4">
                         <h3 className="text-2xl font-bold text-center text-light-primary">Review & Edit Transcript</h3>
                         <p className="text-center text-gray-400">File: <strong>{file?.name}</strong></p>
                         <textarea
                            value={transcript}
                            onChange={(e) => setTranscript(e.target.value)}
                            rows={15}
                            className="w-full p-4 bg-dark-primary rounded-md border border-border-dark font-mono text-sm text-light-secondary"
                        />
                        <div className="flex gap-4">
                            <button onClick={reset} className="flex-1 text-center py-2 px-4 border border-border-dark rounded-md shadow-sm text-sm font-medium">Start Over</button>
                            <button onClick={handleRepurpose} className="flex-1 text-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-brand-primary hover:opacity-90">
                                Continue & Repurpose
                            </button>
                        </div>
                    </div>
                )}

                {currentStep === 'repurposing' && (
                     <div className="text-center p-8 animate-fade-in-up">
                        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-brand-primary mb-4"></div>
                        <p className="text-light-secondary font-semibold">Generating content assets...</p>
                    </div>
                )}

                {currentStep === 'results' && repurposedContent && (
                    <div className="animate-fade-in-up space-y-6">
                        <h3 className="text-2xl font-bold text-center text-light-primary">Your Content Assets are Ready!</h3>
                         <div className="p-6 bg-dark-primary rounded-lg">
                            <h2 className="text-xl font-bold mb-3 flex items-center text-light-primary"><DocumentTextIcon className="w-5 h-5 mr-2" /> Summary</h2>
                             <p className="text-light-secondary whitespace-pre-wrap">{repurposedContent.summary}</p>
                        </div>
                         <div className="p-6 bg-dark-primary rounded-lg">
                            <h2 className="text-xl font-bold mb-3 text-light-primary">Key Takeaways</h2>
                            <ul className="list-disc list-inside space-y-2">
                            {repurposedContent.keyTakeaways.map((takeaway, index) => (
                                <li key={index} className="text-light-secondary">{takeaway}</li>
                            ))}
                            </ul>
                        </div>
                         <div className="space-y-4">
                            {repurposedContent.socialPosts.map((post, index) => (
                                <div key={index} className="p-6 bg-dark-primary rounded-lg">
                                    <h2 className="text-xl font-bold mb-3 flex items-center text-light-primary"><MegaphoneIcon className="w-5 h-5 mr-2"/> {post.platform} Post</h2>
                                    <div className="group relative">
                                        <p className="text-light-secondary whitespace-pre-wrap">{post.content}</p>
                                        <button onClick={() => handleCopyToClipboard(post.content)} className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-md bg-gray-700 hover:bg-gray-600">
                                            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <button onClick={reset} className="w-full mt-4 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-brand-primary hover:opacity-90">
                            Process Another File
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

const FreeTierView: React.FC = () => (
    <div className="text-center py-16 sm:py-24">
        <div className="mx-auto flex-shrink-0 flex items-center justify-center h-16 w-16 rounded-full bg-yellow-900/50">
          <LockIcon className="h-9 w-9 text-yellow-500" />
        </div>
        <h1 className="mt-8 text-4xl font-extrabold tracking-tight text-light-primary sm:text-5xl">
          Unlock the Content Studio
        </h1>
         <p className="mt-4 text-2xl font-semibold text-brand-primary">
          This is a Pro Feature
        </p>
        <p className="mt-4 max-w-2xl mx-auto text-lg text-light-secondary">
          Upgrade your plan to automatically transform long-form content into social media clips, blog posts, and more with our powerful AI assembly line.
        </p>
        <div className="mt-8">
            <Link to="/dashboard" className="inline-flex items-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-white bg-brand-primary hover:opacity-90 transition-colors">
                Upgrade to Pro
            </Link>
        </div>
      </div>
);


const ContentStudioPage: React.FC = () => {
    const { currentUser } = useAuth()!;

    return (
        <div className="animate-fade-in-up">
            {currentUser?.subscriptionTier === 'Pro' ? <ProAccessView /> : <FreeTierView />}
        </div>
    );
};

export default ContentStudioPage;
