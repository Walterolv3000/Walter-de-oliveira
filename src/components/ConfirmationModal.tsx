import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle, X } from 'lucide-react';
import { cn } from '../lib/utils';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  variant = 'danger'
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-md bg-white dark:bg-neutral-900 rounded-3xl shadow-2xl border border-neutral-100 dark:border-neutral-800 overflow-hidden"
          >
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className={cn(
                  "p-3 rounded-2xl",
                  variant === 'danger' ? "bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400" :
                  variant === 'warning' ? "bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400" :
                  "bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
                )}>
                  <AlertTriangle size={24} />
                </div>
                <button
                  onClick={onClose}
                  className="p-2 text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl transition-all"
                >
                  <X size={20} />
                </button>
              </div>

              <h3 className="text-xl font-bold mb-2">{title}</h3>
              <p className="text-neutral-500 dark:text-neutral-400 text-sm leading-relaxed">
                {message}
              </p>
            </div>

            <div className="p-6 bg-neutral-50 dark:bg-neutral-800/50 flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-3 rounded-xl font-bold text-sm text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-all"
              >
                {cancelText}
              </button>
              <button
                onClick={() => {
                  onConfirm();
                  onClose();
                }}
                className={cn(
                  "flex-1 px-4 py-3 rounded-xl font-bold text-sm text-white transition-all shadow-lg",
                  variant === 'danger' ? "bg-red-600 hover:bg-red-700 shadow-red-500/20" :
                  variant === 'warning' ? "bg-amber-600 hover:bg-amber-700 shadow-amber-500/20" :
                  "bg-blue-600 hover:bg-blue-700 shadow-blue-500/20"
                )}
              >
                {confirmText}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
