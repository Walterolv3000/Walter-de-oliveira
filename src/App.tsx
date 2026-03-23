import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { 
  FileText, Search, Brain, ChevronLeft, ChevronRight, 
  ZoomIn, ZoomOut, Download, Printer,
  Send, Loader2, Menu, X, Sun, Moon, Highlighter, EyeOff, Eye,
  ChevronUp, ChevronDown, Settings, Plus, Trash2, Check, Eraser,
  ArrowUpDown, MoreVertical, Filter, PanelRightOpen, PanelRightClose, PanelRight, PanelLeft,
  LayoutList, Copy, Pencil, RotateCcw
} from 'lucide-react';
import { safePrintPDF, safePrintHTML } from './lib/printUtils';
import { PDFViewer } from './components/PDFViewer';
import { DetailedAnalysisModal } from './components/DetailedAnalysisModal';
import { FindingDetailsModal } from './components/FindingDetailsModal';
import { SettingsModal } from './components/SettingsModal';
import { PromptEditorModal } from './components/PromptEditorModal';
import { SearchTab } from './components/SearchTab';
import { AITab } from './components/AITab';
import { analyzeDocument, chatWithDocument, AIProvider } from './services/aiService';
import { ConfirmationModal } from './components/ConfirmationModal';
import { Toast, ToastType } from './components/Toast';
import { editPdf } from './services/pdfService';
import { cn } from './lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { Login } from './components/Login';
import { AdminDashboard } from './components/AdminDashboard';
import { LogOut, ShieldCheck } from 'lucide-react';

const DEFAULT_PROMPTS = [
  { id: 'padrão', name: 'Padrão', prompt: 'Você é um especialista em análise de documentos. Extraia informações relevantes, identifique empresas, datas e eventos importantes. Seja preciso e detalhado.', isDefault: true },
  { id: 'detran', name: 'DETRAN', prompt: `Você é um especialista em análise de documentos oficiais, regulatórios e jurídicos, com foco em identificar informações relevantes dentro de documentos longos como Diários Oficiais, resoluções, portarias e contratos.

OBJETIVO

Analise cuidadosamente todo o conteúdo do PDF fornecido e identifique informações relevantes com base nas palavras-chave e no contexto do documento.

INSTRUÇÕES DE ANÁLISE

1. Leia todo o conteúdo do documento.
2. Identifique palavras-chave ou termos relacionados ao tema analisado.
3. Analise o contexto onde essas palavras aparecem.
4. Ignore ocorrências que não tenham relevância prática ou operacional.
5. Quando encontrar algo relevante, realize uma análise contextual completa.

PALAVRAS-CHAVE A SEREM MONITORADAS

credenciamento  
recredenciamento  
registradora  
registro eletrônico  
gravame  
alienação fiduciária  
contrato de financiamento  
detran  
portaria  
resolução  
norma  
atualização de valores  
preço público  
unidade fiscal  
taxa  
regulamentação  

CRITÉRIOS DE RELEVÂNCIA

Considere relevante quando houver:

• mudança de valores ou taxas  
• alteração de normas ou procedimentos  
• abertura ou renovação de credenciamento  
• novas regras operacionais  
• impacto para registradoras de contratos  
• decisões administrativas que afetem o setor  

FORMATO DA RESPOSTA

Para cada ocorrência encontrada apresente:

PALAVRA IDENTIFICADA:
(palavra encontrada)

PÁGINA:
(número da página no documento)

TRECHO DO DOCUMENTO:
(copie o trecho relevante)

ANÁLISE DA IA:
(interpretação do que significa a informação)

NÍVEL DE RELEVÂNCIA:
Alta / Média / Baixa

IMPACTO OPERACIONAL:
(explique se isso impacta empresas, registradoras ou processos)

RESUMO:
(resuma a informação em poucas linhas)

RECOMENDAÇÃO:
(sugira ação ou monitoramento se necessário)

REGRAS IMPORTANTES

• Não invente informações.
• Analise apenas o que realmente aparece no documento.
• Ignore ocorrências fora de contexto.
• Priorize qualidade da análise em vez de quantidade de resultados.
• Caso não encontre informações relevantes, informe claramente.

Se o documento for muito grande, priorize as partes com maior probabilidade de conter decisões administrativas, portarias, resoluções ou alterações regulatórias.`, isDefault: true },
  { id: 'jurídico', name: 'Jurídico', prompt: 'Analise este documento sob uma perspectiva jurídica. Identifique cláusulas, obrigações, prazos, partes envolvidas e possíveis riscos legais.', isDefault: true },
  { id: 'financeiro', name: 'Financeiro', prompt: 'Foque nos aspectos financeiros: valores, datas de vencimento, contas bancárias, impostos e condições de pagamento.', isDefault: true },
  { id: 'resumo', name: 'Resumo', prompt: 'Crie um resumo executivo conciso destacando apenas os pontos mais críticos para a tomada de decisão.', isDefault: true }
];

interface PromptItem {
  id: string;
  name: string;
  prompt: string;
  isDefault?: boolean;
}

