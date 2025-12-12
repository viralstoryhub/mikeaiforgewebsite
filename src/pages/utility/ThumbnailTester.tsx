import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { analyzeThumbnail, ThumbnailAnalysis } from '../../services/geminiService';
import { CameraIcon } from '../../components/icons/ExtraIcons';
import { CheckIcon, CloseIcon } from '../../components/icons/UtilityIcons';
import { useToast } from '../../contexts/ToastContext';
import { useAuth } from '../../contexts/AuthContext';

const FREE_TIER_LIMIT = 3;
const UTILITY_SLUG = 'thumbnail-tester';

const RatingScore: React.FC<{ label: string; score: number }> = ({ label, score }) => {
    const percentage = score * 10;
    return (
        <div>
            <div className="flex justify-between items-center mb-1">
                <h4 className="font-semibold text-gray-700 dark:text-gray-300">{label}</h4>
                <span className="font-bold text-lg text-brand-secondary">{score}/10</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
                <div className="bg-brand-secondary h-2.5 rounded-full" style={{ width: `${percentage}%` }}></div>
            </div>
        </div>
    );
};


const ThumbnailTester: React.FC = () => {
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imageBase64, setImageBase64] = useState<string | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [results, setResults] = useState<ThumbnailAnalysis | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const { addToast } = useToast();
    const auth = useAuth();
    
    const usage = auth?.currentUser?.utilityUsage?.[UTILITY_SLUG] || 0;
    const remainingUses = FREE_TIER_LIMIT - usage;
    const isFreeTier = auth?.currentUser?.subscriptionTier === 'Free';
    const limitReached = isFreeTier && remainingUses <= 0;

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 4 * 1024 * 1024) { // 4MB limit
                addToast('Image file is too large (max 4MB)', 'error');
                return;
            }
            setImageFile(file);
            setResults(null);
            setError(null);
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
        setResults(null);
        const fileInput = document.getElementById('thumbnail-upload') as HTMLInputElement;
        if(fileInput) fileInput.value = '';
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (limitReached) {
            addToast("You have reached your free limit for this utility.", 'error');
            return;
        }
        if (!imageBase64 || !imageFile) {
            setError('Please upload a thumbnail image first.');
            return;
        }

        setError(null);
        setIsLoading(true);
        setResults(null);
        try {
            const analysisResults = await analyzeThumbnail(imageBase64, imageFile.type);
            setResults(analysisResults);

            if (auth?.currentUser && auth.recordUtilityUsage) {
                await auth.recordUtilityUsage(UTILITY_SLUG);
            }
        } catch (err: any) {
            const errorMessage = err.message || 'An error occurred during analysis. Please try again.';
            setError(errorMessage);
            addToast(errorMessage, 'error');
        } finally {
            setIsLoading(false);
        }
    };
  
    return (
        <div className="max-w-4xl mx-auto animate-fade-in-up">
            <div className="flex items-center space-x-3 mb-6">
                <CameraIcon className="w-8 h-8 text-brand-secondary" />
                <h1 className="text-3xl font-bold">Interactive Thumbnail Tester</h1>
            </div>
            <p className="mb-6 text-gray-600 dark:text-gray-400">Upload a YouTube thumbnail draft to get AI-driven feedback on its effectiveness for attracting clicks.</p>
        
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Left Column: Upload & Preview */}
                <div className="space-y-4">
                     <div className="p-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                        {imagePreview ? (
                            <div className="space-y-4">
                                <div className="relative aspect-video">
                                    <img src={imagePreview} alt="Thumbnail Preview" className="w-full h-full object-cover rounded-md" />
                                     <button onClick={removeImage} type="button" className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600">
                                        <CloseIcon className="w-4 h-4" />
                                    </button>
                                </div>
                                <form onSubmit={handleSubmit}>
                                    {isFreeTier && (
                                      <div className="text-sm text-center text-gray-500 dark:text-gray-400 my-4">
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
                                        disabled={isLoading || limitReached}
                                        className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-brand-primary hover:bg-brand-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-secondary disabled:bg-gray-400 dark:disabled:bg-gray-600 disabled:cursor-not-allowed"
                                    >
                                        {isLoading ? 'Analyzing...' : 'Analyze Thumbnail'}
                                    </button>
                                </form>
                            </div>
                        ) : (
                             <div className="flex justify-center items-center w-full">
                                <label htmlFor="thumbnail-upload" className="flex flex-col items-center justify-center w-full h-64 border-2 border-gray-300 dark:border-gray-600 border-dashed rounded-lg cursor-pointer bg-gray-50 dark:hover:bg-bray-800 dark:bg-gray-700 hover:bg-gray-100 dark:hover:border-gray-500 dark:hover:bg-gray-600">
                                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                        <svg className="w-8 h-8 mb-4 text-gray-500 dark:text-gray-400" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 16"><path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2"/></svg>
                                        <p className="mb-2 text-sm text-gray-500 dark:text-gray-400"><span className="font-semibold">Click to upload</span> or drag and drop</p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">PNG, JPG, WEBP (MAX. 4MB)</p>
                                    </div>
                                    <input id="thumbnail-upload" type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                                </label>
                            </div> 
                        )}
                    </div>
                </div>

                {/* Right Column: Results */}
                <div className="p-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                    <h2 className="text-xl font-bold mb-4">AI Analysis</h2>
                    {isLoading && (
                        <div className="text-center py-10">
                            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-brand-secondary mb-4"></div>
                            <p className="text-gray-700 dark:text-gray-300 font-semibold">AI is analyzing your thumbnail...</p>
                        </div>
                    )}
                    {error && <p className="text-red-500 text-sm text-center">{error}</p>}
                    {!isLoading && !results && !error && (
                        <div className="text-center py-10 text-gray-500 dark:text-gray-400">
                            <p>Upload a thumbnail to see the AI analysis here.</p>
                        </div>
                    )}
                    {results && (
                        <div className="space-y-6 animate-fade-in-up">
                            <div>
                                <h3 className="text-lg font-bold text-center mb-2">Overall Score</h3>
                                <div className="text-6xl font-extrabold text-center text-brand-primary dark:text-brand-light">{results.overallScore}<span className="text-3xl text-gray-400 dark:text-gray-500">/10</span></div>
                            </div>
                            <div className="space-y-4">
                                <RatingScore label="Clarity" score={results.clarity} />
                                <RatingScore label="Emotional Impact" score={results.emotionalImpact} />
                                <RatingScore label="Text Readability" score={results.textReadability} />
                            </div>
                             <div>
                                <h3 className="text-lg font-bold mb-2">Suggestions for Improvement</h3>
                                <ul className="space-y-2">
                                    {results.suggestions.map((suggestion, index) => (
                                        <li key={index} className="flex items-start">
                                            <CheckIcon className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                                            <span className="ml-2 text-gray-700 dark:text-gray-300">{suggestion}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ThumbnailTester;
