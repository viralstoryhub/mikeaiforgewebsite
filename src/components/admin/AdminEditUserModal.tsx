import React, { useState } from 'react';
import { User } from '../../types';
import { useToast } from '../../contexts/ToastContext';

interface AdminEditUserModalProps {
    user: User;
    onClose: () => void;
    onSave: (userId: string, updates: Partial<User>) => Promise<void>;
}

const AdminEditUserModal: React.FC<AdminEditUserModalProps> = ({ user, onClose, onSave }) => {
    const [role, setRole] = useState(user.role);
    const [subscriptionTier, setSubscriptionTier] = useState(user.subscriptionTier);
    const [isSaving, setIsSaving] = useState(false);
    const { addToast } = useToast();

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        const updates: Partial<User> = { role, subscriptionTier };
        await onSave(user.id, updates);
        setIsSaving(false);
    };

    const handleResetUsage = async () => {
        if (window.confirm(`Are you sure you want to reset all utility usage for ${user.name || user.email}?`)) {
            setIsSaving(true);
            await onSave(user.id, { utilityUsage: {} });
            addToast("Utility usage has been reset.", "success");
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-lg m-4">
                <form onSubmit={handleSave}>
                    <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                        <h3 className="text-xl font-bold">Edit User: {user.name || user.email}</h3>
                    </div>
                    <div className="p-6 space-y-4">
                        <div>
                            <label htmlFor="role" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Role</label>
                            <select
                                id="role"
                                value={role}
                                onChange={e => setRole(e.target.value as 'User' | 'Admin')}
                                className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-brand-secondary focus:border-brand-secondary"
                            >
                                <option value="User">User</option>
                                <option value="Admin">Admin</option>
                            </select>
                        </div>
                        <div>
                            <label htmlFor="subscriptionTier" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Subscription Tier</label>
                            <select
                                id="subscriptionTier"
                                value={subscriptionTier}
                                onChange={e => setSubscriptionTier(e.target.value as 'Free' | 'Pro')}
                                className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-brand-secondary focus:border-brand-secondary"
                            >
                                <option value="Free">Free</option>
                                <option value="Pro">Pro</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Utility Usage</label>
                            <button
                                type="button"
                                onClick={handleResetUsage}
                                className="mt-1 px-4 py-2 border border-red-300 dark:border-red-600 text-red-700 dark:text-red-300 rounded-md text-sm font-medium hover:bg-red-50 dark:hover:bg-red-900/50"
                            >
                                Reset Usage for this Month
                            </button>
                        </div>
                    </div>
                    <div className="p-4 bg-gray-50 dark:bg-gray-900/50 flex justify-end space-x-3 rounded-b-lg">
                        <button type="button" onClick={onClose} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">
                            Cancel
                        </button>
                        <button type="submit" disabled={isSaving} className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-brand-primary hover:bg-brand-dark disabled:bg-gray-400">
                            {isSaving ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AdminEditUserModal;