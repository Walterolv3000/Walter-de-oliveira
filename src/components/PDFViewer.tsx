import React, { useEffect, useRef, useState } from 'react';
import { Loader2, X } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

// Set worker path using the local worker from the package
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

interface PDFViewerProps {
  url: string;
  token?: string | null;
  onPageChange?: (page: number) => void;
  onTextExtract?: (text: string) => void;
  zoom?: number;
  currentPage?: number;
  onThumbnailsGenerated?: (thumbnails: string[]) => void;
  highlightQueries?: string[];
  currentMatch?: { page: number, query: string, occurrenceIndexOnPage?: number } | null;
  showAll?: boolean;
  showHighlights?: boolean;
  highlightColor?: string;
  textHighlights?: any[];
  selectedHighlightId?: string | null;
  showAllAnnotations?: boolean;
  editMode?: 'highlight' | 'text' | 'shape' | null;
  onTextSelection?: (selection: { text: string, rects: { x: number, y: number, w: number, h: number }[], page: number } | null) => void;
  onHighlightClick?: (highlight: any) => void;
  onHighlightResize?: (id: string, newRects: { x: number, y: number, w: number, h: number }[]) => void;
  scrollContainerRef?: React.RefObject<HTMLDivElement | null>;
  onMouseDown?: (e: React.MouseEvent) => void;
  onMouseMove?: (e: React.MouseEvent) => void;
  onMouseUp?: (e: React.MouseEvent) => void;
}

