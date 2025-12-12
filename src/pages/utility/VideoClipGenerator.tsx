
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { generateVideoClip } from '../../services/geminiService';
import { FilmIcon } from '../../components/icons/ExtraIcons';
import { useToast } from '../../contexts/ToastContext';
import { useAuth } from '../../contexts/AuthContext';
import { CloseIcon } from '../../components/icons/UtilityIcons';

const FREE_TIER_LIMIT = 1;
const UTILITY_SLUG = 'video-clip-generator';

const loadingMessages = [
  "Contacting the video generation servers...",
  "Warming up the AI models...",
  "Storyboarding your scene...",
  "Rendering initial frames (this can take a few minutes)...",
  "Applying visual effects and color grading...",
  "Finalizing the video stream...",
  "Almost there, preparing your download...",
];

const VideoClipGenerator: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);

  const { addToast } = useToast();
  const auth = useAuth();

  const usage = auth?.currentUser?.utilityUsage?.[UTILITY_SLUG] || 0;
  const remainingUses = FREE_TIER_LIMIT - usage;
  const isFreeTier = auth?.currentUser?.subscriptionTier === 'Free';
  const limitReached = isFreeTier && remainingUses <= 0;

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isLoading) {
      interval = setInterval(() => {
        setCurrentMessageIndex(prevIndex => (prevIndex + 1) % loadingMessages.length);
      }, 4000);
    }
    return () => clearInterval(interval);
  }, [isLoading]);

  // Effect to clean up the generated video object URL to prevent memory leaks.
  useEffect(() => {
    return () => {
      if (videoUrl) {
        URL.revokeObjectURL(videoUrl);
      }
    };
  }, [videoUrl]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 4 * 1024 * 1024) { // 4MB limit
        addToast('Image file is too large (max 4MB)', 'error');
        return;
      }
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setImagePreview(result);
        setImageBase64(result.split(',')[1]);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
    setImageBase64(null);
    const fileInput = document.getElementById('image-upload') as HTMLInputElement;
    if(fileInput) fileInput.value = '';
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (limitReached) {
      addToast(`You have used your ${isFreeTier ? 'free' : ''} generation for this utility.`, 'error');
      return;
    }
    setError(null);
    if (!prompt.trim()) {
      setError('Please enter a prompt.');
      return;
    }

    setIsLoading(true);
    setCurrentMessageIndex(0);
    setVideoUrl(null);
    try {
      const downloadLink = await generateVideoClip(prompt, imageBase64 ?? undefined, imageFile?.type);
      
      const response = await fetch(downloadLink);
      if (!response.ok) throw new Error(`Failed to download video file. Status: ${response.status}`);
      
      const blob = await response.blob();
      const videoObjectUrl = URL.createObjectURL(blob);
      setVideoUrl(videoObjectUrl);

      if (auth?.currentUser && auth.recordUtilityUsage) {
        await auth.recordUtilityUsage(UTILITY_SLUG);
      }
    } catch (err: any) {
      const errorMessage = err.message || 'An error occurred. Please try again.';
      setError(errorMessage);
      addToast(errorMessage, 'error');
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="max-w-3xl mx-auto animate-fade-in-up">
      <div className="flex items-center space-x-3 mb-6">
        <FilmIcon className="w-8 h-8 text-brand-secondary" />
        <h1 className="text-3xl font-bold">Video Clip Generator</h1>
      </div>
      <p className="mb-6 text-gray-600 dark:text-gray-400">Describe the video you want to create. You can also upload an image to guide the generation process. (Powered by Veo)</p>
      
      <form onSubmit={handleSubmit} className="p-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 space-y-4">
        <div>
          <label htmlFor="prompt" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Prompt</label>
          <textarea
            id="prompt"
            rows={3}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="e.g., A majestic lion roaring on a rocky cliff at sunset, cinematic lighting"
            className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-brand-secondary focus:border-brand-secondary"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Optional Image</label>
          {imagePreview ? (
            <div className="mt-2 relative w-48 h-48">
              <img src={imagePreview} alt="Preview" className="w-full h-full object-cover rounded-md" />
              <button onClick={removeImage} type="button" className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600">
                <CloseIcon className="w-4 h-4" />
              </button>
            </div>
          ) : (
             <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 dark:border-gray-600 border-dashed rounded-md">
                <div className="space-y-1 text-center">
                    <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true"><path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"></path></svg>
                    <div className="flex text-sm text-gray-600 dark:text-gray-400">
                        <label htmlFor="image-upload" className="relative cursor-pointer bg-white dark:bg-gray-800 rounded-md font-medium text-brand-secondary hover:text-brand-primary focus-within:outline-none">
                            <span>Upload a file</span>
                            <input id="image-upload" name="image-upload" type="file" className="sr-only" accept="image/*" onChange={handleFileChange} />
                        </label>
                        <p className="pl-1">or drag and drop</p>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-500">PNG, JPG, GIF up to 4MB</p>
                </div>
            </div>
          )}
        </div>

        {error && <p className="text-red-500 text-sm">{error}</p>}
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
                    You have <strong>{remainingUses}</strong> of {FREE_TIER_LIMIT} free generation remaining.
                  </p>
                )}
              </div>
            )}
            <button
              type="submit"
              disabled={isLoading || limitReached}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-brand-primary hover:bg-brand-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-secondary disabled:bg-gray-400 dark:disabled:bg-gray-600 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Generating Video...' : 'Generate'}
            </button>
        </div>
      </form>

      {(isLoading || videoUrl) && (
        <div className="mt-8">
          <h2 className="text-2xl font-bold mb-4">Result</h2>
          {isLoading ? (
            <div className="text-center p-8 bg-gray-100 dark:bg-gray-800 rounded-lg">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-brand-secondary mb-4"></div>
                <p className="text-gray-700 dark:text-gray-300 font-semibold">{loadingMessages[currentMessageIndex]}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Please keep this tab open. Video generation is a slow process.</p>
            </div>
          ) : videoUrl && (
            <div className="space-y-4">
              <video src={videoUrl} controls className="w-full rounded-lg shadow-md" />
              <a href={videoUrl} download={`mikes-ai-forge-video-${Date.now()}.mp4`} className="w-full block text-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500">
                Download Video
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default VideoClipGenerator;
