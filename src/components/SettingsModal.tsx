import React from 'react';
import { X, Settings, Plus, Trash2, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { AIProvider } from '../services/aiService';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  apiKeys: { id: string, name: string, key: string, provider: AIProvider }[];
  setApiKeys: (keys: { id: string, name: string, key: string, provider: AIProvider }[]) => void;
  selectedApiKeyId: string;
  setSelectedApiKeyId: (id: string) => void;
  onConfirmAction?: (config: { title: string, message: string, onConfirm: () => void, variant?: 'danger' | 'warning' | 'info' }) => void;
  onInstallApp?: () => void;
  canInstallApp?: boolean;
}

export const SettingsModal: React.FC<SettingsModalProps> = React.memo(({
  isOpen,
  onClose,
  apiKeys,
  setApiKeys,
  selectedApiKeyId,
  setSelectedApiKeyId,
  onConfirmAction,
  onInstallApp,
  canInstallApp
}) => {
  const [newName, setNewName] = React.useState("");
  const [newKey, setNewKey] = React.useState("");
  const [newProvider, setNewProvider] = React.useState<AIProvider>("gemini");

  const handleAddCompany = () => {
    if (newName && newKey) {
      const newEntry = { 
        id: crypto.randomUUID(), 
        name: newName, 
        key: newKey,
        provider: newProvider
      };
      setApiKeys([...apiKeys, newEntry]);
      if (!selectedApiKeyId) setSelectedApiKeyId(newEntry.id);
      setNewName("");
      setNewKey("");
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          <motion.div 
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="relative w-full max-w-lg bg-white dark:bg-neutral-900 rounded-2xl md:rounded-3xl shadow-2xl overflow-hidden border border-neutral-200 dark:border-neutral-800 flex flex-col max-h-[90vh]"
          >
            <div className="p-4 md:p-6 border-b border-neutral-100 dark:border-neutral-800 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white">
                  <Settings size={18} />
                </div>
                <h2 className="font-black text-[10px] md:text-xs uppercase tracking-widest">Configurações</h2>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-4 md:p-6 space-y-6 overflow-y-auto flex-1">
              <div className="bg-neutral-50 dark:bg-neutral-800/50 p-4 rounded-2xl border border-neutral-200 dark:border-neutral-700 space-y-3">
                <h3 className="text-[10px] font-black uppercase text-neutral-400 tracking-widest">Adicionar Nova Empresa/Chave</h3>
                <div className="grid grid-cols-2 gap-2">
                  <input 
                    type="text" 
                    placeholder="Nome da Empresa" 
                    className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg px-3 py-2 text-xs outline-none focus:ring-2 ring-blue-500/20"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                  />
                  <select 
                    className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg px-3 py-2 text-xs outline-none focus:ring-2 ring-blue-500/20"
                    value={newProvider}
                    onChange={(e) => setNewProvider(e.target.value as AIProvider)}
                  >
                    <option value="gemini">Google Gemini</option>
                    <option value="kimi">Moonshot Kimi</option>
                    <option value="openai">OpenAI GPT-4o</option>
                    <option value="claude">Anthropic Claude</option>
                  </select>
                </div>
                <input 
                  type="password" 
                  placeholder="API Key" 
                  className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg px-3 py-2 text-xs outline-none focus:ring-2 ring-blue-500/20"
                  value={newKey}
                  onChange={(e) => setNewKey(e.target.value)}
                />
                <button 
                  onClick={handleAddCompany}
                  className="w-full bg-neutral-900 dark:bg-white dark:text-neutral-900 text-white py-2 rounded-lg text-[10px] font-black uppercase tracking-widest hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                >
                  <Plus size={14} /> Adicionar Empresa
                </button>
              </div>

              <div className="space-y-2">
                <h3 className="text-[10px] font-black uppercase text-neutral-400 tracking-widest">Empresas Salvas</h3>
                {apiKeys.length === 0 && <p className="text-xs text-neutral-400 italic text-center py-4">Nenhuma empresa cadastrada.</p>}
                {(apiKeys || []).map((k) => (
                  <div 
                    key={k.id}
                    className={cn(
                      "flex items-center justify-between p-3 rounded-xl border transition-all",
                      selectedApiKeyId === k.id 
                        ? "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800" 
                        : "bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800"
                    )}
                  >
                    <button 
                      onClick={() => setSelectedApiKeyId(k.id)}
                      className="flex-1 text-left flex items-center gap-3"
                    >
                      <div className={cn(
                        "w-4 h-4 rounded-full border-2 flex items-center justify-center",
                        selectedApiKeyId === k.id ? "border-blue-600 bg-blue-600" : "border-neutral-300"
                      )}>
                        {selectedApiKeyId === k.id && <Check size={10} className="text-white" />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-bold">{k.name}</p>
                          <span className="text-[8px] px-1.5 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-500 font-black uppercase tracking-tighter">
                            {k.provider}
                          </span>
                        </div>
                        <p className="text-[10px] text-neutral-400 font-mono">••••••••{k.key.slice(-4)}</p>
                      </div>
                    </button>
                    <button 
                      onClick={() => {
                        if (onConfirmAction) {
                          onConfirmAction({
                            title: 'Remover Empresa',
                            message: `Tem certeza que deseja remover a chave da empresa "${k.name}"?`,
                            variant: 'danger',
                            onConfirm: () => {
                              setApiKeys(apiKeys.filter(item => item.id !== k.id));
                              if (selectedApiKeyId === k.id) setSelectedApiKeyId("");
                            }
                          });
                        } else {
                          // Fallback if no confirm action provided
                          setApiKeys(apiKeys.filter(item => item.id !== k.id));
                          if (selectedApiKeyId === k.id) setSelectedApiKeyId("");
                        }
                      }}
                      className="p-2 text-neutral-400 hover:text-red-500 transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>

              <div className="bg-blue-50 dark:bg-blue-900/10 p-4 rounded-2xl border border-blue-100 dark:border-blue-900/30 space-y-2">
                <h3 className="text-[10px] font-black uppercase text-blue-600 dark:text-blue-400 tracking-widest">Aplicativo Desktop (PWA)</h3>
                <p className="text-[10px] text-blue-800/70 dark:text-blue-300/70 leading-relaxed">
                  Instale o PDF Master AI para acesso rápido na área de trabalho e barra de tarefas.
                </p>
                {canInstallApp ? (
                  <button 
                    onClick={onInstallApp}
                    className="w-full bg-blue-600 text-white py-2 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 transition-all flex items-center justify-center gap-2 shadow-md shadow-blue-600/20"
                  >
                    Instalar Aplicativo
                  </button>
                ) : (
                  <div className="bg-white/50 dark:bg-black/20 p-2 rounded-lg border border-blue-200/50 dark:border-blue-800/30">
                    <p className="text-[9px] font-medium text-blue-900 dark:text-blue-100 text-center italic">
                      O aplicativo já está instalado ou não é suportado neste navegador.
                    </p>
                  </div>
                )}
              </div>

              <div className="bg-neutral-50 dark:bg-neutral-800/20 p-4 rounded-2xl border border-neutral-200 dark:border-neutral-800 space-y-2">
                <p className="text-[10px] text-blue-800/70 dark:text-blue-300/70 leading-relaxed">
                  Você pode gerar um executável (.exe) para usar este app no Windows sem instalar nada.
                </p>
                <div className="bg-white/50 dark:bg-black/20 p-2 rounded-lg border border-blue-200/50 dark:border-blue-800/30">
                  <p className="text-[9px] font-medium text-blue-900 dark:text-blue-100">
                    Para baixar o executável:
                  </p>
                  <ol className="text-[9px] text-blue-800/80 dark:text-blue-300/80 list-decimal list-inside mt-1 space-y-1">
                    <li>Exporte o projeto como ZIP (Menu Configurações do AI Studio)</li>
                    <li>Instale o Node.js no seu PC</li>
                    <li>Abra o terminal na pasta e digite: <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">npm run build:exe</code></li>
                    <li>O arquivo estará na pasta <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">bin/</code></li>
                  </ol>
                </div>
              </div>
            </div>

            <div className="p-4 md:p-6 bg-neutral-50 dark:bg-neutral-800/50 flex justify-end">
              <button 
                onClick={onClose}
                className="w-full sm:w-auto bg-blue-600 text-white px-8 py-3 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20"
              >
                Concluído
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
});
