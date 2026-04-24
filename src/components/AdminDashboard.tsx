import React, { useState, useEffect } from 'react';
import { 
  Users, UserPlus, Pencil, Trash2, Search, X, 
  Shield, User, Mail, Calendar, Loader2, ChevronLeft,
  Key, RefreshCw, Eraser, Brain, Download, Monitor, Laptop, Smartphone
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { ConfirmationModal } from './ConfirmationModal';

interface UserData {
  id: string;
  name: string;
  email: string;
  role: string;
  created_at: string;
}

interface AdminDashboardProps {
  token: string;
  onBack: () => void;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  fetchWithAuth: (url: string, options?: RequestInit) => Promise<Response>;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ token, onBack, showToast, fetchWithAuth }) => {
  const [users, setUsers] = useState<UserData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'users' | 'prompts' | 'downloads'>('users');
  const [prompts, setPrompts] = useState<any[]>([]);
  const [isPromptModalOpen, setIsPromptModalOpen] = useState(false);
  const [editingPrompt, setEditingPrompt] = useState<any>(null);
  const [promptFormData, setPromptFormData] = useState({
    name: '',
    prompt: '',
    is_default: false
  });
  
  // Deletion state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserData | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<UserData | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Prompt Deletion state
  const [isPromptDeleteModalOpen, setIsPromptDeleteModalOpen] = useState(false);
  const [promptToDelete, setPromptToDelete] = useState<any>(null);

  // Password Reset state
  const [isPasswordResetModalOpen, setIsPasswordResetModalOpen] = useState(false);
  const [userToResetPassword, setUserToResetPassword] = useState<UserData | null>(null);
  const [resetPasswordValue, setResetPasswordValue] = useState('123456');
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'user'
  });

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const response = await fetchWithAuth('/api/admin/users');
      if (response.ok) {
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          const data = await response.json();
          setUsers(data);
        }
      }
    } catch (err) {
      console.error("Failed to fetch users", err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPrompts = async () => {
    try {
      const response = await fetchWithAuth('/api/prompts');
      if (response.ok) {
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          const data = await response.json();
          setPrompts(data);
        }
      }
    } catch (err) {
      console.error("Failed to fetch prompts", err);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchPrompts();
  }, [token]);

  const handleOpenModal = (user?: UserData) => {
    if (user) {
      setEditingUser(user);
      setFormData({
        name: user.name,
        email: user.email,
        password: '',
        role: user.role
      });
    } else {
      setEditingUser(null);
      setFormData({
        name: '',
        email: '',
        password: '',
        role: 'user'
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const url = editingUser ? `/api/admin/users/${editingUser.id}` : '/api/admin/users';
    const method = editingUser ? 'PUT' : 'POST';

    try {
      const response = await fetchWithAuth(url, {
        method,
        headers: { 
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        setIsModalOpen(false);
        fetchUsers();
        showToast(editingUser ? "Usuário atualizado com sucesso" : "Usuário criado com sucesso");
      } else {
        const responseText = await response.text();
        let errorMessage = "Erro ao salvar usuário";
        try {
          const data = JSON.parse(responseText);
          errorMessage = data.error || errorMessage;
        } catch (e) {
          if (responseText.includes('<!doctype') || responseText.includes('<html')) {
            errorMessage = "Erro no servidor (HTML).";
          }
        }
        showToast(errorMessage, "error");
      }
    } catch (err) {
      showToast("Erro de conexão", "error");
    }
  };

  const handleResetPassword = async () => {
    if (!userToResetPassword) return;
    setIsLoading(true);

    try {
      const response = await fetchWithAuth(`/api/admin/users/${userToResetPassword.id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          name: userToResetPassword.name, 
          email: userToResetPassword.email, 
          role: userToResetPassword.role, 
          password: resetPasswordValue 
        })
      });

      if (response.ok) {
        setIsPasswordResetModalOpen(false);
        showToast("Senha resetada com sucesso!");
      } else {
        const responseText = await response.text();
        let errorMessage = "Erro ao resetar senha";
        try {
          const data = JSON.parse(responseText);
          errorMessage = data.error || errorMessage;
        } catch (e) {
          if (responseText.includes('<!doctype') || responseText.includes('<html')) {
            errorMessage = "Erro no servidor (HTML).";
          }
        }
        showToast(errorMessage, "error");
      }
    } catch (err) {
      showToast("Erro de conexão", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPasswordClick = (user: UserData) => {
    setUserToResetPassword(user);
    setResetPasswordValue('123456');
    setIsPasswordResetModalOpen(true);
  };

  const handleDeleteClick = (user: UserData) => {
    // Prevent self-deletion
    const currentUserToken = token;
    try {
      const base64Url = currentUserToken.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));
      
      const payload = JSON.parse(jsonPayload);
      if (payload.id === user.id) {
        showToast("Você não pode excluir seu próprio usuário enquanto estiver logado.", "error");
        return;
      }
    } catch (e) {
      console.error("Error parsing token", e);
    }

    setUserToDelete(user);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!userToDelete) return;
    
    setIsDeleting(true);
    try {
      const response = await fetchWithAuth(`/api/admin/users/${userToDelete.id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setUsers(prev => prev.filter(u => u.id !== userToDelete.id));
        setIsDeleteModalOpen(false);
        showToast("Usuário excluído com sucesso");
      } else {
        const responseText = await response.text();
        let errorMessage = "Erro ao excluir usuário";
        try {
          const data = JSON.parse(responseText);
          errorMessage = data.error || errorMessage;
        } catch (e) {
          if (responseText.includes('<!doctype') || responseText.includes('<html')) {
            errorMessage = "Erro no servidor (HTML).";
          }
        }
        showToast(errorMessage, "error");
      }
    } catch (err) {
      showToast("Erro de conexão ao tentar excluir", "error");
    } finally {
      setIsDeleting(false);
      setUserToDelete(null);
    }
  };

  const handleOpenPromptModal = (prompt?: any) => {
    if (prompt) {
      setEditingPrompt(prompt);
      setPromptFormData({
        name: prompt.name,
        prompt: prompt.prompt,
        is_default: prompt.is_default || false
      });
    } else {
      setEditingPrompt(null);
      setPromptFormData({
        name: '',
        prompt: '',
        is_default: false
      });
    }
    setIsPromptModalOpen(true);
  };

  const handlePromptSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    const url = editingPrompt ? `/api/prompts/${editingPrompt.id}` : '/api/prompts';
    const method = editingPrompt ? 'PUT' : 'POST';

    try {
      const response = await fetchWithAuth(url, {
        method,
        headers: { 
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(promptFormData)
      });

      if (response.ok) {
        setIsPromptModalOpen(false);
        fetchPrompts();
        showToast(editingPrompt ? "Prompt atualizado com sucesso" : "Prompt criado com sucesso");
      } else {
        const responseText = await response.text();
        let errorMessage = "Erro ao salvar prompt";
        try {
          const data = JSON.parse(responseText);
          errorMessage = data.error || errorMessage;
        } catch (e) {
          if (responseText.includes('<!doctype') || responseText.includes('<html')) {
            errorMessage = "Erro no servidor (HTML).";
          }
        }
        showToast(errorMessage, "error");
      }
    } catch (err) {
      showToast("Erro de conexão", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeletePrompt = async () => {
    if (!promptToDelete) return;
    setIsLoading(true);
    
    try {
      const response = await fetchWithAuth(`/api/prompts/${promptToDelete.id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setPrompts(prev => prev.filter(p => p.id !== promptToDelete.id));
        setIsPromptDeleteModalOpen(false);
        showToast("Prompt excluído com sucesso");
      } else {
        const responseText = await response.text();
        let errorMessage = "Erro ao excluir prompt";
        try {
          const data = JSON.parse(responseText);
          errorMessage = data.error || errorMessage;
        } catch (e) {
          if (responseText.includes('<!doctype') || responseText.includes('<html')) {
            errorMessage = "Erro no servidor (HTML).";
          }
        }
        showToast(errorMessage, "error");
      }
    } catch (err) {
      showToast("Erro de conexão ao tentar excluir", "error");
    } finally {
      setIsLoading(false);
      setPromptToDelete(null);
    }
  };

  const handleDeletePromptClick = (prompt: any) => {
    setPromptToDelete(prompt);
    setIsPromptDeleteModalOpen(true);
  };

  const filteredUsers = React.useMemo(() => users.filter(u => 
    u.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    u.email.toLowerCase().includes(searchQuery.toLowerCase())
  ), [users, searchQuery]);

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 flex flex-col">
      {/* Header */}
      <header className="bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 px-8 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <button 
            onClick={onBack}
            className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-full transition-colors text-neutral-500"
          >
            <ChevronLeft size={20} />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-600/20">
              <Shield size={22} />
            </div>
            <div>
              <h1 className="text-lg font-black uppercase tracking-tight text-neutral-900 dark:text-white">
                Painel Administrativo
              </h1>
              <div className="flex gap-2 mt-1">
                <button 
                  onClick={() => setActiveTab('users')}
                  className={cn(
                    "text-[10px] font-black uppercase tracking-widest transition-all px-2 py-1 rounded-lg",
                    activeTab === 'users' ? "bg-blue-600 text-white" : "text-neutral-400 hover:text-neutral-600"
                  )}
                >
                  Usuários
                </button>
                <button 
                  onClick={() => setActiveTab('prompts')}
                  className={cn(
                    "text-[10px] font-black uppercase tracking-widest transition-all px-2 py-1 rounded-lg",
                    activeTab === 'prompts' ? "bg-blue-600 text-white" : "text-neutral-400 hover:text-neutral-600"
                  )}
                >
                  Prompts
                </button>
                <button 
                  onClick={() => setActiveTab('downloads')}
                  className={cn(
                    "text-[10px] font-black uppercase tracking-widest transition-all px-2 py-1 rounded-lg",
                    activeTab === 'downloads' ? "bg-blue-600 text-white" : "text-neutral-400 hover:text-neutral-600"
                  )}
                >
                  Downloads
                </button>
              </div>
            </div>
          </div>
        </div>

        <button 
          onClick={() => {
            if (activeTab === 'users') handleOpenModal();
            else if (activeTab === 'prompts') handleOpenPromptModal();
          }}
          className={cn(
            "bg-blue-600 text-white px-6 py-2.5 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20 flex items-center gap-2",
            activeTab === 'downloads' && "hidden"
          )}
        >
          {activeTab === 'users' ? <UserPlus size={16} /> : <Brain size={16} />}
          {activeTab === 'users' ? 'Novo Usuário' : 'Novo Prompt'}
        </button>
      </header>

      <main className="flex-1 p-8 max-w-7xl mx-auto w-full space-y-8">
        {/* Stats & Search */}
        <div className={cn(
          "flex flex-col md:flex-row gap-6 items-center justify-between",
          activeTab === 'downloads' && "hidden"
        )}>
          <div className="flex gap-4 w-full md:w-auto">
            <div className="bg-white dark:bg-neutral-900 p-6 rounded-[24px] border border-neutral-200 dark:border-neutral-800 shadow-sm flex-1 md:w-48">
              <p className="text-[10px] font-black uppercase text-neutral-400 tracking-widest mb-1">
                {activeTab === 'users' ? 'Total Usuários' : 'Total Prompts'}
              </p>
              <p className="text-3xl font-black text-neutral-900 dark:text-white">
                {activeTab === 'users' ? users.length : prompts.length}
              </p>
            </div>
            {activeTab === 'users' && (
              <div className="bg-white dark:bg-neutral-900 p-6 rounded-[24px] border border-neutral-200 dark:border-neutral-800 shadow-sm flex-1 md:w-48">
                <p className="text-[10px] font-black uppercase text-neutral-400 tracking-widest mb-1">Admins</p>
                <p className="text-3xl font-black text-blue-600">{users.filter(u => u.role === 'admin').length}</p>
              </div>
            )}
          </div>

          <div className="relative w-full md:w-96">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400">
              <Search size={18} />
            </div>
            <input 
              type="text"
              placeholder={activeTab === 'users' ? "Pesquisar por nome ou email..." : "Pesquisar prompts..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl pl-12 pr-4 py-4 text-sm outline-none focus:ring-4 ring-blue-500/10 transition-all shadow-sm"
            />
          </div>
        </div>

        {/* Content */}
        {activeTab === 'users' ? (
          <div className="bg-white dark:bg-neutral-900 rounded-[32px] border border-neutral-200 dark:border-neutral-800 shadow-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-neutral-50 dark:bg-neutral-800/50 border-b border-neutral-100 dark:border-neutral-800">
                    <th className="px-6 py-4 text-[10px] font-black uppercase text-neutral-400 tracking-widest">Usuário</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase text-neutral-400 tracking-widest">Perfil</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase text-neutral-400 tracking-widest">Data Criação</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase text-neutral-400 tracking-widest text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                  {isLoading ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-12 text-center">
                        <Loader2 size={32} className="animate-spin text-blue-600 mx-auto mb-4" />
                        <p className="text-xs font-bold text-neutral-400 uppercase tracking-widest">Carregando usuários...</p>
                      </td>
                    </tr>
                  ) : filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-12 text-center">
                        <p className="text-xs font-bold text-neutral-400 uppercase tracking-widest">Nenhum usuário encontrado</p>
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((user) => (
                      <tr key={user.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/30 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-500">
                              <User size={20} />
                            </div>
                            <div>
                              <p className="text-sm font-bold text-neutral-900 dark:text-white">{user.name}</p>
                              <p className="text-xs text-neutral-500">{user.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={cn(
                            "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border",
                            user.role === 'admin' 
                              ? "bg-blue-50 text-blue-600 border-blue-100 dark:bg-blue-900/20 dark:border-blue-800" 
                              : "bg-neutral-50 text-neutral-500 border-neutral-100 dark:bg-neutral-800 dark:border-neutral-700"
                          )}>
                            {user.role}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2 text-neutral-500">
                            <Calendar size={14} />
                            <span className="text-xs">{new Date(user.created_at).toLocaleDateString()}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button 
                              onClick={() => handleResetPasswordClick(user)}
                              className="p-2 text-neutral-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-lg transition-all"
                              title="Resetar Senha"
                            >
                              <Key size={16} />
                            </button>
                            <button 
                              onClick={() => handleOpenModal(user)}
                              className="p-2 text-neutral-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-all"
                              title="Editar Usuário"
                            >
                              <Pencil size={16} />
                            </button>
                            <button 
                              onClick={() => handleDeleteClick(user)}
                              disabled={isDeleting && userToDelete?.id === user.id}
                              className={cn(
                                "p-2 rounded-lg transition-all",
                                isDeleting && userToDelete?.id === user.id
                                  ? "text-neutral-300 bg-neutral-100 cursor-not-allowed"
                                  : "text-neutral-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                              )}
                              title="Excluir Usuário"
                            >
                              {isDeleting && userToDelete?.id === user.id ? (
                                <Loader2 size={16} className="animate-spin" />
                              ) : (
                                <Trash2 size={16} />
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : activeTab === 'prompts' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {prompts.filter(p => 
              p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
              p.prompt.toLowerCase().includes(searchQuery.toLowerCase())
            ).map((p) => (
              <div key={p.id} className="group bg-white dark:bg-neutral-900 rounded-[32px] p-6 border border-neutral-200 dark:border-neutral-800 hover:border-blue-500/30 transition-all shadow-xl">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-blue-600/10 flex items-center justify-center text-blue-600">
                      <Brain size={20} />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold">{p.name}</h4>
                      {p.is_default && (
                        <span className="text-[10px] font-black uppercase text-blue-600 tracking-widest">Padrão</span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => handleOpenPromptModal(p)}
                      className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl text-neutral-400 hover:text-blue-600 transition-all"
                    >
                      <Pencil size={16} />
                    </button>
                    <button 
                      onClick={() => handleDeletePromptClick(p)}
                      className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl text-neutral-400 hover:text-red-600 transition-all"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
                <p className="text-xs text-neutral-500 line-clamp-4 leading-relaxed italic">
                  "{p.prompt}"
                </p>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white dark:bg-neutral-900 rounded-[32px] p-8 border border-neutral-200 dark:border-neutral-800 shadow-xl flex flex-col items-center text-center space-y-6">
              <div className="w-16 h-16 rounded-3xl bg-blue-600/10 flex items-center justify-center text-blue-600">
                <Download size={32} />
              </div>
              <div>
                <h3 className="text-lg font-black uppercase tracking-tight mb-2">Instalação via Navegador (PWA)</h3>
                <p className="text-xs text-neutral-500 leading-relaxed">
                  Instale como um aplicativo nativo diretamente pelo seu navegador (Chrome, Edge).
                </p>
              </div>
              <div className="w-full p-4 bg-blue-50 dark:bg-blue-900/20 rounded-2xl text-left">
                <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest mb-2">Como instalar:</p>
                <ol className="text-[10px] text-neutral-600 dark:text-neutral-400 space-y-1 list-decimal ml-4">
                  <li>Clique no botão "Instalar App" que aparece na barra superior.</li>
                  <li>Ou clique no ícone de instalação na barra de endereços do navegador.</li>
                  <li>Confirme a instalação para criar um atalho na sua área de trabalho.</li>
                </ol>
              </div>
            </div>

            <div className="bg-white dark:bg-neutral-900 rounded-[32px] p-8 border border-neutral-200 dark:border-neutral-800 shadow-xl flex flex-col items-center text-center space-y-6">
              <div className="w-16 h-16 rounded-3xl bg-blue-600/10 flex items-center justify-center text-blue-600">
                <Monitor size={32} />
              </div>
              <div>
                <h3 className="text-lg font-black uppercase tracking-tight mb-2">Windows</h3>
                <p className="text-xs text-neutral-500 leading-relaxed">
                  Versão portátil para Windows 10/11 (x64). Não requer instalação.
                </p>
              </div>
              <a 
                href="/api/download/portable/windows" 
                className="w-full bg-blue-600 text-white py-4 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2"
              >
                <Download size={18} />
                Download EXE
              </a>
            </div>

            <div className="bg-white dark:bg-neutral-900 rounded-[32px] p-8 border border-neutral-200 dark:border-neutral-800 shadow-xl flex flex-col items-center text-center space-y-6">
              <div className="w-16 h-16 rounded-3xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-600">
                <Laptop size={32} />
              </div>
              <div>
                <h3 className="text-lg font-black uppercase tracking-tight mb-2">Linux</h3>
                <p className="text-xs text-neutral-500 leading-relaxed">
                  Binário executável para distribuições Linux (x64).
                </p>
              </div>
              <a 
                href="/api/download/portable/linux" 
                className="w-full bg-neutral-800 text-white py-4 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-neutral-900 transition-all shadow-lg shadow-neutral-800/20 flex items-center justify-center gap-2"
              >
                <Download size={18} />
                Download Bin
              </a>
            </div>

            <div className="bg-white dark:bg-neutral-900 rounded-[32px] p-8 border border-neutral-200 dark:border-neutral-800 shadow-xl flex flex-col items-center text-center space-y-6">
              <div className="w-16 h-16 rounded-3xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-600">
                <Smartphone size={32} />
              </div>
              <div>
                <h3 className="text-lg font-black uppercase tracking-tight mb-2">macOS</h3>
                <p className="text-xs text-neutral-500 leading-relaxed">
                  Versão para macOS (Intel/Apple Silicon via Rosetta).
                </p>
              </div>
              <a 
                href="/api/download/portable/macos" 
                className="w-full bg-neutral-800 text-white py-4 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-neutral-900 transition-all shadow-lg shadow-neutral-800/20 flex items-center justify-center gap-2"
              >
                <Download size={18} />
                Download App
              </a>
            </div>
          </div>
        )}
      </main>

      {/* User Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative w-full max-w-lg bg-white dark:bg-neutral-900 rounded-[32px] shadow-2xl overflow-hidden border border-neutral-200 dark:border-neutral-800"
            >
              <div className="p-6 border-b border-neutral-100 dark:border-neutral-800 flex justify-between items-center">
                <h2 className="text-lg font-black uppercase tracking-tight">
                  {editingUser ? "Editar Usuário" : "Novo Usuário"}
                </h2>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-full">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-8 space-y-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-neutral-400 tracking-widest ml-1">Nome Completo</label>
                    <input 
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      className="w-full bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700 rounded-2xl px-4 py-3 text-sm outline-none focus:ring-4 ring-blue-500/10 transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-neutral-400 tracking-widest ml-1">Email</label>
                    <input 
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      className="w-full bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700 rounded-2xl px-4 py-3 text-sm outline-none focus:ring-4 ring-blue-500/10 transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-neutral-400 tracking-widest ml-1">
                      Senha {editingUser && "(deixe em branco para manter)"}
                    </label>
                    <div className="relative">
                      <input 
                        type="password"
                        required={!editingUser}
                        value={formData.password}
                        onChange={(e) => setFormData({...formData, password: e.target.value})}
                        className="w-full bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700 rounded-2xl px-4 py-3 text-sm outline-none focus:ring-4 ring-blue-500/10 transition-all pr-10"
                        placeholder={editingUser ? "••••••••" : "Digite a senha"}
                      />
                      {formData.password && (
                        <button 
                          type="button"
                          onClick={() => setFormData({...formData, password: ''})}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
                          title="Limpar campo"
                        >
                          <Eraser size={14} />
                        </button>
                      )}
                    </div>
                    {editingUser && (
                      <button 
                        type="button"
                        onClick={() => setFormData({...formData, password: '123456'})}
                        className="text-[10px] font-bold text-blue-600 hover:underline ml-1 flex items-center gap-1"
                      >
                        <RefreshCw size={10} />
                        Resetar para "123456"
                      </button>
                    )}
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-neutral-400 tracking-widest ml-1">Perfil</label>
                    <select 
                      value={formData.role}
                      onChange={(e) => setFormData({...formData, role: e.target.value})}
                      className="w-full bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700 rounded-2xl px-4 py-3 text-sm outline-none focus:ring-4 ring-blue-500/10 transition-all"
                    >
                      <option value="user">Usuário</option>
                      <option value="admin">Administrador</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <button 
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-6 py-3 rounded-2xl text-xs font-bold text-neutral-500 hover:bg-neutral-100 transition-all"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit"
                    className="px-8 py-3 bg-blue-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-xl shadow-blue-600/20"
                  >
                    Salvar
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Prompt Modal */}
      <AnimatePresence>
        {isPromptModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsPromptModalOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative w-full max-w-2xl bg-white dark:bg-neutral-900 rounded-[32px] shadow-2xl overflow-hidden border border-neutral-200 dark:border-neutral-800"
            >
              <div className="p-6 border-b border-neutral-100 dark:border-neutral-800 flex justify-between items-center">
                <h2 className="text-lg font-black uppercase tracking-tight">
                  {editingPrompt ? "Editar Prompt" : "Novo Prompt"}
                </h2>
                <button onClick={() => setIsPromptModalOpen(false)} className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-full">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handlePromptSubmit} className="p-8 space-y-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-neutral-400 tracking-widest ml-1">Nome do Prompt</label>
                    <input 
                      required
                      value={promptFormData.name}
                      onChange={(e) => setPromptFormData({...promptFormData, name: e.target.value})}
                      className="w-full bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700 rounded-2xl px-4 py-3 text-sm outline-none focus:ring-4 ring-blue-500/10 transition-all"
                      placeholder="Ex: Análise Jurídica"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-neutral-400 tracking-widest ml-1">Conteúdo do Prompt</label>
                    <textarea 
                      required
                      rows={8}
                      value={promptFormData.prompt}
                      onChange={(e) => setPromptFormData({...promptFormData, prompt: e.target.value})}
                      className="w-full bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700 rounded-2xl px-4 py-3 text-sm outline-none focus:ring-4 ring-blue-500/10 transition-all resize-none"
                      placeholder="Descreva como a IA deve analisar o documento..."
                    />
                  </div>
                  <div className="flex items-center gap-3 ml-1">
                    <input 
                      type="checkbox"
                      id="is_default"
                      checked={promptFormData.is_default}
                      onChange={(e) => setPromptFormData({...promptFormData, is_default: e.target.checked})}
                      className="w-4 h-4 rounded border-neutral-300 text-blue-600 focus:ring-blue-500"
                    />
                    <label htmlFor="is_default" className="text-sm font-bold text-neutral-600 dark:text-neutral-400">
                      Definir como prompt padrão
                    </label>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <button 
                    type="button"
                    onClick={() => setIsPromptModalOpen(false)}
                    className="px-6 py-3 rounded-2xl text-xs font-bold text-neutral-500 hover:bg-neutral-100 transition-all"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit"
                    disabled={isLoading}
                    className="px-8 py-3 bg-blue-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-xl shadow-blue-600/20 disabled:opacity-50"
                  >
                    {isLoading ? "Salvando..." : "Salvar"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <ConfirmationModal 
        isOpen={isDeleteModalOpen}
        onClose={() => !isDeleting && setIsDeleteModalOpen(false)}
        onConfirm={confirmDelete}
        title="Excluir Usuário"
        message={`Tem certeza que deseja excluir o usuário "${userToDelete?.name}"? Esta ação é permanente e não pode ser desfeita.`}
        confirmText={isDeleting ? "Excluindo..." : "Excluir Usuário"}
        variant="danger"
      />

      <ConfirmationModal 
        isOpen={isPromptDeleteModalOpen}
        onClose={() => !isLoading && setIsPromptDeleteModalOpen(false)}
        onConfirm={handleDeletePrompt}
        title="Excluir Prompt"
        message={`Tem certeza que deseja excluir o prompt "${promptToDelete?.name}"? Esta ação é permanente e não pode ser desfeita.`}
        confirmText={isLoading ? "Excluindo..." : "Excluir Prompt"}
        variant="danger"
      />

      <AnimatePresence>
        {isPasswordResetModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !isLoading && setIsPasswordResetModalOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative w-full max-w-md bg-white dark:bg-neutral-900 rounded-[32px] shadow-2xl overflow-hidden border border-neutral-200 dark:border-neutral-800"
            >
              <div className="p-6 border-b border-neutral-100 dark:border-neutral-800 flex justify-between items-center">
                <h2 className="text-lg font-black uppercase tracking-tight">Resetar Senha</h2>
                <button onClick={() => setIsPasswordResetModalOpen(false)} className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-full">
                  <X size={20} />
                </button>
              </div>
              <div className="p-8 space-y-6">
                <div className="space-y-4">
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">
                    Defina uma nova senha para o usuário <strong>{userToResetPassword?.name}</strong>.
                  </p>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-neutral-400 tracking-widest ml-1">Nova Senha</label>
                    <input 
                      type="text"
                      value={resetPasswordValue}
                      onChange={(e) => setResetPasswordValue(e.target.value)}
                      className="w-full bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700 rounded-2xl px-4 py-3 text-sm outline-none focus:ring-4 ring-blue-500/10 transition-all"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-3">
                  <button 
                    onClick={() => setIsPasswordResetModalOpen(false)}
                    className="px-6 py-3 rounded-2xl text-xs font-bold text-neutral-500 hover:bg-neutral-100 transition-all"
                  >
                    Cancelar
                  </button>
                  <button 
                    onClick={handleResetPassword}
                    disabled={isLoading}
                    className="px-8 py-3 bg-amber-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-amber-700 transition-all shadow-xl shadow-amber-600/20 disabled:opacity-50"
                  >
                    {isLoading ? "Resetando..." : "Confirmar Reset"}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
