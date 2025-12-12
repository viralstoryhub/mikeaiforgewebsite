import React, { useState } from 'react';
import { useData } from '../../contexts/DataContext';
import { Workflow } from '../../types';
import AdminEditWorkflowModal from '../../components/admin/AdminEditWorkflowModal';
import { useToast } from '../../contexts/ToastContext';

const AdminWorkflowsPage: React.FC = () => {
    const { workflows, loading, addWorkflow, updateWorkflow, deleteWorkflow } = useData();
    const [editingWorkflow, setEditingWorkflow] = useState<Workflow | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    const { addToast } = useToast();

    const handleSaveWorkflow = async (workflowData: Partial<Workflow>) => {
        try {
            if (editingWorkflow) {
                await updateWorkflow(editingWorkflow.id, workflowData);
                addToast("Workflow updated successfully!", "success");
            } else {
                await addWorkflow(workflowData as Omit<Workflow, 'id' | 'icon'>);
                addToast("Workflow created successfully!", "success");
            }
            setEditingWorkflow(null);
            setIsCreating(false);
        } catch (error: any) {
            addToast(error.message || "Failed to save workflow.", "error");
        }
    };

    const handleDeleteWorkflow = async (workflow: Workflow) => {
        if (window.confirm(`Are you sure you want to delete the workflow "${workflow.name}"?`)) {
            try {
                await deleteWorkflow(workflow.id);
                addToast("Workflow deleted successfully.", "success");
            } catch (error: any) {
                addToast(error.message || "Failed to delete workflow.", "error");
            }
        }
    };

    const handleOpenCreateModal = () => {
        setEditingWorkflow(null);
        setIsCreating(true);
    };
    
    const handleCloseModal = () => {
        setEditingWorkflow(null);
        setIsCreating(false);
    };

    return (
        <div>
             {(editingWorkflow || isCreating) && (
                <AdminEditWorkflowModal
                    workflow={editingWorkflow}
                    onClose={handleCloseModal}
                    onSave={handleSaveWorkflow}
                />
            )}
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Workflow Management</h1>
                <button
                    onClick={handleOpenCreateModal}
                    className="px-4 py-2 bg-brand-primary text-white rounded-md hover:bg-brand-dark"
                >
                    Add New Workflow
                </button>
            </div>

            <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                        <tr>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Name</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Services</th>
                            <th scope="col" className="relative px-6 py-3"><span className="sr-only">Actions</span></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {loading ? (
                            <tr><td colSpan={3} className="text-center py-4">Loading workflows...</td></tr>
                        ) : (
                            workflows.map(workflow => (
                                <tr key={workflow.id}>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm font-medium text-gray-900 dark:text-white">{workflow.name}</div>
                                        <div className="text-sm text-gray-500 dark:text-gray-400">{workflow.slug}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex flex-wrap gap-1">
                                            {workflow.services.slice(0, 4).map(service => (
                                                <span key={service} className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200">
                                                    {service}
                                                </span>
                                            ))}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                                        <button onClick={() => setEditingWorkflow(workflow)} className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-200">Edit</button>
                                        <button onClick={() => handleDeleteWorkflow(workflow)} className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-200">Delete</button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default AdminWorkflowsPage;