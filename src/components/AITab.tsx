import React from 'react';
import { Brain, Pencil, Trash2, Plus, RotateCcw, FileText, Loader2, Send, Copy, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

interface AITabProps {
  prompts: any[];
  selectedPromptId: string;
  setSelectedPromptId: (id: string) => void;
  handleEditPrompt: (p: any) => void;
  handleDeletePrompt: (id: string) => void;
  handleAddPrompt: () => void;
  handleResetPrompts: () => void;
  handleClearAnalysis: () => void;
  handleAiAnalyze: () => void;
  isAiAnalyzing: boolean;
  pdfUrl: string;
  fullText: string;
  setIsDetailedAnalysisOpen: (o: boolean) => void;
  aiAnalysis: any;
  setSelectedFinding: (f: any) => void;
  setCurrentPage: (p: number) => void;
  chatMessages: any[];
  isChatLoading: boolean;
  userInput: string;
  setUserInput: (i: string) => void;
  handleSendMessage: (overrideInput?: string) => void;
  chatEndRef: React.RefObject<HTMLDivElement | null>;
  isOnline: boolean;
}

export const AITab: React.FC<AITabProps> = React.memo(({
  prompts,
  selectedPromptId,
  setSelectedPromptId,
  handleEditPrompt,
  handleDeletePrompt,
  handleAddPrompt,
  handleResetPrompts,
  handleClearAnalysis,
  handleAiAnalyze,
  isAiAnalyzing,
  pdfUrl,
  fullText,
  setIsDetailedAnalysisOpen,
  aiAnalysis,
  setSelectedFinding,
  setCurrentPage,
  chatMessages,
  isChatLoading,
  userInput,
  setUserInput,
  handleSendMessage,
  chatEndRef,
  isOnline
}) => {
  return (
    <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="space-y-6">
      {/* Prompt Selection List */}
      <div className="space-y-3">
        {(prompts || []).map((p) => {
          const isSelected = selectedPromptId === p.id;
          return (
            <div 
              key={p.id}
              className={cn(
                "relative rounded-2xl border transition-all duration-300 overflow-hidden",
                isSelected 
                  ? "bg-white dark:bg-neutral-900 border-blue-500 shadow-lg shadow-blue-500/10" 
                  : "bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 hover:border-neutral-300"
              )}
            >
              <div className="p-4 flex items-start gap-3">
                <button 
                  onClick={() => setSelectedPromptId(p.id)}
                  className={cn(
                    "mt-1 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all",
                    isSelected ? "border-blue-500 bg-blue-500" : "border-neutral-200 dark:border-neutral-700"
                  )}
                >
                  {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                </button>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className={cn("text-xs font-bold uppercase tracking-wider", isSelected ? "text-blue-600" : "text-neutral-700 dark:text-neutral-300")}>
                        {p.name}
                      </span>
                      {p.isDefault && (
                        <span className="text-[9px] font-bold text-neutral-400 uppercase tracking-tighter">(padrão)</span>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-1">
                      <button 
                        onClick={() => handleEditPrompt(p)}
                        className="p-1.5 text-neutral-400 hover:text-blue-600 transition-colors"
                      >
                        <Pencil size={14} />
                      </button>
                      <button 
                        onClick={() => handleDeletePrompt(p.id)}
                        className="p-1.5 text-neutral-400 hover:text-red-500 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                  
                  <AnimatePresence>
                    {isSelected && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <p className="text-[10px] text-neutral-500 dark:text-neutral-400 leading-relaxed mt-2 line-clamp-4">
                          {p.prompt}
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>
          );
        })}

        <div className="flex gap-2">
          <button 
            onClick={handleAddPrompt}
            className="flex-1 border-2 border-dashed border-neutral-200 dark:border-neutral-800 rounded-2xl py-4 text-xs font-bold text-neutral-400 hover:border-blue-500 hover:text-blue-600 transition-all flex items-center justify-center gap-2"
          >
            <Plus size={16} />
            Novo prompt
          </button>
          <button 
            onClick={handleResetPrompts}
            className="px-4 border-2 border-dashed border-neutral-200 dark:border-neutral-800 rounded-2xl py-4 text-xs font-bold text-neutral-400 hover:border-orange-500 hover:text-orange-600 transition-all flex items-center justify-center"
            title="Resetar para padrões"
          >
            <RotateCcw size={16} />
          </button>
        </div>
      </div>

      <div className="pt-4 border-t border-neutral-100 dark:border-neutral-800 space-y-3">
        {!isOnline && (
          <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-2xl border border-amber-100 dark:border-amber-800 flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-amber-500 flex items-center justify-center text-white flex-shrink-0 animate-pulse">
              <Brain size={14} />
            </div>
            <p className="text-[10px] font-bold text-amber-700 dark:text-amber-400 leading-tight">
              O chat e a análise com IA requerem conexão com a internet.
            </p>
          </div>
        )}
        <div className="flex gap-2">
          <button 
            onClick={handleAiAnalyze}
            disabled={isAiAnalyzing || !pdfUrl || !fullText || !isOnline}
            className="flex-1 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-neutral-500 py-3.5 rounded-2xl text-xs font-bold uppercase tracking-widest hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isAiAnalyzing ? <Loader2 size={16} className="animate-spin text-blue-600" /> : <RotateCcw size={16} className="text-neutral-400" />}
            Analisar
          </button>
          {aiAnalysis && (
            <button 
              onClick={handleClearAnalysis}
              className="px-4 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-red-500 py-3.5 rounded-2xl text-xs font-bold hover:bg-red-50 dark:hover:bg-red-900/20 transition-all flex items-center justify-center"
              title="Limpar Análise"
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>

        <button 
          onClick={() => setIsDetailedAnalysisOpen(true)}
          className="w-full bg-blue-200 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 py-3.5 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-blue-300 dark:hover:bg-blue-800 transition-all flex items-center justify-center gap-2 shadow-sm"
        >
          <FileText size={16} /> Ver Análise Detalhada
        </button>
      </div>

      {aiAnalysis && (
        <div className="space-y-6">
          <section className="bg-white dark:bg-neutral-900 p-4 rounded-2xl border border-neutral-100 dark:border-neutral-800 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[10px] font-black uppercase text-neutral-400 tracking-widest">Classificação</h3>
              <div className="bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border border-blue-100 dark:border-blue-800">
                {aiAnalysis.classification}
              </div>
            </div>
            
            <div className="space-y-4">
              <div>
                <h4 className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest mb-1.5">Resumo Executivo</h4>
                <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
                  {aiAnalysis.summary}
                </p>
              </div>

              <div>
                <h4 className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest mb-1.5">Palavras-Chave</h4>
                <div className="flex flex-wrap gap-1.5">
                  {(aiAnalysis?.keywords || []).map((k: string, i: number) => (
                    <span key={i} className="bg-neutral-50 dark:bg-neutral-800 px-2 py-1 rounded-md text-[9px] font-bold text-neutral-500 border border-neutral-100 dark:border-neutral-700 uppercase tracking-wider">
                      {k}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-[10px] font-black uppercase text-neutral-400 tracking-widest">Principais Descobertas</h3>
              <span className="text-[9px] font-bold text-blue-600 bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded-full">{(aiAnalysis?.findings || []).length} itens</span>
            </div>
            
            <div className="space-y-3">
              {(aiAnalysis?.findings || []).slice(0, 3).map((f: any, i: number) => (
                <div key={i} className="bg-white dark:bg-neutral-900 p-4 rounded-2xl border border-neutral-100 dark:border-neutral-800 shadow-sm hover:border-blue-200 transition-all group">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[9px] font-black text-blue-600 uppercase tracking-widest">{f.event_type}</span>
                    <span className={cn(
                      "text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full",
                      f.relevance === 'HIGH' ? "bg-red-50 text-red-600 dark:bg-red-900/20" : 
                      f.relevance === 'MEDIUM' ? "bg-orange-50 text-orange-600 dark:bg-orange-900/20" : 
                      "bg-blue-50 text-blue-600 dark:bg-blue-900/20"
                    )}>
                      {f.relevance}
                    </span>
                  </div>
                  <p className="text-xs font-bold mb-1 line-clamp-1">{f.company}</p>
                  <p className="text-[10px] text-neutral-500 dark:text-neutral-400 line-clamp-2 leading-relaxed mb-3">
                    {f.description}
                  </p>
                  <div className="flex items-center justify-between pt-3 border-t border-neutral-50 dark:border-neutral-800">
                    <span className="text-[9px] font-bold text-neutral-400">{f.date}</span>
                    <button className="text-[9px] font-black text-blue-600 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-all">
                      Ver Detalhes
                    </button>
                  </div>
                </div>
              ))}
              
              {(aiAnalysis?.findings || []).length > 3 && (
                <button 
                  onClick={() => setIsDetailedAnalysisOpen(true)}
                  className="w-full py-3 text-[10px] font-black text-neutral-400 uppercase tracking-widest hover:text-blue-600 transition-all"
                >
                  + {(aiAnalysis?.findings || []).length - 3} outras descobertas
                </button>
              )}
            </div>
          </section>

          <div className="pt-6 border-t border-neutral-100 dark:border-neutral-800">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-6 h-6 rounded-lg bg-blue-600 flex items-center justify-center text-white">
                <Brain size={14} />
              </div>
              <h3 className="text-[10px] font-black uppercase text-neutral-400 tracking-widest">Chat com Documento</h3>
            </div>

            <div className="bg-neutral-50 dark:bg-neutral-800/50 rounded-[24px] p-4 border border-neutral-200 dark:border-neutral-700">
              <div className="space-y-4 mb-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar flex flex-col">
                {(chatMessages || []).length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-[10px] text-neutral-400 italic">Faça uma pergunta específica sobre o conteúdo.</p>
                  </div>
                ) : (
                  (chatMessages || []).map((msg: any, i: number) => (
                    <div 
                      key={i} 
                      className={cn(
                        "max-w-[85%] p-3 rounded-2xl text-xs leading-relaxed shadow-sm",
                        msg.role === 'user' 
                          ? "bg-blue-600 text-white self-end rounded-tr-none" 
                          : "bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 self-start rounded-tl-none border border-neutral-100 dark:border-neutral-800"
                      )}
                    >
                      {msg.content}
                      <span className="block text-[8px] mt-1 opacity-50 font-bold uppercase tracking-tighter">
                        {msg.role === 'user' ? 'Você' : 'Assistente IA'}
                      </span>
                    </div>
                  ))
                )}
                {isChatLoading && (
                  <div className="flex items-center gap-2 text-neutral-400 italic text-[10px] animate-pulse">
                    <Loader2 size={12} className="animate-spin" />
                    <span>IA está pensando...</span>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              <div className="relative">
                <input 
                  type="text" 
                  placeholder={isOnline ? "Pergunte algo sobre o documento..." : "Sem conexão com a internet..."}
                  className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl pl-4 pr-12 py-3 text-xs outline-none focus:ring-2 ring-blue-500/20 transition-all shadow-sm"
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                  disabled={isChatLoading || !isOnline}
                />
                <button 
                  onClick={() => handleSendMessage()}
                  disabled={!userInput.trim() || isChatLoading || !isOnline}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all disabled:opacity-50 disabled:hover:bg-blue-600"
                >
                  <Send size={14} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
});
