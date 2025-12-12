import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { transcribeAudio } from '../../services/geminiService';
import { MicrophoneIcon } from '../../components/icons/ExtraIcons';
import { useToast } from '../../contexts/ToastContext';
import { useAuth } from '../../contexts/AuthContext';
import { CloseIcon } from '../../components/icons/UtilityIcons';
import { useAudioProcessor } from '../../hooks/useAudioProcessor';

const FREE_TIER_LIMIT = 2;
const UTILITY_SLUG = 'video-audio-transcriber';

const VideoAudioTranscriber: React.FC = () => {
    const [file, setFile] = useState<File | null>(null);
    const [transcript, setTranscript] = useState<string | null>(null);
    const [isTranscribing, setIsTranscribing] = useState(false);
    
    const { addToast } = useToast();
    const auth = useAuth();
    const { 
      processFile, 
      isLoading: isProcessing, 
      loadingMessage: processingMessage, 
      error: processingError 
    } = useAudioProcessor();

    const usage = auth?.currentUser?.utilityUsage?.[UTILITY_SLUG] || 0;
    const remainingUses = FREE_TIER_LIMIT - usage;
    const isFreeTier = auth?.currentUser?.subscriptionTier === 'Free';
    const limitReached = isFreeTier && remainingUses <= 0;

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            if (selectedFile.size > 50 * 1024 * 1024) { // 50MB limit
                addToast('File size is too large (max 50MB)', 'error');
                return;
            }
            setFile(selectedFile);
            setTranscript(null);
        }
    };

    const removeFile = () => {
        setFile(null);
        setTranscript(null);
        const fileInput = document.getElementById('file-upload') as HTMLInputElement;
        if(fileInput) fileInput.value = '';
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (limitReached) {
            addToast("You have reached your free limit for this utility.", 'error');
            return;
        }
        if (!file) {
            addToast('Please upload a file first.', 'error');
            return;
        }

        setTranscript(null);
        
        const { base64Data, mimeType, error: processErr } = await processFile(file);

        if (processErr || !base64Data) {
            addToast(processErr || 'Failed to process file.', 'error');
            return;
        }
        
        setIsTranscribing(true);
        try {
            const result = await transcribeAudio(base64Data, mimeType);
            setTranscript(result);

            if (auth?.currentUser && auth.recordUtilityUsage) {
                await auth.recordUtilityUsage(UTILITY_SLUG);
            }
        } catch (err: any) {
             addToast(err.message || 'An error occurred during transcription.', 'error');
        } finally {
            setIsTranscribing(false);
        }
    };
    
    const handleCopyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        addToast('Transcript copied to clipboard!', 'success');
    };
    
    const handleDownload = () => {
        if (!transcript) return;
        const blob = new Blob([transcript], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${file?.name.split('.')[0]}_transcript.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };
    
    const isLoading = isProcessing || isTranscribing;
  
    return (
        <div className="max-w-3xl mx-auto animate-fade-in-up">
            <div className="flex items-center space-x-3 mb-6">
                <MicrophoneIcon className="w-8 h-8 text-brand-secondary" />
                <h1 className="text-3xl font-bold">Video/Audio Transcriber</h1>
            </div>
            <p className="mb-6 text-gray-600 dark:text-gray-400">Upload a video or audio file (MP3, MP4, WAV, etc.) to get a full text transcript. Great for turning content into blog posts or show notes.</p>
        
            <form onSubmit={handleSubmit} className="p-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Media File</label>
                  {!file ? (
                     <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 dark:border-gray-600 border-dashed rounded-md">
                        <div className="space-y-1 text-center">
                            <MicrophoneIcon className="mx-auto h-12 w-12 text-gray-400"/>
                            <div className="flex text-sm text-gray-600 dark:text-gray-400">
                                <label htmlFor="file-upload" className="relative cursor-pointer bg-white dark:bg-gray-800 rounded-md font-medium text-brand-secondary hover:text-brand-primary focus-within:outline-none">
                                    <span>Upload a file</span>
                                    <input id="file-upload" name="file-upload" type="file" className="sr-only" accept="video/*,audio/*" onChange={handleFileChange} />
                                </label>
                                <p className="pl-1">or drag and drop</p>
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-500">Video or Audio up to 50MB</p>
                        </div>
                    </div>
                  ) : (
                    <div className="mt-2 p-3 bg-gray-100 dark:bg-gray-700/50 rounded-md flex justify-between items-center">
                        <span className="text-sm font-medium truncate">{file.name}</span>
                        <button onClick={removeFile} type="button" className="text-red-500 hover:text-red-700 ml-4">
                            <CloseIcon className="w-5 h-5" />
                        </button>
                    </div>
                  )}
                </div>

                {processingError && <p className="text-red-500 text-sm">{processingError}</p>}
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
                        disabled={isLoading || !file || limitReached}
                        className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-brand-primary hover:bg-brand-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-secondary disabled:bg-gray-400 dark:disabled:bg-gray-600 disabled:cursor-not-allowed"
                    >
                        {isLoading ? 'Transcribing...' : 'Transcribe File'}
                    </button>
                </div>
            </form>

            {(isLoading || transcript) && (
                <div className="mt-8">
                  <h2 className="text-2xl font-bold mb-4">Transcript</h2>
                  {isLoading ? (
                    <div className="text-center p-8 bg-gray-100 dark:bg-gray-800 rounded-lg">
                        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-brand-secondary mb-4"></div>
                        <p className="text-gray-700 dark:text-gray-300 font-semibold">{isTranscribing ? 'Sending to AI for transcription...' : processingMessage}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">This may take a moment for larger files.</p>
                    </div>
                  ) : transcript && (
                    <div className="space-y-4 animate-fade-in-up">
                        <textarea
                            readOnly
                            value={transcript}
                            rows={15}
                            className="w-full p-4 bg-gray-50 dark:bg-gray-900 rounded-md border border-gray-200 dark:border-gray-700 font-mono text-sm"
                        />
                        <div className="flex gap-4">
                             <button onClick={() => handleCopyToClipboard(transcript)} className="flex-1 text-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-brand-secondary hover:bg-blue-600">
                                Copy Transcript
                            </button>
                            <button onClick={handleDownload} className="flex-1 text-center py-2 px-4 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                                Download as .txt
                            </button>
                        </div>
                    </div>
                  )}
                </div>
            )}
        </div>
    );
};

export default VideoAudioTranscriber;
