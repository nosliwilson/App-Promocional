import React, { useEffect, useState, useRef } from 'react';
import { Download, Upload, Trash2, Settings as SettingsIcon, Users, QrCode, Gift, Lock, Loader2, KeyRound, Plus, X, Edit, ListTree } from 'lucide-react';
import { Link } from 'react-router-dom';
import * as motion from "motion/react-client";
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
  const [activeTab, setActiveTab] = useState<'participants' | 'settings' | 'prizes' | 'account' | 'form'>('participants');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Prize Form State
  const [prizeForm, setPrizeForm] = useState({ id: 0, name: '', discount: '', probability: 0.1, maxQuantity: '' });
  const [isEditingPrize, setIsEditingPrize] = useState(false);

  // Account Form State
  const [accountForm, setAccountForm] = useState({ newPassword: '', confirmPassword: '' });
  const [newUserForm, setNewUserForm] = useState({ username: '', password: '', role: 'user' });

  useEffect(() => {
    if (token) {
      fetchData();
    }
  }, [token]);

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

  const fetchData = async () => {
    setLoading(true);
    try {
      const p = [
        fetch('/api/admin/participants', { headers: apiHeaders }),
        fetch('/api/settings'),
        fetch('/api/admin/prizes', { headers: apiHeaders })
      ];
      
      const [partsRes, setsRes, prizesRes] = await Promise.all(p);
      
      if (partsRes.status === 401 || prizesRes.status === 401) {
        logout();
        return;
      }

      setParticipants(await partsRes.json());
      setSettings(await setsRes.json());
      setPrizes(await prizesRes.json());
      if (role === 'admin') fetchUsers();
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
      .then(res => res.blob())
      .then(blob => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'database.sqlite';
        a.click();
      });
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
    if (!confirm('ATENÇÃO! Isso apagará TODOS os dados e configurações. Deseja realmente zerar o banco de dados?')) return;
    
    setLoading(true);
    await fetch('/api/admin/clear', { method: 'POST', headers: apiHeaders });
    toast.success('Banco de dados zerado com sucesso!');
    fetchData();
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
    if (newUserForm.password.length < 4) {
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
        setNewUserForm({ username: '', password: '', role: 'user' });
        fetchUsers();
      } else {
        const data = await res.json();
        toast.error("Erro ao criar usuário: " + (data.error || 'Erro desconhecido'));
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
              K-TOUR<br/>ADMIN
            </h1>
            <p className="text-slate-400 font-medium italic text-xs mt-2">Olá, {username}</p>
          </div>
          
          <button onClick={() => setActiveTab('participants')} className={`flex items-center px-4 py-3 rounded-full transition-all text-xs font-bold uppercase tracking-widest ${activeTab === 'participants' ? 'bg-white/10 border border-white/20 text-white' : 'hover:bg-white/5 text-slate-400'}`}>
            <Users className="w-4 h-4 mr-3" /> <span>Inscritos</span>
          </button>

          <button onClick={() => setActiveTab('prizes')} className={`flex items-center px-4 py-3 rounded-full transition-all text-xs font-bold uppercase tracking-widest ${activeTab === 'prizes' ? 'bg-white/10 border border-white/20 text-white' : 'hover:bg-white/5 text-slate-400'}`}>
            <Gift className="w-4 h-4 mr-3" /> <span>Prêmios</span>
          </button>

          <button onClick={() => setActiveTab('form')} className={`flex items-center px-4 py-3 rounded-full transition-all text-xs font-bold uppercase tracking-widest ${activeTab === 'form' ? 'bg-white/10 border border-white/20 text-white' : 'hover:bg-white/5 text-slate-400'}`}>
            <SettingsIcon className="w-4 h-4 mr-3" /> <span>Formulário Customizado</span>
          </button>

          <button onClick={() => setActiveTab('settings')} className={`flex items-center px-4 py-3 rounded-full transition-all text-xs font-bold uppercase tracking-widest ${activeTab === 'settings' ? 'bg-white/10 border border-white/20 text-white' : 'hover:bg-white/5 text-slate-400'}`}>
            <SettingsIcon className="w-4 h-4 mr-3" /> <span>Configurações</span>
          </button>

          <button onClick={() => setActiveTab('account')} className={`flex items-center px-4 py-3 rounded-full transition-all text-xs font-bold uppercase tracking-widest ${activeTab === 'account' ? 'bg-white/10 border border-white/20 text-white' : 'hover:bg-white/5 text-slate-400'}`}>
            <KeyRound className="w-4 h-4 mr-3" /> <span>Conta</span>
          </button>

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
                <button onClick={downloadCSV} className="px-4 py-2 bg-white/5 border border-white/10 rounded-full text-xs font-bold hover:bg-white/10 transition-all flex items-center">
                  <Download className="w-4 h-4 mr-2" /> EXPORTAR CSV
                </button>
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
                    {participants.map(p => (
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
                            {new Date(p.createdAt).toLocaleString()}
                          </td>
                        </tr>
                        {p.customData && p.customData !== '{}' && (
                          <tr className="border-b border-white/5 bg-white/[0.02]">
                            <td colSpan={6} className="py-2 px-4 text-xs text-slate-400">
                              <span className="font-bold text-pink-400 mr-2">Dados Extras:</span>
                              {Object.entries(typeof p.customData === 'string' ? JSON.parse(p.customData) : p.customData).map(([k,v]: any) => {
                                const field = formFields.find(f => f.id === k);
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
              <div>
                <h2 className="text-2xl font-black">Premios e Sorteio</h2>
                <p className="text-slate-400 text-sm mt-1">Gerencie os cupons, chances e quantidades</p>
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
                <button onClick={saveFormFields} className="px-4 py-2 bg-pink-500 rounded-xl font-bold tracking-widest uppercase text-xs hover:bg-pink-400 shadow-xl shadow-pink-500/20">
                  Salvar Formulário
                </button>
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
                    {role === 'admin' && (
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Cargo</label>
                        <select value={newUserForm.role} onChange={e => setNewUserForm({...newUserForm, role: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-pink-500 outline-none transition-all">
                          <option value="user" className="bg-[#1a1a24]">Usuário (Leitura)</option>
                          <option value="admin" className="bg-[#1a1a24]">Administrador</option>
                        </select>
                      </div>
                    )}
                    <button type="submit" className="w-full py-4 bg-purple-500 rounded-2xl font-black text-sm shadow-xl shadow-purple-500/20 hover:bg-purple-400 transition-all uppercase tracking-widest mt-4">
                      Criar Usuário
                    </button>
                  </form>
                </div>
              </div>

              {role === 'admin' && (
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 md:p-8 mt-6">
                  <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400 mb-6">Usuários do Sistema</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="border-b border-white/10 text-xs uppercase tracking-widest text-slate-400">
                          <th className="pb-3 px-4 font-bold">ID</th>
                          <th className="pb-3 px-4 font-bold">Usuário</th>
                          <th className="pb-3 px-4 font-bold">Cargo</th>
                          <th className="pb-3 px-4 font-bold text-right">Ação</th>
                        </tr>
                      </thead>
                      <tbody>
                        {users.map(u => (
                          <tr key={u.id} className="border-b border-white/5 last:border-0 hover:bg-white/[0.02]">
                            <td className="py-4 px-4">{u.id}</td>
                            <td className="py-4 px-4 font-bold">{u.username.toUpperCase()}</td>
                            <td className="py-4 px-4 text-xs font-mono bg-white/10 inline-block mt-3 ml-4 rounded px-2 py-1 text-slate-300">{u.role}</td>
                            <td className="py-4 px-4 text-right">
                              {u.username !== username && (
                                <button onClick={async () => {
                                  if(!confirm('Certeza que deseja remover este usuário?')) return;
                                  try {
                                    await fetch('/api/admin/users/' + u.id, { method: 'DELETE', headers: apiHeaders });
                                    fetchUsers();
                                  } catch(e) {}
                                }} className="p-2 text-slate-500 hover:text-red-400 transition-colors">
                                  <Trash2 className="w-4 h-4" />
                                </button>
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

          {activeTab === 'settings' && (
            <div className="flex flex-col gap-6">
              <div>
                <h2 className="text-2xl font-black">Configurações</h2>
                <p className="text-slate-400 text-sm mt-1">Ajuste os parâmetros do site</p>
              </div>

              <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 md:p-8">
                <form onSubmit={saveSettings} className="space-y-6">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Título do App</label>
                    <input type="text" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-pink-500 outline-none transition-all" value={settings.appTitle || ''} onChange={e => setSettings({...settings, appTitle: e.target.value})} />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Texto: Pergunta do Ingresso</label>
                    <input type="text" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-pink-500 outline-none transition-all" value={settings.ticketQuestionText || ''} onChange={e => setSettings({...settings, ticketQuestionText: e.target.value})} />
                  </div>

                  <div className="border-t border-white/10 pt-6">
                    <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400 mb-4">Mensagens Personalizadas</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Título de Sucesso (Ex: Inscrição Concluída)</label>
                        <input type="text" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-pink-500 outline-none transition-all" value={settings.noTicketTitle || ''} placeholder="Inscrição Concluída!" onChange={e => setSettings({...settings, noTicketTitle: e.target.value})} />
                      </div>
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Mensagem (Quando diz não ter ingresso)</label>
                        <textarea className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-pink-500 outline-none transition-all text-sm" rows={2} value={settings.noTicketMessage || ''} placeholder="Obrigado por participar! Fique ligado nas nossas redes." onChange={e => setSettings({...settings, noTicketMessage: e.target.value})} />
                      </div>
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Mensagem de Vitória (Use [PRIZE])</label>
                        <input type="text" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-pink-500 outline-none transition-all" value={settings.winMessage || ''} placeholder="PARABÉNS! Você ganhou R$ [PRIZE] de desconto em nossa excursão!" onChange={e => setSettings({...settings, winMessage: e.target.value})} />
                      </div>
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Mensagem sem Prêmio</label>
                        <input type="text" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-pink-500 outline-none transition-all" value={settings.loseMessage || ''} placeholder="Que pena! Você não ganhou desta vez." onChange={e => setSettings({...settings, loseMessage: e.target.value})} />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Links Sociais (JSON)</label>
                    <textarea className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-pink-500 outline-none transition-all font-mono text-sm" rows={4} value={settings.socialLinks ? JSON.stringify(settings.socialLinks, null, 2) : ''} onChange={e => {
                        try { setSettings({...settings, socialLinks: JSON.parse(e.target.value)}); } catch(err) { if (e.target.value === '') setSettings({...settings, socialLinks: {}}); }
                      }} />
                  </div>

                  <div className="border-t border-white/10 pt-6">
                    <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400 mb-4">Personalização Visual</h3>
                    <div className="space-y-6">
                      
                      {/* Cor Primária */}
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-2 mt-4">Cor Primária (Hexadecimal)</label>
                        <div className="flex items-center gap-4">
                          <input type="color" className="w-12 h-12 bg-transparent border-none outline-none cursor-pointer" value={settings.primaryColor || '#a855f7'} onChange={e => setSettings({...settings, primaryColor: e.target.value})} />
                          <input type="text" className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-pink-500 outline-none transition-all" value={settings.primaryColor || '#a855f7'} onChange={e => setSettings({...settings, primaryColor: e.target.value})} placeholder="#a855f7"/>
                        </div>
                      </div>

                      {/* Cores de Texto e Opacidade */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-4 bg-white/5 border border-white/10 rounded-2xl">
                        <div>
                          <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Cor do Título</label>
                          <div className="flex items-center gap-2 mb-2">
                            <input type="color" className="w-8 h-8 rounded shrink-0 cursor-pointer" value={settings.titleColor || '#ffffff'} onChange={e => setSettings({...settings, titleColor: e.target.value})} />
                            <input type="text" className="flex-1 bg-[#1a1a24] border border-white/10 rounded px-2 py-1 text-xs text-white" value={settings.titleColor || '#ffffff'} onChange={e => setSettings({...settings, titleColor: e.target.value})} />
                          </div>
                          <label className="block text-[10px] text-slate-500">Opacidade: {settings.titleOpacity ?? 100}%</label>
                          <input type="range" min="0" max="100" value={settings.titleOpacity ?? 100} onChange={e => setSettings({...settings, titleOpacity: parseInt(e.target.value)})} className="w-full accent-pink-500" />
                        </div>
                        
                        <div>
                          <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Cor das Perguntas</label>
                          <div className="flex items-center gap-2 mb-2">
                            <input type="color" className="w-8 h-8 rounded shrink-0 cursor-pointer" value={settings.questionColor || '#cbd5e1'} onChange={e => setSettings({...settings, questionColor: e.target.value})} />
                            <input type="text" className="flex-1 bg-[#1a1a24] border border-white/10 rounded px-2 py-1 text-xs text-white" value={settings.questionColor || '#cbd5e1'} onChange={e => setSettings({...settings, questionColor: e.target.value})} />
                          </div>
                          <label className="block text-[10px] text-slate-500">Opacidade: {settings.questionOpacity ?? 100}%</label>
                          <input type="range" min="0" max="100" value={settings.questionOpacity ?? 100} onChange={e => setSettings({...settings, questionOpacity: parseInt(e.target.value)})} className="w-full accent-pink-500" />
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Cor dos Textos</label>
                          <div className="flex items-center gap-2 mb-2">
                            <input type="color" className="w-8 h-8 rounded shrink-0 cursor-pointer" value={settings.textColor || '#94a3b8'} onChange={e => setSettings({...settings, textColor: e.target.value})} />
                            <input type="text" className="flex-1 bg-[#1a1a24] border border-white/10 rounded px-2 py-1 text-xs text-white" value={settings.textColor || '#94a3b8'} onChange={e => setSettings({...settings, textColor: e.target.value})} />
                          </div>
                          <label className="block text-[10px] text-slate-500">Opacidade: {settings.textOpacity ?? 100}%</label>
                          <input type="range" min="0" max="100" value={settings.textOpacity ?? 100} onChange={e => setSettings({...settings, textOpacity: parseInt(e.target.value)})} className="w-full accent-pink-500" />
                        </div>
                      </div>

                      {/* Fundo */}
                      <div className="p-4 bg-white/5 border border-white/10 rounded-2xl space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                            <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Transparência do Painel (Opacidade)</label>
                            <div className="flex items-center gap-4">
                              <input type="range" min="0" max="100" value={settings.bgOverlayOpacity ?? 80} onChange={e => setSettings({...settings, bgOverlayOpacity: parseInt(e.target.value)})} className="flex-1 accent-pink-500" />
                              <span className="text-xs text-white font-mono w-12 text-right">{settings.bgOverlayOpacity ?? 80}%</span>
                            </div>
                          </div>
                          <div>
                            <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Intensidade do Desfoque (Blur)</label>
                            <div className="flex items-center gap-4">
                              <input type="range" min="0" max="40" value={settings.bgBlurAmount ?? 10} onChange={e => setSettings({...settings, bgBlurAmount: parseInt(e.target.value)})} className="flex-1 accent-pink-500" />
                              <span className="text-xs text-white font-mono w-12 text-right">{settings.bgBlurAmount ?? 10}px</span>
                            </div>
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Tipo de Fundo Principal</label>
                          <select value={settings.bgType || 'solid'} onChange={e => setSettings({...settings, bgType: e.target.value})} className="w-full bg-[#1a1a24] border border-white/10 rounded-xl px-4 py-3 text-white focus:border-pink-500 outline-none transition-all">
                            <option value="solid">Apenas Cor Primária</option>
                            <option value="gradient">Gradiente CSS Personalizado</option>
                            <option value="image">Imagem (Upload)</option>
                          </select>
                        </div>
                        
                        {settings.bgType === 'gradient' && (
                          <div>
                            <label className="block text-xs font-bold uppercase tracking-widest text-slate-300 mb-2">Código de Gradiente CSS</label>
                            <input type="text" className="w-full bg-[#1a1a24] border border-white/10 rounded-xl px-4 py-3 text-white focus:border-pink-500 outline-none transition-all font-mono text-sm" value={settings.bgGradient || 'linear-gradient(135deg, #a855f7, #ec4899)'} onChange={e => setSettings({...settings, bgGradient: e.target.value})} placeholder="ex: linear-gradient(135deg, #a855f7, #ec4899)" />
                          </div>
                        )}

                        {settings.bgType === 'image' && (
                          <div>
                            <label className="block text-xs font-medium text-slate-500 mb-2">Selecione o Plano de Fundo</label>
                            <input type="file" accept="image/*" className="text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-white/10 file:text-white" onChange={(e) => handleImageUpload('backgroundImage', e)} />
                            {settings.backgroundImage && <img src={settings.backgroundImage} alt="BG Preview" className="h-24 mt-3 object-cover rounded-xl border border-white/10" />}
                          </div>
                        )}
                      </div>

                      {/* Logo */}
                      <div className="p-4 bg-white/5 border border-white/10 rounded-2xl">
                        <label className="block text-xs font-medium text-slate-500 mb-2">Logo (Imagem Opcional topo do App)</label>
                        <input type="file" accept="image/*" className="text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-white/10 file:text-white" onChange={(e) => handleImageUpload('logoImage', e)} />
                        {settings.logoImage && <img src={settings.logoImage} alt="Logo Preview" className="h-16 mt-3 object-contain bg-black/20 p-2 rounded" />}
                      </div>
                    </div>
                  </div>

                  <button type="submit" className="w-full py-4 bg-pink-500 rounded-2xl font-black text-sm shadow-xl shadow-pink-500/20 hover:bg-pink-400 transition-all uppercase tracking-widest mt-4">
                    Salvar Configurações
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