interface GroupedMatch {
  matches: { page: number, query: string, id?: string, occurrenceIndexOnPage?: number }[];
  currentIndex: number;
}

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('auth_token'));
  const [isAdminView, setIsAdminView] = useState(false);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  const [file, setFile] = useState<File | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [docId, setDocId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageInputValue, setPageInputValue] = useState("1");
  const [zoom, setZoom] = useState(1.0);
  const [thumbnails, setThumbnails] = useState<string[]>([]);
  const [fullText, setFullText] = useState("");
  const pages = useMemo(() => fullText.split(/--- Page \d+ ---/), [fullText]);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('theme');
      if (saved) return saved === 'dark';
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);
  
  // Panels
  const [activeTab, setActiveTab] = useState<'search' | 'ai' | 'history'>('search');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isRightPanelOpen, setIsRightPanelOpen] = useState(true);
  const [sidebarWidth, setSidebarWidth] = useState(280);
  const [rightPanelWidth, setRightPanelWidth] = useState(350);
  const [isResizingLeft, setIsResizingLeft] = useState(false);
  const [isResizingRight, setIsResizingRight] = useState(false);

  const toggleLeftSidebar = () => setIsSidebarOpen(!isSidebarOpen);
  const toggleRightSidebar = () => setIsRightPanelOpen(!isRightPanelOpen);

  const startResizingLeft = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizingLeft(true);
  }, []);

  const startResizingRight = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizingRight(true);
  }, []);

  const stopResizing = useCallback(() => {
    setIsResizingLeft(false);
    setIsResizingRight(false);
  }, []);

  const resize = useCallback((e: MouseEvent) => {
    if (isResizingLeft) {
      const newWidth = e.clientX;
      if (newWidth > 150 && newWidth < 500) {
        setSidebarWidth(newWidth);
      }
    }
    if (isResizingRight) {
      const newWidth = window.innerWidth - e.clientX;
      if (newWidth > 200 && newWidth < 600) {
        setRightPanelWidth(newWidth);
      }
    }
  }, [isResizingLeft, isResizingRight]);

  useEffect(() => {
    if (isResizingLeft || isResizingRight) {
      window.addEventListener('mousemove', resize);
      window.addEventListener('mouseup', stopResizing);
    }
    return () => {
      window.removeEventListener('mousemove', resize);
      window.removeEventListener('mouseup', stopResizing);
    };
  }, [isResizingLeft, isResizingRight, resize, stopResizing]);
  
  // Search
  const [searchQuery, setSearchQuery] = useState("");
  const [fixedKeywords, setFixedKeywords] = useState<string[]>([]);
  const [searchFilters, setSearchFilters] = useState({
    caseSensitive: false,
    pageRange: "",
    multipleKeywords: true,
    showAll: true
  });
  const [searchResults, setSearchResults] = useState<{ page: number, text: string, count: number }[]>([]);
  const [allMatches, setAllMatches] = useState<{ page: number, query: string, id?: string, occurrenceIndexOnPage?: number }[]>([]);
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);
  const [groupedMatches, setGroupedMatches] = useState<Record<string, GroupedMatch>>({});
  const [activeMatch, setActiveMatch] = useState<{ page: number, query: string, id?: string, occurrenceIndexOnPage?: number } | null>(null);
  
  // AI
  const [aiAnalysis, setAiAnalysis] = useState<any>(null);
  const [isAiAnalyzing, setIsAiAnalyzing] = useState(false);
  const [showHighlights, setShowHighlights] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isPrinting, setIsPrinting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [chatMessages, setChatMessages] = useState<{ role: string, content: string }[]>([]);
  const [userInput, setUserInput] = useState("");
  const [isChatLoading, setIsChatLoading] = useState(false);
  
  // Detailed Analysis
  const [isDetailedAnalysisOpen, setIsDetailedAnalysisOpen] = useState(false);
  const chatEndRef = React.useRef<HTMLDivElement>(null);

  // Text Highlighting State
  const [textHighlights, setTextHighlights] = useState<any[]>([]);
  const [selectedHighlightId, setSelectedHighlightId] = useState<string | null>(null);
  const [editMode, setEditMode] = useState<'highlight' | 'text' | 'shape' | null>(null);
  const [highlightColor, setHighlightColor] = useState('#facc15'); // Default yellow
  const [highlightThickness, setHighlightThickness] = useState(40); // Default 40% opacity
  const [isHighlightPopoverOpen, setIsHighlightPopoverOpen] = useState(false);
  const [activeSelection, setActiveSelection] = useState<{ text: string, rects: any[], page: number } | null>(null);

  useEffect(() => {
    setPageInputValue(currentPage.toString());
  }, [currentPage]);

  const handlePageInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPageInputValue(e.target.value);
  };

  const handlePageInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const val = parseInt(pageInputValue);
      const totalPages = (thumbnails || []).length;
      if (!isNaN(val) && val >= 1 && val <= totalPages) {
        setCurrentPage(val);
      } else {
        setPageInputValue(currentPage.toString());
      }
    }
  };

  const handlePageInputBlur = () => {
    const val = parseInt(pageInputValue);
    const totalPages = (thumbnails || []).length;
    if (!isNaN(val) && val >= 1 && val <= totalPages) {
      setCurrentPage(val);
    } else {
      setPageInputValue(currentPage.toString());
    }
  };

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);
  const [isReaderMode, setIsReaderMode] = useState(false);
  const [readerPage, setReaderPage] = useState<number | undefined>(undefined);
  const [selectedFinding, setSelectedFinding] = useState<any>(null);

  // Settings
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [apiKeys, setApiKeys] = useState<{ id: string, name: string, key: string, provider: AIProvider }[]>(() => {
    const saved = localStorage.getItem('ai_api_keys');
    const parsed = saved ? JSON.parse(saved) : [];
    // Migration: add default provider if missing
    return (Array.isArray(parsed) ? parsed : []).map((k: any) => ({ ...k, provider: k.provider || 'gemini' }));
  });
  const [selectedApiKeyId, setSelectedApiKeyId] = useState(() => localStorage.getItem('selected_api_key_id') || "");
  const [aiFixedPrompt, setAiFixedPrompt] = useState(() => localStorage.getItem('ai_fixed_prompt') || "Você é um especialista em análise de documentos. Extraia informações relevantes, identifique empresas, datas e eventos importantes. Seja preciso e detalhado.");

  const [isMobile, setIsMobile] = useState(false);
  const [isPromptEditorOpen, setIsPromptEditorOpen] = useState(false);
  const [prompts, setPrompts] = useState<PromptItem[]>(() => {
    const saved = localStorage.getItem('ai_prompts');
    const parsed = saved ? JSON.parse(saved) : null;
    return Array.isArray(parsed) ? parsed : DEFAULT_PROMPTS;
  });
  const [selectedPromptId, setSelectedPromptId] = useState(() => localStorage.getItem('selected_prompt_id') || 'padrão');
  const [editingPrompt, setEditingPrompt] = useState<PromptItem | null>(null);

  // Confirmation & Toast States
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    variant?: 'danger' | 'warning' | 'info';
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  const [toast, setToast] = useState<{
    isVisible: boolean;
    message: string;
    type: ToastType;
  }>({
    isVisible: false,
    message: '',
    type: 'success',
  });

  const showToast = (message: string, type: ToastType = 'success') => {
    setToast({ isVisible: true, message, type });
  };

  useEffect(() => {
    localStorage.setItem('ai_prompts', JSON.stringify(prompts));
  }, [prompts]);

  useEffect(() => {
    localStorage.setItem('selected_prompt_id', selectedPromptId);
    const selected = prompts.find(p => p.id === selectedPromptId);
    if (selected) setAiFixedPrompt(selected.prompt);
  }, [selectedPromptId, prompts]);

  const handleAddPrompt = React.useCallback(() => {
    const newPrompt: PromptItem = {
      id: crypto.randomUUID(),
      name: 'Novo Prompt',
      prompt: 'Instruções para a IA...'
    };
    setPrompts([...prompts, newPrompt]);
    setSelectedPromptId(newPrompt.id);
    setEditingPrompt(newPrompt);
    setIsPromptEditorOpen(true);
  }, [prompts]);

  const handleEditPrompt = React.useCallback((p: PromptItem) => {
    setEditingPrompt(p);
    setIsPromptEditorOpen(true);
  }, []);

  const handleDeletePrompt = React.useCallback((id: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Excluir Prompt',
      message: 'Tem certeza que deseja excluir este prompt? Esta ação não pode ser desfeita.',
      variant: 'danger',
      onConfirm: () => {
        const newPrompts = prompts.filter(p => p.id !== id);
        setPrompts(newPrompts);
        if (selectedPromptId === id) {
          setSelectedPromptId(newPrompts[0]?.id || 'padrão');
        }
        showToast("Prompt excluído com sucesso");
      }
    });
  }, [prompts, selectedPromptId]);

  const handleSavePrompt = React.useCallback((newText: string) => {
    if (editingPrompt) {
      setPrompts((prompts || []).map(p => p.id === editingPrompt.id ? { ...p, prompt: newText } : p));
    } else {
      setAiFixedPrompt(newText);
    }
  }, [editingPrompt, prompts]);

  const handleResetPrompts = React.useCallback(() => {
    setConfirmModal({
      isOpen: true,
      title: 'Resetar Prompts',
      message: 'Deseja restaurar os prompts originais? Isso removerá seus prompts personalizados.',
      variant: 'warning',
      onConfirm: () => {
        setPrompts(DEFAULT_PROMPTS);
        setSelectedPromptId(DEFAULT_PROMPTS[0].id);
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        showToast("Prompts restaurados com sucesso");
      }
    });
  }, []);

  const handleClearAnalysis = React.useCallback(() => {
    setAiAnalysis(null);
    setChatMessages([]);
    showToast("Análise limpa");
  }, []);

  useEffect(() => {
    localStorage.setItem('ai_api_keys', JSON.stringify(apiKeys));
  }, [apiKeys]);

  useEffect(() => {
    localStorage.setItem('selected_api_key_id', selectedApiKeyId);
  }, [selectedApiKeyId]);

  useEffect(() => {
    localStorage.setItem('ai_fixed_prompt', aiFixedPrompt);
  }, [aiFixedPrompt]);

  const currentKeyData = apiKeys.find(k => k.id === selectedApiKeyId);
  const currentApiKey = currentKeyData?.key || "";
  const currentProvider = currentKeyData?.provider || 'gemini';
  
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  
  // Edit Tools
  const [edits, setEdits] = useState<any[]>([]);
  const [showAllAnnotations, setShowAllAnnotations] = useState(true);

  useEffect(() => {
    const checkServer = async () => {
      try {
        const res = await fetch('/api/health');
        const data = await res.json();
        console.log("Server health check:", data);
      } catch (err) {
        console.error("Server health check failed:", err);
      }
    };
    checkServer();
  }, []);

  const [docName, setDocName] = useState<string>("");

  useEffect(() => {
    const initAuth = async () => {
      if (token) {
        try {
          const res = await fetch('/api/auth/me', {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (res.ok) {
            const userData = await res.json();
            setUser(userData);
          } else {
            handleLogout();
          }
        } catch (err) {
          console.error("Auth check failed", err);
        }
      }
      setIsAuthLoading(false);
    };
    initAuth();
  }, [token]);

  const handleLogin = (newToken: string, userData: any) => {
    setToken(newToken);
    setUser(userData);
    localStorage.setItem('auth_token', newToken);
    showToast(`Bem-vindo, ${userData.name}!`);
  };

  const handleLogout = () => {
    setToken(null);
    setUser(null);
    setIsAdminView(false);
    localStorage.removeItem('auth_token');
    showToast("Você saiu do sistema.");
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      
      if (e.key.toLowerCase() === 'h') {
        setEditMode(prev => prev === 'highlight' ? null : 'highlight');
        setIsHighlightPopoverOpen(false);
      }
      if (e.key === 'Escape') {
        setEditMode(null);
        setSelectedHighlightId(null);
        setActiveSelection(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleTextSelection = useCallback((selection: { text: string, rects: any[], page: number } | null) => {
    setActiveSelection(selection);
    if (selection && editMode === 'highlight') {
      // Auto-highlight in continuous mode
      const newHighlight = {
        id: Math.random().toString(36).substr(2, 9),
        text: selection.text,
        rects: selection.rects,
        page: selection.page,
        color: highlightColor,
        thickness: highlightThickness,
        createdAt: Date.now()
      };
      setTextHighlights(prev => [...prev, newHighlight]);
      setActiveSelection(null);
      window.getSelection()?.removeAllRanges();
    }
  }, [editMode, highlightColor, highlightThickness]);

  const handleAddHighlight = useCallback(() => {
    if (!activeSelection) return;
    const newHighlight = {
      id: Math.random().toString(36).substr(2, 9),
      text: activeSelection.text,
      rects: activeSelection.rects,
      page: activeSelection.page,
      color: highlightColor,
      thickness: highlightThickness,
      createdAt: Date.now()
    };
    setTextHighlights(prev => [...prev, newHighlight]);
    setActiveSelection(null);
    window.getSelection()?.removeAllRanges();
  }, [activeSelection, highlightColor, highlightThickness]);

  const handleDeleteHighlight = useCallback((id: string) => {
    setTextHighlights(prev => prev.filter(h => h.id !== id));
    setSelectedHighlightId(null);
  }, []);

  const handleUpdateHighlightColor = useCallback((id: string, color: string) => {
    setTextHighlights(prev => prev.map(h => h.id === id ? { ...h, color } : h));
  }, []);

  const handleHighlightResize = useCallback((id: string, newRects: any[]) => {
    setTextHighlights(prev => prev.map(h => h.id === id ? { ...h, rects: newRects } : h));
  }, []);

  const handleClearAllHighlights = useCallback(() => {
    setTextHighlights([]);
    setSelectedHighlightId(null);
  }, []);

  const handleNavigateHighlight = (direction: 'prev' | 'next') => {
    if (textHighlights.length === 0) return;
    
    let nextIndex = 0;
    if (selectedHighlightId) {
      const currentIndex = textHighlights.findIndex(h => h.id === selectedHighlightId);
      if (direction === 'next') {
        nextIndex = (currentIndex + 1) % textHighlights.length;
      } else {
        nextIndex = (currentIndex - 1 + textHighlights.length) % textHighlights.length;
      }
    }
    
    const nextHighlight = textHighlights[nextIndex];
    setSelectedHighlightId(nextHighlight.id);
    setCurrentPage(nextHighlight.page);
  };

  const handleCloseDocument = () => {
    setFile(null);
    setPdfUrl(null);
    setDocId(null);
    setDocName("");
    setThumbnails([]);
    setFullText("");
    setAiAnalysis(null);
    setChatMessages([]);
    setSearchResults([]);
    setAllMatches([]);
    setCurrentMatchIndex(0);
    setGroupedMatches({});
    setActiveMatch(null);
    setIsSearchNavOpen(false);
    setCurrentPage(1);
    setEdits([]);
    setEditMode(null);
    setTextHighlights([]);
    setSelectedHighlightId(null);
    setActiveSelection(null);
    setFixedKeywords([]);
    setIsReaderMode(false);
    setReaderPage(undefined);
    setSelectedFinding(null);
    setIsAiAnalyzing(false);
    setIsChatLoading(false);
    setIsSaving(false);
    setIsPrinting(false);
  };

  const getPdfBlob = useCallback(async () => {
    if (!pdfUrl) return null;
    
    if ((edits || []).length === 0) {
      const response = await fetch(pdfUrl, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      return await response.blob();
    }

    const response = await fetch(pdfUrl, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const existingPdfBytes = await response.arrayBuffer();
    
    // Combine manual edits for PDF generation
    const allEdits = [
      ...edits,
      ...textHighlights.map(th => ({
        type: 'text-highlight' as const,
        page: th.page,
        rects: th.rects,
        color: th.color,
        opacity: (th.thickness || 40) / 100,
        x: 0,
        y: 0
      }))
    ];

    const editedPdfBytes = await editPdf(existingPdfBytes, allEdits, 1.0);
    return new Blob([editedPdfBytes], { type: 'application/pdf' });
  }, [pdfUrl, edits, textHighlights, token]);

  const handlePrint = useCallback(async () => {
    if (!pdfUrl) return;
    setIsPrinting(true);
    try {
      const blob = await getPdfBlob();
      if (!blob) return;

      const url = URL.createObjectURL(blob);
      
      // Use safePrintPDF as a more reliable alternative in iframes
      safePrintPDF(url);
      
      // Revoke after some time to allow the new window to load
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (err) {
      console.error("Print error:", err);
      showToast("Erro ao preparar impressão", "error");
    } finally {
      setIsPrinting(false);
    }
  }, [pdfUrl, getPdfBlob]);

  const handlePrintAnalysis = useCallback(() => {
    // Use safePrintHTML for a more reliable alternative in iframes
    safePrintHTML('analysis-report-content', 'Relatório de Análise');
  }, []);

  const saveAnnotations = async (currentEdits: any[], currentTextHighlights: any[]) => {
    if (!docId || !token) return;
    
    try {
      const allAnnotations = [
        ...currentEdits.map(e => ({
          page_number: e.page,
          type: e.type,
          x: e.x,
          y: e.y,
          width: e.width,
          height: e.height,
          color: e.color,
          thickness: e.thickness,
          content: e.content || ''
        })),
        ...currentTextHighlights.map(th => ({
          page_number: th.page,
          type: 'text-highlight',
          content: JSON.stringify({ text: th.text, rects: th.rects }),
          color: th.color,
          thickness: th.thickness,
          x: th.rects[0]?.x || 0,
          y: th.rects[0]?.y || 0,
          width: th.rects[0]?.w || 0,
          height: th.rects[0]?.h || 0
        }))
      ];

      const saveRes = await fetch(`/api/documents/${docId}/annotations`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ annotations: allAnnotations })
      });

      if (!saveRes.ok) {
        throw new Error("Falha ao salvar anotações no servidor.");
      }
    } catch (err) {
      console.error("Auto-save error:", err);
      showToast("Erro ao salvar anotações automaticamente", "error");
    }
  };

  const handleSave = useCallback(async () => {
    if (!pdfUrl || !docId) return;
    setIsSaving(true);
    try {
      // 1. Save annotations to server
      await saveAnnotations(edits, []);

      // 2. Download the edited PDF
      const blob = await getPdfBlob();
      if (!blob) return;
      
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const fileName = docName || (file ? file.name : "document.pdf");
      link.download = (edits || []).length > 0 ? `edited-${fileName}` : fileName;
      link.click();
      URL.revokeObjectURL(url);
      
      showToast("Documento e anotações salvos com sucesso!");
    } catch (err: any) {
      console.error("Save error:", err);
      showToast(err.message || "Erro ao salvar arquivo.", "error");
    } finally {
      setIsSaving(false);
    }
  }, [pdfUrl, docId, token, edits, getPdfBlob, docName, file]);

  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      if (mobile) {
        setIsSidebarOpen(false);
        setIsRightPanelOpen(false);
      }
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);

    const handleKeyDown = (e: KeyboardEvent) => {
      // Search: Ctrl+F or Cmd+F
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        setActiveTab('search');
        const searchInput = document.querySelector('input[placeholder="Search in document..."]') as HTMLInputElement;
        if (searchInput) searchInput.focus();
      }
      
      // Save: Ctrl+S or Cmd+S
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (pdfUrl) handleSave();
      }

      // Go to Page: Ctrl+G or Cmd+G
      if ((e.ctrlKey || e.metaKey) && e.key === 'g') {
        e.preventDefault();
        const pageInput = document.getElementById('page-input');
        if (pageInput) pageInput.focus();
      }

      // Print: Ctrl+P or Cmd+P
      if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
        e.preventDefault();
        if (pdfUrl) handlePrint();
      }

      // Esc to close modals or exit modes
      if (e.key === 'Escape') {
        setIsDetailedAnalysisOpen(false);
        setIsSettingsOpen(false);
        setIsPromptEditorOpen(false);
        setSelectedFinding(null);
      }

      // Page Navigation
      if (pdfUrl && !isChatLoading) {
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === 'PageDown') {
          e.preventDefault();
          setCurrentPage(prev => Math.min((thumbnails || []).length, prev + 1));
        } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp' || e.key === 'PageUp') {
          e.preventDefault();
          setCurrentPage(prev => Math.max(1, prev - 1));
        } else if (e.key === 'Home') {
          e.preventDefault();
          setCurrentPage(1);
        } else if (e.key === 'End') {
          e.preventDefault();
          setCurrentPage((thumbnails || []).length);
        } else if (e.key === ' ') {
          e.preventDefault();
          if (e.shiftKey) {
            setCurrentPage(prev => Math.max(1, prev - 1));
          } else {
            setCurrentPage(prev => Math.min((thumbnails || []).length, prev + 1));
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('resize', checkMobile);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [pdfUrl, handleSave, handlePrint, (thumbnails || []).length, isChatLoading]);

  const handlePdfClick = () => {
    return;
  };

  const handlePdfMouseDown = (e: React.MouseEvent) => {
    return;
  };

  const handlePdfMouseMove = (e: React.MouseEvent) => {
    return;
  };

  const handlePdfMouseUp = () => {
    return;
  };

  const [isDragging, setIsDragging] = useState(false);

  const [recentDocuments, setRecentDocuments] = useState<{ id: string, name: string, created_at: string }[]>([]);

  useEffect(() => {
    const fetchRecentDocs = async () => {
      try {
        const res = await fetch('/api/documents', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const contentType = res.headers.get("content-type");
          if (contentType && contentType.includes("application/json")) {
            const data = await res.json();
            setRecentDocuments(data);
          } else {
            console.warn("Expected JSON from /api/documents but got:", contentType);
          }
        }
      } catch (err) {
        console.error("Failed to fetch recent documents:", err);
      }
    };
    if (token) {
      fetchRecentDocs();
    }
  }, [pdfUrl, activeTab, token]);

  const handleOpenRecent = async (doc: { id: string, name: string }) => {
    setIsUploading(true);
    try {
      setPdfUrl(`/api/documents/${doc.id}/pdf`);
      setDocId(doc.id);
      setDocName(doc.name);
      // Reset state for new document
      setAiAnalysis(null);
      setFullText("");
      setChatMessages([]);
      setSearchResults([]);
      setEdits([]);
      setCurrentPage(1);

      // Load analysis and annotations
      const [analysisRes, annotationsRes] = await Promise.all([
        fetch(`/api/documents/${doc.id}/analysis`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`/api/documents/${doc.id}/annotations`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);
      
      if (analysisRes.ok) {
        const contentType = analysisRes.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          const analysis = await analysisRes.json();
          setAiAnalysis(analysis);
        }
      }
      
      if (annotationsRes.ok) {
        const contentType = annotationsRes.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          const annotations = await annotationsRes.json();
          
          // Separate manual edits from text highlights
          const loadedEdits: any[] = [];
          const loadedTextHighlights: any[] = [];
          
          (annotations || []).forEach((a: any) => {
            if (a.type === 'text-highlight') {
              try {
                const content = JSON.parse(a.content);
                loadedTextHighlights.push({
                  id: a.id,
                  page: a.page_number,
                  text: content.text,
                  rects: content.rects,
                  color: a.color,
                  thickness: a.thickness,
                  createdAt: new Date(a.created_at).getTime()
                });
              } catch (e) {
                console.error("Error parsing text-highlight content:", e);
              }
            } else {
              loadedEdits.push({
                ...a,
                page: a.page_number // Map DB column to state property
              });
            }
          });
          
          setEdits(loadedEdits);
        }
      }
    } catch (err) {
      console.error(err);
      showToast("Erro ao abrir o documento.", "error");
    } finally {
      setIsUploading(false);
    }
  };

  // Document management functions
  const deleteDocument = async (id: string, name?: string) => {
    const displayName = name || recentDocuments.find(d => d.id === id)?.name || "este documento";
    
    setConfirmModal({
      isOpen: true,
      title: 'Excluir Documento',
      message: `Tem certeza que deseja excluir o documento "${displayName}"? Esta ação não pode ser desfeita.`,
      variant: 'danger',
      onConfirm: async () => {
        try {
          const response = await fetch(`/api/documents/${id}`, { 
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (response.ok) {
            setRecentDocuments(prev => prev.filter(doc => doc.id !== id));
            showToast("Documento excluído com sucesso");
            if (docId === id) {
              handleCloseDocument();
            }
          } else {
            throw new Error("Falha ao excluir o documento no servidor.");
          }
        } catch (error) {
          console.error("Delete error:", error);
          showToast("Não foi possível excluir o documento", "error");
        }
      }
    });
  };

  const clearAllDocuments = async () => {
    setConfirmModal({
      isOpen: true,
      title: 'Limpar Todo o Histórico',
      message: 'Tem certeza que deseja limpar todos os documentos? Esta ação é irreversível e apagará todos os arquivos do servidor.',
      variant: 'danger',
      onConfirm: async () => {
        try {
          const response = await fetch('/api/documents', { 
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (response.ok) {
            setRecentDocuments([]);
            handleCloseDocument();
            showToast("Histórico limpo com sucesso");
          } else {
            throw new Error("Falha ao limpar documentos no servidor.");
          }
        } catch (error) {
          console.error("Clear documents error:", error);
          showToast("Erro ao limpar o histórico", "error");
        }
      }
    });
  };

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts if user is typing in an input or textarea
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        if (e.key === 'Escape') {
          (e.target as HTMLElement).blur();
        }
        return;
      }

      // Save: Ctrl+S or Cmd+S
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (pdfUrl && !isSaving) handleSave();
      }

      // Search: Ctrl+F or Cmd+F
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        setActiveTab('search');
        // Small delay to allow panel to open before focusing
        setTimeout(() => {
          const searchInput = document.querySelector('input[placeholder*="Keywords"]') as HTMLInputElement;
          searchInput?.focus();
        }, 100);
      }

      // Print: Ctrl+P or Cmd+P
      if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
        e.preventDefault();
        if (pdfUrl && !isPrinting) handlePrint();
      }

      // Navigation
      if (e.key === 'ArrowLeft') {
        setCurrentPage(prev => Math.max(1, prev - 1));
      }
      if (e.key === 'ArrowRight') {
        setCurrentPage(prev => Math.min((thumbnails || []).length, prev + 1));
      }

      // Clear modes
      if (e.key === 'Escape') {
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pdfUrl, isSaving, isPrinting, (thumbnails || []).length]);

  const handleClearAllAnnotations = async () => {
    if (!docId) return;
    
    setConfirmModal({
      isOpen: true,
      title: 'Remover Anotações',
      message: 'Deseja realmente remover todas as anotações e destaques deste documento? Esta ação não pode ser desfeita.',
      variant: 'warning',
      onConfirm: async () => {
        try {
          const response = await fetch(`/api/documents/${docId}/annotations`, { 
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (response.ok) {
            setEdits([]);
            showToast("Anotações removidas com sucesso");
          } else {
            throw new Error("Falha ao remover anotações no servidor.");
          }
        } catch (error) {
          console.error("Clear annotations error:", error);
          showToast("Erro ao remover as anotações", "error");
        }
      }
    });
  };

  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement> | React.DragEvent) => {
    console.log("handleFileUpload triggered", e.type);
    let uploadedFile: File | undefined;
    
    if (e.type === 'change') {
      const target = e.target as HTMLInputElement;
      if (target.files && target.files.length > 0) {
        uploadedFile = target.files[0];
      }
    } else if (e.type === 'drop') {
      const dragEvent = e as React.DragEvent;
      if (dragEvent.dataTransfer.files && dragEvent.dataTransfer.files.length > 0) {
        uploadedFile = dragEvent.dataTransfer.files[0];
      }
      e.preventDefault();
    }

    if (!uploadedFile) return;

    // Check if it's a PDF by extension if type is missing
    const isPdf = uploadedFile.type === 'application/pdf' || uploadedFile.name.toLowerCase().endsWith('.pdf');

    if (!isPdf) {
      showToast("Por favor, selecione apenas arquivos PDF.", "error");
      return;
    }

    // Client-side size check (500MB)
    if (uploadedFile.size > 500 * 1024 * 1024) {
      showToast("O arquivo é muito grande (máximo 500MB).", "error");
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append('pdf', uploadedFile);

      // Use fetch instead of XMLHttpRequest for better compatibility with proxy/iframe
      const response = await fetch('/api/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData,
        // credentials: 'include' is important for iframe cookie support if needed
        credentials: 'same-origin'
      });

      const responseText = await response.text();
      
      if (!response.ok) {
        console.error("Upload failed with status:", response.status);
        if (responseText.includes("<!doctype html>") || responseText.includes("<html")) {
          console.error("Server returned HTML instead of JSON. Full response (first 500 chars):", responseText.substring(0, 500));
          throw new Error("O servidor retornou uma página de erro (HTML). Isso pode ser causado por um arquivo muito grande ou tempo limite excedido.");
        }
        
        try {
          const errorData = JSON.parse(responseText);
          throw new Error(errorData.error || `Falha no upload: ${response.status}`);
        } catch (e) {
          console.error("Failed to parse error response as JSON:", responseText.substring(0, 200));
          throw new Error(`Falha no upload: ${response.status}`);
        }
      }

      let data;
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        console.error("Failed to parse success response as JSON. Full response (first 500 chars):", responseText.substring(0, 500));
        throw new Error("O servidor retornou uma resposta inválida. Tente novamente.");
      }
      
      // Reset state for new document
      setAiAnalysis(null);
      setFullText("");
      setChatMessages([]);
      setSearchResults([]);
      setEdits([]);
      setCurrentPage(1);
      
      setFile(uploadedFile);
      setDocName(uploadedFile.name);
      setPdfUrl(`/api/documents/${data.id}/pdf`);
      setDocId(data.id);
      
      // Reset input value to allow selecting the same file again
      const fileInput = document.getElementById('pdf-upload-input') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
      
      // Update recent documents list
      const newDoc = {
        id: data.id,
        name: uploadedFile.name,
        created_at: new Date().toISOString()
      };
      setRecentDocuments(prev => [newDoc, ...prev]);
      
      showToast("Documento enviado com sucesso!");
    } catch (err: any) {
      console.error("Upload error:", err);
      showToast(err.message || "Erro ao enviar arquivo.", "error");
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  }, [token]);

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = () => {
    setIsDragging(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileUpload(e);
  };

  const [isSearchNavOpen, setIsSearchNavOpen] = useState(false);

  useEffect(() => {
    if (fullText) {
      handleSearch();
    }
  }, [fixedKeywords, fullText]);

  const handleSearch = useCallback((customQueries?: string[]) => {
    // If no custom queries, use the search input combined with fixed keywords
    const inputQueries = searchFilters.multipleKeywords 
      ? searchQuery.split(',').map(q => q.trim()).filter(q => q)
      : [searchQuery.trim()].filter(q => q);
    
    const queries = customQueries || inputQueries;

    // Combine with fixed keywords
    const allQueries = [...new Set([...queries, ...fixedKeywords])];

    if ((allQueries || []).length === 0) {
      setSearchResults([]);
      setAllMatches([]);
      setIsSearchNavOpen(false);
      return;
    }

    const results: { page: number, text: string, count: number }[] = [];
    const matches: { page: number, query: string }[] = [];
    const newGroupedMatches: Record<string, { matches: { page: number, query: string }[], currentIndex: number }> = {};
    
    allQueries.forEach(q => {
      newGroupedMatches[q] = { matches: [], currentIndex: 0 };
    });

    // Handle page range filter
    let startPage = 1;
    let endPage = (pages || []).length - 1;
    if (searchFilters.pageRange && typeof searchFilters.pageRange === 'string') {
      const [start, end] = searchFilters.pageRange.split('-').map(n => parseInt(n.trim()));
      if (!isNaN(start)) startPage = Math.max(1, start);
      if (!isNaN(end)) endPage = Math.min((pages || []).length - 1, end);
    }

    const queryRegexes = (allQueries || []).map(query => ({
      query,
      regex: new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), searchFilters.caseSensitive ? 'g' : 'gi')
    }));

    pages.forEach((pageText, index) => {
      if (index < startPage || index > endPage) return;
      
      let totalOnPage = 0;
      let matchFound = false;
      let firstMatchSnippet = "";

      queryRegexes.forEach(({ query, regex }) => {
        const pageMatches = pageText.match(regex);
        
        if (pageMatches) {
          totalOnPage += pageMatches.length;
          matchFound = true;
          
          // Collect individual matches
          pageMatches.forEach((_, mIdx) => {
            const matchObj = { 
              page: index, 
              query, 
              id: `${index}-${query}-${mIdx}-${Math.random().toString(36).substr(2, 9)}`,
              occurrenceIndexOnPage: mIdx
            };
            matches.push(matchObj);
            newGroupedMatches[query].matches.push(matchObj);
          });

          if (!firstMatchSnippet) {
            const matchIndex = pageText.toLowerCase().indexOf(query.toLowerCase());
            firstMatchSnippet = pageText.substring(Math.max(0, matchIndex - 40), Math.min(pageText.length, matchIndex + 60));
          }
        }
      });

      if (matchFound) {
        results.push({ 
          page: index, 
          text: `...${firstMatchSnippet}...`,
          count: totalOnPage
        });
      }
    });
    setSearchResults(results);
    setAllMatches(matches);
    setGroupedMatches(newGroupedMatches);
    setCurrentMatchIndex(0);
    if ((matches || []).length > 0) {
      setActiveMatch(matches[0]);
      setCurrentPage(matches[0].page);
    } else {
      setActiveMatch(null);
    }
    setIsSearchNavOpen((matches || []).length > 0);
  }, [searchQuery, searchFilters, fixedKeywords, pages]);

  const addFixedKeyword = () => {
    if (searchQuery && !fixedKeywords.includes(searchQuery)) {
      setFixedKeywords([...fixedKeywords, searchQuery]);
      setSearchQuery("");
    }
  };

  const removeFixedKeyword = (kw: string) => {
    setFixedKeywords(fixedKeywords.filter(k => k !== kw));
  };

  const navigateKeywordMatch = (query: string, direction: 'next' | 'prev') => {
    const group = groupedMatches[query];
    if (!group || (group.matches || []).length === 0) return;

    const matchesCount = (group.matches || []).length;
    let newIndex = group.currentIndex;
    if (direction === 'next') {
      newIndex = (newIndex + 1) % matchesCount;
    } else {
      newIndex = (newIndex - 1 + matchesCount) % matchesCount;
    }

    setGroupedMatches({
      ...groupedMatches,
      [query]: { ...group, currentIndex: newIndex }
    });

    const match = group.matches[newIndex];
    setActiveMatch(match);
    setCurrentPage(match.page);
  };

  const handleClearSearch = () => {
    setSearchQuery("");
    setSearchResults([]);
    setAllMatches([]);
    setGroupedMatches({});
    setActiveMatch(null);
    setIsSearchNavOpen(false);
  };

  const handleClearAllSearch = () => {
    setSearchQuery("");
    setSearchResults([]);
    setAllMatches([]);
    setGroupedMatches({});
    setActiveMatch(null);
    setIsSearchNavOpen(false);
    setFixedKeywords([]);
  };

  const [analysisSearchQuery, setAnalysisSearchQuery] = useState("");
  const [relevanceFilter, setRelevanceFilter] = useState<string>("ALL");

  const filteredFindings = React.useMemo(() => {
    if (!aiAnalysis?.findings) return [];
    return aiAnalysis.findings.filter((f: any) => {
      const matchesSearch = 
        f.company.toLowerCase().includes(analysisSearchQuery.toLowerCase()) ||
        f.description.toLowerCase().includes(analysisSearchQuery.toLowerCase()) ||
        f.event_type.toLowerCase().includes(analysisSearchQuery.toLowerCase());
      
      const matchesRelevance = relevanceFilter === "ALL" || f.relevance === relevanceFilter;
      
      return matchesSearch && matchesRelevance;
    });
  }, [aiAnalysis, analysisSearchQuery, relevanceFilter]);

  const handleExportCSV = () => {
    if (!aiAnalysis?.findings) return;
    const headers = ["Data", "UF", "Empresa", "Evento", "Resumo", "Relevância"];
    const rows = (aiAnalysis?.findings || []).map((f: any) => [
      f.date, f.uf, f.company, f.event_type, f.description, f.relevance
    ]);
    
    const csvContent = [
      headers.join(","),
      ...rows.map((r: any) => (r || []).map((cell: any) => `"${cell}"`).join(","))
    ].join("\n");
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `analise-${docName || 'documento'}.csv`;
    link.click();
  };

  const handleAiAnalyze = React.useCallback(async () => {
    if (!fullText) return;
    if (!currentApiKey) {
      setIsSettingsOpen(true);
      showToast("Por favor, adicione e selecione uma chave de API nas configurações antes de analisar.", "info");
      return;
    }
    setIsAiAnalyzing(true);
    try {
      const analysis = await analyzeDocument(fullText, currentApiKey, aiFixedPrompt, currentProvider);
      setAiAnalysis(analysis);
      setActiveTab('ai');
      
      // Save analysis to server
      if (docId) {
        await fetch(`/api/documents/${docId}/analysis`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ analysis })
        });
      }
    } catch (err) {
      console.error(err);
      showToast("Erro na análise IA. Verifique sua chave de API selecionada nas configurações.", "error");
    } finally {
      setIsAiAnalyzing(false);
    }
  }, [fullText, currentApiKey, aiFixedPrompt, currentProvider, docId]);

  const handleSendMessage = React.useCallback(async (overrideInput?: string) => {
    const input = overrideInput || userInput;
    if (!input.trim() || !fullText || isChatLoading) return;

    const newMessages = [...chatMessages, { role: 'user', content: input }];
    setChatMessages(newMessages);
    setUserInput("");
    setIsChatLoading(true);
    
    try {
      const response = await chatWithDocument(
        fullText, 
        input, 
        newMessages,
        currentApiKey,
        aiFixedPrompt,
        currentProvider
      );
      setChatMessages([...newMessages, { role: 'model', content: response || "" }]);
    } catch (err) {
      console.error(err);
      setChatMessages([...newMessages, { role: 'model', content: "Erro ao processar sua pergunta. Verifique sua chave de API." }]);
    } finally {
      setIsChatLoading(false);
    }
  }, [userInput, fullText, isChatLoading, chatMessages, currentApiKey, aiFixedPrompt, currentProvider]);

  const highlightQueries = useMemo(() => [
    ...(fixedKeywords || []),
    ...((searchQuery || "").split(',').map(q => q.trim()).filter(q => q))
  ], [fixedKeywords, searchQuery]);

  if (isAuthLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-neutral-950">
        <Loader2 size={48} className="animate-spin text-blue-600" />
      </div>
    );
  }

  if (!token || !user) {
    return <Login onLogin={handleLogin} />;
  }

  if (isAdminView && user.role === 'admin') {
    return <AdminDashboard token={token} onBack={() => setIsAdminView(false)} showToast={showToast} />;
  }

  return (
    <div className="flex h-screen w-full overflow-hidden font-sans bg-white text-neutral-900 dark:bg-neutral-950 dark:text-neutral-50 transition-colors duration-300">
      
      {/* Detailed Analysis Modal */}
      <DetailedAnalysisModal 
        isOpen={isDetailedAnalysisOpen} 
        onClose={() => setIsDetailedAnalysisOpen(false)} 
        aiAnalysis={aiAnalysis}
        onPrint={handlePrintAnalysis}
        onSave={handleExportCSV}
        onOpenReader={(page) => {
          setReaderPage(page);
          setIsReaderMode(true);
        }}
      />

      <FindingDetailsModal 
        isOpen={!!selectedFinding} 
        onClose={() => setSelectedFinding(null)} 
        onOpenReader={(page) => {
          setReaderPage(page);
          setIsReaderMode(true);
        }}
        finding={selectedFinding} 
      />

      {/* Full Screen Reader Mode */}
      <AnimatePresence>
        {isReaderMode && pdfUrl && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex flex-col"
          >
            <div className="h-14 bg-neutral-900 border-b border-white/10 flex items-center justify-between px-6">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white">
                  <FileText size={18} />
                </div>
                <h2 className="text-white font-bold text-sm truncate max-w-md">{docName || 'Documento'}</h2>
              </div>
              <div className="flex items-center gap-4">
                <button 
                  onClick={handlePrint}
                  className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-all"
                  title="Imprimir"
                >
                  <Printer size={20} />
                </button>
                <button 
                  onClick={handleSave}
                  className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-all"
                  title="Download"
                >
                  <Download size={20} />
                </button>
                <div className="w-px h-6 bg-white/10 mx-2" />
                <button 
                  onClick={() => setIsReaderMode(false)}
                  className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all"
                >
                  <X size={18} /> FECHAR LEITOR
                </button>
              </div>
            </div>
            <div className="flex-1 bg-neutral-800 relative">
              {pdfUrl ? (
                <iframe 
                  src={`${pdfUrl}#toolbar=1&navpanes=1&scrollbar=1${readerPage ? `&page=${readerPage}` : ''}`} 
                  className="w-full h-full border-none"
                  title="PDF Reader"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white/50">
                  <div className="flex flex-col items-center gap-4">
                    <Loader2 className="animate-spin" size={32} />
                    <p className="text-sm font-bold uppercase tracking-widest">Carregando Documento...</p>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isDetailedAnalysisOpen && aiAnalysis && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDetailedAnalysisOpen(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.98, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.98, opacity: 0, y: 10 }}
              className="relative w-full max-w-7xl bg-[#F8FAFC] dark:bg-neutral-950 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh] border border-white/20"
            >
              {/* Header */}
              <div className="p-6 bg-white dark:bg-neutral-900 border-b border-neutral-100 dark:border-neutral-800 flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-600/20">
                    <Brain size={22} />
                  </div>
                  <div>
                    <h2 className="font-bold text-lg text-neutral-800 dark:text-white">Análise de Documento</h2>
                    <p className="text-xs text-neutral-400 font-medium">{docName}</p>
                  </div>
                </div>
                <button onClick={() => setIsDetailedAnalysisOpen(false)} className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-full transition-colors text-neutral-400">
                  <X size={20} />
                </button>
              </div>
              
              <div id="analysis-report-content" className="flex-1 overflow-y-auto p-8 space-y-8">
                {/* Search and Filters Bar */}
                <div className="bg-white dark:bg-neutral-900 p-4 rounded-2xl shadow-sm border border-neutral-100 dark:border-neutral-800 flex items-center gap-4 no-print">
                  <div className="flex-1 relative">
                    <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" />
                    <input 
                      type="text" 
                      placeholder="Buscar por empresa, termo ou resumo..." 
                      className="w-full pl-12 pr-4 py-3 rounded-xl bg-neutral-50 dark:bg-neutral-800 border-none outline-none text-sm text-neutral-600 dark:text-neutral-300 placeholder:text-neutral-400"
                      value={analysisSearchQuery}
                      onChange={(e) => setAnalysisSearchQuery(e.target.value)}
                    />
                  </div>
                  
                  <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700">
                    <Filter size={16} className="text-neutral-400" />
                    <select 
                      className="bg-transparent border-none outline-none text-sm font-bold text-neutral-600 dark:text-neutral-300 cursor-pointer"
                      value={relevanceFilter}
                      onChange={(e) => setRelevanceFilter(e.target.value)}
                    >
                      <option value="ALL">Todas Relevâncias</option>
                      <option value="HIGH">Alta Relevância</option>
                      <option value="MEDIUM">Média Relevância</option>
                      <option value="LOW">Baixa Relevância</option>
                    </select>
                  </div>

                  <button 
                    onClick={handleExportCSV}
                    className="flex items-center gap-2 bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-neutral-200 transition-all"
                  >
                    <Download size={16} /> EXPORTAR CSV
                  </button>

                  <button 
                    onClick={handlePrintAnalysis}
                    className="flex items-center gap-2 bg-[#1E293B] text-white px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-neutral-800 transition-all shadow-lg shadow-black/10"
                  >
                    <Printer size={16} /> IMPRIMIR RELATÓRIO
                  </button>
                </div>

                {/* Table Section */}
                <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-100 dark:border-neutral-800 overflow-hidden shadow-sm">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-neutral-100 dark:border-neutral-800">
                        <th className="px-6 py-5 text-[10px] font-black uppercase text-neutral-400 tracking-widest">
                          <div className="flex items-center gap-1">
                            DATA/UF <ArrowUpDown size={12} />
                          </div>
                        </th>
                        <th className="px-6 py-5 text-[10px] font-black uppercase text-neutral-400 tracking-widest">EMPRESA</th>
                        <th className="px-6 py-5 text-[10px] font-black uppercase text-neutral-400 tracking-widest">EVENTO</th>
                        <th className="px-6 py-5 text-[10px] font-black uppercase text-neutral-400 tracking-widest">RESUMO</th>
                        <th className="px-6 py-5 text-[10px] font-black uppercase text-neutral-400 tracking-widest">RELEVÂNCIA</th>
                        <th className="px-6 py-5 text-[10px] font-black uppercase text-neutral-400 tracking-widest text-right">AÇÕES</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-50 dark:divide-neutral-800">
                      {filteredFindings?.map((finding: any, i: number) => (
                        <tr 
                          key={i} 
                          onClick={() => setSelectedFinding(finding)}
                          className="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/20 transition-colors group cursor-pointer"
                        >
                          <td className="px-6 py-6">
                            <div className="flex flex-col">
                              <span className="text-sm font-bold text-neutral-800 dark:text-white">{finding.date}</span>
                              <span className="text-[11px] font-bold text-blue-600 uppercase">{finding.uf}</span>
                            </div>
                          </td>
                          <td className="px-6 py-6">
                            <span className="text-sm font-bold text-blue-600 dark:text-blue-400 leading-tight block max-w-[250px]">{finding.company}</span>
                          </td>
                          <td className="px-6 py-6">
                            <span className="inline-block px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600 text-[10px] font-bold uppercase tracking-wider">
                              {finding.event_type}
                            </span>
                          </td>
                          <td className="px-6 py-6">
                            <p className="text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed max-w-[400px]">{finding.description}</p>
                          </td>
                          <td className="px-6 py-6">
                            <span className={cn(
                              "inline-block px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest",
                              finding.relevance === 'HIGH' ? "bg-red-50 text-red-500" :
                              finding.relevance === 'MEDIUM' ? "bg-orange-50 text-orange-500" :
                              "bg-emerald-50 text-emerald-500"
                            )}>
                              {finding.relevance}
                            </span>
                          </td>
                          <td className="px-6 py-6">
                            <div className="flex items-center justify-end gap-4 text-neutral-300">
                              <button className="hover:text-blue-600 transition-colors"><FileText size={18} /></button>
                              <button className="hover:text-emerald-600 transition-colors"><Check size={18} /></button>
                              <button className="hover:text-neutral-600 transition-colors"><MoreVertical size={18} /></button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {filteredFindings?.length === 0 && (
                        <tr>
                          <td colSpan={6} className="px-6 py-20 text-center text-neutral-400 italic text-sm">
                            Nenhum resultado encontrado para os filtros aplicados.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <SettingsModal 
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        apiKeys={apiKeys}
        setApiKeys={setApiKeys}
        selectedApiKeyId={selectedApiKeyId}
        setSelectedApiKeyId={setSelectedApiKeyId}
        onConfirmAction={(config) => setConfirmModal({ ...config, isOpen: true })}
      />

      <PromptEditorModal 
        isOpen={isPromptEditorOpen} 
        onClose={() => {
          setIsPromptEditorOpen(false);
          setEditingPrompt(null);
        }} 
        prompt={editingPrompt ? editingPrompt.prompt : aiFixedPrompt}
        onSave={handleSavePrompt}
        presets={prompts}
      />

      <ConfirmationModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        variant={confirmModal.variant}
      />

      <Toast
        isVisible={toast.isVisible}
        message={toast.message}
        type={toast.type}
        onClose={() => setToast({ ...toast, isVisible: false })}
      />

      {/* Left Sidebar: Thumbnails */}
      <div 
        id="left-sidebar"
        className={cn(
          "sidebar left flex flex-col z-[60] relative transition-all duration-300 ease-in-out",
          !isSidebarOpen && "hidden-left",
          isMobile && "fixed inset-y-0 left-0 shadow-2xl"
        )}
        style={{ width: isSidebarOpen ? sidebarWidth : 0 }}
      >
        <div className="p-4 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between min-w-[200px] bg-white dark:bg-neutral-900 sticky top-0 z-10">
          <div className="flex items-center gap-2">
            <h2 className="font-black text-[10px] uppercase tracking-[0.2em] text-neutral-400">PÁGINAS</h2>
            <span className="text-[10px] font-bold text-neutral-400">{(thumbnails || []).length}</span>
          </div>
          <button 
            onClick={toggleLeftSidebar}
            className="p-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg text-neutral-400 lg:hidden"
          >
            <X size={16} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-8">
          {(thumbnails || []).map((thumb, i) => (
            <div 
              key={i} 
              className="flex flex-col items-center gap-2"
            >
              <button
                onClick={() => setCurrentPage(i + 1)}
                className={cn(
                  "w-full aspect-[3/4] rounded-lg border-2 transition-all overflow-hidden shadow-sm flex items-center justify-center bg-neutral-100 dark:bg-neutral-800",
                  currentPage === i + 1 ? "border-blue-600 ring-4 ring-blue-500/10" : "border-transparent hover:border-neutral-300"
                )}
              >
                {thumb ? (
                  <img src={thumb} alt={`Page ${i + 1}`} className="w-full h-full object-cover" />
                ) : (
                  <div className="flex flex-col items-center gap-1">
                    <FileText size={20} className="text-neutral-300" />
                    <span className="text-[8px] font-bold text-neutral-400">PÁG {i + 1}</span>
                  </div>
                )}
              </button>
              <span className="text-[10px] font-bold text-neutral-400">{i + 1}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Left Resize Handle */}
      {isSidebarOpen && !isMobile && (
        <div
          onMouseDown={startResizingLeft}
          className="w-1 hover:w-1.5 bg-transparent hover:bg-blue-500/30 cursor-col-resize z-[70] transition-all"
        />
      )}

      {/* Main Content */}
      <main className="flex-1 flex flex-col relative min-w-0">
        {/* Toolbar */}
        <header className="h-14 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between px-4 bg-white dark:bg-neutral-900 z-30 relative">
          {/* Left & Center Section Grouped */}
          <div className="flex items-center gap-3">
            <button 
              onClick={toggleLeftSidebar}
              className={cn("p-2 rounded-lg transition-colors", isSidebarOpen ? "text-blue-600 bg-blue-50" : "text-neutral-500 hover:bg-neutral-100")}
              title={isSidebarOpen ? "Ocultar Páginas" : "Mostrar Páginas"}
            >
              <PanelLeft size={20} />
            </button>

            <button 
              onClick={() => {
                if (!isRightPanelOpen) setIsRightPanelOpen(true);
                setActiveTab('search');
              }}
              className="p-2 text-neutral-500 hover:bg-neutral-100 rounded-lg"
              title="Buscar"
            >
              <Search size={20} />
            </button>

            <div className="flex items-center gap-0.5">
              <button onClick={() => setZoom(z => Math.max(0.5, z - 0.1))} className="p-1.5 hover:bg-neutral-100 rounded-lg text-neutral-500" title="Diminuir Zoom"><ZoomOut size={18} /></button>
              <span className="text-sm font-bold w-12 text-center">{Math.round(zoom * 100)}%</span>
              <button onClick={() => setZoom(z => Math.min(3, z + 0.1))} className="p-1.5 hover:bg-neutral-100 rounded-lg text-neutral-500" title="Aumentar Zoom"><ZoomIn size={18} /></button>
            </div>

            <div className="h-6 w-px bg-neutral-200 dark:bg-neutral-800 mx-1" />

            <div className="flex items-center gap-1">
              <button 
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                className="p-1 hover:bg-neutral-100 rounded-lg disabled:opacity-30"
              >
                <ChevronLeft size={18} />
              </button>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-medium text-neutral-500">Pág.</span>
                <input 
                  id="page-input"
                  type="text" 
                  value={pageInputValue} 
                  onChange={handlePageInputChange}
                  onKeyDown={handlePageInputKeyDown}
                  onBlur={handlePageInputBlur}
                  className="w-10 h-7 bg-neutral-100 border border-neutral-200 rounded text-center text-xs font-bold focus:ring-1 ring-blue-500 outline-none"
                />
                <span className="text-xs font-medium text-neutral-500">/ {(thumbnails || []).length}</span>
              </div>
              <button 
                disabled={currentPage === (thumbnails || []).length}
                onClick={() => setCurrentPage(Math.min((thumbnails || []).length, currentPage + 1))}
                className="p-1 hover:bg-neutral-100 rounded-lg disabled:opacity-30"
              >
                <ChevronRight size={18} />
              </button>
            </div>

            <div className="h-6 w-px bg-neutral-200 dark:bg-neutral-800 mx-1" />

            <h1 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 truncate max-w-[250px]">
              {file?.name || "Sem título"}
            </h1>

            <div className="h-6 w-px bg-neutral-200 dark:bg-neutral-800 mx-1" />

            <button 
              onClick={handleCloseDocument}
              className="p-1.5 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-full hover:bg-red-100 dark:hover:bg-red-900/40 transition-all border border-red-100 dark:border-red-800"
              title="Fechar Arquivo"
            >
              <X size={18} />
            </button>

            <div className="h-6 w-px bg-neutral-200 dark:bg-neutral-800 mx-1" />
          </div>

          {/* Right Section */}
          <div className="flex items-center gap-1">
            <div className="h-6 w-px bg-neutral-200 dark:bg-neutral-800 mx-1" />

            <div className="flex items-center gap-1 bg-neutral-100 dark:bg-neutral-800 p-1 rounded-xl">
              <button 
                onClick={() => {
                  setEditMode(editMode === 'highlight' ? null : 'highlight');
                  setIsHighlightPopoverOpen(false);
                }}
                className={cn(
                  "p-2 rounded-lg transition-all flex items-center gap-2",
                  editMode === 'highlight' 
                    ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20" 
                    : "text-neutral-500 hover:bg-neutral-200 dark:hover:bg-neutral-700"
                )}
                title="Ferramenta de Destaque (H)"
              >
                <Highlighter size={20} />
                <span className="text-xs font-bold uppercase tracking-widest hidden lg:inline">Destaque</span>
              </button>

              <div className="relative">
                <button 
                  onClick={() => setIsHighlightPopoverOpen(!isHighlightPopoverOpen)}
                  className="p-2 text-neutral-500 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-lg transition-all"
                  style={{ color: highlightColor }}
                >
                  <div className="w-5 h-5 rounded-full border-2 border-current" style={{ backgroundColor: highlightColor + '40' }} />
                </button>

                <AnimatePresence>
                  {isHighlightPopoverOpen && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute top-full right-0 mt-2 p-4 bg-white dark:bg-neutral-800 rounded-2xl shadow-2xl border border-neutral-100 dark:border-neutral-700 z-50 min-w-[200px]"
                    >
                      <div className="space-y-4">
                        <div>
                          <label className="text-[10px] font-black uppercase text-neutral-400 tracking-widest mb-2 block">Cor do Marcador</label>
                          <div className="grid grid-cols-5 gap-2">
                            {['#facc15', '#4ade80', '#60a5fa', '#f472b6', '#f87171'].map(color => (
                              <button
                                key={color}
                                onClick={() => {
                                  setHighlightColor(color);
                                  if (selectedHighlightId) handleUpdateHighlightColor(selectedHighlightId, color);
                                }}
                                className={cn(
                                  "w-8 h-8 rounded-full transition-all hover:scale-110 active:scale-90",
                                  highlightColor === color ? "ring-2 ring-blue-500 ring-offset-2 dark:ring-offset-neutral-800" : ""
                                )}
                                style={{ backgroundColor: color }}
                              />
                            ))}
                          </div>
                        </div>
                        <div>
                          <label className="text-[10px] font-black uppercase text-neutral-400 tracking-widest mb-2 block">Opacidade: {highlightThickness}%</label>
                          <input 
                            type="range" 
                            min="10" 
                            max="100" 
                            value={highlightThickness}
                            onChange={(e) => setHighlightThickness(parseInt(e.target.value))}
                            className="w-full accent-blue-600"
                          />
                        </div>
                        <button 
                          onClick={handleClearAllHighlights}
                          className="w-full py-2 text-[10px] font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all uppercase tracking-widest border border-red-100 dark:border-red-900/30"
                        >
                          Limpar Todos
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            <div className="h-6 w-px bg-neutral-200 dark:bg-neutral-800 mx-1" />

            <button onClick={handlePrint} className="p-2 text-neutral-500 hover:bg-neutral-100 rounded-lg" title="Imprimir">
              <Printer size={20} />
            </button>

            <div className="h-6 w-px bg-neutral-200 dark:bg-neutral-800 mx-1" />

            <button 
              onClick={handleSave}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-bold transition-all shadow-sm"
            >
              <Download size={18} />
              Salvar
            </button>

            <button 
              onClick={handleAiAnalyze}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-bold transition-all shadow-sm"
            >
              <Brain size={18} />
              Analisar IA
            </button>

            <div className="flex items-center gap-2">
              {user.role === 'admin' && (
                <button 
                  onClick={() => setIsAdminView(true)}
                  className="p-2 text-neutral-500 hover:text-blue-600 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl transition-all flex items-center gap-2"
                  title="Administração"
                >
                  <ShieldCheck size={20} />
                  <span className="text-xs font-bold uppercase tracking-widest hidden md:inline">Admin</span>
                </button>
              )}
              
              <button 
                onClick={() => setIsSettingsOpen(true)}
                className="p-2 text-neutral-500 hover:bg-neutral-100 rounded-lg transition-all"
                title="Configurações"
              >
                <Settings size={20} />
              </button>

              <button 
                onClick={handleLogout}
                className="p-2 text-neutral-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all flex items-center gap-2"
                title="Sair"
              >
                <LogOut size={20} />
                <span className="text-xs font-bold uppercase tracking-widest hidden md:inline">Sair</span>
              </button>
            </div>

            <div className="h-6 w-px bg-neutral-200 dark:bg-neutral-800 mx-1" />

            <button 
              onClick={toggleRightSidebar}
              className={cn("p-2 rounded-lg transition-colors", isRightPanelOpen ? "text-blue-600 bg-blue-50" : "text-neutral-500 hover:bg-neutral-100")}
              title={isRightPanelOpen ? "Ocultar Painel" : "Mostrar Painel"}
            >
              <PanelRight size={20} />
            </button>
          </div>
        </header>

        {/* PDF Area */}
        <div className="flex-1 overflow-hidden relative bg-neutral-100 dark:bg-neutral-950">
          {!pdfUrl ? (
            <div 
              className={cn(
                "h-full flex flex-col items-center justify-center p-8 text-center transition-all duration-300",
                isDragging ? "bg-blue-50 dark:bg-blue-900/20 scale-[0.98]" : ""
              )}
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onDrop={onDrop}
            >
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-xl w-full bg-white dark:bg-neutral-900 p-6 md:p-12 rounded-[2rem] md:rounded-[2.5rem] shadow-[0_30px_60px_rgba(0,0,0,0.1)] dark:shadow-[0_30px_60px_rgba(0,0,0,0.4)] border border-neutral-100 dark:border-neutral-800 flex flex-col items-center"
              >
                <div className={cn(
                  "w-16 h-16 md:w-24 md:h-24 rounded-2xl md:rounded-3xl flex items-center justify-center mb-6 md:mb-8 transition-all duration-500",
                  isDragging || isUploading ? "bg-blue-600 text-white rotate-12 scale-110" : "bg-blue-50 dark:bg-blue-900/30 text-blue-600"
                )}>
                  {isUploading ? <Loader2 size={32} className="animate-spin" /> : <FileText size={32} className="md:w-12 md:h-12" />}
                </div>
                
                <h1 className="text-2xl md:text-3xl font-black mb-3 md:mb-4 tracking-tight">PDF Master AI</h1>
                <p className="text-sm md:text-base text-neutral-500 dark:text-neutral-400 mb-8 md:mb-10 leading-relaxed">
                  Arraste seu PDF aqui ou clique para explorar documentos com inteligência artificial avançada.
                </p>
                
                {isUploading ? (
                  <div className="w-full max-w-xs space-y-3">
                    <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-blue-600">
                      <span>Enviando Documento</span>
                      <span>{uploadProgress}%</span>
                    </div>
                    <div className="h-2 w-full bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                      <motion.div 
                        className="h-full bg-blue-600"
                        initial={{ width: 0 }}
                        animate={{ width: `${uploadProgress}%` }}
                        transition={{ type: "spring", bounce: 0, duration: 0.3 }}
                      />
                    </div>
                    <p className="text-[10px] text-neutral-400 italic">Por favor, aguarde enquanto processamos seu arquivo...</p>
                  </div>
                ) : (
                  <label 
                    htmlFor="pdf-upload-input"
                    className="group relative cursor-pointer overflow-hidden bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 px-8 md:px-10 py-3 md:py-4 rounded-xl md:rounded-2xl font-bold transition-all hover:scale-105 active:scale-95 shadow-xl shadow-black/10 dark:shadow-white/10"
                  >
                    <span className="relative z-10 text-sm md:text-base">Selecionar Documento</span>
                    <div className="absolute inset-0 bg-blue-600 translate-y-full transition-transform group-hover:translate-y-0" />
                    <input 
                      id="pdf-upload-input"
                      type="file" 
                      accept=".pdf" 
                      className="absolute inset-0 opacity-0 cursor-pointer" 
                      onChange={handleFileUpload} 
                    />
                  </label>
                )}
                
                <div className="mt-8 md:mt-12 flex flex-wrap justify-center items-center gap-4 md:gap-8 text-[10px] font-bold uppercase tracking-widest text-neutral-400">
                  <div className="flex items-center gap-2"><Search size={14} /> Busca Global</div>
                  <div className="flex items-center gap-2"><Brain size={14} /> Análise IA</div>
                  <div className="flex items-center gap-2"><Highlighter size={14} /> Destaque</div>
                </div>

                {(recentDocuments || []).length > 0 && (
                    <div className="mt-12 w-full max-w-md">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-[10px] font-black uppercase text-neutral-400 tracking-widest">Documentos Recentes</h3>
                        {(recentDocuments || []).length > 0 && (
                          <button 
                            onClick={clearAllDocuments}
                            className="flex items-center gap-1 text-[9px] font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 px-2 py-1 rounded-md transition-all uppercase tracking-widest"
                          >
                            <Trash2 size={10} />
                            Limpar Tudo
                          </button>
                        )}
                      </div>
                      <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                        {(recentDocuments || []).map((doc) => (
                        <div
                          key={doc.id}
                          className="w-full flex items-center justify-between p-3 rounded-xl border border-neutral-100 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/50 hover:bg-white dark:hover:bg-neutral-800 transition-all group"
                        >
                          <button
                            onClick={() => handleOpenRecent(doc)}
                            className="flex-1 flex items-center gap-3 overflow-hidden text-left"
                          >
                            <div className="p-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 rounded-lg group-hover:bg-blue-600 group-hover:text-white transition-colors">
                              <FileText size={16} />
                            </div>
                            <div className="flex flex-col overflow-hidden">
                              <span className="text-xs font-bold truncate">{doc.name}</span>
                              <span className="text-[10px] text-neutral-400">
                                {new Date(doc.created_at).toLocaleDateString()}
                              </span>
                            </div>
                          </button>
                          <div className="flex items-center gap-1">
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                setDocName(doc.name);
                                setPdfUrl(`/api/documents/${doc.id}/pdf`);
                                setReaderPage(undefined);
                                setIsReaderMode(true);
                              }}
                              className="p-2 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg transition-all"
                              title="Abrir no Leitor"
                            >
                              <Search size={16} />
                            </button>
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteDocument(doc.id, doc.name);
                              }}
                              className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
                              title="Excluir Documento"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            </div>
          ) : (
            <div 
              ref={scrollContainerRef}
              className="relative h-full w-full overflow-auto flex flex-col items-center"
            >
              {/* Active Mode Indicators */}
              <AnimatePresence>
                {editMode === 'highlight' && (
                  <motion.div 
                    initial={{ y: -20, opacity: 0, x: '-50%' }}
                    animate={{ y: 0, opacity: 1, x: '-50%' }}
                    exit={{ y: -20, opacity: 0, x: '-50%' }}
                    className="absolute top-4 left-1/2 bg-blue-600 text-white px-4 py-2 rounded-full shadow-xl z-[100] flex items-center gap-3 border border-blue-500"
                  >
                    <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
                    <Highlighter size={16} />
                    <span className="text-[10px] font-black uppercase tracking-widest">
                      Ferramenta de Destaque
                    </span>
                    <button onClick={() => setEditMode(null)} className="ml-2 hover:bg-white/20 p-1 rounded-full transition-colors"><X size={14} /></button>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Floating Selection Menu */}
              <AnimatePresence>
                {activeSelection && !editMode && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 10 }}
                    className="absolute z-[100] bg-white dark:bg-neutral-800 rounded-xl shadow-2xl border border-neutral-100 dark:border-neutral-700 p-1 flex items-center gap-1"
                    style={{
                      left: activeSelection.rects[0].x * zoom,
                      top: (activeSelection.rects[0].y * zoom) - 50
                    }}
                  >
                    <button 
                      onClick={handleAddHighlight}
                      className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg flex items-center gap-2 transition-all"
                    >
                      <Highlighter size={16} />
                      <span className="text-[10px] font-bold uppercase tracking-widest">Destacar</span>
                    </button>
                    <div className="w-px h-4 bg-neutral-200 dark:bg-neutral-700 mx-1" />
                    <button 
                      onClick={() => {
                        navigator.clipboard.writeText(activeSelection.text);
                        setActiveSelection(null);
                        window.getSelection()?.removeAllRanges();
                        showToast("Texto copiado!");
                      }}
                      className="p-2 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-lg flex items-center gap-2 transition-all"
                    >
                      <Copy size={16} />
                      <span className="text-[10px] font-bold uppercase tracking-widest">Copiar</span>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Floating Highlight Menu */}
              <AnimatePresence>
                {selectedHighlightId && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 10 }}
                    className="absolute z-[100] bg-white dark:bg-neutral-800 rounded-xl shadow-2xl border border-neutral-100 dark:border-neutral-700 p-1 flex items-center gap-1"
                    style={{
                      left: textHighlights.find(h => h.id === selectedHighlightId)?.rects[0].x * zoom,
                      top: (textHighlights.find(h => h.id === selectedHighlightId)?.rects[0].y * zoom) - 50
                    }}
                  >
                    <div className="flex items-center gap-1 px-2">
                      {['#facc15', '#4ade80', '#60a5fa', '#f472b6', '#f87171'].map(color => (
                        <button
                          key={color}
                          onClick={() => handleUpdateHighlightColor(selectedHighlightId, color)}
                          className={cn(
                            "w-5 h-5 rounded-full transition-all hover:scale-110",
                            textHighlights.find(h => h.id === selectedHighlightId)?.color === color ? "ring-2 ring-blue-500 ring-offset-1" : ""
                          )}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                    <div className="w-px h-4 bg-neutral-200 dark:bg-neutral-700 mx-1" />
                    <button 
                      onClick={() => handleDeleteHighlight(selectedHighlightId)}
                      className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
                      title="Excluir Destaque"
                    >
                      <Trash2 size={16} />
                    </button>
                    <button 
                      onClick={() => setSelectedHighlightId(null)}
                      className="p-2 text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-lg transition-all"
                    >
                      <X size={16} />
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              <div 
                className="relative" 
                style={{ width: 'fit-content' }}
                onClick={handlePdfClick}
              >
                <PDFViewer 
                  url={pdfUrl} 
                  token={token}
                  currentPage={currentPage}
                  zoom={zoom}
                  onPageChange={setCurrentPage}
                  onTextExtract={setFullText}
                  onThumbnailsGenerated={setThumbnails}
                  highlightQueries={highlightQueries}
                  currentMatch={activeMatch}
                  showAll={searchFilters.showAll}
                  showHighlights={showHighlights}
                  highlightColor="#facc15"
                  textHighlights={textHighlights}
                  selectedHighlightId={selectedHighlightId}
                  showAllAnnotations={showAllAnnotations}
                  editMode={editMode}
                  onTextSelection={handleTextSelection}
                  onHighlightClick={(h) => setSelectedHighlightId(h.id)}
                  onHighlightResize={handleHighlightResize}
                  scrollContainerRef={scrollContainerRef}
                  onMouseDown={handlePdfMouseDown}
                  onMouseMove={handlePdfMouseMove}
                  onMouseUp={handlePdfMouseUp}
                />
                
                {/* Visual Overlays for Edits */}
                {showAllAnnotations && (edits || []).filter(e => e.page === currentPage).map((edit, i) => (
                  <div 
                    key={i}
                    className="absolute pointer-events-none"
                    style={{ left: edit.x * zoom, top: edit.y * zoom }}
                  >
                    {edit.type === 'text' ? (
                      <span className="text-black bg-yellow-200/50 px-1 rounded whitespace-nowrap text-sm" style={{ fontSize: `${14 * zoom}px` }}>{edit.content}</span>
                    ) : (
                      <div className="border-2 border-neutral-400 bg-neutral-400/20" style={{ width: edit.width * zoom, height: edit.height * zoom }} />
                    )}
                  </div>
                ))}
                
                {/* Floating Selection Menu */}
                <AnimatePresence>
                </AnimatePresence>
              </div>
            </div>
          )}

          {/* Floating Search Navigation */}
          <AnimatePresence>
            {isSearchNavOpen && (
              <motion.div 
                initial={{ y: 100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 100, opacity: 0 }}
                className="absolute bottom-20 md:bottom-24 left-1/2 -translate-x-1/2 flex items-center gap-2 md:gap-4 bg-white dark:bg-neutral-900 px-3 md:px-4 py-2 rounded-xl shadow-2xl border border-neutral-200 dark:border-neutral-800 z-40 w-[calc(100%-2rem)] max-w-[400px]"
              >
                <div className="flex-1 flex items-center gap-2 overflow-hidden">
                  <Search size={14} className="text-neutral-400 flex-shrink-0" />
                  <span className="text-[10px] md:text-xs font-medium truncate">{searchQuery || fixedKeywords.join(', ')}</span>
                </div>
                <div className="h-6 w-px bg-neutral-200 dark:bg-neutral-800 flex-shrink-0" />
                <div className="flex items-center gap-1 md:gap-2 flex-shrink-0">
                  <span className="text-[9px] md:text-[10px] font-mono text-neutral-400">{currentMatchIndex + 1}/{(allMatches || []).length}</span>
                  <button 
                    onClick={() => {
                      const next = (currentMatchIndex - 1 + (allMatches || []).length) % (allMatches || []).length;
                      setCurrentMatchIndex(next);
                      setActiveMatch(allMatches[next]);
                      setCurrentPage(allMatches[next].page);
                    }}
                    className="p-1 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-md transition-colors"
                  >
                    <ChevronUp size={16} />
                  </button>
                  <button 
                    onClick={() => {
                      const next = (currentMatchIndex + 1) % (allMatches || []).length;
                      setCurrentMatchIndex(next);
                      setActiveMatch(allMatches[next]);
                      setCurrentPage(allMatches[next].page);
                    }}
                    className="p-1 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-md transition-colors"
                  >
                    <ChevronDown size={16} />
                  </button>
                  <button 
                    onClick={() => setIsSearchNavOpen(false)}
                    className="p-1 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-md transition-colors text-neutral-400 hover:text-red-500"
                  >
                    <X size={16} />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Floating Pagination */}
          {pdfUrl && (
            <div className="absolute bottom-6 md:bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-2 md:gap-4 bg-white/90 dark:bg-neutral-900/90 backdrop-blur-md px-3 md:px-4 py-1.5 md:py-2 rounded-full shadow-2xl border border-neutral-200 dark:border-neutral-800 z-30">
              <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} className="p-1 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-full"><ChevronLeft size={18} md:size={20} /></button>
              <span className="text-[10px] md:text-sm font-mono whitespace-nowrap">Pág. {currentPage} / {(thumbnails || []).length}</span>
              <button onClick={() => setCurrentPage(p => Math.min((thumbnails || []).length, p + 1))} className="p-1 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-full"><ChevronRight size={18} md:size={20} /></button>
            </div>
          )}
        </div>
      </main>

      {/* Right Resize Handle */}
      {isRightPanelOpen && !isMobile && (
        <div
          onMouseDown={startResizingRight}
          className="w-1 hover:w-1.5 bg-transparent hover:bg-blue-500/30 cursor-col-resize z-[70] transition-all"
        />
      )}

      {/* Right Panel: Tools & AI */}
      <div 
        id="right-sidebar"
        className={cn(
          "sidebar border-l border-neutral-200 dark:border-neutral-800 flex flex-col bg-white dark:bg-neutral-900 z-[60] relative transition-all duration-300 ease-in-out",
          !isRightPanelOpen && "hidden-right",
          isMobile && "fixed inset-y-0 right-0 shadow-2xl"
        )}
        style={{ width: isRightPanelOpen ? rightPanelWidth : 0 }}
      >
        <div className="flex border-b border-neutral-100 dark:border-neutral-800 items-center bg-neutral-50 dark:bg-neutral-900/50">
          <div className="flex-1 flex">
            {(['search', 'ai', 'history'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => {
                  if (!isRightPanelOpen) setIsRightPanelOpen(true);
                  setActiveTab(tab);
                }}
                className={cn(
                  "flex-1 py-3 flex flex-col items-center gap-1 transition-all relative",
                  activeTab === tab ? "text-blue-600 bg-white dark:bg-neutral-900" : "text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
                )}
              >
                {tab === 'search' && <Search size={18} />}
                {tab === 'ai' && <Brain size={18} />}
                {tab === 'history' && <FileText size={18} />}
                <span className="text-[10px] uppercase font-bold tracking-widest">
                  {tab === 'search' ? 'BUSCA' : tab === 'ai' ? 'ANÁLISE IA' : 'HISTÓRICO'}
                </span>
                {activeTab === tab && (
                  <motion.div 
                    layoutId="activeTab"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600"
                  />
                )}
              </button>
            ))}
          </div>
          <button 
            onClick={toggleRightSidebar}
            className="p-3 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 lg:hidden"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 min-w-[200px]">
              <AnimatePresence mode="wait">
                {activeTab === 'search' && (
                  <SearchTab 
                    searchQuery={searchQuery}
                    setSearchQuery={setSearchQuery}
                    searchFilters={searchFilters}
                    setSearchFilters={setSearchFilters}
                    handleSearch={handleSearch}
                    handleClearAllSearch={handleClearAllSearch}
                    fixedKeywords={fixedKeywords}
                    addFixedKeyword={addFixedKeyword}
                    removeFixedKeyword={removeFixedKeyword}
                    groupedMatches={groupedMatches}
                    navigateKeywordMatch={navigateKeywordMatch}
                    setCurrentPage={setCurrentPage}
                    showHighlights={showHighlights}
                    setShowHighlights={setShowHighlights}
                  />
                )}

                {activeTab === 'ai' && (
                  <AITab 
                    prompts={prompts}
                    selectedPromptId={selectedPromptId}
                    setSelectedPromptId={setSelectedPromptId}
                    handleEditPrompt={handleEditPrompt}
                    handleDeletePrompt={handleDeletePrompt}
                    handleAddPrompt={handleAddPrompt}
                    handleResetPrompts={handleResetPrompts}
                    handleClearAnalysis={handleClearAnalysis}
                    handleAiAnalyze={handleAiAnalyze}
                    isAiAnalyzing={isAiAnalyzing}
                    pdfUrl={pdfUrl}
                    fullText={fullText}
                    setIsDetailedAnalysisOpen={setIsDetailedAnalysisOpen}
                    aiAnalysis={aiAnalysis}
                    setSelectedFinding={setSelectedFinding}
                    setCurrentPage={setCurrentPage}
                    chatMessages={chatMessages}
                    isChatLoading={isChatLoading}
                    userInput={userInput}
                    setUserInput={setUserInput}
                    handleSendMessage={handleSendMessage}
                    chatEndRef={chatEndRef}
                  />
                )}
                {activeTab === 'history' && (
                  <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="space-y-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-[10px] font-black uppercase text-neutral-400 tracking-widest">Documentos Recentes</h3>
                        {(recentDocuments || []).length > 0 && (
                          <button 
                            onClick={clearAllDocuments}
                            className="flex items-center gap-1 text-[9px] font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 px-2 py-1 rounded-md transition-all uppercase tracking-widest"
                          >
                            <Trash2 size={10} />
                            Limpar Tudo
                          </button>
                        )}
                    </div>
                    
                    <div className="space-y-2">
                      {(recentDocuments || []).length === 0 && (
                        <div className="text-center py-12">
                          <FileText size={32} className="mx-auto text-neutral-200 mb-3" />
                          <p className="text-xs text-neutral-400 italic">Nenhum documento recente.</p>
                        </div>
                      )}
                      {(recentDocuments || []).map((doc) => (
                        <div 
                          key={doc.id}
                          className={cn(
                            "group flex items-center justify-between p-3 rounded-xl border transition-all",
                            docId === doc.id 
                              ? "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800" 
                              : "bg-white dark:bg-neutral-900 border-neutral-100 dark:border-neutral-800 hover:border-neutral-200 dark:hover:border-neutral-700"
                          )}
                        >
                          <button 
                            onClick={() => handleOpenRecent(doc)}
                            className="flex-1 text-left flex items-center gap-3 overflow-hidden"
                          >
                            <div className={cn(
                              "w-8 h-8 rounded-lg flex items-center justify-center transition-colors",
                              docId === doc.id ? "bg-blue-600 text-white" : "bg-neutral-100 dark:bg-neutral-800 text-neutral-400 group-hover:bg-blue-600 group-hover:text-white"
                            )}>
                              <FileText size={14} />
                            </div>
                            <div className="overflow-hidden">
                              <p className="text-xs font-bold truncate">{doc.name}</p>
                              <p className="text-[10px] text-neutral-400">{new Date(doc.created_at).toLocaleDateString()}</p>
                            </div>
                          </button>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteDocument(doc.id, doc.name);
                            }}
                            className="p-2 text-neutral-400 hover:text-red-500 transition-colors"
                            title="Excluir"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
      </div>

    </div>
  );
}
