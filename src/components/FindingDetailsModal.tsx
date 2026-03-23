import React from 'react';
import { X, FileText, Download, Printer, Copy } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { safePrintHTML } from '../lib/printUtils';
import { cn } from '../lib/utils';

interface FindingDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGoToPage?: (page: number) => void;
  finding: any;
}

export const FindingDetailsModal: React.FC<FindingDetailsModalProps> = ({
  isOpen,
  onClose,
  onGoToPage,
  finding
}) => {
  if (!finding) return null;

  const handleGoToPage = () => {
    if (!finding.page || !onGoToPage) return;
    const pageNum = parseInt(finding.page);
    if (isNaN(pageNum)) {
      return;
    }
    onGoToPage(pageNum);
    onClose();
  };

  const handlePrintFinding = () => {
    safePrintHTML('finding-details-content', 'Detalhes da Descoberta');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
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
            id="finding-details-content"
            className="relative w-full max-w-2xl bg-white dark:bg-neutral-900 rounded-2xl md:rounded-[32px] shadow-2xl overflow-hidden border border-neutral-200 dark:border-neutral-800 flex flex-col h-full md:h-auto overflow-y-auto"
          >
            {/* Header */}
            <div className="p-4 md:p-6 bg-neutral-900 dark:bg-black text-white flex justify-between items-center sticky top-0 z-10 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-600/20">
                  <FileText size={18} className="md:w-[22px] md:h-[22px]" />
                </div>
                <div>
                  <h2 className="font-black text-[10px] md:text-xs uppercase tracking-[0.2em]">Detalhes da Descoberta</h2>
                  <p className="text-[8px] text-neutral-400 font-bold uppercase tracking-widest mt-0.5">Análise Técnica de Documento</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => {
                    const text = `
DETALHES DA DESCOBERTA
Empresa: ${finding.company}
Relevância: ${finding.relevance}
Trecho: ${finding.excerpt}
Análise: ${finding.description}
Categoria: ${finding.category}
Impacto: ${finding.impact_classification}
Recomendação: ${finding.recommended_action}
Página: ${finding.page}
Data: ${finding.date}
                    `;
                    navigator.clipboard.writeText(text);
                  }}
                  className="p-2 hover:bg-white/10 rounded-full transition-colors no-print"
                  title="Copiar Detalhes"
                >
                  <Copy size={18} />
                </button>
                <button 
                  onClick={handlePrintFinding}
                  className="p-2 hover:bg-white/10 rounded-full transition-colors no-print"
                  title="Imprimir Detalhes"
                >
                  <Printer size={18} />
                </button>
                <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors no-print">
                  <X size={20} />
                </button>
              </div>
            </div>
            
            <div className="p-4 md:p-8 space-y-6 md:space-y-8 flex-1">
              {/* Company and Relevance */}
              <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                <div>
                  <h3 className="text-[9px] md:text-[10px] font-black uppercase text-neutral-400 tracking-widest mb-1">Empresa / Interessado</h3>
                  <p className="text-lg md:text-xl font-black text-neutral-900 dark:text-white leading-tight">{finding.company}</p>
                </div>
                <div className="sm:text-right">
                  <h3 className="text-[9px] md:text-[10px] font-black uppercase text-neutral-400 tracking-widest mb-1">Relevância</h3>
                  <span className={cn(
                    "inline-block px-4 py-1 rounded-full text-[9px] md:text-[10px] font-black uppercase tracking-widest",
                    finding.relevance === 'HIGH' ? "bg-red-50 text-red-600" :
                    finding.relevance === 'MEDIUM' ? "bg-orange-50 text-orange-600" :
                    "bg-emerald-50 text-emerald-600"
                  )}>
                    {finding.relevance}
                  </span>
                </div>
              </div>

              {/* Excerpt */}
              <div className="relative">
                <div className="absolute -top-3 left-6 bg-white dark:bg-neutral-900 px-4 py-1 rounded-full border border-neutral-200 dark:border-neutral-800 z-10">
                  <span className="text-[9px] font-black text-blue-600 uppercase tracking-widest">Trecho Identificado</span>
                </div>
                <div className="bg-blue-50/30 dark:bg-blue-900/10 border border-blue-100/50 dark:border-blue-800/50 p-8 rounded-3xl italic text-sm text-neutral-600 dark:text-neutral-300 leading-relaxed">
                  "{finding.excerpt}"
                </div>
              </div>

              {/* AI Analysis */}
              <div>
                <h3 className="text-[10px] font-black uppercase text-neutral-400 tracking-widest mb-3">Análise Técnica (IA)</h3>
                <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
                  {finding.description}
                </p>
              </div>

              <div className="h-px bg-neutral-100 dark:bg-neutral-800" />

              {/* Metadata Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-8">
                <div>
                  <h3 className="text-[9px] md:text-[10px] font-black uppercase text-neutral-400 tracking-widest mb-1">Categoria</h3>
                  <p className="text-xs md:text-sm font-black text-blue-600 uppercase">{finding.category || '---'}</p>
                </div>
                <div>
                  <h3 className="text-[9px] md:text-[10px] font-black uppercase text-neutral-400 tracking-widest mb-1">Impacto</h3>
                  <p className="text-xs md:text-sm font-black text-neutral-900 dark:text-white">{finding.impact_classification || '---'}</p>
                </div>
                <div>
                  <h3 className="text-[9px] md:text-[10px] font-black uppercase text-neutral-400 tracking-widest mb-1">Ação Recomendada</h3>
                  <p className="text-xs md:text-sm font-black text-emerald-600">{finding.recommended_action || '---'}</p>
                </div>
              </div>

              <div className="h-px bg-neutral-100 dark:bg-neutral-800" />

              {/* Metadata Grid 2 */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-8">
                <div>
                  <h3 className="text-[9px] md:text-[10px] font-black uppercase text-neutral-400 tracking-widest mb-1">Portaria / Ato</h3>
                  <p className="text-xs md:text-sm font-black text-neutral-900 dark:text-white">{finding.portaria_ato || '---'}</p>
                </div>
                <div>
                  <h3 className="text-[9px] md:text-[10px] font-black uppercase text-neutral-400 tracking-widest mb-1">Página DOE</h3>
                  <p className="text-xs md:text-sm font-black text-neutral-900 dark:text-white">{finding.page || '---'}</p>
                </div>
                <div>
                  <h3 className="text-[9px] md:text-[10px] font-black uppercase text-neutral-400 tracking-widest mb-1">Publicação</h3>
                  <p className="text-xs md:text-sm font-black text-neutral-900 dark:text-white">{finding.date}</p>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 md:p-6 border-t border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-800/50 flex flex-col sm:flex-row justify-end gap-2 md:gap-3 no-print sticky bottom-0 z-10">
              <button 
                onClick={onClose}
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl font-bold text-[10px] md:text-xs uppercase tracking-widest border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-all"
              >
                Fechar
              </button>
              <button 
                onClick={handleGoToPage}
                className="w-full sm:w-auto bg-blue-600 text-white px-6 py-2.5 rounded-xl font-bold text-[10px] md:text-xs uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2"
              >
                <FileText size={14} />
                Ver no Leitor
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
