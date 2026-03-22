import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react';
import { cn } from '../lib/utils';

export type ToastType = 'success' | 'error' | 'info';

interface ToastProps {
  message: string;
  type: ToastType;
  isVisible: boolean;
  onClose: () => void;
}

export const Toast: React.FC<ToastProps> = ({ message, type, isVisible, onClose }) => {
  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => {
        onClose();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isVisible, onClose]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.9 }}
          className={cn(
            "fixed bottom-8 left-1/2 -translate-x-1/2 z-[200] flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl border min-w-[300px]",
            type === 'success' ? "bg-emerald-50 border-emerald-100 text-emerald-800 dark:bg-emerald-900/90 dark:border-emerald-800 dark:text-emerald-100" :
            type === 'error' ? "bg-red-50 border-red-100 text-red-800 dark:bg-red-900/90 dark:border-red-800 dark:text-red-100" :
            "bg-blue-50 border-blue-100 text-blue-800 dark:bg-blue-900/90 dark:border-blue-800 dark:text-blue-100"
          )}
        >
          <div className={cn(
            "p-1 rounded-full",
            type === 'success' ? "bg-emerald-500 text-white" :
            type === 'error' ? "bg-red-500 text-white" :
            "bg-blue-500 text-white"
          )}>
            {type === 'success' && <CheckCircle size={16} />}
            {type === 'error' && <AlertCircle size={16} />}
            {type === 'info' && <Info size={16} />}
          </div>
          <span className="text-sm font-bold flex-1">{message}</span>
          <button onClick={onClose} className="p-1 hover:bg-black/5 dark:hover:bg-white/5 rounded-lg transition-all">
            <X size={14} />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
