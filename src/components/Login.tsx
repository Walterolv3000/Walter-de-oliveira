import React, { useState } from 'react';
import { Mail, Lock, Eye, EyeOff, Loader2, Brain } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

interface LoginProps {
  onLogin: (token: string, user: any) => void;
}

export const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        onLogin(data.token, data.user);
      } else {
        setError(data.error || 'Falha ao entrar. Verifique suas credenciais.');
      }
    } catch (err) {
      setError('Erro de conexão com o servidor.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-neutral-950 p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="bg-white dark:bg-neutral-900 rounded-[32px] shadow-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden">
          <div className="p-8 pb-0 flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-xl shadow-blue-600/20 mb-6">
              <Brain size={32} />
            </div>
            <h1 className="text-2xl font-black text-neutral-900 dark:text-white uppercase tracking-tight mb-2">
              PDF Master AI
            </h1>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 font-medium">
              Entre para gerenciar seus documentos
            </p>
          </div>

          <form onSubmit={handleSubmit} className="p-8 space-y-6">
            {error && (
              <motion.div 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 rounded-2xl text-xs font-bold text-red-600 dark:text-red-400"
              >
                {error}
              </motion.div>
            )}

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-neutral-400 tracking-widest ml-1">
                  Email ou Usuário
                </label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400">
                    <Mail size={18} />
                  </div>
                  <input 
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700 rounded-2xl pl-12 pr-4 py-4 text-sm outline-none focus:ring-4 ring-blue-500/10 transition-all"
                    placeholder="Digite seu email."
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-neutral-400 tracking-widest ml-1">
                  Senha
                </label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400">
                    <Lock size={18} />
                  </div>
                  <input 
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700 rounded-2xl pl-12 pr-12 py-4 text-sm outline-none focus:ring-4 ring-blue-500/10 transition-all"
                    placeholder="••••••••"
                  />
                  <button 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 transition-colors"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between px-1">
              <button type="button" className="text-[10px] font-bold text-blue-600 hover:underline">
                Esqueci minha senha
              </button>
            </div>

            <button 
              type="submit"
              disabled={isLoading}
              className="w-full bg-blue-600 text-white py-4 rounded-2xl text-sm font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-xl shadow-blue-600/20 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isLoading ? <Loader2 size={18} className="animate-spin" /> : "Entrar"}
            </button>
          </form>

          <div className="p-6 bg-neutral-50 dark:bg-neutral-800/20 border-t border-neutral-100 dark:border-neutral-800 text-center">
            <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">
              Sistema de Análise de Documentos v2.0
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
