import React, { useEffect } from 'react';
import _ from 'lodash';
import { XMarkIcon } from '@heroicons/react/24/outline';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    if (isOpen) {
        document.body.style.overflow = 'hidden';
        window.addEventListener('keydown', handleEsc);
    }
    
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleEsc);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-70 z-40 flex justify-center items-center p-4" 
      onClick={onClose}
      aria-modal="true"
      role="dialog"
    >
      <div 
        className="relative bg-gray-800 rounded-lg shadow-xl w-[95%] md:w-full max-w-3xl max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex-shrink-0 p-6 border-b border-gray-700">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-semibold text-white">{title}</h3>
              <button 
                onClick={onClose} 
                className="text-gray-400 hover:text-white transition-colors"
                aria-label="Fechar modal"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
        </div>
        <div className="flex-grow overflow-y-auto p-6">
          {children}
        </div>
      </div>
    </div>
  );
};

export default Modal;
