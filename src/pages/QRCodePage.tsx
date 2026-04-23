import { QRCodeSVG } from 'qrcode.react';
import { Link } from 'react-router-dom';

export default function QRCodePage() {
  const url = process.env.APP_URL || window.location.origin;

  return (
    <div className="min-h-screen bg-[#0a0a0c] text-white flex flex-col items-center justify-center p-6 relative font-sans overflow-hidden">
      {/* Background Mesh Gradients */}
      <div className="fixed top-[-10%] left-[-10%] w-[50%] h-[50%] bg-pink-600/20 rounded-full blur-[120px] pointer-events-none z-0"></div>
      <div className="fixed bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-purple-600/20 rounded-full blur-[120px] pointer-events-none z-0"></div>
      <div className="fixed top-[20%] right-[10%] w-[30%] h-[30%] bg-cyan-600/10 rounded-full blur-[100px] pointer-events-none z-0"></div>

      <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-8 rounded-3xl shadow-2xl flex flex-col items-center relative z-10 w-full max-w-md">
        <h2 className="text-2xl font-black mb-8 text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-purple-400 text-center tracking-tighter">QR Code da Promoção</h2>
        
        <div className="p-4 bg-white border-4 border-pink-400 rounded-3xl shadow-lg shadow-pink-500/20">
          <QRCodeSVG value={url} size={256} fgColor="#000000" />
        </div>
        
        <p className="mt-8 text-slate-400 font-bold uppercase tracking-widest text-xs">Link direto</p>
        <a href={url} className="text-pink-300 hover:text-pink-200 break-all font-bold mt-2 text-center max-w-sm transition-colors border-b border-pink-300/30">
          {url}
        </a>

        <div className="mt-10 flex w-full flex-col gap-3">
          <button 
            onClick={() => window.print()}
            className="w-full py-4 bg-pink-500 rounded-2xl font-black text-sm text-white shadow-xl shadow-pink-500/20 hover:bg-pink-400 transition-all uppercase tracking-widest flex items-center justify-center"
          >
            Imprimir
          </button>
          <Link 
            to="/admin"
            className="w-full py-4 bg-white/5 border border-white/10 rounded-xl font-black text-sm text-white hover:bg-white/10 transition-all uppercase tracking-widest flex items-center justify-center"
          >
            Voltar ao Painel
          </Link>
        </div>
      </div>
    </div>
  );
}
