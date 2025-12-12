import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { AIPersona } from '../../types';
// Fix: Import EditIcon and TrashIcon from UtilityIcons, not ExtraIcons.
import { EditIcon, TrashIcon } from '../icons/UtilityIcons';
import { PersonaIcon } from '../icons/ExtraIcons';

interface PersonaFormModalProps {
  persona?: AIPersona | null;
  onClose: () => void;
}

const PersonaFormModal: React.FC<PersonaFormModalProps> = ({ persona, onClose }) => {
  const [name, setName] = useState(persona?.name || '');
  const [description, setDescription] = useState(persona?.description || '');
  const [isSaving, setIsSaving] = useState(false);
  const { addPersona, updatePersona } = useAuth();
  const { addToast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !description.trim()) {
      addToast('Name and description are required.', 'error');
      return;
    }
    setIsSaving(true);
    try {
      if (persona) {
        await updatePersona(persona.id, { name, description });
        addToast('Persona updated successfully!', 'success');
      } else {
        await addPersona({ name, description });
        addToast('Persona created successfully!', 'success');
      }
      onClose();
    } catch (error: any) {
      addToast(error.message || 'Failed to save persona.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center animate-fade-in-up" style={{ animationDuration: '0.3s' }}>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-lg m-4">
        <form onSubmit={handleSubmit}>
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-xl font-bold">{persona ? 'Edit Persona' : 'Create New Persona'}</h3>
          </div>
          <div className="p-6 space-y-4">
            <div>
              <label htmlFor="persona-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Persona Name</label>
              <input
                type="text"
                id="persona-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Witty Social Media Manager"
                className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-brand-secondary focus:border-brand-secondary"
                required
              />
            </div>
            <div>
              <label htmlFor="persona-description" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Description / System Instruction</label>
              <textarea
                id="persona-description"
                rows={5}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the AI's personality, tone, and any specific rules it should follow. E.g., 'You are a helpful assistant for a tech YouTuber. Your tone is casual, informative, and slightly humorous. Always avoid corporate jargon.'"
                className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-brand-secondary focus:border-brand-secondary"
                required
              />
            </div>
          </div>
          <div className="p-4 bg-gray-50 dark:bg-gray-900/50 flex justify-end space-x-3 rounded-b-lg">
            <button type="button" onClick={onClose} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">Cancel</button>
            <button type="submit" disabled={isSaving} className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-brand-primary hover:bg-brand-dark disabled:bg-gray-400">{isSaving ? 'Saving...' : 'Save Persona'}</button>
          </div>
        </form>
      </div>
    </div>
  );
};


const PersonasTab: React.FC = () => {
  const { currentUser, deletePersona } = useAuth();
  const { addToast } = useToast();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPersona, setEditingPersona] = useState<AIPersona | null>(null);

  const handleOpenModal = (persona: AIPersona | null = null) => {
    setEditingPersona(persona);
    setIsModalOpen(true);
  };

  const handleDelete = async (persona: AIPersona) => {
    if (window.confirm(`Are you sure you want to delete the "${persona.name}" persona?`)) {
      try {
        await deletePersona(persona.id);
        addToast('Persona deleted successfully.', 'success');
      } catch (error: any) {
        addToast(error.message || 'Failed to delete persona.', 'error');
      }
    }
  };

  return (
    <>
      {isModalOpen && (
        <PersonaFormModal persona={editingPersona} onClose={() => setIsModalOpen(false)} />
      )}
      <div className="space-y-4">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Create custom AI personas to tailor the output of utility tools to your brand's voice.
        </p>
        
        {currentUser?.personas && currentUser.personas.length > 0 ? (
          <ul className="space-y-3">
            {currentUser.personas.map(persona => (
              <li key={persona.id} className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg flex justify-between items-start">
                <div>
                  <h4 className="font-bold text-gray-800 dark:text-white">{persona.name}</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">{persona.description}</p>
                </div>
                <div className="flex-shrink-0 flex items-center space-x-2 ml-4">
                  <button onClick={() => handleOpenModal(persona)} className="p-1.5 text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600">
                    <EditIcon className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(persona)} className="p-1.5 text-gray-500 hover:text-red-600 dark:hover:text-red-400 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600">
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="text-center py-8 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
             <PersonaIcon className="mx-auto h-12 w-12 text-gray-400" />
            <p className="mt-2 text-gray-500 dark:text-gray-400">You haven't created any personas yet.</p>
          </div>
        )}

        <button
          onClick={() => handleOpenModal()}
          className="w-full mt-4 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-brand-secondary hover:bg-blue-600"
        >
          Create New Persona
        </button>
      </div>
    </>
  );
};

export default PersonasTab;