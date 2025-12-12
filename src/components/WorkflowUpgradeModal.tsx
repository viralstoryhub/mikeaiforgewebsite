import React from 'react';
import { LockIcon } from './icons/UtilityIcons';
import { Link } from 'react-router-dom';
import type { Workflow } from '../types';

interface WorkflowUpgradeModalProps {
  onClose: () => void;
  workflow: Workflow;
}

const WorkflowUpgradeModal: React.FC<WorkflowUpgradeModalProps> = ({ onClose, workflow }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center animate-fade-in-up" style={{ animationDuration: '0.3s' }}>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md m-4 p-8 text-center">
        <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-yellow-100 dark:bg-yellow-900/50">
          <LockIcon className="h-6 w-6 text-yellow-500" />
        </div>
        <h3 className="text-2xl font-bold mt-4">Pro Feature Locked</h3>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Deploying the <strong>{workflow.name}</strong> workflow is a benefit of the Pro plan.
        </p>
        <p className="mt-4 text-gray-600 dark:text-gray-400">
          Upgrade to a Pro plan to get one-click deployment for all workflows, unlimited utility access, and the full power of the Content Studio.
        </p>
        <div className="mt-6 flex flex-col sm:flex-row gap-3">
          <button onClick={onClose} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">
            Maybe Later
          </button>
          <Link to="/dashboard" onClick={onClose} className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-brand-primary hover:bg-brand-dark">
            Upgrade to Pro
          </Link>
        </div>
      </div>
    </div>
  );
};

export default WorkflowUpgradeModal;