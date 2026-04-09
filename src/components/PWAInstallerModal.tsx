import React, { useState } from 'react';
import { Download, X, Monitor, Smartphone, CheckCircle2, ArrowRight, ShieldCheck, Zap, Layout, Copy, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

interface PWAInstallerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInstall: () => void;
  isInstallSupported: boolean;
}

export function PWAInstallerModal({ isOpen, onClose, onInstall, isInstallSupported }: PWAInstallerModalProps) {
  const [step, setStep] = useState(1);
  const [copied, setCopied] = useState(false);

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.origin);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getManualInstructions = () => {
    const ua = navigator.userAgent;
    const isIOS = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream;
    const isMac = /Macintosh/.test(ua);
    const isAndroid = /Android/.test(ua);
    const isFirefox = /Firefox/.test(ua);
    const isSafari = /Safari/.test(ua) && !/Chrome/.test(ua);
    
    if (isIOS) {
      return {
        title: "Instalação no iPhone/iPad (Safari)",
        steps: [
          "Toque no ícone de Compartilhar (quadrado com seta para cima).",
          "Role para baixo e toque em 'Adicionar à Tela de Início'.",
          "Confirme o nome e toque em 'Adicionar'."
        ]
      };
    }
    
    if (isAndroid) {
      return {
        title: "Instalação no Android (Chrome/Edge)",
        steps: [
          "Toque nos três pontos (menu) no canto superior direito.",
          "Selecione 'Instalar Aplicativo' ou 'Adicionar à tela inicial'.",
          "Confirme a instalação."
        ]
      };
    }

    if (isMac && isSafari) {
      return {
        title: "Instalação no Mac (Safari)",
        steps: [
          "Vá no menu superior em 'Arquivo'.",
          "Selecione 'Adicionar ao Dock'.",
          "O app aparecerá no seu Dock e Launchpad."
        ]
      };
    }

    if (isFirefox) {
      return {
        title: "Instalação no Firefox",
        steps: [
          "O Firefox Desktop não suporta PWAs nativamente.",
          "Recomendamos usar Chrome ou Edge para instalar como App.",
          "No Android, use o menu 'Instalar' do Firefox."
        ]
      };
    }

    return {
      title: "Instalação Manual",
      steps: [
        "Procure pelo ícone de instalação (computador com seta) na barra de endereços.",
        "Ou abra o menu do navegador (três pontos ou barras).",
        "Selecione 'Instalar PDF Master AI' ou 'Adicionar à tela inicial'."
      ]
    };
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="bg-white dark:bg-neutral-900 rounded-[2.5rem] shadow-2xl max-w-lg w-full overflow-hidden border border-neutral-200 dark:border-neutral-800"
          >
            <div className="relative flex flex-col h-full">
              {/* Header */}
              <div className="p-8 pb-0 flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-600/20">
                    <Download size={24} />
                  </div>
                  <div>
                    <h2 className="text-xl font-black uppercase tracking-tight text-neutral-900 dark:text-white">Assistente de Instalação</h2>
                    <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400">PDF Master AI v4.0</p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-full transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Content Area */}
              <div className="p-8 pt-10 flex-1">
                <AnimatePresence mode="wait">
                  {step === 1 ? (
                    <motion.div
                      key="step1"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="space-y-6"
                    >
                      <div className="space-y-2">
                        <h3 className="text-2xl font-black text-neutral-900 dark:text-white leading-tight">
                          Transforme sua experiência com PDF Master AI
                        </h3>
                        <p className="text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed">
                          A instalação permite que o aplicativo funcione de forma nativa no seu sistema operacional, oferecendo maior performance e integração.
                        </p>
                      </div>

                      <div className="grid grid-cols-1 gap-3">
                        <div className="flex items-center gap-4 p-4 rounded-2xl bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800">
                          <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                            <Monitor size={20} />
                          </div>
                          <div>
                            <p className="text-xs font-black uppercase tracking-widest text-neutral-900 dark:text-white">Desktop e Barra de Tarefas</p>
                            <p className="text-[10px] text-neutral-500">Crie um atalho na sua área de trabalho e fixe na barra de tarefas.</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-100 dark:border-neutral-800">
                          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                            <Smartphone size={20} />
                          </div>
                          <div>
                            <p className="text-xs font-black uppercase tracking-widest text-neutral-900 dark:text-white">Mobile e Tablet</p>
                            <p className="text-[10px] text-neutral-500">Leve seus documentos para qualquer lugar.</p>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="step2"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="space-y-8 text-center py-4"
                    >
                      <div className="relative inline-block">
                        <div className="w-24 h-24 rounded-[2rem] bg-blue-600 flex items-center justify-center text-white shadow-2xl shadow-blue-600/30 mx-auto animate-bounce">
                          <Download size={40} />
                        </div>
                        <div className="absolute -bottom-2 -right-2 w-10 h-10 rounded-full bg-emerald-500 border-4 border-white dark:border-neutral-900 flex items-center justify-center text-white">
                          <CheckCircle2 size={20} />
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <h3 className="text-2xl font-black text-neutral-900 dark:text-white">Tudo Pronto!</h3>
                        {isInstallSupported ? (
                          <p className="text-sm text-neutral-500 dark:text-neutral-400 max-w-xs mx-auto">
                            O navegador solicitará uma confirmação final. Clique em <strong>"Instalar"</strong> na janela que aparecerá no topo.
                          </p>
                        ) : (
                          <div className="space-y-4 text-left">
                            <div className="p-5 bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700 rounded-3xl">
                              <p className="text-xs font-black uppercase tracking-widest text-blue-600 dark:text-blue-400 mb-3">
                                {getManualInstructions().title}
                              </p>
                              <ul className="space-y-3">
                                {getManualInstructions().steps.map((step, i) => (
                                  <li key={i} className="flex gap-3 text-xs text-neutral-600 dark:text-neutral-300">
                                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center text-[10px] font-bold">
                                      {i + 1}
                                    </span>
                                    {step}
                                  </li>
                                ))}
                              </ul>
                              <div className="mt-4 flex items-center justify-between p-3 bg-neutral-100 dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700">
                                <span className="text-[10px] text-neutral-500 truncate mr-2">{window.location.origin}</span>
                                <button
                                  onClick={copyLink}
                                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-neutral-900 text-[10px] font-black uppercase tracking-widest text-blue-600 dark:text-blue-400 rounded-lg border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-all active:scale-95"
                                >
                                  {copied ? <Check size={12} /> : <Copy size={12} />}
                                  {copied ? "Copiado" : "Copiar Link"}
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="p-4 rounded-2xl bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 flex items-center gap-3 text-left">
                        <ShieldCheck className="text-blue-600 shrink-0" size={24} />
                        <p className="text-[10px] text-blue-800 dark:text-blue-300 font-medium">
                          Este aplicativo é seguro e verificado. Ele não terá acesso aos seus arquivos pessoais sem sua permissão explícita.
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Footer Actions */}
              <div className="p-8 bg-neutral-50 dark:bg-neutral-800/50 border-t border-neutral-200 dark:border-neutral-800 flex flex-col gap-3">
                {step === 1 ? (
                  <button
                    onClick={() => setStep(2)}
                    className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-blue-600/20 transition-all flex items-center justify-center gap-2 group"
                  >
                    Continuar Instalação
                    <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                  </button>
                ) : (
                  <>
                    {isInstallSupported ? (
                      <button
                        onClick={onInstall}
                        className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-emerald-600/20 transition-all flex items-center justify-center gap-2"
                      >
                        <Download size={16} />
                        Confirmar e Instalar
                      </button>
                    ) : (
                      <button
                        onClick={onClose}
                        className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-blue-600/20 transition-all flex items-center justify-center gap-2"
                      >
                        Entendi
                      </button>
                    )}
                  </>
                )}
                <button
                  onClick={onClose}
                  className="w-full py-3 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 font-black uppercase tracking-widest text-[10px] transition-colors"
                >
                  {isInstallSupported ? "Cancelar e usar no navegador" : "Fechar"}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
