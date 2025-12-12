import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import * as authService from '../services/authService';
import type { User, AIPersona } from '../types';

interface AuthContextType {
  currentUser: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
  signup: (email: string, password: string) => Promise<User>;
  updateUser: (updates: Partial<User>) => Promise<User>;
  toggleSaveTool: (toolId: string) => Promise<void>;
  recordUtilityUsage: (utilitySlug: string) => Promise<void>;
  upgradeSubscription: () => Promise<User>;
  addPersona: (persona: Omit<AIPersona, 'id'>) => Promise<void>;
  updatePersona: (personaId: string, updates: Partial<AIPersona>) => Promise<void>;
  deletePersona: (personaId: string) => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        const user = JSON.parse(storedUser);
        // Ensure every user has default properties
        if (!user.subscriptionTier) user.subscriptionTier = 'Free';
        if (!user.role) user.role = 'User';
        if (!user.personas) user.personas = [];
        setCurrentUser(user);
      }
    } catch (error) {
      console.error("Failed to parse user from localStorage", error);
    } finally {
      setLoading(false);
    }
  }, []);

  const login = async (email: string, password: string) => {
    const user = await authService.login(email, password);
    setCurrentUser(user);
    return user;
  };

  const logout = async () => {
    await authService.logout();
    setCurrentUser(null);
  };

  const signup = async (email: string, password: string) => {
    const user = await authService.signup(email, password);
    setCurrentUser(user);
    return user;
  };
  
  const updateUser = async (updates: Partial<User>) => {
    if (!currentUser) throw new Error("No user logged in");
    const updatedUser = await authService.updateUserProfile(currentUser.id, updates);
    setCurrentUser(updatedUser);
    return updatedUser;
  };

  const toggleSaveTool = async (toolId: string) => {
    if (!currentUser) throw new Error("No user logged in");
    const updatedUser = await authService.toggleSaveTool(currentUser.id, toolId);
    setCurrentUser(updatedUser);
  };

  const recordUtilityUsage = async (utilitySlug: string) => {
      if (!currentUser) throw new Error("No user logged in");
      const updatedUser = await authService.recordUtilityUsage(currentUser.id, utilitySlug);
      setCurrentUser(updatedUser);
  };

  const upgradeSubscription = async () => {
    if (!currentUser) throw new Error("No user logged in");
    const updatedUser = await authService.upgradeSubscription(currentUser.id);
    setCurrentUser(updatedUser);
    return updatedUser;
  };
  
  const addPersona = async (persona: Omit<AIPersona, 'id'>) => {
    if (!currentUser) throw new Error("No user logged in");
    const updatedUser = await authService.addPersona(currentUser.id, persona);
    setCurrentUser(updatedUser);
  };

  const updatePersona = async (personaId: string, updates: Partial<AIPersona>) => {
    if (!currentUser) throw new Error("No user logged in");
    const updatedUser = await authService.updatePersona(currentUser.id, personaId, updates);
    setCurrentUser(updatedUser);
  };

  const deletePersona = async (personaId: string) => {
    if (!currentUser) throw new Error("No user logged in");
    const updatedUser = await authService.deletePersona(currentUser.id, personaId);
    setCurrentUser(updatedUser);
  };

  const value = {
    currentUser,
    loading,
    login,
    logout,
    signup,
    updateUser,
    toggleSaveTool,
    recordUtilityUsage,
    upgradeSubscription,
    addPersona,
    updatePersona,
    deletePersona,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};