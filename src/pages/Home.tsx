import React, { useState } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { Loader2, Ticket, CheckCircle, AlertCircle } from 'lucide-react';
import { motion } from "motion/react";

export default function Home() {
  const { settings } = useOutletContext<{ settings: any }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const getHexRgba = (hex: string, opacity: number = 100) => {
    if (!hex) return undefined;
    if (hex.startsWith('#') && hex.length === 7) {
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      return `rgba(${r}, ${g}, ${b}, ${opacity / 100})`;
    }
    return hex;
  };

  const [formData, setFormData] = useState({
    name: '',
    socialName: '',
    phone: '',
    email: '',
    hasTicket: ''
  });

  const [customData, setCustomData] = useState<Record<string, any>>({});

  const handleCustomChange = (id: string, value: any, type: string) => {
    setCustomData(prev => {
      const next = { ...prev };
      if (type === 'checkbox') {
        const arr = Array.isArray(next[id]) ? [...next[id]] : [];
        if (arr.includes(value)) {
          next[id] = arr.filter(v => v !== value);
        } else {
          next[id] = [...arr, value];
        }
      } else {
        next[id] = value;
      }
      return next;
    });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    let value = e.target.value;
    if (e.target.name === 'phone') {
      value = value.replace(/\D/g, "");
      if (value.length > 11) value = value.slice(0, 11);
      
      if (value.length <= 10) {
        value = value.replace(/^(\d{2})(\d)/g, "($1) $2").replace(/(\d{4})(\d)/, "$1-$2");
      } else {
        value = value.replace(/^(\d{2})(\d)/g, "($1) $2").replace(/(\d{5})(\d)/, "$1-$2");
      }
    }
    setFormData(prev => ({ ...prev, [e.target.name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate phone length (10 or 11 digits)
    const phoneDigits = formData.phone.replace(/\D/g, "");
    if (phoneDigits.length < 10) {
      setError('Por favor, preencha o telefone corretamente com DDD.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const res = await fetch('/api/participate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          hasTicket: formData.hasTicket === 'yes',
          customData
        })
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.error === 'already_participated') {
          const prev = data.previousResult;
          let msg = `Você já participou! `;
          if (prev.wonPrize && prev.wonPrize !== '0') {
            msg += `Prêmio: R$ ${prev.wonPrize}.`;
          } else if (prev.wonPrize === '0') {
            msg += `Você já raspou a sua chance antes.`;
          } else {
            msg += `Agradecemos a participação.`;
          }
          setError(msg);
        } else {
          setError('Ocorreu um erro ao processar sua participação.');
        }
        return;
      }

      if (formData.hasTicket === 'yes') {
        navigate('/scratchcard', { state: { wonPrize: data.wonPrize } });
      } else {
        setSuccessMsg('Obrigado por participar! Fique ligado nas nossas redes para mais novidades.');
      }
    } catch (err) {
      setError('Erro de conexão. Tente novamente mais tarde.');
    } finally {
      setLoading(false);
    }
  };

  if (successMsg) {
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center justify-center py-12 text-center space-y-4"
      >
        <div className="w-20 h-20 bg-green-500/20 text-green-400 rounded-full flex items-center justify-center mb-4 border border-green-500/30 shadow-lg shadow-green-500/20">
          <CheckCircle className="w-10 h-10" />
        </div>
        <h2 className="text-2xl font-bold" style={{ color: getHexRgba(settings.titleColor || '#ffffff', settings.titleOpacity ?? 100) }}>
          {settings.noTicketTitle || "Inscrição Concluída!"}
        </h2>
        <p className="font-medium" style={{ color: getHexRgba(settings.textColor || '#cbd5e1', settings.textOpacity ?? 100) }}>
          {settings.noTicketMessage || successMsg}
        </p>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="mb-6 text-center">
        <h2 className="text-xl font-semibold" style={{ color: getHexRgba(settings.titleColor || '#ffffff', settings.titleOpacity ?? 100) }}>
          {settings.appTitle || "Participe da Nossa Ação!"}
        </h2>
        <p className="text-sm mt-2" style={{ color: getHexRgba(settings.textColor || '#cbd5e1', settings.textOpacity ?? 100) }}>
          {settings.appSubtitle || "Preencha os dados abaixo para continuar."}
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-500/20 border border-red-500/30 text-red-200 rounded-xl text-sm flex items-start backdrop-blur-md">
          <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0 text-red-400" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-bold uppercase tracking-widest mb-1" style={{ color: getHexRgba(settings.questionColor || '#cbd5e1', settings.questionOpacity ?? 100) }}>
            Nome Completo *
          </label>
          <input 
            type="text" 
            name="name" 
            required
            value={formData.name}
            onChange={handleChange}
            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-400 focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20 outline-none transition-all backdrop-blur-md"
            placeholder="Seu nome"
          />
        </div>

        {settings.socialNameEnabled !== 'false' && (
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest mb-1" style={{ color: getHexRgba(settings.questionColor || '#cbd5e1', settings.questionOpacity ?? 100) }}>
              Nome Social (Opcional)
            </label>
            <input 
              type="text" 
              name="socialName"
              value={formData.socialName}
              onChange={handleChange}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-400 focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20 outline-none transition-all backdrop-blur-md"
              placeholder="Como prefere ser chamado"
            />
          </div>
        )}

        <div>
           <label className="block text-xs font-bold uppercase tracking-widest mb-1" style={{ color: getHexRgba(settings.questionColor || '#cbd5e1', settings.questionOpacity ?? 100) }}>
             Telefone (WhatsApp) *
           </label>
           <input 
             type="tel" 
             name="phone"
             required
             value={formData.phone}
             onChange={handleChange}
             className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-400 focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20 outline-none transition-all backdrop-blur-md"
             placeholder="(11) 99999-9999"
           />
        </div>

        <div>
           <label className="block text-xs font-bold uppercase tracking-widest mb-1" style={{ color: getHexRgba(settings.questionColor || '#cbd5e1', settings.questionOpacity ?? 100) }}>
             Email *
           </label>
           <input 
             type="email" 
             name="email"
             required
             value={formData.email}
             onChange={handleChange}
             className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-400 focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20 outline-none transition-all backdrop-blur-md"
             placeholder="seu@email.com"
           />
        </div>

         <div className="pt-2">
           <label className="block text-xs font-bold uppercase tracking-widest mb-2" style={{ color: getHexRgba(settings.questionColor || '#cbd5e1', settings.questionOpacity ?? 100) }}>
              {settings.ticketQuestionText || 'Você já possui ingresso para o evento?'}
           </label>
           <div className="grid grid-cols-2 gap-3">
              <label className={`border border-white/10 rounded-xl py-3 px-4 flex items-center justify-center cursor-pointer transition-colors ${formData.hasTicket === 'yes' ? 'btn-radio-selected font-bold' : 'bg-white/5 text-slate-300 hover:bg-white/10'}`}>
                 <input 
                   type="radio" 
                   name="hasTicket" 
                   value="yes" 
                   checked={formData.hasTicket === 'yes'}
                   onChange={handleChange}
                   className="hidden" 
                 />
                 Sim
              </label>
              <label className={`border border-white/10 rounded-xl py-3 px-4 flex items-center justify-center cursor-pointer transition-colors ${formData.hasTicket === 'no' ? 'btn-radio-selected font-bold' : 'bg-white/5 text-slate-300 hover:bg-white/10'}`}>
                 <input 
                   type="radio" 
                   name="hasTicket" 
                   value="no" 
                   checked={formData.hasTicket === 'no'}
                   onChange={handleChange}
                   className="hidden" 
                 />
                 Não
              </label>
           </div>
        </div>

        {/* Custom Fields */}
        {(() => {
          let customFields = [];
          try {
            customFields = settings.customFormFields ? (typeof settings.customFormFields === 'string' ? JSON.parse(settings.customFormFields) : settings.customFormFields) : [];
          } catch(e) {}
          
          return customFields.map((field: any) => {
            const vis = field.visibility || (field.showOnlyIfTicket ? 'yes' : 'always');
            if (vis === 'yes' && formData.hasTicket !== 'yes') return null;
            if (vis === 'no' && formData.hasTicket !== 'no') return null;
            
            const options = field.options ? field.options.split(',').map((o: string) => o.trim()).filter(Boolean) : [];

            return (
              <div key={field.id} className="pt-2">
                <label className="block text-xs font-bold uppercase tracking-widest mb-2" style={{ color: getHexRgba(settings.questionColor || '#cbd5e1', settings.questionOpacity ?? 100) }}>
                  {field.label} {field.required && <span className="text-pink-500">*</span>}
                </label>
                
                {field.type === 'text' && (
                  <input type="text" required={field.required} value={customData[field.id] || ''} onChange={(e) => handleCustomChange(field.id, e.target.value, 'text')} className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-400 focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20 outline-none transition-all backdrop-blur-md" />
                )}
                
                {field.type === 'textarea' && (
                  <textarea required={field.required} value={customData[field.id] || ''} onChange={(e) => handleCustomChange(field.id, e.target.value, 'textarea')} className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-400 focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20 outline-none transition-all backdrop-blur-md" rows={3}></textarea>
                )}

                {field.type === 'select' && (
                  <select required={field.required} value={customData[field.id] || ''} onChange={(e) => handleCustomChange(field.id, e.target.value, 'select')} className="w-full px-4 py-3 bg-[#1a1a24] border border-white/10 rounded-xl text-white focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20 outline-none transition-all backdrop-blur-md">
                    <option value="">Selecione...</option>
                    {options.map((opt: string) => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                )}
                
                {field.type === 'radio' && (
                  <div className="space-y-2">
                    {options.map((opt: string) => (
                      <label key={opt} className={`border border-white/10 rounded-xl py-3 px-4 flex items-center cursor-pointer transition-colors ${customData[field.id] === opt ? 'btn-radio-selected' : 'bg-white/5 text-slate-300 hover:bg-white/10'}`}>
                        <input type="radio" required={field.required} name={`custom_${field.id}`} value={opt} checked={customData[field.id] === opt} onChange={(e) => handleCustomChange(field.id, e.target.value, 'radio')} className="mr-3 accent-current" />
                        {opt}
                      </label>
                    ))}
                  </div>
                )}

                {field.type === 'checkbox' && (
                  <div className="space-y-2">
                    {options.map((opt: string) => {
                      const isChecked = Array.isArray(customData[field.id]) && customData[field.id].includes(opt);
                      return (
                        <label key={opt} className={`border border-white/10 rounded-xl py-3 px-4 flex items-center cursor-pointer transition-colors ${isChecked ? 'btn-radio-selected' : 'bg-white/5 text-slate-300 hover:bg-white/10'}`}>
                          <input type="checkbox" value={opt} checked={isChecked} onChange={(e) => handleCustomChange(field.id, e.target.value, 'checkbox')} className="mr-3 rounded text-current focus:ring-0 bg-white/10 border-white/20" />
                          {opt}
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          });
        })()}

        <button 
          type="submit" 
          disabled={loading || !formData.hasTicket}
          className="w-full mt-6 py-4 btn-custom rounded-2xl font-black text-sm shadow-xl shadow-pink-500/20 disabled:opacity-50 disabled:shadow-none flex justify-center items-center uppercase tracking-widest"
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Participar'}
        </button>
      </form>
    </motion.div>
  );
}
