import React, { useState } from 'react';
import { useData } from '../../contexts/DataContext';
import { Tool } from '../../types';
import AdminEditToolModal from '../../components/admin/AdminEditToolModal';
import { useToast } from '../../contexts/ToastContext';

const AdminToolsPage: React.FC = () => {
    const { tools, loading, addTool, updateTool, deleteTool } = useData();
    const [editingTool, setEditingTool] = useState<Tool | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    const { addToast } = useToast();

    const handleSaveTool = async (toolData: Partial<Tool>) => {
        try {
            if (editingTool) {
                // Updating existing tool
                await updateTool(editingTool.id, toolData);
                addToast("Tool updated successfully!", "success");
            } else {
                // Creating new tool
                await addTool(toolData as Omit<Tool, 'id'>);
                addToast("Tool created successfully!", "success");
            }
            setEditingTool(null);
            setIsCreating(false);
        } catch (error: any) {
            addToast(error.message || "Failed to save tool.", "error");
        }
    };

    const handleDeleteTool = async (tool: Tool) => {
        if (window.confirm(`Are you sure you want to delete the tool "${tool.name}"?`)) {
            try {
                await deleteTool(tool.id);
                addToast("Tool deleted successfully.", "success");
            } catch (error: any) {
                addToast(error.message || "Failed to delete tool.", "error");
            }
        }
    };

    const handleOpenCreateModal = () => {
        setEditingTool(null);
        setIsCreating(true);
    };
    
    const handleCloseModal = () => {
        setEditingTool(null);
        setIsCreating(false);
    };

    return (
        <div>
             {(editingTool || isCreating) && (
                <AdminEditToolModal
                    tool={editingTool}
                    onClose={handleCloseModal}
                    onSave={handleSaveTool}
                />
            )}
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Tool Management</h1>
                <button
                    onClick={handleOpenCreateModal}
                    className="px-4 py-2 bg-brand-primary text-white rounded-md hover:bg-brand-dark"
                >
                    Add New Tool
                </button>
            </div>

            <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                        <tr>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Name</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Category</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Rating</th>
                            <th scope="col" className="relative px-6 py-3"><span className="sr-only">Actions</span></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {loading ? (
                            <tr><td colSpan={4} className="text-center py-4">Loading tools...</td></tr>
                        ) : (
                            tools.map(tool => (
                                <tr key={tool.id}>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm font-medium text-gray-900 dark:text-white">{tool.name}</div>
                                        <div className="text-sm text-gray-500 dark:text-gray-400">{tool.slug}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                                            {tool.categories[0]}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{tool.rating}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                                        <button onClick={() => setEditingTool(tool)} className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-200">Edit</button>
                                        <button onClick={() => handleDeleteTool(tool)} className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-200">Delete</button>
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

export default AdminToolsPage;