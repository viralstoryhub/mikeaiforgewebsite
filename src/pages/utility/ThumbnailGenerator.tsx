import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { generateImages } from '../../services/geminiService';
import { SparklesIcon } from '../../components/icons/ExtraIcons';
import { LockIcon } from '../../components/icons/UtilityIcons';

const ThumbnailGenerator: React.FC = () => {
    const { currentUser } = useAuth();
    const { addToast } = useToast();
    
    const [prompt, setPrompt] = useState('');
    const [aspectRatio, setAspectRatio] = useState('16:9');
    const [numberOfImages, setNumberOfImages] = useState(1);
    const [isLoading, setIsLoading] = useState(false);
    const [generatedImages, setGeneratedImages] = useState<string[]>([]);
    
    const isPro = currentUser?.subscriptionTier === 'Pro';

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!prompt.trim()) {
            addToast('Please enter a prompt to generate an image.', 'error');
            return;
        }

        setIsLoading(true);
        setGeneratedImages([]);
        try {
            const images = await generateImages(prompt, numberOfImages, aspectRatio);
            setGeneratedImages(images);
            addToast(`Successfully generated ${images.length} image(s)!`, 'success');
        } catch (error: any) {
            addToast(error.message || 'Failed to generate images.', 'error');
        } finally {
            setIsLoading(false);
        }
    };
    
    const downloadImage = (base64Image: string, index: number) => {
        const link = document.createElement('a');
        link.href = `data:image/jpeg;base64,${base64Image}`;
        link.download = `thumbnail-${index + 1}.jpeg`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    if (!isPro) {
        return (
             <div className="text-center py-16 sm:py-24 animate-fade-in-up">
                <div className="mx-auto flex-shrink-0 flex items-center justify-center h-16 w-16 rounded-full bg-yellow-100 dark:bg-yellow-900/50">
                  <LockIcon className="h-9 w-9 text-yellow-500" />
                </div>
                <h1 className="mt-8 text-4xl font-extrabold tracking-tight text-gray-900 dark:text-white sm:text-5xl">
                  Unlock the AI Thumbnail Generator
                </h1>
                 <p className="mt-4 text-2xl font-semibold text-brand-secondary">
                  This is a Pro Feature
                </p>
                <p className="mt-4 max-w-2xl mx-auto text-lg text-gray-600 dark:text-gray-300">
                  Upgrade your plan to generate unlimited, high-quality, click-worthy thumbnails for your content in seconds.
                </p>
                <div className="mt-8">
                    <Link to="/dashboard" className="inline-flex items-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-white bg-brand-primary hover:bg-brand-dark transition-colors">
                        Upgrade to Pro
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto animate-fade-in-up">
            <div className="flex items-center space-x-3 mb-6">
                <SparklesIcon className="w-8 h-8 text-brand-secondary" />
                <h1 className="text-3xl font-bold">AI Thumbnail Generator</h1>
            </div>
            <p className="mb-6 text-gray-600 dark:text-gray-400">Describe the thumbnail you want to create. Be as descriptive as possible for the best results.</p>
        
            <form onSubmit={handleSubmit} className="p-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 space-y-4">
                <div>
                    <label htmlFor="prompt" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Prompt</label>
                    <textarea
                        id="prompt"
                        rows={3}
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        placeholder="e.g., Ultra-realistic photo of a shocked developer looking at a glowing computer screen with code, dramatic lighting."
                        className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-brand-secondary focus:border-brand-secondary"
                    />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                     <div>
                        <label htmlFor="aspectRatio" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Aspect Ratio</label>
                        <select
                            id="aspectRatio"
                            value={aspectRatio}
                            onChange={(e) => setAspectRatio(e.target.value)}
                            className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-brand-secondary focus:border-brand-secondary"
                        >
                            <option value="16:9">16:9 (YouTube Video)</option>
                            <option value="1:1">1:1 (Square)</option>
                            <option value="9:16">9:16 (Shorts/Reels)</option>
                             <option value="4:3">4:3 (Traditional)</option>
                            <option value="3:4">3:4 (Portrait)</option>
                        </select>
                    </div>
                    <div>
                        <label htmlFor="numberOfImages" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Number of Images</label>
                        <select
                            id="numberOfImages"
                            value={numberOfImages}
                            onChange={(e) => setNumberOfImages(parseInt(e.target.value, 10))}
                            className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-brand-secondary focus:border-brand-secondary"
                        >
                            <option value="1">1</option>
                            <option value="2">2</option>
                            <option value="4">4</option>
                        </select>
                    </div>
                </div>
                 <div className="pt-2">
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-brand-primary hover:bg-brand-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-secondary disabled:bg-gray-400 dark:disabled:bg-gray-600 disabled:cursor-not-allowed"
                    >
                        {isLoading ? 'Generating...' : 'Generate Thumbnails'}
                    </button>
                </div>
            </form>

            {isLoading && (
                 <div className="text-center p-8 mt-8 bg-gray-100 dark:bg-gray-800 rounded-lg">
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-brand-secondary mb-4"></div>
                    <p className="text-gray-700 dark:text-gray-300 font-semibold">AI is creating your images...</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">This may take a moment.</p>
                </div>
            )}

            {generatedImages.length > 0 && (
                <div className="mt-8">
                    <h2 className="text-2xl font-bold mb-4">Generated Images</h2>
                    <div className={`grid grid-cols-1 ${numberOfImages > 1 ? 'sm:grid-cols-2' : ''} gap-4`}>
                        {generatedImages.map((base64Image, index) => (
                            <div key={index} className="group relative">
                                <img
                                    src={`data:image/jpeg;base64,${base64Image}`}
                                    alt={`Generated Thumbnail ${index + 1}`}
                                    className="rounded-lg shadow-md w-full"
                                />
                                <button
                                    onClick={() => downloadImage(base64Image, index)}
                                    className="absolute bottom-2 right-2 bg-black bg-opacity-50 text-white text-xs px-3 py-1.5 rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                    Download
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default ThumbnailGenerator;