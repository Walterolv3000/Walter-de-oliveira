import React, { useState } from 'react';
import { X, Brain, Printer, Search, Check, FileText, Copy } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { FindingDetailsModal } from './FindingDetailsModal';

interface DetailedAnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  aiAnalysis: any;
  onPrint?: () => void;
  onSave?: () => void;
  onSelectFinding?: (finding: any) => void;
}

export const DetailedAnalysisModal: React.FC<DetailedAnalysisModalProps> = ({
  isOpen,
  onClose,
  aiAnalysis,
  onPrint = () => window.print(),
  onSave = () => {},
  onSelectFinding
}) => {
  const [localSelectedFinding, setLocalSelectedFinding] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [relevanceFilter, setRelevanceFilter] = useState("ALL");

  const filteredFindings = React.useMemo(() => {
    if (!aiAnalysis?.findings) return [];
    return aiAnalysis.findings.filter((f: any) => {
      const matchesSearch = 
        f.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
        f.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        f.event_type.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesRelevance = relevanceFilter === "ALL" || f.relevance === relevanceFilter;
      
      return matchesSearch && matchesRelevance;
    });
  }, [aiAnalysis, searchQuery, relevanceFilter]);

  const handleFindingClick = (finding: any) => {
    if (onSelectFinding) {
      onSelectFinding(finding);
      onClose();
    } else {
      setLocalSelectedFinding(finding);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && aiAnalysis && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
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
            className="relative w-full max-w-6xl bg-white dark:bg-neutral-900 rounded-2xl md:rounded-3xl shadow-2xl overflow-hidden border border-neutral-200 dark:border-neutral-800 flex flex-col h-full md:max-h-[90vh]"
          >
            <FindingDetailsModal 
              isOpen={!!localSelectedFinding} 
              onClose={() => setLocalSelectedFinding(null)} 
              finding={localSelectedFinding} 
            />
            <div className="p-4 md:p-6 border-b border-neutral-100 dark:border-neutral-800 flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white dark:bg-neutral-900 sticky top-0 z-10 gap-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-600/20">
                  <Brain size={18} className="md:w-[22px] md:h-[22px]" />
                </div>
                <div>
                  <h2 className="font-black text-xs md:text-sm uppercase tracking-widest">Análise Detalhada</h2>
                  <p className="text-[8px] md:text-[10px] text-neutral-400 uppercase font-bold tracking-wider">{aiAnalysis.classification}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <button 
                  onClick={() => {
                    const text = `
RELATÓRIO DE ANÁLISE DETALHADA
Classificação: ${aiAnalysis.classification}
Resumo: ${aiAnalysis.summary}
Palavras-Chave: ${(aiAnalysis?.keywords || []).join(', ')}

DESCOBERTAS:
${(aiAnalysis?.findings || []).map((f: any) => `- [${f.date}][${f.uf}] ${f.company}: ${f.description} (${f.relevance})`).join('\n')}
                    `;
                    navigator.clipboard.writeText(text);
                  }}
                  className="flex items-center gap-2 px-3 md:px-4 py-2 rounded-xl text-[10px] md:text-xs font-bold hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-all border border-neutral-100 dark:border-neutral-800"
                  title="Copiar Relatório para Área de Transferência"
                >
                  <Copy size={14} /> <span className="hidden xs:inline">Copiar</span>
                </button>
                <button 
                  onClick={onPrint}
                  className="flex items-center gap-2 px-3 md:px-4 py-2 rounded-xl text-[10px] md:text-xs font-bold hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-all border border-neutral-100 dark:border-neutral-800"
                >
                  <Printer size={14} /> <span className="hidden xs:inline">Imprimir</span>
                </button>
                <button onClick={onClose} className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-full transition-colors">
                  <X size={20} />
                </button>
              </div>
            </div>
            
            <div id="analysis-report-content" className="flex-1 overflow-y-auto p-4 md:p-8">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
                <div className="lg:col-span-2 space-y-6">
                  <section className="bg-neutral-50 dark:bg-neutral-800/50 p-6 rounded-2xl border border-neutral-200 dark:border-neutral-700">
                    <h3 className="text-[10px] font-black uppercase text-neutral-400 tracking-widest mb-4">Resumo Executivo</h3>
                    <p className="text-sm leading-relaxed text-neutral-600 dark:text-neutral-300">{aiAnalysis.summary}</p>
                  </section>
                </div>
                <div className="space-y-6">
                  <section className="bg-neutral-50 dark:bg-neutral-800/50 p-6 rounded-2xl border border-neutral-200 dark:border-neutral-700">
                    <h3 className="text-[10px] font-black uppercase text-neutral-400 tracking-widest mb-4">Palavras-Chave</h3>
                    <div className="flex flex-wrap gap-2">
                      {(aiAnalysis?.keywords || []).map((k: string, i: number) => (
                        <span key={i} className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 px-3 py-1.5 rounded-lg text-[10px] font-bold text-blue-600 uppercase tracking-wider">{k}</span>
                      ))}
                    </div>
                  </section>
                </div>
              </div>

              <div className="space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <h3 className="text-[10px] font-black uppercase text-neutral-400 tracking-widest">Eventos e Descobertas Identificadas</h3>
                    <span className="text-[10px] font-bold bg-blue-100 dark:bg-blue-900/30 text-blue-600 px-3 py-1 rounded-full uppercase tracking-widest">{filteredFindings?.length || 0} Itens</span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1 md:w-64">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={14} />
                      <input 
                        type="text" 
                        placeholder="Filtrar descobertas..."
                        className="w-full bg-neutral-100 dark:bg-neutral-800 border-none rounded-xl pl-9 pr-4 py-2 text-xs outline-none focus:ring-2 ring-blue-500/20 transition-all"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                    </div>
                    <select 
                      className="bg-neutral-100 dark:bg-neutral-800 border-none rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 ring-blue-500/20 transition-all"
                      value={relevanceFilter}
                      onChange={(e) => setRelevanceFilter(e.target.value)}
                    >
                      <option value="ALL">Todas</option>
                      <option value="HIGH">Alta</option>
                      <option value="MEDIUM">Média</option>
                      <option value="LOW">Baixa</option>
                    </select>
                  </div>
                </div>
                
                <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl md:rounded-3xl overflow-hidden shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[800px]">
                    <thead>
                      <tr className="bg-neutral-50 dark:bg-neutral-800/50 border-bottom border-neutral-200 dark:border-neutral-800">
                        <th className="px-6 py-4 text-[10px] font-black uppercase text-neutral-400 tracking-widest">Data/UF</th>
                        <th className="px-6 py-4 text-[10px] font-black uppercase text-neutral-400 tracking-widest">Empresa</th>
                        <th className="px-6 py-4 text-[10px] font-black uppercase text-neutral-400 tracking-widest">Categoria</th>
                        <th className="px-6 py-4 text-[10px] font-black uppercase text-neutral-400 tracking-widest">Evento</th>
                        <th className="px-6 py-4 text-[10px] font-black uppercase text-neutral-400 tracking-widest">Resumo</th>
                        <th className="px-6 py-4 text-[10px] font-black uppercase text-neutral-400 tracking-widest">Relevância</th>
                        <th className="px-6 py-4 text-[10px] font-black uppercase text-neutral-400 tracking-widest text-center">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                      {filteredFindings?.map((finding: any, i: number) => (
                        <tr 
                          key={i} 
                          onClick={() => handleFindingClick(finding)}
                          className="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/20 transition-colors group cursor-pointer"
                        >
                          <td className="px-6 py-6">
                            <div className="flex flex-col">
                              <span className="text-xs font-black text-neutral-900 dark:text-white">{finding.date}</span>
                              <span className="text-[10px] font-black text-blue-600 uppercase mt-0.5">{finding.uf}</span>
                            </div>
                          </td>
                          <td className="px-6 py-6">
                            <span className="text-xs font-black text-neutral-900 dark:text-white leading-tight block max-w-[200px]">{finding.company}</span>
                          </td>
                          <td className="px-6 py-6">
                            <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">{finding.category || '---'}</span>
                          </td>
                          <td className="px-6 py-6">
                            <span className="inline-block px-3 py-1 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600 text-[9px] font-black uppercase tracking-widest">
                              {finding.event_type}
                            </span>
                          </td>
                          <td className="px-6 py-6">
                            <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed max-w-[300px]">{finding.description}</p>
                          </td>
                          <td className="px-6 py-6">
                            <span className={cn(
                              "inline-block px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest",
                              finding.relevance === 'HIGH' ? "bg-red-50 dark:bg-red-900/20 text-red-600" :
                              finding.relevance === 'MEDIUM' ? "bg-orange-50 dark:bg-orange-900/20 text-orange-600" :
                              "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600"
                            )}>
                              {finding.relevance}
                            </span>
                          </td>
                          <td className="px-6 py-6">
                            <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg text-neutral-400 hover:text-blue-600 transition-all">
                                <Search size={14} />
                              </button>
                              <button className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg text-neutral-400 hover:text-blue-600 transition-all">
                                <Check size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>

          <div className="p-4 md:p-6 border-t border-neutral-100 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/50 flex flex-col sm:flex-row justify-end gap-3">
              <button 
                onClick={onClose}
                className="w-full sm:w-auto px-8 py-3 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-all border border-neutral-200 dark:border-neutral-700"
              >
                Fechar
              </button>
              <button 
                onClick={onSave}
                className="w-full sm:w-auto bg-blue-600 text-white px-8 py-3 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20"
              >
                Exportar Relatório
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
