// TEMPORARY: This file includes mock authentication fallbacks
// Remove mock code and use only API calls once backend is running
import type { User, AIPersona } from '../types';
import { apiClient } from './apiClient';

/**
 * Helper function to generate consistent IDs
 * Uses crypto.randomUUID when available, otherwise generates a UUID-like string
 */
const getId = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  // Fallback: Generate a UUID-like string in the format xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
  const timestamp = Date.now();
  const randomPart = Math.random().toString(16).substring(2);
  const uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c, idx) => {
    const r = (timestamp + Math.random() * 16 + idx) % 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });

  return uuid;
};

// TEMPORARY: Mock authentication fallback
const MOCK_USERS_KEY = 'mock_users';
const MOCK_CURRENT_USER_KEY = 'mock_current_user';

const getMockUsers = (): Record<string, any> => {
  const stored = localStorage.getItem(MOCK_USERS_KEY);
  if (stored) return JSON.parse(stored);

  const defaultUsers = {
    'admin@example.com': {
      id: '1',
      email: 'admin@example.com',
      password: 'password',
      name: 'Admin User',
      role: 'admin',
      subscriptionTier: 'pro',
      savedTools: [],
      utilityUsage: {},
      personas: [],
    },
    'test@example.com': {
      id: '2',
      email: 'test@example.com',
      password: 'password',
      name: 'Test User',
      role: 'user',
      subscriptionTier: 'free',
      savedTools: [],
      utilityUsage: {},
      personas: [],
    },
  };

  localStorage.setItem(MOCK_USERS_KEY, JSON.stringify(defaultUsers));
  return defaultUsers;
};

const saveMockUsers = (users: Record<string, any>) => {
  localStorage.setItem(MOCK_USERS_KEY, JSON.stringify(users));
};

/**
 * Find the original email key for a user by their ID.
 * Returns the email key exactly as stored (case-sensitive) to ensure proper lookups.
 * @param users - The users map keyed by email
 * @param userId - The user ID to search for
 * @returns The original email key or null if not found
 */
const findMockUserKeyById = (users: Record<string, any>, userId: string): string | null => {
  for (const [email, user] of Object.entries(users)) {
    if ((user as Record<string, any>).id === userId) {
      return email; // Return original email key without any normalization
    }
  }
  return null;
};

/**
 * Centralized helper to perform atomic read-modify-write operations on mock user data.
 * This prevents race conditions when multiple updates run concurrently by serializing
 * updates per user.
 * 
 * WARNING: This helper only provides serialization within a single browser session.
 * It does NOT protect against concurrent updates across browser tabs/windows.
 * 
 * @param userId - The ID of the user to update
 * @param updateCallback - A callback function that receives the current user object
 *                         and returns the updated user object
 * @returns The updated and sanitized user object
 * @throws Error if user is not found
 */
const updateMockUserAtomically = (
  userId: string,
  updateCallback: (currentUser: Record<string, any>) => Record<string, any>
): User => {
  // Load latest state from storage
  const users = getMockUsers();
  const userKey = findMockUserKeyById(users, userId);

  if (!userKey) {
    throw new Error('User not found');
  }

  // Apply the update callback
  const updatedUser = updateCallback(users[userKey]);

  // Save back to storage
  users[userKey] = updatedUser;
  saveMockUsers(users);

  // Update current user session if this is the logged-in user
  const currentUser = getMockCurrentUser();
  if (currentUser && currentUser.id === userId) {
    setMockCurrentUser(updatedUser);
  }

  return sanitizeUser(updatedUser);
};

const sanitizeUser = (user: Record<string, any>): User => {
  const { password: _password, ...userWithoutPassword } = user;
  return userWithoutPassword as User;
};

const setMockTokens = () => {
  localStorage.setItem('accessToken', 'mock-access-token');
  localStorage.setItem('refreshToken', 'mock-refresh-token');
};

const clearMockTokens = () => {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
};

