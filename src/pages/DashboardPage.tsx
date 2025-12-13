
import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { User } from '../types';
import { ProfileIcon, BillingIcon, EditIcon, UserIcon, BookmarkIcon, LightningIcon } from '../components/icons/UtilityIcons';
import { useToast } from '../contexts/ToastContext';
import { useData } from '../contexts/DataContext';
import { UTILITIES_DATA } from '../constants';
import { Link } from 'react-router-dom';
import SubscriptionModal from '../components/SubscriptionModal';
import PersonasTab from '../components/dashboard/PersonasTab';
import { PersonaIcon } from '../components/icons/ExtraIcons';

const FREE_TIER_LIMIT = 3;

// --- Edit Profile Modal Component ---
interface EditProfileModalProps {
    user: User;
    onClose: () => void;
    onSave: (updates: Partial<User>) => Promise<void>;
}

const EditProfileModal: React.FC<EditProfileModalProps> = ({ user, onClose, onSave }) => {
    const [bio, setBio] = useState(user.bio || '');
    const [profilePictureFile, setProfilePictureFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(user.profilePictureUrl || null);
    const [isSaving, setIsSaving] = useState(false);
    const { addToast } = useToast();

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 2 * 1024 * 1024) {
                addToast('Image file is too large (max 2MB)', 'error');
                return;
            }
            setProfilePictureFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setPreviewUrl(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        const updates: Partial<User> = { bio };

        if (profilePictureFile && previewUrl) {
            updates.profilePictureUrl = previewUrl;
        }

        try {
            await onSave(updates);
            addToast('Profile updated successfully!', 'success');
            onClose();
        } catch (error) {
            console.error("Failed to save profile:", error);
            addToast('Failed to save profile', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center animate-fade-in-up" style={{ animationDuration: '0.3s' }}>
            <div className="bg-dark-secondary rounded-lg shadow-xl w-full max-w-lg m-4">
                <form onSubmit={handleSubmit}>
                    <div className="p-6 border-b border-border-dark">
                        <h3 className="text-xl font-bold text-light-primary">Edit Profile</h3>
                    </div>
                    <div className="p-6 space-y-6">
                        <div className="flex items-center space-x-4">
                            {previewUrl ? (
                                <img src={previewUrl} alt="Profile Preview" className="w-20 h-20 rounded-full object-cover" />
                            ) : (
                                <div className="w-20 h-20 rounded-full bg-gray-700 flex items-center justify-center">
                                    <UserIcon className="w-10 h-10 text-gray-500" />
                                </div>
                            )}
                            <div>
                                <label htmlFor="profile-picture-upload" className="cursor-pointer px-4 py-2 border border-border-dark rounded-md text-sm font-medium text-light-secondary bg-dark-secondary hover:bg-dark-primary">
                                    Change Picture
                                </label>
                                <input id="profile-picture-upload" type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-400">Name</label>
                            <p className="mt-1 text-light-secondary">{user.name}</p>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-400">Email</label>
                            <p className="mt-1 text-light-secondary">{user.email}</p>
                        </div>
                        <div>
                            <label htmlFor="bio" className="block text-sm font-medium text-light-secondary">Bio</label>
                            <textarea
                                id="bio"
                                rows={3}
                                value={bio}
                                onChange={(e) => setBio(e.target.value)}
                                className="mt-1 block w-full px-3 py-2 bg-dark-primary border border-border-dark rounded-md shadow-sm focus:outline-none focus:ring-brand-primary focus:border-brand-primary text-light-primary"
                                placeholder="Tell us a little about yourself"
                            />
                        </div>
                    </div>
                    <div className="p-4 bg-dark-primary/50 flex justify-end space-x-3 rounded-b-lg">
                        <button type="button" onClick={onClose} className="px-4 py-2 border border-border-dark rounded-md text-sm font-medium text-light-secondary hover:bg-dark-primary">
                            Cancel
                        </button>
                        <button type="submit" disabled={isSaving} className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-brand-primary hover:opacity-90 disabled:bg-gray-600">
                            {isSaving ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};


// --- Main Dashboard Page Component ---
const DashboardPage: React.FC = () => {
    const { currentUser, updateUser } = useAuth()!;
    const { tools } = useData();
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isSubModalOpen, setIsSubModalOpen] = useState(false);

    if (!currentUser) {
        return <div>Loading user data...</div>;
    }

    const handleSaveProfile = async (updates: Partial<User>) => {
        if (updateUser) {
            await updateUser(updates);
        }
    };

    const handleUpgradeSuccess = () => {
        setIsSubModalOpen(false);
    }

    const savedToolsList = tools.filter(tool => currentUser.savedTools?.includes(tool.id));

    return (
        <div className="max-w-7xl mx-auto animate-fade-in-up space-y-8">
            {isEditModalOpen && (
                <EditProfileModal user={currentUser} onClose={() => setIsEditModalOpen(false)} onSave={handleSaveProfile} />
            )}
            {isSubModalOpen && (
                <SubscriptionModal onClose={() => setIsSubModalOpen(false)} onUpgradeSuccess={handleUpgradeSuccess} />
            )}

            <div className="mb-8">
                <h1 className="text-3xl font-extrabold text-light-primary">My Dashboard</h1>
                <p className="mt-1 text-lg text-light-secondary">Manage your profile and settings.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column */}
                <div className="lg:col-span-1 space-y-8">
                    {/* Profile Card */}
                    <div className="bg-dark-secondary rounded-lg border border-border-dark shadow-sm p-6 text-center">
                        {currentUser.profilePictureUrl ? (
                            <img src={currentUser.profilePictureUrl} alt="Profile" className="w-32 h-32 rounded-full object-cover mx-auto mb-4 border-4 border-gray-700 shadow-md" />
                        ) : (
                            <div className="w-32 h-32 rounded-full bg-gray-700 flex items-center justify-center mx-auto mb-4 border-4 border-gray-700 shadow-md">
                                <UserIcon className="w-16 h-16 text-gray-500" />
                            </div>
                        )}
                        <h2 className="text-2xl font-bold text-light-primary">{currentUser.name || 'User'}</h2>
                        <p className="text-sm text-gray-400">{currentUser.email}</p>
                        <p className="mt-3 text-sm text-gray-300">{currentUser.bio}</p>
                        <button onClick={() => setIsEditModalOpen(true)} className="mt-4 w-full flex items-center justify-center py-2 px-4 border border-border-dark rounded-md shadow-sm text-sm font-medium text-gray-200 bg-dark-secondary hover:bg-dark-primary">
                            <EditIcon className="w-4 h-4 mr-2" />
                            Edit Profile
                        </button>
                    </div>

                    <div className="bg-dark-secondary rounded-lg border border-border-dark shadow-sm">
                        <div className="p-4 border-b border-border-dark flex items-center space-x-3">
                            <svg className="w-6 h-6 text-brand-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4M17 3v4m-2-2h4m2 10v4m-2-2h4M5 11h14a2 2 0 012 2v2a2 2 0 01-2 2H5a2 2 0 01-2-2v-2a2 2 0 012-2z" /></svg>
                            <h3 className="text-lg font-bold text-light-primary">Membership Plan</h3>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <p className="text-sm font-medium text-gray-400">Current Plan</p>
                                <p className={`text-2xl font-bold ${currentUser.subscriptionTier?.toLowerCase() === 'pro' ? 'text-green-500' : 'text-brand-primary'}`}>{currentUser.subscriptionTier} Tier</p>
                            </div>
                            {currentUser.subscriptionTier?.toLowerCase() === 'free' ? (
                                <button onClick={() => setIsSubModalOpen(true)} className="w-full mt-2 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-brand-primary hover:opacity-90">
                                    Upgrade to Pro
                                </button>
                            ) : (
                                <div className="p-3 bg-green-900/30 text-green-200 rounded-md text-center text-sm">
                                    You have full access to all features!
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="bg-dark-secondary rounded-lg border border-border-dark shadow-sm">
                        <div className="p-4 border-b border-border-dark flex items-center space-x-3">
                            <LightningIcon className="w-6 h-6 text-brand-primary" />
                            <h3 className="text-lg font-bold text-light-primary">Utility Usage</h3>
                        </div>
                        <div className="p-6">
                            {currentUser.subscriptionTier?.toLowerCase() === 'pro' ? (
                                <p className="text-center text-gray-300">You have unlimited access to all utilities! ✨</p>
                            ) : (
                                <ul className="space-y-4">
                                    {UTILITIES_DATA.map(utility => {
                                        const usage = currentUser.utilityUsage?.[utility.slug] || 0;
                                        const percentage = Math.min((usage / FREE_TIER_LIMIT) * 100, 100);
                                        return (
                                            <li key={utility.id}>
                                                <div className="flex justify-between items-center mb-1">
                                                    <span className="text-sm font-medium text-light-secondary">{utility.name}</span>
                                                    <span className="text-sm text-gray-400">{usage} / {FREE_TIER_LIMIT}</span>
                                                </div>
                                                <div className="w-full bg-gray-700 rounded-full h-2.5">
                                                    <div className="bg-brand-primary h-2.5 rounded-full" style={{ width: `${percentage}%` }}></div>
                                                </div>
                                            </li>
                                        );
                                    })}
                                </ul>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right Column */}
                <div className="lg:col-span-2 space-y-8">
                    <div className="bg-dark-secondary rounded-lg border border-border-dark shadow-sm">
                        <div className="p-4 border-b border-border-dark flex items-center space-x-3">
                            <PersonaIcon className="w-6 h-6 text-brand-primary" />
                            <h3 className="text-lg font-bold text-light-primary">My AI Personas</h3>
                        </div>
                        <div className="p-6">
                            <PersonasTab />
                        </div>
                    </div>
                    <div className="bg-dark-secondary rounded-lg border border-border-dark shadow-sm">
                        <div className="p-4 border-b border-border-dark flex items-center space-x-3">
                            <BookmarkIcon className="w-6 h-6 text-brand-primary" />
                            <h3 className="text-lg font-bold text-light-primary">My Saved Tools</h3>
                        </div>
                        <div className="p-6">
                            {savedToolsList.length > 0 ? (
                                <ul className="space-y-3">
                                    {savedToolsList.map(tool => (
                                        <li key={tool.id}>
                                            <Link to={`/tools/${tool.slug}`} className="flex items-center space-x-3 p-3 rounded-md hover:bg-dark-primary/50">
                                                <img src={tool.logoUrl} alt={tool.name} className="w-10 h-10 rounded-md" />
                                                <div>
                                                    <p className="font-semibold text-light-primary">{tool.name}</p>
                                                    <p className="text-sm text-gray-400">{tool.summary}</p>
                                                </div>
                                            </Link>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="text-gray-400 text-center py-4">
                                    You haven't saved any tools yet.
                                    <Link to="/tools" className="text-brand-primary font-semibold hover:underline ml-1">Browse the directory</Link> to find your favorites!
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DashboardPage;
