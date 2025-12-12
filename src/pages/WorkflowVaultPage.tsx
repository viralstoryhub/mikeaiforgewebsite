
import React, { useState } from 'react';
import { useData } from '../contexts/DataContext';
import WorkflowCard from '../components/WorkflowCard';
import { useAuth } from '../contexts/AuthContext';
import { Workflow } from '../types';
import WorkflowUpgradeModal from '../components/WorkflowUpgradeModal';
import WorkflowDeployModal from '../components/WorkflowDeployModal';
import { ToolCardSkeleton } from '../components/Skeletons';

const WorkflowVaultPage: React.FC = () => {
  const { currentUser } = useAuth()!;
  const { workflows, loading } = useData();
  const [selectedWorkflow, setSelectedWorkflow] = useState<Workflow | null>(null);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [isDeployModalOpen, setIsDeployModalOpen] = useState(false);

  const handleDeployClick = (workflow: Workflow) => {
    setSelectedWorkflow(workflow);
    if (!currentUser) {
        // Should be handled by a protected route, but as a fallback
        alert("Please log in to deploy workflows.");
        return;
    }
    if (currentUser.subscriptionTier === 'Pro') {
      setIsDeployModalOpen(true);
    } else {
      setIsUpgradeModalOpen(true);
    }
  };

  const closeModals = () => {
    setIsUpgradeModalOpen(false);
    setIsDeployModalOpen(false);
    setSelectedWorkflow(null);
  };

  return (
    <div className="animate-fade-in-up">
       {isUpgradeModalOpen && selectedWorkflow && (
        <WorkflowUpgradeModal workflow={selectedWorkflow} onClose={closeModals} />
      )}
      {isDeployModalOpen && selectedWorkflow && (
        <WorkflowDeployModal workflow={selectedWorkflow} onClose={closeModals} />
      )}

      <div className="text-center mb-12">
        <h1 className="text-4xl font-extrabold tracking-tight text-light-primary sm:text-5xl">Workflow Vault</h1>
        <p className="mt-3 max-w-2xl mx-auto text-xl text-light-secondary sm:mt-4">
          Deploy powerful, pre-built automations from my YouTube videos in just one click.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
        {loading ? (
             Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="bg-dark-secondary rounded-lg border border-border-dark p-6 animate-pulse">
                    <div className="h-24 bg-gray-700 rounded"></div>
                </div>
            ))
        ) : (
            workflows.map((workflow, index) => (
              <div key={workflow.id} className="animate-fade-in-up" style={{ animationDelay: `${index * 150}ms`}}>
                <WorkflowCard workflow={workflow} onDeployClick={handleDeployClick} />
              </div>
            ))
        )}
      </div>
    </div>
  );
};

export default WorkflowVaultPage;