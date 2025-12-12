import React, { useState } from 'react';
import { Tool } from '../../types';

interface AdminEditToolModalProps {
    tool: Tool | null;
    onClose: () => void;
    onSave: (toolData: Partial<Tool>) => Promise<void>;
}

const AdminEditToolModal: React.FC<AdminEditToolModalProps> = ({ tool, onClose, onSave }) => {
    const [formData, setFormData] = useState<Partial<Tool>>(tool || {
        name: '', slug: '', summary: '', websiteUrl: '', logoUrl: 'https://picsum.photos/seed/new/100',
        pricingModel: 'Freemium', freeTier: true, rating: 4.5, verdict: '', pros: [], cons: [],
        bestFor: '', quickstart: [], categories: [], tags: []
    });
    const [isSaving, setIsSaving] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        if (type === 'checkbox') {
            const checked = (e.target as HTMLInputElement).checked;
            setFormData(prev => ({ ...prev, [name]: checked }));
        } else if (type === 'number') {
             setFormData(prev => ({ ...prev, [name]: parseFloat(value) }));
        }
        else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };
    
    const handleArrayChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value.split('\n') }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        // Auto-generate slug from name if it's a new tool or slug is empty
        const dataToSave = { ...formData };
        if (!dataToSave.slug && dataToSave.name) {
            dataToSave.slug = dataToSave.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
        }
        await onSave(dataToSave);
        setIsSaving(false);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl m-4 max-h-[90vh] flex flex-col">
                <form onSubmit={handleSubmit} className="flex flex-col h-full">
                    <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                        <h3 className="text-xl font-bold">{tool ? 'Edit Tool' : 'Create New Tool'}</h3>
                    </div>
                    <div className="p-6 space-y-4 overflow-y-auto">
                        {/* Simple text inputs */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <input name="name" value={formData.name} onChange={handleChange} placeholder="Name" className="input-field" required />
                            <input name="slug" value={formData.slug} onChange={handleChange} placeholder="Slug (auto-generates if empty)" className="input-field" />
                            <input name="websiteUrl" value={formData.websiteUrl} onChange={handleChange} placeholder="Website URL" className="input-field" type="url" required/>
                            <input name="logoUrl" value={formData.logoUrl} onChange={handleChange} placeholder="Logo URL" className="input-field" type="url" />
                             <input name="youtubeReviewId" value={formData.youtubeReviewId} onChange={handleChange} placeholder="YouTube Review ID" className="input-field" />
                        </div>

                        <textarea name="summary" value={formData.summary} onChange={handleChange} placeholder="Summary" className="input-field" rows={2} required />
                        <textarea name="verdict" value={formData.verdict} onChange={handleChange} placeholder="Mike's Verdict" className="input-field" rows={2} />

                        {/* Dropdown and number inputs */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <select name="pricingModel" value={formData.pricingModel} onChange={handleChange} className="input-field">
                                <option value="Freemium">Freemium</option>
                                <option value="Paid">Paid</option>
                                <option value="Free">Free</option>
                                <option value="Usage-based">Usage-based</option>
                            </select>
                            <input name="rating" value={formData.rating} onChange={handleChange} placeholder="Rating (0-5)" type="number" step="0.1" min="0" max="5" className="input-field" required />
                             <div className="flex items-center">
                                <input id="freeTier" name="freeTier" checked={formData.freeTier} onChange={handleChange} type="checkbox" className="h-4 w-4 text-brand-secondary rounded focus:ring-brand-secondary" />
                                <label htmlFor="freeTier" className="ml-2 block text-sm text-gray-900 dark:text-gray-300">Has Free Tier</label>
                            </div>
                        </div>

                         <textarea name="bestFor" value={formData.bestFor} onChange={handleChange} placeholder="Best For..." className="input-field" rows={2} />

                        {/* Array inputs */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <textarea name="pros" value={formData.pros?.join('\n')} onChange={handleArrayChange} placeholder="Pros (one per line)" className="input-field" rows={4} />
                            <textarea name="cons" value={formData.cons?.join('\n')} onChange={handleArrayChange} placeholder="Cons (one per line)" className="input-field" rows={4} />
                            <textarea name="quickstart" value={formData.quickstart?.join('\n')} onChange={handleArrayChange} placeholder="Quickstart Guide (one step per line)" className="input-field" rows={4} />
                            <textarea name="categories" value={formData.categories?.join('\n')} onChange={handleArrayChange} placeholder="Categories (one per line)" className="input-field" rows={4} />
                             <textarea name="tags" value={formData.tags?.join('\n')} onChange={handleArrayChange} placeholder="Tags (one per line)" className="input-field" rows={4} />
                        </div>
                    </div>
                    <div className="p-4 bg-gray-50 dark:bg-gray-900/50 flex justify-end space-x-3 rounded-b-lg mt-auto">
                        <button type="button" onClick={onClose} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">
                            Cancel
                        </button>
                        <button type="submit" disabled={isSaving} className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-brand-primary hover:bg-brand-dark disabled:bg-gray-400">
                            {isSaving ? 'Saving...' : 'Save Tool'}
                        </button>
                    </div>
                </form>
                <style>{`.input-field { display: block; width: 100%; padding: 0.5rem 0.75rem; background-color: white; border: 1px solid #d1d5db; border-radius: 0.375rem; box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05); } .dark .input-field { background-color: #374151; border-color: #4b5563; }`}</style>
            </div>
        </div>
    );
};

export default AdminEditToolModal;