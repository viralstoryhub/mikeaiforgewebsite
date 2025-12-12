import { AI_TOOLS_DATA, WORKFLOWS_DATA } from '../constants';
import type { Tool, Workflow } from '../types';

const TOOLS_STORAGE_KEY = 'ai_tools';
const WORKFLOWS_STORAGE_KEY = 'ai_workflows';

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const initializeData = <T,>(key: string, initialData: T[]): T[] => {
  try {
    const storedData = localStorage.getItem(key);
    if (storedData) {
      return JSON.parse(storedData);
    } else {
      localStorage.setItem(key, JSON.stringify(initialData));
      return initialData;
    }
  } catch (error) {
    console.error(`Error initializing data for ${key}:`, error);
    return initialData;
  }
};

// Initialize with seed data if not present
initializeData<Tool>(TOOLS_STORAGE_KEY, AI_TOOLS_DATA);
initializeData<Workflow>(WORKFLOWS_STORAGE_KEY, WORKFLOWS_DATA);

// --- Tools ---
export const getTools = async (): Promise<Tool[]> => {
  await sleep(300);
  return initializeData<Tool>(TOOLS_STORAGE_KEY, AI_TOOLS_DATA);
};

export const addTool = async (tool: Omit<Tool, 'id'>): Promise<Tool> => {
  await sleep(300);
  const tools = await getTools();
  const newTool: Tool = { ...tool, id: String(Date.now()) };
  const updatedTools = [...tools, newTool];
  localStorage.setItem(TOOLS_STORAGE_KEY, JSON.stringify(updatedTools));
  return newTool;
};

export const updateTool = async (toolId: string, updates: Partial<Tool>): Promise<Tool> => {
  await sleep(300);
  const tools = await getTools();
  let updatedTool: Tool | undefined;
  const updatedTools = tools.map(t => {
    if (t.id === toolId) {
      updatedTool = { ...t, ...updates };
      return updatedTool;
    }
    return t;
  });
  if (!updatedTool) throw new Error("Tool not found");
  localStorage.setItem(TOOLS_STORAGE_KEY, JSON.stringify(updatedTools));
  return updatedTool;
};

export const deleteTool = async (toolId: string): Promise<void> => {
  await sleep(300);
  const tools = await getTools();
  const updatedTools = tools.filter(t => t.id !== toolId);
  localStorage.setItem(TOOLS_STORAGE_KEY, JSON.stringify(updatedTools));
};

// --- Workflows ---
export const getWorkflows = async (): Promise<Workflow[]> => {
  await sleep(300);
  return initializeData<Workflow>(WORKFLOWS_STORAGE_KEY, WORKFLOWS_DATA);
};

export const addWorkflow = async (workflow: Omit<Workflow, 'id' | 'icon'>): Promise<Workflow> => {
    await sleep(300);
    const workflows = await getWorkflows();
    const newWorkflow: Workflow = { ...workflow, id: String(Date.now()), icon: 'RocketLaunchIcon' };
    const updatedWorkflows = [...workflows, newWorkflow];
    localStorage.setItem(WORKFLOWS_STORAGE_KEY, JSON.stringify(updatedWorkflows));
    return newWorkflow;
};

export const updateWorkflow = async (workflowId: string, updates: Partial<Workflow>): Promise<Workflow> => {
    await sleep(300);
    const workflows = await getWorkflows();
    let updatedWorkflow: Workflow | undefined;
    const updatedWorkflows = workflows.map(w => {
        if (w.id === workflowId) {
            updatedWorkflow = { ...w, ...updates };
            return updatedWorkflow;
        }
        return w;
    });
    if (!updatedWorkflow) throw new Error("Workflow not found");
    localStorage.setItem(WORKFLOWS_STORAGE_KEY, JSON.stringify(updatedWorkflows));
    return updatedWorkflow;
};

export const deleteWorkflow = async (workflowId: string): Promise<void> => {
    await sleep(300);
    const workflows = await getWorkflows();
    const updatedWorkflows = workflows.filter(w => w.id !== workflowId);
    localStorage.setItem(WORKFLOWS_STORAGE_KEY, JSON.stringify(updatedWorkflows));
};