const setMockCurrentUser = (user: Record<string, any>) => {
  const sanitized = sanitizeUser(user);
  localStorage.setItem(MOCK_CURRENT_USER_KEY, JSON.stringify(sanitized));
  localStorage.setItem('user', JSON.stringify(sanitized));
};

const getMockCurrentUser = (): User | null => {
  const stored = localStorage.getItem(MOCK_CURRENT_USER_KEY) ?? localStorage.getItem('user');
  return stored ? (JSON.parse(stored) as User) : null;
};

export const login = async (email: string, password: string): Promise<User> => {
  try {
    const response = await apiClient.post('/auth/login', { email, password });
    const { user, accessToken, refreshToken } = response?.data?.data || {};

    if (!user) {
      throw new Error('Unexpected response from /auth/login: missing user data');
    }

    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    localStorage.setItem('user', JSON.stringify(user));

    return user;
  } catch (error: any) {
    // Only fallback to mock authentication for network errors
    // If error.response is undefined, it's likely a network/connectivity issue
    if (error.response === undefined) {
      console.warn('Backend not available, using mock authentication for login', error);
      const users = getMockUsers();
      const userRecord = users[email];

      if (!userRecord || userRecord.password !== password) {
        throw new Error('Invalid credentials');
      }

      setMockTokens();
      setMockCurrentUser(userRecord);
      return sanitizeUser(userRecord);
    }

    // For authentication errors or other API errors, rethrow without falling back to mock
    throw error;
  }
};

export const signup = async (email: string, password: string, name?: string): Promise<User> => {
  try {
    const response = await apiClient.post('/auth/register', { email, password, name });
    const signupData = response?.data?.data;

    if (!signupData || !signupData.user) {
      throw new Error('Unexpected response from /auth/register: missing user data');
    }

    const { user, accessToken, refreshToken } = signupData;

    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    localStorage.setItem('user', JSON.stringify(user));

    return user;
  } catch (error) {
    console.warn('Backend not available, using mock authentication for signup', error);
    const users = getMockUsers();

    if (users[email]) {
      throw new Error('User already exists');
    }

    const newUser = {
      id: getId(),
      email,
      password,
      name: name || email.split('@')[0],
      role: 'user',
      subscriptionTier: 'free',
      savedTools: [],
      utilityUsage: {},
      personas: [],
      profilePictureUrl: `https://i.pravatar.cc/150?u=${email}`,
    };

    users[email] = newUser;
    saveMockUsers(users);

    setMockTokens();
    setMockCurrentUser(newUser);
    return sanitizeUser(newUser);
  }
};

export const logout = async (): Promise<void> => {
  try {
    await apiClient.post('/auth/logout');
  } catch (error) {
    console.warn('Backend not available, clearing mock authentication session on logout', error);
  } finally {
    clearMockTokens();
    localStorage.removeItem('user');
    localStorage.removeItem(MOCK_CURRENT_USER_KEY);
  }
};

export const updateUserProfile = async (userId: string, updates: Partial<User>): Promise<User> => {
  try {
    const response = await apiClient.patch('/users/profile', updates);
    const user = response.data.data.user;
    localStorage.setItem('user', JSON.stringify(user));
    return user;
  } catch (error) {
    console.warn('Backend not available, updating mock user profile', error);
    const users = getMockUsers();
    const userKey = findMockUserKeyById(users, userId);

    if (!userKey) {
      throw new Error('User not found');
    }

    // Deep merge for nested objects to preserve existing nested data
    const updatedUser = {
      ...users[userKey],
      ...updates,
    };

    // Explicitly merge nested objects like utilityUsage
    if (updates.utilityUsage && users[userKey].utilityUsage) {
      updatedUser.utilityUsage = {
        ...users[userKey].utilityUsage,
        ...updates.utilityUsage,
      };
    }

    users[userKey] = updatedUser;
    saveMockUsers(users);
    setMockCurrentUser(updatedUser);
    return sanitizeUser(updatedUser);
  }
};

