import React, { useState, useEffect } from 'react';
import { X, Brain, RotateCcw, Check, Copy } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

interface PromptEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  prompt: string;
  onSave: (newPrompt: string) => void;
  presets: { name: string, prompt: string }[];
}

export const PromptEditorModal: React.FC<PromptEditorModalProps> = React.memo(({
  isOpen,
  onClose,
  prompt,
  onSave,
  presets
}) => {
  const [tempPrompt, setTempPrompt] = useState(prompt);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setTempPrompt(prompt);
    }
  }, [isOpen, prompt]);

  const handleCopy = () => {
    navigator.clipboard.writeText(tempPrompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

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
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            className="relative w-full max-w-3xl bg-white dark:bg-neutral-900 rounded-[32px] shadow-2xl overflow-hidden border border-neutral-200 dark:border-neutral-800 flex flex-col max-h-[90vh]"
          >
            <div className="p-6 border-b border-neutral-100 dark:border-neutral-800 flex justify-between items-center bg-white dark:bg-neutral-900 sticky top-0 z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-600/20">
                  <Brain size={22} />
                </div>
                <div>
                  <h2 className="font-black text-sm uppercase tracking-widest">Editor de Prompt</h2>
                  <p className="text-[10px] text-neutral-400 uppercase font-bold tracking-wider">Personalize o comportamento da IA</p>
                </div>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 space-y-8">
              <section className="space-y-4">
                <h3 className="text-[10px] font-black uppercase text-neutral-400 tracking-widest">Presets Rápidos</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {(presets || []).map((preset) => (
                    <button
                      key={preset.name}
                      onClick={() => setTempPrompt(preset.prompt)}
                      className={cn(
                        "p-4 rounded-2xl text-left transition-all border flex flex-col gap-2",
                        tempPrompt === preset.prompt
                          ? "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 ring-2 ring-blue-500/20"
                          : "bg-neutral-50 dark:bg-neutral-800/50 border-neutral-100 dark:border-neutral-700 hover:border-blue-300"
                      )}
                    >
                      <span className="text-[10px] font-black uppercase tracking-widest text-blue-600">{preset.name}</span>
                      <p className="text-[10px] text-neutral-500 line-clamp-2 leading-relaxed">{preset.prompt}</p>
                    </button>
                  ))}
                </div>
              </section>

              <section className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-[10px] font-black uppercase text-neutral-400 tracking-widest">Prompt Customizado</h3>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={handleCopy}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-all"
                    >
                      {copied ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                      {copied ? 'Copiado' : 'Copiar'}
                    </button>
                    <button 
                      onClick={() => setTempPrompt(prompt)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-all"
                    >
                      <RotateCcw size={12} />
                      Resetar
                    </button>
                  </div>
                </div>
                <textarea 
                  className="w-full h-64 bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700 rounded-3xl p-6 text-sm outline-none focus:ring-4 ring-blue-500/10 transition-all resize-none leading-relaxed"
                  value={tempPrompt}
                  onChange={(e) => setTempPrompt(e.target.value)}
                  placeholder="Escreva aqui as instruções detalhadas para o agente..."
                />
                <div className="flex justify-between items-center px-2">
                  <p className="text-[10px] text-neutral-400 italic">O prompt define como a IA analisa o documento e responde no chat.</p>
                  <span className="text-[10px] font-bold text-neutral-300">{tempPrompt.length} caracteres</span>
                </div>
              </section>
            </div>

            <div className="p-6 border-t border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-800/20 flex justify-end gap-3">
              <button 
                onClick={onClose}
                className="px-6 py-3 rounded-2xl text-xs font-bold text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-all"
              >
                Cancelar
              </button>
              <button 
                onClick={() => {
                  onSave(tempPrompt);
                  onClose();
                }}
                className="px-8 py-3 bg-blue-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-xl shadow-blue-600/20"
              >
                Salvar Alterações
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
});
