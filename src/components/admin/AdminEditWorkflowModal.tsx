import React, { useState } from 'react';
import { Workflow } from '../../types';

interface AdminEditWorkflowModalProps {
    workflow: Workflow | null;
    onClose: () => void;
    onSave: (workflowData: Partial<Workflow>) => Promise<void>;
}

const AdminEditWorkflowModal: React.FC<AdminEditWorkflowModalProps> = ({ workflow, onClose, onSave }) => {
    const [formData, setFormData] = useState<Partial<Workflow>>(workflow || {
        name: '', slug: '', description: '', services: [], deploymentUrl: ''
    });
    const [isSaving, setIsSaving] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };
    
    const handleServicesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const { value } = e.target;
        setFormData(prev => ({ ...prev, services: value.split(',').map(s => s.trim()) }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        const dataToSave = { ...formData };
        if (!dataToSave.slug && dataToSave.name) {
            dataToSave.slug = dataToSave.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
        }
        await onSave(dataToSave);
        setIsSaving(false);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-lg m-4">
                <form onSubmit={handleSubmit}>
                    <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                        <h3 className="text-xl font-bold">{workflow ? 'Edit Workflow' : 'Create New Workflow'}</h3>
                    </div>
                    <div className="p-6 space-y-4">
                        <input name="name" value={formData.name} onChange={handleChange} placeholder="Name" className="input-field" required />
                        <input name="slug" value={formData.slug} onChange={handleChange} placeholder="Slug (auto-generates if empty)" className="input-field" />
                        <textarea name="description" value={formData.description} onChange={handleChange} placeholder="Description" className="input-field" rows={3} required />
                        <textarea name="services" value={formData.services?.join(', ')} onChange={handleServicesChange} placeholder="Services (comma-separated)" className="input-field" rows={2} />
                        <input name="deploymentUrl" value={formData.deploymentUrl} onChange={handleChange} placeholder="Deployment URL" className="input-field" type="url" />
                    </div>
                    <div className="p-4 bg-gray-50 dark:bg-gray-900/50 flex justify-end space-x-3 rounded-b-lg">
                        <button type="button" onClick={onClose} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">
                            Cancel
                        </button>
                        <button type="submit" disabled={isSaving} className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-brand-primary hover:bg-brand-dark disabled:bg-gray-400">
                            {isSaving ? 'Saving...' : 'Save Workflow'}
                        </button>
                    </div>
                </form>
                <style>{`.input-field { display: block; width: 100%; padding: 0.5rem 0.75rem; background-color: white; border: 1px solid #d1d5db; border-radius: 0.375rem; box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05); } .dark .input-field { background-color: #374151; border-color: #4b5563; }`}</style>
            </div>
        </div>
    );
};

export default AdminEditWorkflowModal;