export const toggleSaveTool = async (userId: string, toolId: string): Promise<User> => {
  try {
    await apiClient.post('/users/saved-tools', { toolId });
    const response = await apiClient.get('/users/profile');
    const user = response.data.data.user;
    localStorage.setItem('user', JSON.stringify(user));
    return user;
  } catch (error) {
    console.warn('Backend not available, toggling saved tool in mock data', error);
    const users = getMockUsers();
    const userKey = findMockUserKeyById(users, userId);

    if (!userKey) {
      throw new Error('User not found');
    }

    const currentUser = users[userKey];
    const savedTools: string[] = Array.isArray(currentUser.savedTools)
      ? [...(currentUser.savedTools as string[])]
      : [];
    const updatedSavedTools = savedTools.includes(toolId)
      ? savedTools.filter((id) => id !== toolId)
      : [...savedTools, toolId];

    const updatedUser = {
      ...currentUser,
      savedTools: updatedSavedTools,
    };

    users[userKey] = updatedUser;
    saveMockUsers(users);
    setMockCurrentUser(updatedUser);
    return sanitizeUser(updatedUser);
  }
};

export const recordUtilityUsage = async (userId: string, utilitySlug: string): Promise<User> => {
  try {
    await apiClient.post('/users/utility-usage', { utilitySlug });
    const response = await apiClient.get('/users/profile');
    const user = response.data.data.user;
    localStorage.setItem('user', JSON.stringify(user));
    return user;
  } catch (error) {
    console.warn('Backend not available, recording mock utility usage', error);
    return updateMockUserAtomically(userId, (currentUser) => {
      // Use structuredClone for deep copy to prevent shared references
      const currentUsage: Record<string, number> = structuredClone(currentUser.utilityUsage ?? {});
      currentUsage[utilitySlug] = (currentUsage[utilitySlug] ?? 0) + 1;

      return {
        ...currentUser,
        utilityUsage: currentUsage,
      };
    });
  }
};

export const upgradeSubscription = async (userId: string): Promise<User> => {
  try {
    const response = await apiClient.post('/stripe/create-checkout-session');
    const { url } = response.data.data;
    window.location.href = url;

    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      return JSON.parse(storedUser);
    }

    const mockUser = getMockCurrentUser();
    if (mockUser) {
      return mockUser;
    }

    throw new Error('User session not found');
  } catch (error) {
    console.warn('Backend not available, upgrading subscription in mock data', error);
    const users = getMockUsers();
    const userKey = findMockUserKeyById(users, userId);

    if (!userKey) {
      throw new Error('User not found');
    }

    const updatedUser = {
      ...users[userKey],
      subscriptionTier: 'pro',
    };

    users[userKey] = updatedUser;
    saveMockUsers(users);
    setMockCurrentUser(updatedUser);
    return sanitizeUser(updatedUser);
  }
};

export const addPersona = async (userId: string, persona: Omit<AIPersona, 'id'>): Promise<User> => {
  try {
    await apiClient.post('/users/personas', persona);
    const response = await apiClient.get('/users/profile');
    const user = response.data.data.user;
    localStorage.setItem('user', JSON.stringify(user));
    return user;
  } catch (error) {
    console.warn('Backend not available, adding persona in mock data', error);
    return updateMockUserAtomically(userId, (currentUser) => {
      const personaId = getId();

      const newPersona: AIPersona = {
        id: personaId,
        ...persona,
      };

      const personas: AIPersona[] = Array.isArray(currentUser.personas)
        ? [...(currentUser.personas as AIPersona[]), newPersona]
        : [newPersona];

      return {
        ...currentUser,
        personas,
      };
    });
  }
};

