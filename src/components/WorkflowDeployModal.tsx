import React, { useState, useEffect } from 'react';
import type { Workflow } from '../types';
import { CheckIcon } from './icons/UtilityIcons';

interface WorkflowDeployModalProps {
  workflow: Workflow;
  onClose: () => void;
}

const SpinnerIcon: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
    <svg className={`animate-spin ${className}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

const WorkflowDeployModal: React.FC<WorkflowDeployModalProps> = ({ workflow, onClose }) => {
    const [step, setStep] = useState(0);
    const [isDeployed, setIsDeployed] = useState(false);

    const automationProvider = workflow.services.find(s => s.toLowerCase() === 'make' || s.toLowerCase() === 'zapier') || 'automation provider';
    const deploymentSteps = [
        'Initializing deployment...',
        `Connecting to ${automationProvider}...`,
        'Creating new scenario...',
        'Deployment successful!'
    ];

    useEffect(() => {
        if (step < deploymentSteps.length - 1) {
            const timer = setTimeout(() => {
                setStep(s => s + 1);
            }, 1200);
            return () => clearTimeout(timer);
        } else if (!isDeployed) {
            const finalTimer = setTimeout(() => {
                setIsDeployed(true);
            }, 1200);
            return () => clearTimeout(finalTimer);
        }
    }, [step, isDeployed, deploymentSteps.length]);

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center animate-fade-in-up" style={{ animationDuration: '0.3s' }}>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md m-4">
                <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                    <h3 className="text-xl font-bold">Deploying: {workflow.name}</h3>
                </div>
                <div className="p-8">
                    {!isDeployed ? (
                        <ul className="space-y-4">
                            {deploymentSteps.map((stepName, index) => (
                                <li key={index} className="flex items-center space-x-3">
                                    <div className="flex-shrink-0 w-6 h-6 flex items-center justify-center">
                                        {step > index ? (
                                            <CheckIcon className="w-6 h-6 text-green-500" />
                                        ) : step === index ? (
                                            <SpinnerIcon className="w-5 h-5 text-brand-secondary" />
                                        ) : (
                                            <div className="w-5 h-5 border-2 border-gray-300 dark:border-gray-600 rounded-full"></div>
                                        )}
                                    </div>
                                    <span className={`text-sm ${step >= index ? 'font-semibold text-gray-800 dark:text-gray-200' : 'text-gray-500 dark:text-gray-400'}`}>
                                        {stepName}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <div className="text-center">
                            <CheckIcon className="w-16 h-16 text-green-500 mx-auto" />
                            <h4 className="text-2xl font-bold mt-4">Deployment Complete</h4>
                            <p className="mt-2 text-gray-600 dark:text-gray-400">Your workflow is ready to be configured.</p>
                             <a 
                                href={workflow.deploymentUrl} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="w-full mt-6 inline-flex justify-center items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-brand-primary hover:bg-brand-dark"
                            >
                                View Deployed Workflow
                            </a>
                        </div>
                    )}
                </div>
                <div className="p-4 bg-gray-50 dark:bg-gray-900/50 flex justify-end rounded-b-lg">
                    <button onClick={onClose} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};

export default WorkflowDeployModal;