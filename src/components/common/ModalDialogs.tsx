import React, { useState, useEffect } from 'react';
import { AlertTriangle, HelpCircle, X, Check } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  confirmText = 'Delete',
  cancelText = 'Cancel',
  variant = 'danger',
  onConfirm,
  onCancel
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-[#1F2937] border border-gray-700 rounded-xl p-5 max-w-md w-full space-y-4 shadow-2xl text-gray-100">
        <div className="flex items-center justify-between border-b border-gray-700 pb-3">
          <div className="flex items-center gap-2">
            {variant === 'danger' && <AlertTriangle className="w-5 h-5 text-red-400" />}
            {variant === 'warning' && <AlertTriangle className="w-5 h-5 text-amber-400" />}
            {variant === 'info' && <HelpCircle className="w-5 h-5 text-cyan-400" />}
            <h3 className="text-sm font-bold uppercase tracking-wider text-white">{title}</h3>
          </div>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-white p-1 rounded hover:bg-gray-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-gray-300 leading-relaxed font-sans">{message}</p>

        <div className="flex justify-end gap-2 pt-2 border-t border-gray-700/60">
          <button
            onClick={onCancel}
            className="px-4 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded text-xs font-bold transition-all"
          >
            {cancelText}
          </button>
          <button
            onClick={() => {
              onConfirm();
            }}
            className={`px-4 py-1.5 rounded text-xs font-bold text-white shadow transition-all active:scale-95 ${
              variant === 'danger'
                ? 'bg-red-600 hover:bg-red-500'
                : variant === 'warning'
                ? 'bg-amber-600 hover:bg-amber-500'
                : 'bg-blue-600 hover:bg-blue-500'
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

interface PromptModalProps {
  isOpen: boolean;
  title: string;
  message?: string;
  defaultValue?: string;
  placeholder?: string;
  confirmText?: string;
  cancelText?: string;
  onSave: (value: string) => void;
  onCancel: () => void;
}

export const PromptModal: React.FC<PromptModalProps> = ({
  isOpen,
  title,
  message,
  defaultValue = '',
  placeholder = 'Enter value...',
  confirmText = 'Save',
  cancelText = 'Cancel',
  onSave,
  onCancel
}) => {
  const [inputValue, setInputValue] = useState(defaultValue);

  useEffect(() => {
    setInputValue(defaultValue);
  }, [defaultValue, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim()) {
      onSave(inputValue.trim());
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 animate-fadeIn">
      <form
        onSubmit={handleSubmit}
        className="bg-[#1F2937] border border-gray-700 rounded-xl p-5 max-w-md w-full space-y-4 shadow-2xl text-gray-100"
      >
        <div className="flex items-center justify-between border-b border-gray-700 pb-3">
          <h3 className="text-sm font-bold uppercase tracking-wider text-white">{title}</h3>
          <button
            type="button"
            onClick={onCancel}
            className="text-gray-400 hover:text-white p-1 rounded hover:bg-gray-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {message && <p className="text-xs text-gray-300 font-sans">{message}</p>}

        <div>
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={placeholder}
            autoFocus
            className="w-full bg-[#111827] border border-gray-600 text-amber-300 font-mono text-xs px-3 py-2 rounded outline-none focus:border-amber-400"
          />
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-gray-700/60">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded text-xs font-bold transition-all"
          >
            {cancelText}
          </button>
          <button
            type="submit"
            className="px-4 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded text-xs font-bold shadow transition-all active:scale-95"
          >
            {confirmText}
          </button>
        </div>
      </form>
    </div>
  );
};
