import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { PersonaIcon } from './icons/ExtraIcons';

interface PersonaSelectorProps {
  selectedPersonaId: string;
  onChange: (personaId: string) => void;
}

const PersonaSelector: React.FC<PersonaSelectorProps> = ({ selectedPersonaId, onChange }) => {
  const { currentUser } = useAuth();
  const personas = currentUser?.personas || [];

  if (personas.length === 0) {
    return null; // Don't render the selector if there are no personas
  }

  return (
    <div>
      <label htmlFor="persona-selector" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
        AI Persona (Optional)
      </label>
      <div className="relative">
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <PersonaIcon className="h-5 w-5 text-gray-400" />
        </div>
        <select
          id="persona-selector"
          value={selectedPersonaId}
          onChange={(e) => onChange(e.target.value)}
          className="block w-full appearance-none rounded-md border border-gray-300 bg-white py-2 pl-10 pr-3 text-gray-900 shadow-sm focus:border-brand-secondary focus:outline-none focus:ring-brand-secondary dark:border-gray-600 dark:bg-gray-700 dark:text-white"
        >
          <option value="default">Default AI</option>
          {personas.map(persona => (
            <option key={persona.id} value={persona.id}>
              {persona.name}
            </option>
          ))}
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2">
            <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fillRule="evenodd" d="M10 3a.75.75 0 01.55.24l3.25 3.5a.75.75 0 11-1.1 1.02L10 4.852 7.3 7.76a.75.75 0 01-1.1-1.02l3.25-3.5A.75.75 0 0110 3zm-3.76 9.24a.75.75 0 011.06 0L10 15.148l2.7-2.908a.75.75 0 111.1 1.02l-3.25 3.5a.75.75 0 01-1.1 0l-3.25-3.5a.75.75 0 010-1.06z" clipRule="evenodd" />
            </svg>
        </div>
      </div>
    </div>
  );
};

export default PersonaSelector;