export const PDFViewer: React.FC<PDFViewerProps> = ({
  url,
  token,
  onPageChange,
  onTextExtract,
  zoom = 1.0,
  currentPage = 1,
  onThumbnailsGenerated,
  highlightQueries = [],
  currentMatch = null,
  showAll = false,
  showHighlights = true,
  highlightColor = '#facc15',
  textHighlights = [],
  selectedHighlightId = null,
  showAllAnnotations = true,
  editMode = null,
  onTextSelection,
  onHighlightClick,
  onHighlightResize,
  scrollContainerRef,
  onMouseDown,
  onMouseMove,
  onMouseUp
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const textLayerRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<any>(null);
  const [pdf, setPdf] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [renderTask, setRenderTask] = useState<any>(null);
  const [highlights, setHighlights] = useState<{ x: number, y: number, w: number, h: number, text: string, isCurrent: boolean }[]>([]);
  const [resizingInfo, setResizingInfo] = useState<{ id: string, edge: 'start' | 'end', startX: number, startY: number } | null>(null);

  // Load PDF
  useEffect(() => {
    let isMounted = true;
    const loadPdf = async () => {
      if (!url) return;
      
      setIsLoading(true);
      setError(null);
      setPdf(null); // Clear previous PDF
      
      try {
        console.log("Loading PDF from URL:", url);
        
        // Ensure URL is absolute if it starts with /api
        const finalUrl = url.startsWith('/') ? `${window.location.origin}${url}` : url;
        
        const loadingTask = pdfjsLib.getDocument({
          url: finalUrl,
          httpHeaders: token ? { 'Authorization': `Bearer ${token}` } : undefined,
          withCredentials: true, // Important for some proxy setups
          cMapUrl: `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/cmaps/`,
          cMapPacked: true,
          standardFontDataUrl: `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/standard_fonts/`,
        });
        
        const pdfDoc = await loadingTask.promise;
        
        if (!isMounted) return;
        setPdf(pdfDoc);
        console.log("PDF loaded successfully, pages:", pdfDoc.numPages);

        // Extract text and thumbnails in background
        const extractData = async () => {
          let fullText = "";
          const thumbs: string[] = new Array(pdfDoc.numPages).fill("");
          const pageTexts: string[] = new Array(pdfDoc.numPages).fill("");
          
          // Process pages in batches of 5 for better performance
          const batchSize = 5;
          for (let i = 1; i <= pdfDoc.numPages; i += batchSize) {
            if (!isMounted) break;
            
            const batch = [];
            for (let j = i; j < i + batchSize && j <= pdfDoc.numPages; j++) {
              batch.push(j);
            }
            
            await Promise.all(batch.map(async (pageNum) => {
              try {
                const page = await pdfDoc.getPage(pageNum);
                const textContent = await page.getTextContent();
                const pageText = (textContent.items || []).map((item: any) => item.str).join(" ");
                pageTexts[pageNum - 1] = pageText;

                // Thumbnail generation - only for first 50 pages to save memory
                if (pageNum <= 50) {
                  const viewport = page.getViewport({ scale: 0.2 });
                  const canvas = document.createElement('canvas');
                  const context = canvas.getContext('2d');
                  if (context) {
                    canvas.height = viewport.height;
                    canvas.width = viewport.width;
                    await page.render({ canvasContext: context, viewport, canvas }).promise;
                    thumbs[pageNum - 1] = canvas.toDataURL('image/jpeg', 0.7);
                  }
                }
              } catch (pageErr) {
                console.warn(`Error extracting page ${pageNum}:`, pageErr);
                pageTexts[pageNum - 1] = "[Erro ao extrair texto desta página]";
              }
            }));
          }
          
          if (isMounted) {
            fullText = pageTexts.map((text, i) => `\n--- Page ${i + 1} ---\n${text}`).join("");
            onTextExtract?.(fullText);
            onThumbnailsGenerated?.(thumbs);
          }
        };

        extractData();
      } catch (err: any) {
        if (isMounted) {
          console.error("PDF Load Error:", err);
          let errorMessage = "Não foi possível carregar o PDF.";
          
          if (err.name === 'PasswordException') {
            errorMessage = "Este PDF está protegido por senha.";
          } else if (err.name === 'InvalidPDFException') {
            errorMessage = "O arquivo PDF parece estar corrompido ou é inválido.";
          } else if (err.name === 'MissingPDFException') {
            errorMessage = "O arquivo PDF não foi encontrado no servidor.";
          } else if (err.message.includes('401') || err.message.includes('403')) {
            errorMessage = "Sessão expirada ou sem permissão para acessar este arquivo.";
          } else {
            errorMessage += ` (${err.message || 'Erro desconhecido'})`;
          }
          
          setError(errorMessage);
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    if (url) loadPdf();
    return () => { isMounted = false; };
  }, [url]);

  // Render Page and Calculate Highlights
  useEffect(() => {
    let isCurrentRender = true;
    
    // Smooth scroll to top when page changes
    if (scrollContainerRef?.current) {
      scrollContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }

    const renderPage = async () => {
      if (!pdf || !canvasRef.current) return;

      // Cancel previous render task if exists
      if (renderTask) {
        try {
          renderTask.cancel();
        } catch (e) {
          // Ignore cancellation errors
        }
      }

      try {
        const page = await pdf.getPage(currentPage);
        const viewport = page.getViewport({ scale: zoom });
        viewportRef.current = viewport;
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');

        if (!context || !isCurrentRender) return;

        canvas.height = viewport.height;
        canvas.width = viewport.width;

        const newTask = page.render({
          canvasContext: context,
          viewport: viewport,
        });

        setRenderTask(newTask);
        await newTask.promise;
        
        if (!isCurrentRender) return;

        // Render text layer for selection
        if (textLayerRef.current) {
          textLayerRef.current.innerHTML = '';
          const textContent = await page.getTextContent();
          const textLayer = new (pdfjsLib as any).TextLayer({
            textContentSource: textContent,
            container: textLayerRef.current,
            viewport: viewport,
          });
          await textLayer.render();
        }

        onPageChange?.(currentPage);

        // Calculate highlights
        if ((highlightQueries || []).length > 0) {
          const textContent = await page.getTextContent();
          const newHighlights: any[] = [];
          const lowerQueries = (highlightQueries || []).map(q => q.toLowerCase());
          const queryCounters: Record<string, number> = {};
          lowerQueries.forEach(q => queryCounters[q] = 0);

          textContent.items.forEach((item: any) => {
            const str = item.str.toLowerCase();
            lowerQueries.forEach((query) => {
              let startIdx = 0;
              while ((startIdx = str.indexOf(query, startIdx)) !== -1) {
                const currentCounter = queryCounters[query];
                const isCurrent = currentMatch?.page === currentPage && 
                                 currentMatch?.query.toLowerCase() === query &&
                                 (currentMatch?.occurrenceIndexOnPage === undefined || 
                                  currentMatch?.occurrenceIndexOnPage === currentCounter);

                // If showAll is false, we only show if it's the current match
                if (!showAll && !isCurrent) {
                  queryCounters[query]++;
                  startIdx += query.length;
                  continue;
                }

                const [x, y] = viewport.convertToViewportPoint(item.transform[4], item.transform[5]);
                const width = item.width * zoom;
                const height = item.height * zoom;

                newHighlights.push({
                  x,
                  y: y - height,
                  w: width,
                  h: height,
                  text: item.str,
                  isCurrent
                });
                
                queryCounters[query]++;
                startIdx += query.length;
              }
            });
          });
          
          if (isCurrentRender) {
            setHighlights(newHighlights);
            
            // Auto-scroll to current match
            const currentMatchHighlight = newHighlights.find(h => h.isCurrent);
            if (currentMatchHighlight && scrollContainerRef?.current) {
              scrollContainerRef.current.scrollTo({
                top: currentMatchHighlight.y - 100,
                behavior: 'smooth'
              });
            }
          }
        } else {
          if (isCurrentRender) setHighlights([]);
        }

        // Auto-scroll to selected custom highlight
        if (selectedHighlightId && textHighlights && textHighlights.length > 0) {
          const selected = textHighlights.find(h => h.id === selectedHighlightId && h.page === currentPage);
          if (selected && scrollContainerRef?.current) {
            scrollContainerRef.current.scrollTo({
              top: selected.rects[0].y - 100,
              behavior: 'smooth'
            });
          }
        }

      } catch (err: any) {
        if (err.name !== 'RenderingCancelledException' && isCurrentRender) {
          console.error("Render Error:", err);
          setError(`Erro ao renderizar a página ${currentPage}.`);
        }
      }
    };

    renderPage();
    return () => { isCurrentRender = false; };
  }, [pdf, currentPage, zoom, highlightQueries, currentMatch, showAll]);

  // Handle Text Selection
  useEffect(() => {
    const handleSelection = () => {
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed || !textLayerRef.current) {
        onTextSelection?.(null);
        return;
      }

      // Check if selection is within the text layer
      if (!textLayerRef.current.contains(selection.anchorNode)) {
        return;
      }

      const range = selection.getRangeAt(0);
      const rects = Array.from(range.getClientRects());
      const containerRect = textLayerRef.current.getBoundingClientRect();

      // Map to PDF points and filter out invalid rects
      const rawRects = rects.map(rect => ({
        x: (rect.left - containerRect.left) / zoom,
        y: (rect.top - containerRect.top) / zoom,
        w: rect.width / zoom,
        h: rect.height / zoom
      })).filter(r => r.w > 0 && r.h > 0);

      // Merge adjacent rects on the same line for a cleaner look
      const mergedRects: { x: number, y: number, w: number, h: number }[] = [];
      if (rawRects.length > 0) {
        // Sort by y then x
        const sorted = [...rawRects].sort((a, b) => (Math.abs(a.y - b.y) < 2 ? a.x - b.x : a.y - b.y));
        
        let current = sorted[0];
        for (let i = 1; i < sorted.length; i++) {
          const next = sorted[i];
          // If on same line (y is close) and adjacent or overlapping (x is close)
          if (Math.abs(next.y - current.y) < 2 && next.x <= current.x + current.w + 2) {
            const newX = Math.min(current.x, next.x);
            const newW = Math.max(current.x + current.w, next.x + next.w) - newX;
            current = { ...current, x: newX, w: newW, h: Math.max(current.h, next.h) };
          } else {
            mergedRects.push(current);
            current = next;
          }
        }
        mergedRects.push(current);
      }

      if (mergedRects.length > 0) {
        onTextSelection?.({
          text: selection.toString(),
          rects: mergedRects,
          page: currentPage
        });
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (resizingInfo) {
        const highlight = textHighlights.find(h => h.id === resizingInfo.id);
        if (!highlight || !textLayerRef.current) return;

        const containerRect = textLayerRef.current.getBoundingClientRect();
        const mouseX = (e.clientX - containerRect.left) / zoom;
        const mouseY = (e.clientY - containerRect.top) / zoom;

        const newRects = [...highlight.rects];
        if (resizingInfo.edge === 'start') {
          const firstRect = { ...newRects[0] };
          const deltaX = mouseX - firstRect.x;
          firstRect.x = mouseX;
          firstRect.w = Math.max(5, firstRect.w - deltaX);
          newRects[0] = firstRect;
        } else {
          const lastRect = { ...newRects[newRects.length - 1] };
          lastRect.w = Math.max(5, mouseX - lastRect.x);
          newRects[newRects.length - 1] = lastRect;
        }
        onHighlightResize?.(highlight.id, newRects);
        return;
      }
      if (e.buttons === 1) handleSelection();
    };

    const handleMouseUp = () => {
      setResizingInfo(null);
      handleSelection();
    };

    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('mousemove', handleMouseMove);
    return () => {
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('mousemove', handleMouseMove);
    };
  }, [currentPage, onTextSelection, zoom, textHighlights, resizingInfo, onHighlightResize, editMode]);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-12 text-center bg-white dark:bg-neutral-900 rounded-2xl shadow-inner border border-red-100 dark:border-red-900/20 m-8">
        <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-4">
          <X className="text-red-600" size={32} />
        </div>
        <h3 className="text-lg font-bold text-neutral-900 dark:text-white mb-2">Ops! Algo deu errado</h3>
        <p className="text-neutral-500 dark:text-neutral-400 text-sm max-w-xs mb-6">{error}</p>
        <button 
          onClick={() => window.location.reload()}
          className="px-6 py-2 bg-neutral-900 dark:bg-white dark:text-neutral-900 text-white rounded-full text-sm font-bold hover:opacity-90 transition-all"
        >
          Tentar Novamente
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center bg-[#E8E9EB] dark:bg-neutral-950 p-8 md:p-12 min-h-full scroll-smooth">
      <motion.div 
        key={currentPage}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="relative group"
      >
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/80 dark:bg-neutral-900/80 backdrop-blur-sm z-10 rounded-lg">
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="animate-spin text-blue-600" size={40} />
              <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400">Processando documento...</p>
            </div>
          </div>
        )}
        
        <div 
          ref={containerRef} 
          className="bg-white dark:bg-neutral-800 shadow-[0_20px_50px_rgba(0,0,0,0.1)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.3)] rounded-sm transition-all duration-300 ring-1 ring-black/5 dark:ring-white/5 relative"
          style={{ width: 'fit-content' }}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
        >
          <canvas ref={canvasRef} className="block" />
          
          {/* Text Layer for Selection */}
          <div 
            ref={textLayerRef} 
            className={cn(
              "absolute inset-0 textLayer pointer-events-auto print:hidden cursor-text"
            )}
            style={{ 
              width: canvasRef.current?.width, 
              height: canvasRef.current?.height
            }}
          />
          
          {/* Custom Text Highlights */}
          {showAllAnnotations && textHighlights.filter(h => h.page === currentPage).map((h) => (
            <div key={h.id} className="absolute inset-0 pointer-events-none z-10">
              {h.rects.map((rect: any, idx: number) => (
                <div
                  key={idx}
                  className={cn(
                    "absolute pointer-events-auto mix-blend-multiply dark:mix-blend-screen transition-all group/hl",
                    selectedHighlightId === h.id ? "ring-2 ring-blue-500 ring-offset-1" : "hover:bg-opacity-80"
                  )}
                  style={{
                    left: rect.x * zoom,
                    top: rect.y * zoom,
                    width: rect.w * zoom,
                    height: rect.h * zoom,
                    backgroundColor: h.color + Math.floor((h.thickness || 40) * 2.55).toString(16).padStart(2, '0'),
                    cursor: 'pointer'
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    onHighlightClick?.(h);
                  }}
                >
                  {/* Resize Handles - only on first and last rect of selection */}
                  {selectedHighlightId === h.id && idx === 0 && (
                    <div 
                      className="absolute left-0 top-0 bottom-0 w-1.5 bg-blue-500 cursor-col-resize z-30"
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        setResizingInfo({ id: h.id, edge: 'start', startX: e.clientX, startY: e.clientY });
                      }}
                    />
                  )}
                  {selectedHighlightId === h.id && idx === h.rects.length - 1 && (
                    <div 
                      className="absolute right-0 top-0 bottom-0 w-1.5 bg-blue-500 cursor-col-resize z-30"
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        setResizingInfo({ id: h.id, edge: 'end', startX: e.clientX, startY: e.clientY });
                      }}
                    />
                  )}
                </div>
              ))}
            </div>
          ))}
          
          {/* Search Highlights */}
          {showHighlights && highlights.map((h, i) => (
            <div 
              key={i}
              className={cn(
                "absolute pointer-events-none mix-blend-multiply dark:mix-blend-screen transition-colors duration-200 print:hidden",
                h.isCurrent ? "bg-orange-400/60 z-20" : "z-10"
              )}
              style={{
                left: h.x,
                top: h.y,
                width: h.w,
                height: h.h,
                backgroundColor: h.isCurrent ? undefined : `${highlightColor}66` // 40% opacity
              }}
            />
          ))}
        </div>
      </motion.div>
    </div>
  );
};