export const updatePersona = async (
  userId: string,
  personaId: string,
  updates: Partial<AIPersona>
): Promise<User> => {
  try {
    await apiClient.patch(`/users/personas/${personaId}`, updates);
    const response = await apiClient.get('/users/profile');
    const user = response.data.data.user;
    localStorage.setItem('user', JSON.stringify(user));
    return user;
  } catch (error) {
    console.warn('Backend not available, updating persona in mock data', error);
    return updateMockUserAtomically(userId, (currentUser) => {
      const personas: AIPersona[] = Array.isArray(currentUser.personas)
        ? [...(currentUser.personas as AIPersona[])]
        : [];

      const personaIndex = personas.findIndex((p) => p.id === personaId);
      if (personaIndex === -1) {
        throw new Error('Persona not found');
      }

      // Whitelist of allowed persona fields that can be updated
      const allowedFields: (keyof AIPersona)[] = ['name', 'description'];

      // Validate and filter updates to only include whitelisted fields
      const validatedUpdates: Partial<AIPersona> = {};
      for (const key of Object.keys(updates)) {
        if (allowedFields.includes(key as keyof AIPersona)) {
          validatedUpdates[key as keyof AIPersona] = updates[key as keyof AIPersona];
        }
      }

      // Create a deep copy of the existing persona before merging updates
      const existingPersona = structuredClone(personas[personaIndex]);
      const originalId = existingPersona.id;

      personas[personaIndex] = {
        ...existingPersona,
        ...validatedUpdates,
        id: originalId, // Explicitly preserve the original ID
      };

      return {
        ...currentUser,
        personas,
      };
    });
  }
};

export const deletePersona = async (userId: string, personaId: string): Promise<User> => {
  try {
    await apiClient.delete(`/users/personas/${personaId}`);
    const response = await apiClient.get('/users/profile');
    const user = response.data.data.user;
    localStorage.setItem('user', JSON.stringify(user));
    return user;
  } catch (error) {
    console.warn('Backend not available, deleting persona in mock data', error);
    return updateMockUserAtomically(userId, (currentUser) => {
      const personas: AIPersona[] = Array.isArray(currentUser.personas)
        ? [...(currentUser.personas as AIPersona[])]
        : [];

      const personaIndex = personas.findIndex((p) => p.id === personaId);
      if (personaIndex === -1) {
        throw new Error('Persona not found');
      }

      personas.splice(personaIndex, 1);

      return {
        ...currentUser,
        personas,
      };
    });
  }
};

export const getAllUsers = async (): Promise<User[]> => {
  try {
    const response = await apiClient.get('/admin/users');
    // Backend returns { data: [...users], pagination: {...} }
    return response.data.data;
  } catch (error) {
    console.warn('Backend not available, returning mock users', error);
    const users = getMockUsers();
    return Object.values(users).map((user) => sanitizeUser(user));
  }
};

export const updateUserAsAdmin = async (userId: string, updates: Partial<User>): Promise<User> => {
  try {
    const response = await apiClient.patch(`/admin/users/${userId}`, updates);
    return response.data.data.user;
  } catch (error) {
    console.warn('Backend not available, updating mock user as admin', error);
    return updateMockUserAtomically(userId, (currentUser) => {
      return {
        ...currentUser,
        ...updates,
      };
    });
  }
};

/**
 * Delete a user as admin. Returns void instead of User.
 * 
 * WARNING: Mock implementation uses read-modify-write pattern that may cause
 * race conditions with concurrent updates. Avoid parallel mock updates in tests.
 * This function cannot use updateMockUserAtomically since it returns void.
 */
export const deleteUserAsAdmin = async (userId: string): Promise<void> => {
  try {
    await apiClient.delete(`/admin/users/${userId}`);
  } catch (error) {
    console.warn('Backend not available, deleting mock user as admin', error);

    // Atomic read-modify-write operation
    const users = getMockUsers();
    const userKey = findMockUserKeyById(users, userId);

    if (!userKey) {
      throw new Error('User not found');
    }

    delete users[userKey];
    saveMockUsers(users);

    // Clean up current user session if deleting the logged-in user
    const currentUser = getMockCurrentUser();
    if (currentUser && currentUser.id === userId) {
      localStorage.removeItem('user');
      localStorage.removeItem(MOCK_CURRENT_USER_KEY);
      clearMockTokens();
    }
  }
};
