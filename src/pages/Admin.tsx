import React, { useEffect, useState, useRef } from 'react';
import { motion } from "motion/react";
import { Download, Upload, Trash2, Settings as SettingsIcon, Users, QrCode, Gift, Lock, Loader2, KeyRound, Plus, X, Edit, ListTree, Shield, Ban, UserCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

export default function Admin() {
  const [token, setToken] = useState<string | null>(localStorage.getItem('adminToken'));
  const [username, setUsername] = useState<string>(localStorage.getItem('adminUsername') || '');
  const [role, setRole] = useState<string>(localStorage.getItem('adminRole') || 'user');
  
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [loginError, setLoginError] = useState('');
  const [loading, setLoading] = useState(false);

  const [participants, setParticipants] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>({});
  const [prizes, setPrizes] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [securityLogs, setSecurityLogs] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'participants' | 'settings' | 'prizes' | 'account' | 'form' | 'security'>('participants');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Prize Form State
  const [prizeForm, setPrizeForm] = useState({ id: 0, name: '', discount: '', probability: 0.1, maxQuantity: '' });
  const [isEditingPrize, setIsEditingPrize] = useState(false);

  // Account Form State
  const [accountForm, setAccountForm] = useState({ newPassword: '', confirmPassword: '' });
  const [newUserForm, setNewUserForm] = useState({ username: '', password: '', role: 'viewer' });
  const [editingUser, setEditingUser] = useState<any>(null);

  const isAdmin = role === 'admin';
  const isEditor = role === 'admin' || role === 'editor';

  useEffect(() => {
    if (token) {
      fetchData();
    }
  }, [token, role]);

  const apiHeaders = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setLoginError('');
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginForm)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      localStorage.setItem('adminToken', data.token);
      localStorage.setItem('adminUsername', data.username);
      localStorage.setItem('adminRole', data.role);
      setToken(data.token);
      setUsername(data.username);
      setRole(data.role);
    } catch (e: any) {
      setLoginError(e.message || 'Erro ao fazer login');
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUsername');
    localStorage.removeItem('adminRole');
    setToken(null);
  };

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/admin/users', { headers: apiHeaders });
      if (res.ok) setUsers(await res.json());
    } catch (e) {}
  };

  const toggleUserStatus = async (user: any) => {
    if (user.username === username) {
      toast.error("Você não pode desativar a si mesmo!");
      return;
    }
    const newStatus = !user.active;
    try {
      const res = await fetch(`/api/admin/users/${user.id}/status`, {
        method: 'PATCH',
        headers: apiHeaders,
        body: JSON.stringify({ active: newStatus })
      });
      if (res.ok) {
        toast.success(`Usuário ${newStatus ? 'ativado' : 'desativado'} com sucesso!`);
        fetchUsers();
      } else {
        const err = await res.json();
        toast.error(err.error || "Erro ao atualizar status");
      }
    } catch (e) {
      toast.error("Erro na requisição");
    }
  };

  const fetchLogs = async () => {
    if (!isAdmin) return;
    try {
      const res = await fetch('/api/admin/security-logs', { headers: apiHeaders });
      if (res.ok) setSecurityLogs(await res.json());
    } catch (e) {}
  };

  const clearLogs = async () => {
    if (!confirm("Tem certeza que deseja limpar os logs? Isso pode prejudicar o rastreamento do fail2ban.")) return;
    try {
      const res = await fetch('/api/admin/security-logs/clear', { method: 'POST', headers: apiHeaders });
      if (res.ok) {
        toast.success("Logs limpos com sucesso!");
        fetchLogs();
      }
    } catch (e) {}
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const p = [
        fetch('/api/admin/participants', { headers: apiHeaders }),
        fetch('/api/settings'),
      ];
      
      if (isEditor) {
        p.push(fetch('/api/admin/prizes', { headers: apiHeaders }));
      }
      
      const responses = await Promise.all(p);
      const partsRes = responses[0];
      const setsRes = responses[1];
      const prizesRes = responses[2];
      
      if (partsRes.status === 401 || (prizesRes && prizesRes.status === 401)) {
        logout();
        return;
      }

      if (!partsRes.ok || !setsRes.ok) {
        throw new Error("Erro ao carregar dados básico");
      }

      const partsData = await partsRes.json();
      setParticipants(Array.isArray(partsData) ? partsData : []);

      const setsData = await setsRes.json();
      setSettings(setsData || {});
      
      if (setsData?.appTitle) document.title = `Admin - ${setsData.appTitle}`;
      if (setsData?.favicon) {
        let link: HTMLLinkElement | null = document.querySelector("link[rel~='icon']");
        if (!link) {
          link = document.createElement('link');
          link.rel = 'icon';
          document.head.appendChild(link);
        }
        link.href = setsData.favicon;
      }
      
      if (prizesRes && prizesRes.ok) {
        const prizesData = await prizesRes.json();
        setPrizes(Array.isArray(prizesData) ? prizesData : []);
      }
      if (isAdmin) {
        fetchUsers();
        fetchLogs();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await fetch('/api/settings', {
      method: 'POST',
      headers: apiHeaders,
      body: JSON.stringify(settings)
    });
    toast.success('Configurações salvas com sucesso!');
    fetchData();
  };

  const handleImageUpload = (key: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSettings({ ...settings, [key]: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const downloadCSV = () => {
    fetch('/api/admin/export', { headers: { 'Authorization': `Bearer ${token}` } })
      .then(res => res.blob())
      .then(blob => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'participants.csv';
        a.click();
      });
  };

  const downloadBackup = () => {
    fetch('/api/admin/backup', { headers: { 'Authorization': `Bearer ${token}` } })
      .then(res => {
        if (!res.ok) throw new Error();
        return res.blob();
      })
      .then(blob => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const date = new Date().toISOString().split('T')[0];
        a.download = `backup-${date}.sqlite`;
        a.click();
      }).catch(() => toast.error("Erro ao baixar backup"));
  };

  const clearParticipantsAction = async () => {
    if (!confirm('Deseja baixar uma cópia dos inscritos antes de apagar tudo?')) {
      // do nothing, proceed
    } else {
      downloadCSV();
    }
    
    if (confirm('PRIMEIRA CONFIRMAÇÃO: Tem certeza que deseja apagar TODOS os inscritos?')) {
      if (confirm('ÚLTIMA CONFIRMAÇÃO: Esta ação é IRREVERSÍVEL. Apagar agora?')) {
        setLoading(true);
        try {
          const res = await fetch('/api/admin/clear/participants', { method: 'POST', headers: apiHeaders });
          if(res.ok) {
            toast.success('Lista de inscritos zerada!');
            fetchData();
          }
        } catch(e) {}
        setLoading(false);
      }
    }
  };

  const clearPrizesAction = async () => {
    if (confirm('PRIMEIRA CONFIRMAÇÃO: Deseja apagar todos os prêmios?')) {
      if (confirm('ÚLTIMA CONFIRMAÇÃO: Os prêmios serão removidos permanentemente. Continuar?')) {
        setLoading(true);
        try {
          const res = await fetch('/api/admin/clear/prizes', { method: 'POST', headers: apiHeaders });
          if(res.ok) {
            toast.success('Lista de prêmios zerada!');
            fetchData();
          }
        } catch(e) {}
        setLoading(false);
      }
    }
  };

  const clearFormAction = async () => {
    if (confirm('Deseja limpar todos os campos adicionais do formulário?')) {
      if (confirm('Isso removerá as perguntas extras configuradas. Confirmar?')) {
        setFormFields([]);
        setSettings({ ...settings, customFormFields: '[]' });
        toast.info('Campos limpos. Lembre-se de clicar em "Salvar Formulário".');
      }
    }
  };

  const clearSettingsAction = async () => {
    if (confirm('PRIMEIRA CONFIRMAÇÃO: Deseja resetar TODAS as configurações para o padrão?')) {
      if (confirm('ÚLTIMA CONFIRMAÇÃO: Cores, logos e textos voltarão ao original. Confirmar?')) {
        setLoading(true);
        try {
          const res = await fetch('/api/admin/clear/settings', { method: 'POST', headers: apiHeaders });
          if(res.ok) {
            toast.success('Configurações resetadas!');
            fetchData();
          }
        } catch(e) {}
        setLoading(false);
      }
    }
  };

  const clearDBFullAction = async () => {
    if (confirm('Deseja realizar um BACKUP de segurança antes de zerar o banco?')) {
      downloadBackup();
    }
    
    if (confirm('RESTANTE: 1/3 - Tem certeza que deseja zerar o banco de dados (Exceto usuários)?')) {
      if (confirm('RESTANTE: 2/3 - Esta ação apagará participantes, prêmios e configurações. Continuar?')) {
        if (confirm('RESTANTE: 3/3 - ÚLTIMO AVISO! Clique em OK para confirmar a deleção TOTAL.')) {
          setLoading(true);
          try {
            const res = await fetch('/api/admin/clear/database', { method: 'POST', headers: apiHeaders });
            if(res.ok) {
              toast.success('Banco de dados resetado com sucesso!');
              fetchData();
            }
          } catch(e) {}
          setLoading(false);
        }
      }
    }
  };

  const restoreBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!confirm('Isso vai apagar o banco atual e substituir pelo backup. Continuar?')) return;

    const formData = new FormData();
    formData.append('dbFile', file);

    setLoading(true);
    try {
      await fetch('/api/admin/restore', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      toast.success('Backup restaurado com sucesso!');
      fetchData();
    } catch (err) {
      toast.error('Erro ao restaurar backup');
    } finally {
      setLoading(false);
    }
  };

  const clearDB = async () => {
    clearDBFullAction();
  };

  // Form Builder
  const [formFields, setFormFields] = useState<any[]>([]);
  
  useEffect(() => {
    if (settings.customFormFields) {
      try {
        const parsed = typeof settings.customFormFields === 'string' ? JSON.parse(settings.customFormFields) : settings.customFormFields;
        setFormFields(Array.isArray(parsed) ? parsed : []);
      } catch(e) {
        setFormFields([]);
      }
    } else {
      setFormFields([]);
    }
  }, [settings.customFormFields]);

  const saveFormFields = async () => {
    setLoading(true);
    await fetch('/api/settings', {
      method: 'POST',
      headers: apiHeaders,
      body: JSON.stringify({ customFormFields: JSON.stringify(formFields) })
    });
    toast.success('Formulário atualizado com sucesso!');
    fetchData();
  };

  const addFormField = () => {
    const newField = { id: `q_${Date.now()}`, type: 'text', label: '', options: '', required: false, visibility: 'always' };
    setFormFields([...formFields, newField]);
  };

  const updateFormField = (index: number, key: string, value: any) => {
    const updated = [...formFields];
    updated[index] = { ...updated[index], [key]: value };
    setFormFields(updated);
  };

  const removeFormField = (index: number) => {
    const updated = [...formFields];
    updated.splice(index, 1);
    setFormFields(updated);
  };

  // Prizes
  const savePrize = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    const payload = {
      name: prizeForm.name,
      discount: prizeForm.discount,
      probability: parseFloat(prizeForm.probability.toString()),
      maxQuantity: prizeForm.maxQuantity ? parseInt(prizeForm.maxQuantity.toString()) : null
    };

    try {
      if (isEditingPrize) {
        await fetch(`/api/admin/prizes/${prizeForm.id}`, { method: 'PUT', headers: apiHeaders, body: JSON.stringify(payload) });
        toast.success('Prêmio atualizado com sucesso!');
      } else {
        await fetch('/api/admin/prizes', { method: 'POST', headers: apiHeaders, body: JSON.stringify(payload) });
        toast.success('Novo prêmio adicionado!');
      }
      
      setPrizeForm({ id: 0, name: '', discount: '', probability: 0.1, maxQuantity: '' });
      setIsEditingPrize(false);
      fetchData();
    } catch(e) {
      toast.error('Erro ao salvar prêmio');
      setLoading(false);
    }
  };

  const editPrize = (p: any) => {
    setPrizeForm({ ...p, maxQuantity: p.maxQuantity ?? '' });
    setIsEditingPrize(true);
    setActiveTab('prizes');
  };

  const delPrize = async (id: number) => {
    if (!confirm('Excluir prêmio?')) return;
    try {
      await fetch(`/api/admin/prizes/${id}`, { method: 'DELETE', headers: apiHeaders });
      toast.success('Prêmio excluído!');
      fetchData();
    } catch(e) {
      toast.error('Erro ao excluir prêmio');
    }
  };

  // Account
  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (accountForm.newPassword !== accountForm.confirmPassword) {
      toast.error("As senhas não conferem");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/admin/change-password', {
        method: 'POST',
        headers: apiHeaders,
        body: JSON.stringify({ newPassword: accountForm.newPassword })
      });
      if (res.ok) {
        toast.success("Senha alterada com sucesso!");
        setAccountForm({ newPassword: '', confirmPassword: '' });
      } else {
        toast.error("Erro ao alterar senha");
      }
    } finally {
      setLoading(false);
    }
  };

  const createAdminUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newUserForm.password && newUserForm.password.length < 4) {
      toast.error("A senha deve ter no mínimo 4 caracteres");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: apiHeaders,
        body: JSON.stringify(newUserForm)
      });
      if (res.ok) {
        toast.success("Novo usuário criado com sucesso!");
        setNewUserForm({ username: '', password: '', role: 'viewer' });
        fetchUsers();
      } else {
        const data = await res.json();
        toast.error("Erro ao criar usuário: " + (data.error || 'Erro desconhecido'));
      }
    } finally {
      setLoading(false);
    }
  };

  const updateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/admin/users/' + editingUser.id, {
        method: 'PUT',
        headers: apiHeaders,
        body: JSON.stringify(editingUser)
      });
      if (res.ok) {
        toast.success("Usuário atualizado com sucesso!");
        setEditingUser(null);
        fetchUsers();
      } else {
        const data = await res.json();
        toast.error("Erro ao atualizar usuário: " + (data.error || 'Erro desconhecido'));
      }
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0c] p-4 font-sans text-white relative">
        <div className="fixed top-[-10%] left-[-10%] w-[50%] h-[50%] bg-pink-600/20 rounded-full blur-[120px] pointer-events-none z-0"></div>
        <div className="fixed bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-purple-600/20 rounded-full blur-[120px] pointer-events-none z-0"></div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white/5 backdrop-blur-xl border border-white/10 p-8 rounded-3xl w-full max-w-sm z-10 shadow-2xl">
          <div className="flex justify-center mb-6">
            <Lock className="w-12 h-12 text-pink-400" />
          </div>
          <h2 className="text-2xl font-black text-center tracking-tight mb-6 text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-purple-400">ADMIN LOGIN</h2>
          
          {loginError && <div className="mb-4 p-3 bg-red-500/20 border border-red-500/30 text-red-200 rounded-xl text-sm text-center">{loginError}</div>}
          
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Usuário</label>
              <input type="text" required value={loginForm.username} onChange={e => setLoginForm({...loginForm, username: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-pink-500 outline-none transition-all" />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Senha</label>
              <input type="password" required value={loginForm.password} onChange={e => setLoginForm({...loginForm, password: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-pink-500 outline-none transition-all" />
            </div>
            <button type="submit" disabled={loading} className="w-full py-4 bg-pink-500 rounded-2xl font-black text-sm shadow-xl shadow-pink-500/20 hover:bg-pink-400 transition-all uppercase tracking-widest mt-4">
              {loading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Entrar'}
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  if (loading && !participants.length && !prizes.length) {
    return <div className="min-h-screen bg-[#0a0a0c] flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-pink-500" /></div>;
  }

  return (
    <div className="min-h-screen bg-[#0a0a0c] text-white p-4 md:p-8 relative font-sans overflow-y-auto">
      {/* Background Mesh Gradients */}
      <div className="fixed top-[-10%] left-[-10%] w-[50%] h-[50%] bg-pink-600/20 rounded-full blur-[120px] pointer-events-none z-0"></div>
      <div className="fixed bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-purple-600/20 rounded-full blur-[120px] pointer-events-none z-0"></div>
      <div className="fixed top-[20%] right-[10%] w-[30%] h-[30%] bg-cyan-600/10 rounded-full blur-[100px] pointer-events-none z-0"></div>

      <div className="max-w-6xl mx-auto flex flex-col md:flex-row gap-8 relative z-10">
        
        {/* Sidebar / Topbar */}
        <div className="w-full md:w-64 flex-shrink-0 flex flex-row md:flex-col space-x-2 md:space-x-0 md:space-y-3 overflow-x-auto pb-2">
          <div className="p-2 hidden md:block mb-6">
            <h1 className="text-3xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-purple-400 leading-none">
              {settings.adminBrand || (import.meta as any).env.VITE_ADMIN_BRAND || 'K-TOUR'}<br/>ADMIN
            </h1>
            <p className="text-slate-400 font-medium italic text-xs mt-2">Olá, {username}</p>
            <p className="text-pink-500/80 font-bold uppercase text-[9px] tracking-widest mt-1">Nível: {role}</p>
          </div>
          
          <button onClick={() => setActiveTab('participants')} className={`flex items-center px-4 py-3 rounded-full transition-all text-xs font-bold uppercase tracking-widest ${activeTab === 'participants' ? 'bg-white/10 border border-white/20 text-white' : 'hover:bg-white/5 text-slate-400'}`}>
            <Users className="w-4 h-4 mr-3" /> <span>Inscritos</span>
          </button>

          {isEditor && (
            <>
              <button onClick={() => setActiveTab('prizes')} className={`flex items-center px-4 py-3 rounded-full transition-all text-xs font-bold uppercase tracking-widest ${activeTab === 'prizes' ? 'bg-white/10 border border-white/20 text-white' : 'hover:bg-white/5 text-slate-400'}`}>
                <Gift className="w-4 h-4 mr-3" /> <span>Prêmios</span>
              </button>

              <button onClick={() => setActiveTab('form')} className={`flex items-center px-4 py-3 rounded-full transition-all text-xs font-bold uppercase tracking-widest ${activeTab === 'form' ? 'bg-white/10 border border-white/20 text-white' : 'hover:bg-white/5 text-slate-400'}`}>
                <ListTree className="w-4 h-4 mr-3" /> <span>Formulário</span>
              </button>

              <button onClick={() => setActiveTab('settings')} className={`flex items-center px-4 py-3 rounded-full transition-all text-xs font-bold uppercase tracking-widest ${activeTab === 'settings' ? 'bg-white/10 border border-white/20 text-white' : 'hover:bg-white/5 text-slate-400'}`}>
                <SettingsIcon className="w-4 h-4 mr-3" /> <span>Configurações</span>
              </button>
            </>
          )}

          <button onClick={() => setActiveTab('account')} className={`flex items-center px-4 py-3 rounded-full transition-all text-xs font-bold uppercase tracking-widest ${activeTab === 'account' ? 'bg-white/10 border border-white/20 text-white' : 'hover:bg-white/5 text-slate-400'}`}>
            <KeyRound className="w-4 h-4 mr-3" /> <span>Conta {isAdmin ? '& Usuários' : ''}</span>
          </button>

          {isAdmin && (
            <button onClick={() => setActiveTab('security')} className={`flex items-center px-4 py-3 rounded-full transition-all text-xs font-bold uppercase tracking-widest ${activeTab === 'security' ? 'bg-white/10 border border-white/20 text-white' : 'hover:bg-white/5 text-slate-400'}`}>
              <Shield className="w-4 h-4 mr-3" /> <span>Segurança</span>
            </button>
          )}

          <Link to="/qr" className="flex items-center px-4 py-3 rounded-full hover:bg-white/5 text-slate-400 transition-all text-xs font-bold uppercase tracking-widest">
            <QrCode className="w-4 h-4 mr-3" /> <span>QR Code</span>
          </Link>

          <button onClick={logout} className="flex items-center px-4 py-3 rounded-full hover:bg-red-500/10 text-red-400 transition-all text-xs font-bold uppercase tracking-widest mt-4">
            <Lock className="w-4 h-4 mr-3" /> <span>Sair</span>
          </button>
        </div>

        {/* Main Content */}
        <div className="flex-1 w-full max-w-5xl">
          
          {activeTab === 'participants' && (
            <div className="flex flex-col gap-6">
              <header className="flex justify-between items-end">
                <div>
                  <h2 className="text-2xl font-black">Inscritos da Promoção</h2>
                  <p className="text-slate-400 text-sm mt-1">Total: {participants.length}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={clearParticipantsAction} className="px-4 py-2 bg-red-500/10 border border-red-500/20 rounded-full text-[10px] font-bold text-red-400 hover:bg-red-500/20 transition-all flex items-center">
                    <Trash2 className="w-3 h-3 mr-2" /> ZERAR PLANILHA
                  </button>
                  <button onClick={downloadCSV} className="px-4 py-2 bg-white/5 border border-white/10 rounded-full text-xs font-bold hover:bg-white/10 transition-all flex items-center">
                    <Download className="w-4 h-4 mr-2" /> EXPORTAR CSV
                  </button>
                </div>
              </header>

              <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead>
                    <tr className="text-slate-400 border-b border-white/5">
                      <th className="pb-3 px-2 font-medium">Nome</th>
                      <th className="pb-3 px-2 font-medium">Email</th>
                      <th className="pb-3 px-2 font-medium">Telefone</th>
                      <th className="pb-3 px-2 font-medium">Ticket?</th>
                      <th className="pb-3 px-2 font-medium">Prêmio</th>
                      <th className="pb-3 px-2 font-medium">Data</th>
                    </tr>
                  </thead>
                  <tbody className="text-slate-200">
                    {Array.isArray(participants) && participants.map(p => p && (
                      <React.Fragment key={p.id}>
                        <tr className="border-b border-white/5 hover:bg-white/5 transition-colors">
                          <td className="py-3 px-2">
                            <div className="font-medium text-white">{p.name}</div>
                            {p.socialName && <div className="text-slate-500 text-xs">({p.socialName})</div>}
                          </td>
                          <td className="py-3 px-2 text-slate-400">{p.email}</td>
                          <td className="py-3 px-2 text-slate-400">{p.phone}</td>
                          <td className="py-3 px-2">
                            {p.hasTicket ? <span className="text-green-400">Sim</span> : <span className="text-red-400">Não</span>}
                          </td>
                          <td className="py-3 px-2">
                            {p.wonPrize ? (
                              p.wonPrize === "0" 
                                ? <span className="text-slate-500">-</span>
                                : <span className="bg-pink-500/20 text-pink-300 px-2 py-0.5 rounded text-xs font-bold">R$ {p.wonPrize}</span>
                            ) : (
                              <span className="text-slate-500">-</span>
                            )}
                          </td>
                          <td className="py-3 px-2 text-slate-500 text-xs whitespace-nowrap">
                            {p.createdAt ? new Date(p.createdAt).toLocaleString() : '-'}
                          </td>
                        </tr>
                        {p.customData && p.customData !== '{}' && (
                          <tr className="border-b border-white/5 bg-white/[0.02]">
                            <td colSpan={6} className="py-2 px-4 text-xs text-slate-400">
                              <span className="font-bold text-pink-400 mr-2">Dados Extras:</span>
                              {Object.entries(
                                  (() => {
                                    try {
                                      const data = typeof p.customData === 'string' ? JSON.parse(p.customData) : p.customData;
                                      return typeof data === 'object' && data !== null ? data : {};
                                    } catch {
                                      return {};
                                    }
                                  })()
                                ).map(([k,v]: any) => {
                                const field = Array.isArray(formFields) ? formFields.find(f => f && f.id === k) : null;
                                const label = field ? field.label : k;
                                return <span key={k} className="mr-6 inline-block"><span className="text-slate-500">{label}:</span> <span className="text-white">{Array.isArray(v) ? v.join(', ') : (v || '-')}</span></span>
                              })}
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}
                    {participants.length === 0 && <tr><td colSpan={6} className="py-8 text-center text-slate-500">Nenhum inscrito ainda.</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'prizes' && (
            <div className="flex flex-col gap-6">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-black">Premios e Sorteio</h2>
                  <p className="text-slate-400 text-sm mt-1">Gerencie os cupons, chances e quantidades</p>
                </div>
                <button onClick={clearPrizesAction} className="px-4 py-2 bg-red-500/10 border border-red-500/20 rounded-full text-[10px] font-bold text-red-400 hover:bg-red-500/20 transition-all flex items-center">
                  <Trash2 className="w-3 h-3 mr-2" /> ZERAR PREMIAÇÕES
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6">
                  <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400 mb-4">Lista de Prêmios</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead>
                        <tr className="text-slate-400 border-b border-white/5">
                          <th className="pb-3 px-2 font-medium">Nome</th>
                          <th className="pb-3 px-2 font-medium">Prêmio</th>
                          <th className="pb-3 px-2 font-medium">Chance</th>
                          <th className="pb-3 px-2 font-medium">Resgatados / Max</th>
                          <th className="pb-3 px-2">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="text-slate-200">
                        {prizes.map(p => (
                          <tr key={p.id} className="border-b border-white/5 hover:bg-white/5">
                            <td className="py-3 px-2">{p.name}</td>
                            <td className="py-3 px-2 font-bold text-pink-400">{p.discount}</td>
                            <td className="py-3 px-2">{p.probability * 100}%</td>
                            <td className="py-3 px-2">
                              {p.redeemedQuantity} / {p.maxQuantity === null ? '∞' : p.maxQuantity}
                            </td>
                            <td className="py-3 px-2 flex gap-2">
                              <button onClick={() => editPrize(p)} className="text-xs bg-white/10 hover:bg-white/20 px-2 py-1 rounded">Editar</button>
                              <button onClick={() => delPrize(p.id)} className="text-xs bg-red-500/20 text-red-300 hover:bg-red-500/40 px-2 py-1 rounded">Excluir</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6">
                  <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400 mb-4">{isEditingPrize ? 'Editar Prêmio' : 'Novo Prêmio'}</h3>
                  <form onSubmit={savePrize} className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Nome</label>
                      <input type="text" required value={prizeForm.name} onChange={e => setPrizeForm({...prizeForm, name: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white outline-none" placeholder="Ex: Cupom R$ 20"/>
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Prêmio (Nome, palavra ou valor)</label>
                      <input type="text" required value={prizeForm.discount} onChange={e => setPrizeForm({...prizeForm, discount: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white outline-none" placeholder="Ex: Cupom R$ 20 ou Kit K-Pop"/>
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Chance (Probabilidade 0-1)</label>
                      <input type="number" step="0.01" min="0" max="1" required value={prizeForm.probability} onChange={e => setPrizeForm({...prizeForm, probability: parseFloat(e.target.value)})} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white outline-none" />
                      <p className="text-[10px] text-slate-500 mt-1">Ex: 0.1 = 10% chance. Total não precisa ser 1 (restante = sem prêmio).</p>
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Quantidade Máxima</label>
                      <input type="number" value={prizeForm.maxQuantity} onChange={e => setPrizeForm({...prizeForm, maxQuantity: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white outline-none" placeholder="Vazio = Ilimitado"/>
                    </div>
                    <div className="flex gap-2 mt-4">
                      <button type="submit" className="flex-1 py-2 bg-pink-500 rounded-xl font-bold tracking-widest uppercase text-xs hover:bg-pink-400">{isEditingPrize ? 'Salvar' : 'Criar'}</button>
                      {isEditingPrize && <button type="button" onClick={() => { setIsEditingPrize(false); setPrizeForm({ id:0, name:'', discount:'', probability:0.1, maxQuantity:''})}} className="px-4 py-2 bg-white/10 rounded-xl font-bold tracking-widest uppercase text-xs hover:bg-white/20">Cancelar</button>}
                    </div>
                  </form>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'form' && (
            <div className="flex flex-col gap-6">
              <div className="flex justify-between items-end">
                <div>
                  <h2 className="text-2xl font-black">Formulário Customizado</h2>
                  <p className="text-slate-400 text-sm mt-1">Crie perguntas adicionais (Ex: data de interesse, etc)</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={clearFormAction} className="px-4 py-2 bg-red-500/10 border border-red-500/20 rounded-xl font-bold tracking-widest uppercase text-xs hover:bg-red-500/20 flex items-center">
                    <Trash2 className="w-3 h-3 mr-2" /> Zerar Campos
                  </button>
                  <button onClick={saveFormFields} className="px-4 py-2 bg-pink-500 rounded-xl font-bold tracking-widest uppercase text-xs hover:bg-pink-400 shadow-xl shadow-pink-500/20">
                    Salvar Formulário
                  </button>
                </div>
              </div>

              <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6">
                <div className="space-y-4 mb-6">
                  {formFields.map((field, i) => (
                    <div key={field.id} className="p-4 bg-white/5 border border-white/10 rounded-2xl flex flex-col gap-4 relative">
                      <button onClick={() => removeFormField(i)} className="absolute top-4 right-4 text-slate-500 hover:text-red-400">
                        <X className="w-5 h-5" />
                      </button>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mr-8">
                        <div>
                          <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Pergunta / Label</label>
                          <input type="text" required value={field.label} onChange={e => updateFormField(i, 'label', e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white outline-none" placeholder="Ex: Qual dia você vai?" />
                        </div>
                        <div>
                          <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Tipo de Resposta</label>
                          <select value={field.type} onChange={e => updateFormField(i, 'type', e.target.value)} className="w-full bg-[#1a1a24] border border-white/10 rounded-xl px-4 py-2 text-white outline-none">
                            <option value="text">Texto Curto</option>
                            <option value="textarea">Texto Longo</option>
                            <option value="select">Caixa de Seleção (Dropdown)</option>
                            <option value="radio">Múltipla Escolha (Uma opção)</option>
                            <option value="checkbox">Múltipla Escolha (Várias opções)</option>
                          </select>
                        </div>
                      </div>

                      {['select', 'radio', 'checkbox'].includes(field.type) && (
                        <div>
                          <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Opções (Separadas por vírgula)</label>
                          <input type="text" value={field.options} onChange={e => updateFormField(i, 'options', e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white outline-none" placeholder="Sexta, Sábado, Domingo" />
                        </div>
                      )}

                      <div className="flex flex-wrap gap-6 items-center">
                        <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
                          <input type="checkbox" checked={field.required} onChange={e => updateFormField(i, 'required', e.target.checked)} className="rounded bg-white/10 border-white/20 text-pink-500 focus:ring-0 w-4 h-4" />
                          Obrigatório
                        </label>
                        <div className="flex items-center gap-2">
                          <label className="text-xs font-bold uppercase tracking-widest text-slate-400">Exibir:</label>
                          <select 
                            value={field.visibility || (field.showOnlyIfTicket ? 'yes' : 'always')} 
                            onChange={e => updateFormField(i, 'visibility', e.target.value)}
                            className="bg-[#1a1a24] border border-white/10 rounded-lg px-2 py-1 text-xs text-white outline-none"
                          >
                            <option value="always">Sempre Exibir</option>
                            <option value="yes">Apenas em resposta SIM</option>
                            <option value="no">Apenas em resposta NÃO</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {formFields.length === 0 && (
                    <div className="text-center py-8 text-slate-500 border border-dashed border-white/10 rounded-2xl">
                      Nenhuma pergunta extra configurada. Todo mundo responde apenas os dados essenciais.
                    </div>
                  )}
                </div>

                <button onClick={addFormField} className="w-full py-3 bg-white/5 border border-white/10 hover:bg-white/10 rounded-xl font-bold tracking-widest uppercase text-xs flex items-center justify-center transition-all">
                  <Plus className="w-4 h-4 mr-2" /> Adicionar Pergunta
                </button>
              </div>
            </div>
          )}

          {activeTab === 'account' && (
            <div className="flex flex-col gap-6">
              <div>
                <h2 className="text-2xl font-black">Minha Conta</h2>
                <p className="text-slate-400 text-sm mt-1">Alterar senha do painel ({username})</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 md:p-8">
                  <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400 mb-6">Alterar Senha</h3>
                  <form onSubmit={changePassword} className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Nova Senha</label>
                      <input type="password" required minLength={4} value={accountForm.newPassword} onChange={e => setAccountForm({...accountForm, newPassword: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-pink-500 outline-none transition-all" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Confirmar Nova Senha</label>
                      <input type="password" required minLength={4} value={accountForm.confirmPassword} onChange={e => setAccountForm({...accountForm, confirmPassword: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-pink-500 outline-none transition-all" />
                    </div>
                    <button type="submit" className="w-full py-4 bg-pink-500 rounded-2xl font-black text-sm shadow-xl shadow-pink-500/20 hover:bg-pink-400 transition-all uppercase tracking-widest mt-4">
                      Alterar Senha
                    </button>
                  </form>
                </div>

                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 md:p-8">
                  <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400 mb-6">Criar Novo Usuário</h3>
                  <form onSubmit={createAdminUser} className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Nome de Usuário</label>
                      <input type="text" required value={newUserForm.username} onChange={e => setNewUserForm({...newUserForm, username: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-pink-500 outline-none transition-all" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Senha</label>
                      <input type="password" required minLength={4} value={newUserForm.password} onChange={e => setNewUserForm({...newUserForm, password: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-pink-500 outline-none transition-all" />
                    </div>
                    {isAdmin && (
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Cargo</label>
                        <select value={newUserForm.role} onChange={e => setNewUserForm({...newUserForm, role: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-pink-500 outline-none transition-all">
                          <option value="viewer" className="bg-[#1a1a24]">Visualização (Sorteados)</option>
                          <option value="editor" className="bg-[#1a1a24]">Configuração (Prêmios/Forms)</option>
                          <option value="admin" className="bg-[#1a1a24]">Administrador Geral</option>
                        </select>
                      </div>
                    )}
                    <button type="submit" className="w-full py-4 bg-purple-500 rounded-2xl font-black text-sm shadow-xl shadow-purple-500/20 hover:bg-purple-400 transition-all uppercase tracking-widest mt-4">
                      Criar Usuário
                    </button>
                  </form>
                </div>
              </div>

              {editingUser && (
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 md:p-8 mt-6">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-sm font-bold uppercase tracking-widest text-pink-400">Editar Usuário: {editingUser.username}</h3>
                    <button onClick={() => setEditingUser(null)} className="p-2 hover:bg-white/10 rounded-full"><X className="w-4 h-4" /></button>
                  </div>
                  <form onSubmit={updateUser} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Usuário</label>
                      <input type="text" value={editingUser.username} onChange={e => setEditingUser({...editingUser, username: e.target.value})} className="w-full bg-[#1a1a24] border border-white/10 rounded px-4 py-2 text-sm text-white" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Nova Senha (Opcional)</label>
                      <input type="password" placeholder="Deixe em branco p/ manter" onChange={e => setEditingUser({...editingUser, password: e.target.value})} className="w-full bg-[#1a1a24] border border-white/10 rounded px-4 py-2 text-sm text-white" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Cargo</label>
                      <select value={editingUser.role} onChange={e => setEditingUser({...editingUser, role: e.target.value})} className="w-full bg-[#1a1a24] border border-white/10 rounded px-4 py-2 text-sm text-white">
                        <option value="viewer">Visualização</option>
                        <option value="editor">Configuração</option>
                        <option value="admin">Administrador</option>
                      </select>
                    </div>
                    <button type="submit" className="md:col-span-3 py-3 bg-pink-500 rounded-xl font-bold text-xs uppercase tracking-widest">Salvar Alterações</button>
                  </form>
                </div>
              )}

              {isAdmin && (
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 md:p-8 mt-6">
                  <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400 mb-6">Usuários do Sistema</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="border-b border-white/10 text-xs uppercase tracking-widest text-slate-400">
                          <th className="pb-3 px-4 font-bold">ID</th>
                          <th className="pb-3 px-4 font-bold">Usuário</th>
                          <th className="pb-3 px-4 font-bold">Cargo</th>
                          <th className="pb-3 px-4 font-bold text-right">Ações</th>
                        </tr>
                      </thead>
                      <tbody>
                        {users.map(u => (
                          <tr key={u.id} className="border-b border-white/5 last:border-0 hover:bg-white/[0.02]">
                            <td className="py-4 px-4 text-slate-500">{u.id}</td>
                            <td className="py-4 px-4 font-bold">
                              <span className={u.active === 0 ? "text-slate-500 line-through" : ""}>{u.username}</span>
                              {u.active === 0 && <span className="ml-2 text-[9px] bg-red-500/20 text-red-400 px-1 rounded uppercase">Inativo</span>}
                            </td>
                            <td className="py-4 px-4">
                              <span className={`text-[10px] uppercase font-bold px-2 py-1 rounded ${u.role === 'admin' ? 'bg-pink-500/20 text-pink-400' : u.role === 'editor' ? 'bg-purple-500/20 text-purple-400' : 'bg-blue-500/20 text-blue-400'}`}>
                                {u.role}
                              </span>
                            </td>
                             <td className="py-4 px-4 text-right space-x-2">
                              <button onClick={() => setEditingUser({ ...u, password: '' })} className="p-2 text-slate-500 hover:text-pink-400 transition-colors" title="Editar">
                                <Edit className="w-4 h-4" />
                              </button>
                              {u.username !== username && (
                                <>
                                  <button onClick={() => toggleUserStatus(u)} className={`p-2 transition-colors ${u.active === 0 ? 'text-green-500 hover:text-green-400' : 'text-slate-500 hover:text-yellow-400'}`} title={u.active === 0 ? 'Ativar' : 'Desativar'}>
                                    {u.active === 0 ? <UserCheck className="w-4 h-4" /> : <Ban className="w-4 h-4" />}
                                  </button>
                                  <button onClick={async () => {
                                    if(!confirm('Certeza que deseja remover este usuário permanentemente?')) return;
                                    try {
                                      const res = await fetch('/api/admin/users/' + u.id, { method: 'DELETE', headers: apiHeaders });
                                      if(res.ok) {
                                        toast.success("Usuário removido");
                                        fetchUsers();
                                      } else {
                                        const err = await res.json();
                                        toast.error(err.error || "Erro ao remover usuário");
                                      }
                                    } catch(e) {
                                      toast.error("Erro na requisição");
                                    }
                                  }} className="p-2 text-slate-500 hover:text-red-400 transition-colors" title="Remover">
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'security' && isAdmin && (
            <div className="flex flex-col gap-6">
              <header className="flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-black">Monitoramento de Segurança</h2>
                  <p className="text-slate-400 text-sm mt-1">Logs para monitoramento e prevenção (Fail2Ban)</p>
                </div>
                <div className="flex gap-2">
                   <button onClick={fetchLogs} className="px-4 py-2 bg-white/5 border border-white/10 rounded-full text-xs font-bold hover:bg-white/10 transition-all">
                    ATUALIZAR
                  </button>
                  <button onClick={clearLogs} className="px-4 py-2 bg-red-500/20 border border-red-500/30 rounded-full text-xs font-bold text-red-300 hover:bg-red-500/30 transition-all flex items-center">
                    <Trash2 className="w-4 h-4 mr-2" /> LIMPAR LOGS
                  </button>
                </div>
              </header>

              <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6">
                <div className="bg-[#050507] rounded-2xl p-4 font-mono text-[11px] overflow-x-auto max-h-[600px] overflow-y-auto space-y-1">
                  {securityLogs.length > 0 ? securityLogs.map((log, i) => {
                    const isFailure = log.includes('FAILED_LOGIN') || log.includes('INVALID_API_ACCESS') || log.includes('SUSPICIOUS') || log.includes('NOT_FOUND');
                    const isSuccess = log.includes('SUCCESS_LOGIN');
                    return (
                      <div key={i} className={`whitespace-pre-wrap py-0.5 ${isFailure ? 'text-red-400' : isSuccess ? 'text-green-400' : 'text-slate-400'}`}>
                        {log}
                      </div>
                    );
                  }) : (
                    <div className="text-slate-600 italic">Nenhum log registrado ainda.</div>
                  )}
                </div>
                <div className="mt-4 p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                  <h4 className="text-xs font-bold text-blue-300 uppercase mb-2 flex items-center">
                    <Shield className="w-4 h-4 mr-2" /> Dica de Configuração (Fail2Ban)
                  </h4>
                  <p className="text-[11px] text-slate-300 leading-relaxed font-mono">
                    # Exemplo de regex para Fail2Ban:<br/>
                    failregex = ^\[.*\] \[SECURITY\] (FAILED_LOGIN|SUSPICIOUS_PATH_ACCESS|NOT_FOUND_FILE_ACCESS) .* "ip": "&lt;HOST&gt;"
                  </p>
                  <p className="text-[10px] text-slate-500 mt-2">
                    O sistema agora captura tentativas de acesso a caminhos suspeitos (.env, .php, etc) e arquivos inexistentes, permitindo banir bots automaticamente.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="flex flex-col gap-6">
              <div>
                <h2 className="text-2xl font-black">Configurações</h2>
                <p className="text-slate-400 text-sm mt-1">Ajuste os parâmetros do site</p>
              </div>

              <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 md:p-8">
                <form onSubmit={saveSettings} className="space-y-8">
                  {/* Restrição de Acesso */}
                  <div className="p-4 bg-pink-500/5 border border-pink-500/20 rounded-2xl">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-bold text-pink-400">Restrição de Smartphone</h3>
                        <p className="text-xs text-slate-400">Bloquear acesso de computadores/telas largas</p>
                      </div>
                      <button type="button" onClick={() => setSettings({...settings, mobileOnly: !settings.mobileOnly})} className={`w-12 h-6 rounded-full transition-all relative ${settings.mobileOnly ? 'bg-pink-500' : 'bg-slate-700'}`}>
                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${settings.mobileOnly ? 'left-7' : 'left-1'}`} />
                      </button>
                    </div>
                  </div>

                  {/* Cabeçalho */}
                  <div className="space-y-6 pt-4">
                    <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 border-b border-white/5 pb-2">Identidade e Cabeçalho</h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Favicon Config */}
                      <div className="space-y-4">
                        <label className="block text-xs font-bold uppercase tracking-widest text-slate-400">Favicon (Ícone Aba)</label>
                        <div className="flex gap-4 items-center">
                          <input type="file" accept="image/png, image/x-icon, image/gif" className="text-[10px] text-slate-500" onChange={(e) => handleImageUpload('favicon', e)} />
                          {settings.favicon && <img src={settings.favicon} alt="Favicon" className="w-8 h-8 object-contain bg-black/20 p-1 rounded" />}
                        </div>
                        <p className="text-[9px] text-slate-500">Aceita PNG e ICO.</p>
                      </div>

                      <div className="space-y-4">
                        <label className="block text-xs font-bold uppercase tracking-widest text-slate-400">Branding Admin (Sidebar)</label>
                        <input type="text" className="w-full bg-[#1a1a24] border border-white/10 rounded-xl px-4 py-3 text-white" value={settings.adminBrand || ''} placeholder="Ex: K-TOUR" onChange={e => setSettings({...settings, adminBrand: e.target.value})} />
                        <p className="text-[9px] text-slate-500 italic">Altera o nome que aparece no canto superior do painel administrativo.</p>
                      </div>

                      {/* Title Config */}
                      <div className="space-y-4">
                        <label className="block text-xs font-bold uppercase tracking-widest text-slate-400">Título Principal</label>
                        <input type="text" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm" value={settings.appTitle || ''} placeholder="Promoção KPop Tour" onChange={e => setSettings({...settings, appTitle: e.target.value})} />
                      </div>

                      {/* Title Type Config (Existing) */}
                      <div className="space-y-4">
                        <label className="block text-xs font-bold uppercase tracking-widest text-slate-400">Tipo de Cabeçalho</label>
                        <select value={settings.titleType || 'text'} onChange={e => setSettings({...settings, titleType: e.target.value})} className="w-full bg-[#1a1a24] border border-white/10 rounded-xl px-4 py-2 text-xs text-white">
                          <option value="text">Texto</option>
                          <option value="image">Imagem/Logo</option>
                        </select>
                        {settings.titleType === 'image' ? (
                          <div className="space-y-2">
                             <input type="file" accept="image/*" className="text-[10px] text-slate-500" onChange={(e) => handleImageUpload('titleImage', e)} />
                             {settings.titleImage && <img src={settings.titleImage} alt="Title Logo" className="h-12 object-contain bg-black/20 p-1 rounded" />}
                          </div>
                        ) : (
                          <input type="text" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm" value={settings.titleText || ''} placeholder="STRAY KIDS" onChange={e => setSettings({...settings, titleText: e.target.value})} />
                        )}
                      </div>

                      {/* Subtitle Config (Moving/Keeping) */}
                      <div className="space-y-4">
                        <label className="block text-xs font-bold uppercase tracking-widest text-slate-400">Subtítulo</label>
                        <select value={settings.subtitleType || 'text'} onChange={e => setSettings({...settings, subtitleType: e.target.value})} className="w-full bg-[#1a1a24] border border-white/10 rounded-xl px-4 py-2 text-xs text-white">
                          <option value="text">Texto</option>
                          <option value="image">Imagem</option>
                        </select>
                        {settings.subtitleType === 'image' ? (
                          <div className="space-y-2">
                             <input type="file" accept="image/*" className="text-[10px] text-slate-500" onChange={(e) => handleImageUpload('subtitleImage', e)} />
                             {settings.subtitleImage && <img src={settings.subtitleImage} alt="Subtitle Logo" className="h-8 object-contain bg-black/20 p-1 rounded" />}
                          </div>
                        ) : (
                          <input type="text" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm" value={settings.subtitleText || ''} placeholder="Excursão 2024" onChange={e => setSettings({...settings, subtitleText: e.target.value})} />
                        )}
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Pergunta do Ingresso</label>
                    <input type="text" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-pink-500 outline-none transition-all" value={settings.ticketQuestionText || ''} onChange={e => setSettings({...settings, ticketQuestionText: e.target.value})} />
                  </div>

                  {/* Estilização Geral */}
                  <div className="space-y-6 pt-4">
                    <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 border-b border-white/5 pb-2">Cores e Estilos</h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                       <div>
                         <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Cor de Destaque (Primária)</label>
                         <div className="flex items-center gap-4">
                            <input type="color" className="w-12 h-12 bg-transparent border-none outline-none cursor-pointer" value={settings.primaryColor || '#ec4899'} onChange={e => setSettings({...settings, primaryColor: e.target.value})} />
                            <input type="text" className="flex-1 bg-[#1a1a24] border border-white/10 rounded-xl px-4 py-3 text-white font-mono" value={settings.primaryColor || '#ec4899'} onChange={e => setSettings({...settings, primaryColor: e.target.value})} />
                         </div>
                       </div>
                       <div>
                         <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Cor do Texto dos Botões</label>
                         <div className="flex items-center gap-4">
                            <input type="color" className="w-12 h-12 bg-transparent border-none outline-none cursor-pointer" value={settings.buttonTextColor || '#ffffff'} onChange={e => setSettings({...settings, buttonTextColor: e.target.value})} />
                            <input type="text" className="flex-1 bg-[#1a1a24] border border-white/10 rounded-xl px-4 py-3 text-white font-mono" value={settings.buttonTextColor || '#ffffff'} onChange={e => setSettings({...settings, buttonTextColor: e.target.value})} />
                         </div>
                       </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
                       <div>
                         <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Botão (Fundo)</label>
                         <div className="flex items-center gap-2">
                            <input type="color" className="w-8 h-8 bg-transparent border-none outline-none cursor-pointer" value={settings.buttonBgColor || '#ec4899'} onChange={e => setSettings({...settings, buttonBgColor: e.target.value})} />
                            <input type="text" className="flex-1 bg-[#1a1a24] border border-white/10 rounded px-2 py-2 text-white font-mono text-[10px]" value={settings.buttonBgColor || '#ec4899'} onChange={e => setSettings({...settings, buttonBgColor: e.target.value})} />
                         </div>
                       </div>
                       <div>
                         <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Botão (Hover/Mouse)</label>
                         <div className="flex items-center gap-2">
                            <input type="color" className="w-8 h-8 bg-transparent border-none outline-none cursor-pointer" value={settings.buttonHoverBgColor || '#be185d'} onChange={e => setSettings({...settings, buttonHoverBgColor: e.target.value})} />
                            <input type="text" className="flex-1 bg-[#1a1a24] border border-white/10 rounded px-2 py-2 text-white font-mono text-[10px]" value={settings.buttonHoverBgColor || '#be185d'} onChange={e => setSettings({...settings, buttonHoverBgColor: e.target.value})} />
                         </div>
                       </div>
                       <div>
                         <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Botão (Clique/Ativo)</label>
                         <div className="flex items-center gap-2">
                            <input type="color" className="w-8 h-8 bg-transparent border-none outline-none cursor-pointer" value={settings.buttonActiveBgColor || '#9d174d'} onChange={e => setSettings({...settings, buttonActiveBgColor: e.target.value})} />
                            <input type="text" className="flex-1 bg-[#1a1a24] border border-white/10 rounded px-2 py-2 text-white font-mono text-[10px]" value={settings.buttonActiveBgColor || '#9d174d'} onChange={e => setSettings({...settings, buttonActiveBgColor: e.target.value})} />
                         </div>
                       </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-4 bg-white/5 border border-white/10 rounded-2xl">
                        <div>
                          <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Cor Título</label>
                          <input type="color" className="w-full h-8 cursor-pointer rounded mb-2" value={settings.titleColor || '#ffffff'} onChange={e => setSettings({...settings, titleColor: e.target.value})} />
                          <input type="range" min="0" max="100" value={settings.titleOpacity ?? 100} onChange={e => setSettings({...settings, titleOpacity: parseInt(e.target.value)})} className="w-full accent-pink-500" title="Opacidade" />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Cor Perguntas</label>
                          <input type="color" className="w-full h-8 cursor-pointer rounded mb-2" value={settings.questionColor || '#ffffff'} onChange={e => setSettings({...settings, questionColor: e.target.value})} />
                          <input type="range" min="0" max="100" value={settings.questionOpacity ?? 100} onChange={e => setSettings({...settings, questionOpacity: parseInt(e.target.value)})} className="w-full accent-pink-500" title="Opacidade" />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Cor Textos</label>
                          <input type="color" className="w-full h-8 cursor-pointer rounded mb-2" value={settings.textColor || '#94a3b8'} onChange={e => setSettings({...settings, textColor: e.target.value})} />
                          <input type="range" min="0" max="100" value={settings.textOpacity ?? 100} onChange={e => setSettings({...settings, textOpacity: parseInt(e.target.value)})} className="w-full accent-pink-500" title="Opacidade" />
                        </div>
                    </div>
                  </div>

                  {/* FUNDO DA PÁGINA */}
                  <div className="space-y-4 pt-4 border-t border-white/5">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500">Fundo Geral da Página (Externo)</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <select value={settings.bgType || 'solid'} onChange={e => setSettings({...settings, bgType: e.target.value})} className="w-full bg-[#1a1a24] border border-white/10 rounded-xl px-4 py-3 text-white text-sm">
                        <option value="solid">Cor sólida (Primária)</option>
                        <option value="gradient">Gradiente CSS</option>
                        <option value="image">Imagem Personalizada</option>
                      </select>
                      {settings.bgType === 'gradient' && (
                        <input type="text" className="w-full bg-[#1a1a24] border border-white/10 rounded-xl px-4 py-3 text-white font-mono text-xs" value={settings.bgGradient || ''} placeholder="linear-gradient(...)" onChange={e => setSettings({...settings, bgGradient: e.target.value})} />
                      )}
                      {settings.bgType === 'image' && (
                        <input type="file" accept="image/*" className="text-xs self-center" onChange={(e) => handleImageUpload('backgroundImage', e)} />
                      )}
                    </div>
                  </div>

                  {/* FUNDO DO APLICATIVO */}
                  <div className="space-y-4 pt-4 border-t border-white/5">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500">Fundo da Área do App (Smartphone)</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                       <div className="space-y-4">
                          <label className="block text-[10px] font-bold text-slate-400">Tipo de Fundo</label>
                          <select value={settings.appBgType || 'solid'} onChange={e => setSettings({...settings, appBgType: e.target.value})} className="w-full bg-[#1a1a24] border border-white/10 rounded-xl px-4 py-2 text-white text-xs">
                            <option value="solid">Transparente / Cor do Sistema</option>
                            <option value="gradient">Gradiente CSS</option>
                            <option value="image">Imagem</option>
                          </select>
                          {settings.appBgType === 'gradient' && <input type="text" className="w-full bg-[#1a1a24] border border-white/10 rounded px-2 py-2 text-white text-[10px] font-mono" value={settings.appBgGradient || ''} placeholder="linear-gradient(...)" onChange={e => setSettings({...settings, appBgGradient: e.target.value})} />}
                          {settings.appBgType === 'image' && <input type="file" accept="image/*" className="text-[10px]" onChange={(e) => handleImageUpload('appBgImage', e)} />}
                       </div>
                       <div className="space-y-4">
                          <div>
                            <label className="block text-[10px] font-bold text-slate-400 mb-1">Opacidade (Efeito Vidro)</label>
                            <input type="range" min="0" max="100" value={settings.bgOverlayOpacity ?? 80} onChange={e => setSettings({...settings, bgOverlayOpacity: parseInt(e.target.value)})} className="w-full accent-pink-500" />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-slate-400 mb-1">Blur Amount (Desfoque)</label>
                            <input type="range" min="0" max="40" value={settings.bgBlurAmount ?? 10} onChange={e => setSettings({...settings, bgBlurAmount: parseInt(e.target.value)})} className="w-full accent-pink-500" />
                          </div>
                       </div>
                    </div>
                  </div>

                  {/* Perguntas e Texto */}
                  <div className="space-y-4 pt-4 border-t border-white/5">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 underline decoration-slate-800 underline-offset-4">Mensagens Personalizadas</h3>
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] font-bold uppercase text-slate-400 mb-2">Título Sucesso</label>
                          <input type="text" className="w-full bg-white/5 border border-white/10 rounded-xl px-2 py-2 text-white text-xs" value={settings.noTicketTitle || ''} onChange={e => setSettings({...settings, noTicketTitle: e.target.value})} />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold uppercase text-slate-400 mb-2">Mensagem (Sem Ingresso)</label>
                          <input type="text" className="w-full bg-white/5 border border-white/10 rounded-xl px-2 py-2 text-white text-xs" value={settings.noTicketMessage || ''} onChange={e => setSettings({...settings, noTicketMessage: e.target.value})} />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold uppercase text-slate-400 mb-2">Mensagem Vitória ([PRIZE])</label>
                          <input type="text" className="w-full bg-white/5 border border-white/10 rounded-xl px-2 py-2 text-white text-xs" value={settings.winMessage || ''} onChange={e => setSettings({...settings, winMessage: e.target.value})} />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold uppercase text-slate-400 mb-2">Mensagem Derrota</label>
                          <input type="text" className="w-full bg-white/5 border border-white/10 rounded-xl px-2 py-2 text-white text-xs" value={settings.loseMessage || ''} onChange={e => setSettings({...settings, loseMessage: e.target.value})} />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4 pt-4 border-t border-white/5">
                    <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">Links Sociais (JSON)</label>
                    <textarea 
                      className="w-full bg-[#1a1a24] border border-white/10 rounded-xl px-4 py-3 text-white font-mono text-xs focus:border-pink-500 outline-none transition-all" 
                      rows={3} 
                      value={settings && (typeof settings.socialLinks === 'object' ? JSON.stringify(settings.socialLinks, null, 2) : settings.socialLinks) || ''} 
                      onChange={e => {
                        try {
                          const val = e.target.value;
                          const parsed = val ? JSON.parse(val) : {};
                          setSettings({...settings, socialLinks: parsed});
                        } catch {
                          setSettings({...settings, socialLinks: e.target.value});
                        }
                      }}
                    />
                  </div>

                  <button type="submit" disabled={loading} className="w-full py-5 bg-gradient-to-r from-pink-500 to-purple-500 rounded-2xl font-black text-sm shadow-xl shadow-pink-500/20 hover:opacity-90 transition-all uppercase tracking-widest mt-10 flex items-center justify-center gap-2">
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Salvar Todas as Configurações'}
                  </button>
                </form>

                <div className="border-t border-white/10 mt-10 pt-8">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-red-400 mb-4">Gerenciamento de Banco de Dados</h3>
                  <div className="flex flex-wrap gap-4">
                    <button onClick={downloadBackup} className="bg-white/5 border border-white/10 hover:bg-white/10 transition-all text-white px-4 py-3 rounded-xl flex items-center text-xs font-bold uppercase tracking-widest">
                      <Download className="w-4 h-4 mr-2" /> Baixar Backup
                    </button>
                    
                    <label className="bg-white/5 border border-white/10 hover:bg-white/10 transition-all text-white px-4 py-3 rounded-xl flex items-center cursor-pointer text-xs font-bold uppercase tracking-widest">
                      <Upload className="w-4 h-4 mr-2" /> Restaurar
                      <input type="file" accept=".sqlite" className="hidden" ref={fileInputRef} onChange={restoreBackup} />
                    </label>

                    <button onClick={clearSettingsAction} className="bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 hover:bg-yellow-500/20 transition-all px-4 py-3 rounded-xl flex items-center text-xs font-bold uppercase tracking-widest">
                      <Trash2 className="w-4 h-4 mr-2" /> Zerar Configurações
                    </button>

                    <button onClick={clearDB} className="bg-red-500/20 border border-red-500/30 text-red-400 hover:bg-red-500/30 transition-all px-4 py-3 rounded-xl flex items-center xl:ml-auto text-xs font-bold uppercase tracking-widest">
                      <Trash2 className="w-4 h-4 mr-2" /> Zerar Banco
                    </button>
                  </div>
                </div>

              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
