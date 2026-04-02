import React from 'react';
import { Search, X, ChevronLeft, ChevronRight, FileText, Plus, ChevronDown, List } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

interface GroupedMatch {
  matches: { page: number, query: string, id?: string, occurrenceIndexOnPage?: number }[];
  currentIndex: number;
}

interface SearchTabProps {
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  searchFilters: {
    caseSensitive: boolean;
    pageRange: string;
    multipleKeywords: boolean;
    showAll: boolean;
  };
  setSearchFilters: (f: any) => void;
  handleSearch: () => void;
  handleClearAllSearch: () => void;
  fixedKeywords: string[];
  addFixedKeyword: () => void;
  addFixedKeywordsList: (list: string) => void;
  isBulkKeywordsModalOpen: boolean;
  setIsBulkKeywordsModalOpen: (open: boolean) => void;
  removeFixedKeyword: (kw: string) => void;
  removeNotFoundKeywords: () => void;
  groupedMatches: Record<string, GroupedMatch>;
  navigateKeywordMatch: (query: string, direction: 'next' | 'prev') => void;
  setCurrentPage: (p: number) => void;
  showHighlights: boolean;
  setShowHighlights: (show: boolean) => void;
}

export const SearchTab: React.FC<SearchTabProps> = React.memo(({
  searchQuery,
  setSearchQuery,
  searchFilters,
  setSearchFilters,
  handleSearch,
  handleClearAllSearch,
  fixedKeywords,
  addFixedKeyword,
  addFixedKeywordsList,
  isBulkKeywordsModalOpen,
  setIsBulkKeywordsModalOpen,
  removeFixedKeyword,
  removeNotFoundKeywords,
  groupedMatches,
  navigateKeywordMatch,
  setCurrentPage,
  showHighlights,
  setShowHighlights
}) => {
  const [collapsedKeywords, setCollapsedKeywords] = React.useState<Record<string, boolean>>({});

  const toggleCollapse = (query: string) => {
    setCollapsedKeywords(prev => ({
      ...prev,
      [query]: !prev[query]
    }));
  };

  return (
    <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="space-y-4">
      <div className="space-y-4">
        <div className="relative">
          <input 
            type="text" 
            placeholder="Buscar no documento..." 
            className="w-full bg-neutral-100 dark:bg-neutral-800 rounded-xl pl-10 pr-4 py-3 text-sm outline-none border-none focus:ring-2 ring-blue-500/20 transition-all"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
        </div>
        
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <input 
              type="checkbox" 
              id="caseSensitive"
              checked={searchFilters.caseSensitive}
              onChange={(e) => setSearchFilters({...searchFilters, caseSensitive: e.target.checked})}
              className="rounded text-blue-600 w-4 h-4"
            />
            <label htmlFor="caseSensitive" className="text-[10px] font-bold uppercase text-neutral-500 cursor-pointer tracking-wider">Diferenciar Maiúsculas</label>
          </div>
          
          <div className="flex items-center gap-2">
            <input 
              type="checkbox" 
              id="showAll"
              checked={searchFilters.showAll}
              onChange={(e) => setSearchFilters({...searchFilters, showAll: e.target.checked})}
              className="rounded text-blue-600 w-4 h-4"
            />
            <label htmlFor="showAll" className="text-[10px] font-bold uppercase text-neutral-500 cursor-pointer tracking-wider">Marcar Tudo</label>
          </div>

          <div className="flex items-center gap-2">
            <input 
              type="checkbox" 
              id="showHighlights"
              checked={showHighlights}
              onChange={(e) => setShowHighlights(e.target.checked)}
              className="rounded text-blue-600 w-4 h-4"
            />
            <label htmlFor="showHighlights" className="text-[10px] font-bold uppercase text-neutral-500 cursor-pointer tracking-wider">Mostrar Destaques</label>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button 
            onClick={() => handleSearch()}
            className="bg-blue-600 text-white py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-blue-700 transition-all shadow-md shadow-blue-600/20"
          >
            Buscar
          </button>
          <button 
            onClick={handleClearAllSearch}
            className="bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-neutral-200 transition-all"
          >
            Limpar
          </button>
        </div>

        {/* Fixed Keywords */}
        <div className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Palavras-Chave Fixas</span>
            <button 
              onClick={removeNotFoundKeywords}
              className="text-[10px] font-bold text-red-500 uppercase tracking-wider hover:text-red-600 transition-colors flex items-center gap-1"
              title="Remover palavras que não foram encontradas no documento"
            >
              <X size={10} />
              Limpar Não Encontradas
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {(fixedKeywords || []).map((kw, i) => {
              const hasMatches = (groupedMatches[kw]?.matches || []).length > 0;
              const searched = groupedMatches[kw] !== undefined;
              
              return (
              <div key={i} className={cn(
                "flex items-center gap-1 px-3 py-1.5 rounded-lg group border transition-all",
                searched 
                  ? hasMatches 
                    ? "bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-800" 
                    : "bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-800"
                  : "bg-neutral-50 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700"
              )}>
                <button 
                  onClick={() => handleSearch()}
                  className={cn(
                    "text-xs font-bold transition-colors",
                    searched
                      ? hasMatches ? "text-blue-600" : "text-red-500"
                      : "text-neutral-500"
                  )}
                >
                  {kw}
                </button>
                <button onClick={() => removeFixedKeyword(kw)} className="text-neutral-400 hover:text-red-500 transition-colors">
                  <X size={12} />
                </button>
              </div>
            );})}
          </div>
          
          <div className="grid grid-cols-2 gap-2">
            <button 
              onClick={addFixedKeyword}
              className="border-2 border-dashed border-neutral-200 dark:border-neutral-800 py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest text-neutral-400 hover:border-blue-500 hover:text-blue-600 transition-all flex items-center justify-center gap-2"
            >
              <Plus size={14} />
              Adicionar
            </button>
            <button 
              onClick={() => setIsBulkKeywordsModalOpen(true)}
              className="border-2 border-dashed border-neutral-200 dark:border-neutral-800 py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest text-neutral-400 hover:border-blue-500 hover:text-blue-600 transition-all flex items-center justify-center gap-2"
            >
              <List size={14} />
              Inserir Lista
            </button>
          </div>
        </div>
      </div>

      {/* Bulk Keywords Modal */}
      {isBulkKeywordsModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-neutral-200 dark:border-neutral-800"
          >
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold uppercase tracking-widest text-neutral-500">Inserir Lista de Palavras-Chave</h3>
                <button onClick={() => setIsBulkKeywordsModalOpen(false)} className="text-neutral-400 hover:text-red-500 transition-colors">
                  <X size={20} />
                </button>
              </div>
              
              <p className="text-[10px] text-neutral-400 uppercase font-bold tracking-wider">
                Insira as palavras separadas por vírgula, ponto e vírgula ou nova linha.
              </p>

              <textarea 
                id="bulk-keywords-input"
                className="w-full h-48 bg-neutral-50 dark:bg-neutral-800 rounded-xl p-4 text-sm outline-none border border-neutral-200 dark:border-neutral-700 focus:ring-2 ring-blue-500/20 transition-all resize-none"
                placeholder="Ex: contrato, cláusula, valor, data..."
              />

              <div className="flex gap-2 pt-2">
                <button 
                  onClick={() => setIsBulkKeywordsModalOpen(false)}
                  className="flex-1 py-3 rounded-xl text-xs font-bold uppercase tracking-wider text-neutral-500 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 transition-all"
                >
                  Cancelar
                </button>
                <button 
                  onClick={() => {
                    const input = document.getElementById('bulk-keywords-input') as HTMLTextAreaElement;
                    if (input) {
                      addFixedKeywordsList(input.value);
                      setIsBulkKeywordsModalOpen(false);
                    }
                  }}
                  className="flex-1 py-3 rounded-xl text-xs font-bold uppercase tracking-wider text-white bg-blue-600 hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20"
                >
                  Adicionar Lista
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      <div className="space-y-4 pt-4 border-t border-neutral-100 dark:border-neutral-800">
        <div className="flex justify-between items-center px-1">
          <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Resultados por Palavra-Chave</span>
        </div>
        
        {Object.entries(groupedMatches || {}).map(([query, data]) => {
          const groupData = data as GroupedMatch;
          const isCollapsed = collapsedKeywords[query];
          const hasMatches = (groupData.matches || []).length > 0;

          return (
          <div key={query} className="bg-neutral-50 dark:bg-neutral-800/50 rounded-xl border border-neutral-200 dark:border-neutral-700 overflow-hidden">
            <div className="p-3 flex items-center justify-between border-b border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900">
              <button 
                onClick={() => toggleCollapse(query)}
                className="flex items-center gap-2 flex-1 text-left"
              >
                <div className={cn(
                  "p-1 rounded-md transition-transform",
                  isCollapsed ? "-rotate-90" : "rotate-0"
                )}>
                  <ChevronDown size={14} className="text-neutral-400" />
                </div>
                <div className="flex flex-col">
                  <span className={cn(
                    "text-xs font-bold truncate max-w-[120px]",
                    hasMatches ? "text-blue-600" : "text-red-500"
                  )}>
                    {query}
                  </span>
                  <span className="text-[9px] text-neutral-400 font-bold uppercase tracking-tighter">{(groupData.matches || []).length} ocorrências</span>
                </div>
              </button>
              
              <div className="flex items-center gap-1">
                <button 
                  onClick={() => navigateKeywordMatch(query, 'prev')}
                  disabled={(groupData.matches || []).length === 0}
                  className="p-1 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-md text-neutral-500 disabled:opacity-30 transition-all"
                >
                  <ChevronLeft size={14} />
                </button>
                <span className="text-[10px] font-bold min-w-[3rem] text-center">
                  {(groupData.matches || []).length > 0 ? `${groupData.currentIndex + 1} / ${(groupData.matches || []).length}` : '0 / 0'}
                </span>
                <button 
                  onClick={() => navigateKeywordMatch(query, 'next')}
                  disabled={(groupData.matches || []).length === 0}
                  className="p-1 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-md text-neutral-500 disabled:opacity-30 transition-all"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
            
            {!isCollapsed && (
              <div className="max-h-40 overflow-y-auto p-2 space-y-1 custom-scrollbar">
                {(groupData.matches || []).length > 0 ? (
                  [...new Set((groupData.matches || []).map(m => m.page))].map((page, idx) => (
                    <button 
                      key={idx}
                      onClick={() => setCurrentPage(page)}
                      className="w-full text-left px-3 py-2 rounded-lg hover:bg-white dark:hover:bg-neutral-800 text-[10px] font-bold text-neutral-500 flex justify-between items-center group transition-all border border-transparent hover:border-neutral-200 dark:hover:border-neutral-700"
                    >
                      <div className="flex items-center gap-2">
                        <FileText size={12} className="text-neutral-400" />
                        <span>Página {page}</span>
                      </div>
                      <ChevronRight size={12} className="opacity-0 group-hover:opacity-100 transition-opacity text-blue-600" />
                    </button>
                  ))
                ) : (
                  <p className="text-[10px] text-neutral-400 text-center py-4 italic">Nenhum resultado</p>
                )}
              </div>
            )}
          </div>
        );})}

        {Object.keys(groupedMatches || {}).length === 0 && searchQuery && (
          <div className="text-center py-12">
            <Search size={32} className="mx-auto text-neutral-200 mb-3" />
            <p className="text-xs text-neutral-400">Nenhum resultado encontrado para "{searchQuery}"</p>
          </div>
        )}
      </div>
    </motion.div>
  );
});
