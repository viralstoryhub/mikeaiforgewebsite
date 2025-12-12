
import React from 'react';
import type { Workflow } from '../types';
import { RocketLaunchIcon } from './icons/ExtraIcons';
import { useTiltEffect } from '../hooks/useTiltEffect';

const iconMap: { [key: string]: React.ComponentType<{ className?: string }> } = {
    RocketLaunchIcon,
};

const SERVICE_COLORS: { [key: string]: string } = {
  'make': 'bg-purple-900 text-purple-200',
  'zapier': 'bg-orange-900 text-orange-200',
  'gemini': 'bg-blue-900 text-blue-200',
  'youtube': 'bg-red-900 text-red-200',
  'google docs': 'bg-indigo-900 text-indigo-200',
  'mailchimp': 'bg-yellow-900 text-yellow-200',
  'buffer': 'bg-gray-700 text-gray-200',
  'zendesk': 'bg-green-900 text-green-200',
  'default': 'bg-gray-700 text-gray-200',
};

const getServiceColor = (serviceName: string): string => {
    const lowerCaseName = serviceName.toLowerCase();
    for (const key in SERVICE_COLORS) {
        if (lowerCaseName.includes(key)) {
            return SERVICE_COLORS[key];
        }
    }
    return SERVICE_COLORS['default'];
};

interface WorkflowCardProps {
  workflow: Workflow;
  onDeployClick: (workflow: Workflow) => void;
}

const WorkflowCard: React.FC<WorkflowCardProps> = ({ workflow, onDeployClick }) => {
  const IconComponent = iconMap[workflow.icon];
  const tiltRef = useTiltEffect<HTMLDivElement>();

  return (
    <div ref={tiltRef} className="group flex flex-col p-6 bg-dark-secondary rounded-lg border border-border-dark hover:border-brand-primary/50 transition-colors duration-300 tilt-card relative overflow-hidden glare-effect h-full">
      <div className="flex items-start space-x-4">
        <div className="flex-shrink-0 bg-dark-primary p-3 rounded-lg border border-border-dark">
          {IconComponent && <IconComponent className="w-6 h-6 text-brand-primary" />}
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-bold text-light-primary">{workflow.name}</h3>
          <p className="mt-1 text-sm text-light-secondary">{workflow.description}</p>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {workflow.services.map(service => (
          <span key={service} className={`px-2 py-1 text-xs font-medium rounded-full ${getServiceColor(service)}`}>
            {service}
          </span>
        ))}
      </div>
      <div className="mt-6 flex-grow flex items-end">
        <button 
          onClick={() => onDeployClick(workflow)}
          className="w-full mt-2 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-brand-primary hover:opacity-90 transition-opacity"
        >
          Deploy Workflow
        </button>
      </div>
    </div>
  );
};

export default WorkflowCard;