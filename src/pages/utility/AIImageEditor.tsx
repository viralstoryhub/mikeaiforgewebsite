import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { editImage, EditedImageResponse } from '../../services/geminiService';
import { WandIcon } from '../../components/icons/ExtraIcons';
import { LockIcon } from '../../components/icons/UtilityIcons';

const AIImageEditor: React.FC = () => {
    const { currentUser } = useAuth();
    const { addToast } = useToast();

    const [originalImage, setOriginalImage] = useState<{ file: File; preview: string; base64: string } | null>(null);
    const [editedImage, setEditedImage] = useState<{ preview: string; base64: string } | null>(null);
    const [textResponse, setTextResponse] = useState<string | null>(null);
    const [prompt, setPrompt] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    
    const isPro = currentUser?.subscriptionTier === 'Pro';

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 4 * 1024 * 1024) { // 4MB limit
                addToast('Image file is too large (max 4MB)', 'error');
                return;
            }
            const reader = new FileReader();
            reader.onloadend = () => {
                const result = reader.result as string;
                setOriginalImage({ file, preview: result, base64: result.split(',')[1] });
                setEditedImage(null); // Clear previous edit
                setTextResponse(null);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!originalImage) {
            addToast('Please upload an image first.', 'error');
            return;
        }
        if (!prompt.trim()) {
            addToast('Please enter an editing prompt.', 'error');
            return;
        }

        setIsLoading(true);
        setEditedImage(null);
        setTextResponse(null);

        try {
            const result: EditedImageResponse = await editImage(originalImage.base64, originalImage.file.type, prompt);
            if (result.newImageBase64) {
                 setEditedImage({
                    preview: `data:${originalImage.file.type};base64,${result.newImageBase64}`,
                    base64: result.newImageBase64
                });
            }
            if (result.textResponse) {
                setTextResponse(result.textResponse);
            }
            addToast('Image edited successfully!', 'success');
        } catch (err: any) {
            addToast(err.message || 'Failed to edit image.', 'error');
        } finally {
            setIsLoading(false);
        }
    };
    
    const useEditedImage = () => {
        if (editedImage && originalImage) {
            setOriginalImage({ ...originalImage, preview: editedImage.preview, base64: editedImage.base64 });
            setEditedImage(null);
            setTextResponse(null);
            setPrompt('');
        }
    };

    if (!isPro) {
        return (
             <div className="text-center py-16 sm:py-24 animate-fade-in-up">
                <div className="mx-auto flex-shrink-0 flex items-center justify-center h-16 w-16 rounded-full bg-yellow-100 dark:bg-yellow-900/50">
                  <LockIcon className="h-9 w-9 text-yellow-500" />
                </div>
                <h1 className="mt-8 text-4xl font-extrabold tracking-tight text-gray-900 dark:text-white sm:text-5xl">
                  Unlock the AI Image Editor
                </h1>
                 <p className="mt-4 text-2xl font-semibold text-brand-secondary">
                  This is a Pro Feature
                </p>
                <p className="mt-4 max-w-2xl mx-auto text-lg text-gray-600 dark:text-gray-300">
                  Upgrade your plan to edit images with text prompts, creating the perfect visuals for your content in seconds.
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
        <div className="max-w-5xl mx-auto animate-fade-in-up">
            <div className="flex items-center space-x-3 mb-6">
                <WandIcon className="w-8 h-8 text-brand-secondary" />
                <h1 className="text-3xl font-bold">AI Image Editor</h1>
            </div>
            <p className="mb-6 text-gray-600 dark:text-gray-400">Upload an image and tell the AI what you want to change. Edit iteratively until you have the perfect picture.</p>
        
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
                {!originalImage ? (
                     <div className="flex justify-center items-center w-full">
                        <label htmlFor="image-upload" className="flex flex-col items-center justify-center w-full h-64 border-2 border-gray-300 dark:border-gray-600 border-dashed rounded-lg cursor-pointer bg-gray-50 dark:hover:bg-bray-800 dark:bg-gray-700 hover:bg-gray-100 dark:hover:border-gray-500 dark:hover:bg-gray-600">
                            <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                <svg className="w-8 h-8 mb-4 text-gray-500 dark:text-gray-400" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 16"><path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2"/></svg>
                                <p className="mb-2 text-sm text-gray-500 dark:text-gray-400"><span className="font-semibold">Click to upload an image</span></p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">PNG, JPG, WEBP (MAX. 4MB)</p>
                            </div>
                            <input id="image-upload" type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                        </label>
                    </div>
                ) : (
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                            <div className="text-center">
                                <h3 className="text-lg font-semibold mb-2">Before</h3>
                                <img src={originalImage.preview} alt="Original" className="rounded-lg shadow-md aspect-video object-contain" />
                                 <button onClick={() => setOriginalImage(null)} className="mt-2 text-sm text-gray-500 hover:underline">Change image</button>
                            </div>
                            <div className="text-center">
                                <h3 className="text-lg font-semibold mb-2">After</h3>
                                <div className="rounded-lg shadow-md aspect-video bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                                    {isLoading ? (
                                        <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-brand-secondary"></div>
                                    ) : editedImage ? (
                                        <img src={editedImage.preview} alt="Edited" className="rounded-lg aspect-video object-contain" />
                                    ) : (
                                        <p className="text-gray-500 text-sm">Your edited image will appear here</p>
                                    )}
                                </div>
                                {editedImage && (
                                    <div className="mt-2 flex gap-2 justify-center">
                                        <button onClick={useEditedImage} className="text-sm py-1 px-3 bg-blue-100 text-blue-800 rounded-full hover:bg-blue-200">Use this image</button>
                                        <a href={editedImage.preview} download={`edited-${originalImage.file.name}`} className="text-sm py-1 px-3 bg-green-100 text-green-800 rounded-full hover:bg-green-200">Download</a>
                                    </div>
                                )}
                            </div>
                        </div>

                        {textResponse && (
                            <p className="p-3 bg-blue-50 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 rounded-md text-sm text-center">{textResponse}</p>
                        )}
                        
                        <form onSubmit={handleSubmit} className="space-y-4">
                             <div>
                                <label htmlFor="prompt" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Editing Prompt</label>
                                <input
                                    type="text"
                                    id="prompt"
                                    value={prompt}
                                    onChange={(e) => setPrompt(e.target.value)}
                                    placeholder="e.g., add a party hat on the cat"
                                    className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-brand-secondary focus:border-brand-secondary"
                                />
                            </div>
                            <button
                              type="submit"
                              disabled={isLoading}
                              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-brand-primary hover:bg-brand-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-secondary disabled:bg-gray-400 dark:disabled:bg-gray-600 disabled:cursor-not-allowed"
                            >
                              {isLoading ? 'Editing...' : 'Generate Edit'}
                            </button>
                        </form>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AIImageEditor;