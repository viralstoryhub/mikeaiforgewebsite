import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { CheckIcon } from './icons/UtilityIcons';

interface SubscriptionModalProps {
  onClose: () => void;
  onUpgradeSuccess: () => void;
}

const proBenefits = [
  "Unlimited access to all utility tools",
  "Full access to the Content Automation Studio",
  "One-click deployment from the Workflow Vault",
  "Priority access to new features",
];

const SubscriptionModal: React.FC<SubscriptionModalProps> = ({ onClose, onUpgradeSuccess }) => {
  const [isLoading, setIsLoading] = useState(false);
  const { upgradeSubscription } = useAuth()!;
  const { addToast } = useToast();

  const handleUpgrade = async () => {
    setIsLoading(true);
    try {
      await upgradeSubscription();
      addToast('Upgrade successful! Welcome to the Pro plan.', 'success');
      onUpgradeSuccess();
    } catch (error: any) {
      addToast(error.message || 'Failed to upgrade subscription.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center animate-fade-in-up" style={{ animationDuration: '0.3s' }}>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-lg m-4">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <h3 className="text-2xl font-bold">Upgrade to Pro</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <div className="p-8">
            <p className="text-center text-4xl font-extrabold mb-2">$19<span className="text-base font-medium text-gray-500 dark:text-gray-400">/month</span></p>
            <p className="text-center text-gray-600 dark:text-gray-400 mb-6">Unlock the full power of the AI Forge.</p>

            <ul className="space-y-3 mb-8">
                {proBenefits.map((benefit, index) => (
                    <li key={index} className="flex items-start">
                        {/* Fix: Add className for styling to the shared CheckIcon component. */}
                        <CheckIcon className="w-5 h-5 text-green-500 flex-shrink-0" />
                        <span className="ml-2 text-gray-700 dark:text-gray-300">{benefit}</span>
                    </li>
                ))}
            </ul>
            
            <button
              onClick={handleUpgrade}
              disabled={isLoading}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-lg font-medium text-white bg-brand-primary hover:bg-brand-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-secondary disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Processing...' : 'Proceed to Checkout'}
            </button>
            <p className="text-xs text-center text-gray-500 dark:text-gray-400 mt-3">This is a simulation. No real payment will be processed.</p>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionModal;