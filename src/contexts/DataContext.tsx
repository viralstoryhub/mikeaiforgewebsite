import React, { createContext, useState, useContext, useEffect, ReactNode, useCallback } from 'react';
import * as contentService from '../services/contentService';
import type { Tool, Workflow } from '../types';

interface DataContextType {
  tools: Tool[];
  workflows: Workflow[];
  loading: boolean;
  addTool: (tool: Omit<Tool, 'id'>) => Promise<void>;
  updateTool: (toolId: string, updates: Partial<Tool>) => Promise<void>;
  deleteTool: (toolId: string) => Promise<void>;
  addWorkflow: (workflow: Omit<Workflow, 'id' | 'icon'>) => Promise<void>;
  updateWorkflow: (workflowId: string, updates: Partial<Workflow>) => Promise<void>;
  deleteWorkflow: (workflowId: string) => Promise<void>;
}

const DataContext = createContext<DataContextType | null>(null);

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error("useData must be used within a DataProvider");
  }
  return context;
};

interface DataProviderProps {
  children: ReactNode;
}

export const DataProvider: React.FC<DataProviderProps> = ({ children }) => {
  const [tools, setTools] = useState<Tool[]>([]);
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [toolsData, workflowsData] = await Promise.all([
        contentService.getTools(),
        contentService.getWorkflows(),
      ]);
      setTools(toolsData);
      setWorkflows(workflowsData);
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const addTool = async (tool: Omit<Tool, 'id'>) => {
    await contentService.addTool(tool);
    await fetchData();
  };

  const updateTool = async (toolId: string, updates: Partial<Tool>) => {
    await contentService.updateTool(toolId, updates);
    await fetchData();
  };

  const deleteTool = async (toolId: string) => {
    await contentService.deleteTool(toolId);
    await fetchData();
  };

  const addWorkflow = async (workflow: Omit<Workflow, 'id' | 'icon'>) => {
    await contentService.addWorkflow(workflow);
    await fetchData();
  };

  const updateWorkflow = async (workflowId: string, updates: Partial<Workflow>) => {
    await contentService.updateWorkflow(workflowId, updates);
    await fetchData();
  };

  const deleteWorkflow = async (workflowId: string) => {
    await contentService.deleteWorkflow(workflowId);
    await fetchData();
  };

  const value = {
    tools,
    workflows,
    loading,
    addTool,
    updateTool,
    deleteTool,
    addWorkflow,
    updateWorkflow,
    deleteWorkflow,
  };

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  );
};
