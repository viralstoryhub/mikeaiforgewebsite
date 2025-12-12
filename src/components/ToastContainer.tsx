
import React, { useEffect, useState } from 'react';
import { useToast } from '../contexts/ToastContext';
import { ToastMessage, ToastType } from '../types';
import { SuccessIcon, ErrorIcon, InfoIcon, CloseIcon } from './icons/UtilityIcons';

const ICONS: Record<ToastType, React.ReactNode> = {
  success: <SuccessIcon className="w-6 h-6 text-green-500" />,
  error: <ErrorIcon className="w-6 h-6 text-red-500" />,
  info: <InfoIcon className="w-6 h-6 text-blue-500" />,
  warning: <InfoIcon className="w-6 h-6 text-yellow-500" />,
};

const Toast: React.FC<{ toast: ToastMessage; onRemove: (id: number) => void }> = ({ toast, onRemove }) => {
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsExiting(true);
      setTimeout(() => onRemove(toast.id), 300); // Wait for animation
    }, 4000); // Auto-dismiss after 4 seconds

    return () => clearTimeout(timer);
  }, [toast.id, onRemove]);
  
  const handleRemove = () => {
      setIsExiting(true);
      setTimeout(() => onRemove(toast.id), 300);
  }

  return (
    <div
      className={`
        flex items-start p-4 w-full max-w-sm bg-dark-secondary shadow-lg rounded-lg pointer-events-auto ring-1 ring-border-dark
        transition-all duration-300 ease-in-out
        ${isExiting ? 'opacity-0 translate-x-full' : 'opacity-100 translate-x-0'}
      `}
      style={{ animation: 'fadeInRight 0.3s ease-out' }}
    >
      <div className="flex-shrink-0">{ICONS[toast.type]}</div>
      <div className="ml-3 w-0 flex-1 pt-0.5">
        <p className="text-sm font-medium text-light-primary">{toast.message}</p>
      </div>
      <div className="ml-4 flex-shrink-0 flex">
        <button onClick={handleRemove} className="inline-flex text-gray-400 hover:text-gray-500 focus:outline-none">
          <CloseIcon className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useToast();

  return (
    <div className="fixed inset-0 flex items-end justify-center px-4 py-6 pointer-events-none sm:p-6 sm:items-start sm:justify-end z-50">
      <div className="w-full max-w-sm space-y-4">
        {toasts.map(toast => (
          <Toast key={toast.id} toast={toast} onRemove={removeToast} />
        ))}
      </div>
    </div>
  );
};

export default ToastContainer;
