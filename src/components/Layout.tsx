import { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Instagram, Twitter, Facebook, Globe, Loader2 } from 'lucide-react';

export default function Layout() {
  const [settings, setSettings] = useState<any>(null);

  const [isMobile, setIsMobile] = useState(true);

  useEffect(() => {
    fetch('/api/settings')
      .then(res => res.json())
      .then(data => setSettings(data));
    
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent));
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  if (!settings) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-pink-500" />
      </div>
    );
  }

  if (settings.mobileOnly && !isMobile) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#0a0a0c] text-white p-8 text-center">
        <div className="w-20 h-20 bg-pink-500/20 rounded-full flex items-center justify-center mb-6">
          <svg className="w-10 h-10 text-pink-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
        </div>
        <h1 className="text-2xl font-black mb-4 uppercase tracking-tighter italic">Acesso Restrito</h1>
        <p className="text-slate-400 max-w-xs mx-auto mb-8 font-medium">Esta promoção está disponível exclusivamente para dispositivos móveis.</p>
        <p className="text-pink-500 font-bold uppercase text-xs tracking-widest bg-pink-500/10 px-4 py-2 rounded-full border border-pink-500/20">Por favor, acesse pelo seu celular</p>
      </div>
    );
  }

  // Convert hex to rgba to apply opacity easily
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

  const getBgStyle = (type: string, img: string, grad: string, color: string) => {
    const style: React.CSSProperties = {
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundAttachment: 'fixed'
    };
    if (type === 'image' && img) {
      style.backgroundImage = `url(${img})`;
    } else if (type === 'gradient' && grad) {
      style.backgroundImage = grad;
    } else {
      style.backgroundColor = color || '#0a0a0c';
    }
    return style;
  };

  const pageBgStyle = getBgStyle(settings.bgType, settings.backgroundImage, settings.bgGradient, settings.primaryColor);
  const appBgStyle = getBgStyle(settings.appBgType, settings.appBgImage, settings.appBgGradient, 'transparent');

  const bgOverlayOpacity = typeof settings.bgOverlayOpacity === 'number' ? settings.bgOverlayOpacity / 100 : 0.8;
  const bgBlurAmount = typeof settings.bgBlurAmount === 'number' ? settings.bgBlurAmount : 10;

  return (
    <div className="min-h-screen relative font-sans flex flex-col items-center justify-center sm:p-4 text-white">
      {/* Fixed Page Background */}
      <div 
        className="fixed inset-0 z-0 pointer-events-none" 
        style={pageBgStyle}
      />

      {/* Background Mesh Gradients */}
      {(!settings.bgType || settings.bgType === 'solid') && (
        <>
          <div className="fixed top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full blur-[120px] pointer-events-none z-0" style={{ backgroundColor: getHexRgba(settings.primaryColor, 20) || 'rgba(236, 72, 153, 0.1)' }}></div>
          <div className="fixed bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full blur-[120px] pointer-events-none z-0" style={{ backgroundColor: getHexRgba(settings.primaryColor, 20) || 'rgba(168, 85, 247, 0.1)' }}></div>
        </>
      )}
      
      <div className="relative z-10 w-full max-w-md sm:rounded-[3rem] sm:border-[8px] border-[#2a2a35]/50 shadow-2xl flex flex-col overflow-hidden min-h-[100dvh] sm:min-h-[85vh]">
        <div className="flex-1 flex flex-col relative" style={{ ...appBgStyle, backgroundColor: `rgba(26, 26, 36, ${bgOverlayOpacity})`, backdropFilter: `blur(${bgBlurAmount}px)` }}>
          
          <div className="flex justify-center p-4">
            <div className="w-16 h-1 bg-white/20 rounded-full"></div>
          </div>

          <header className="px-6 flex flex-col items-center mt-2 gap-1 text-center">
            {/* Title Section */}
            {settings.titleType === 'image' && settings.titleImage ? (
                <img src={settings.titleImage} alt="Title Logo" className="h-16 max-w-full object-contain mb-1" />
            ) : (
                <h1 className="text-2xl font-black tracking-tighter" style={{ color: getHexRgba(settings.titleColor || '#ffffff', settings.titleOpacity ?? 100) }}>
                  {settings.titleText || 'STRAY KIDS'}
                </h1>
            )}

            {/* Subtitle Section */}
            {settings.subtitleType === 'image' && settings.subtitleImage ? (
                <img src={settings.subtitleImage} alt="Subtitle Logo" className="h-8 max-w-full object-contain" />
            ) : (
                <p className="text-sm font-bold uppercase tracking-widest" style={{ color: getHexRgba(settings.primaryColor || '#ec4899', 100) }}>
                  {settings.subtitleText || 'Excursão 2024'}
                </p>
            )}
          </header>

          <main className="flex-1 px-6 pb-6 mt-6">
            <Outlet context={{ settings }} />
          </main>

          {/* Social Links Footer */}
          <footer className="mt-auto flex justify-center gap-4 py-8">
            {settings.socialLinks?.instagram && (
              <a href={settings.socialLinks.instagram} target="_blank" rel="noreferrer" className="w-10 h-10 rounded-full bg-white/10 border border-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors">
                <Instagram className="w-5 h-5" />
              </a>
            )}
            {settings.socialLinks?.twitter && (
              <a href={settings.socialLinks.twitter} target="_blank" rel="noreferrer" className="w-10 h-10 rounded-full bg-white/10 border border-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors">
                <Twitter className="w-5 h-5" />
              </a>
            )}
            {settings.socialLinks?.facebook && (
              <a href={settings.socialLinks.facebook} target="_blank" rel="noreferrer" className="w-10 h-10 rounded-full bg-white/10 border border-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors">
                <Facebook className="w-5 h-5" />
              </a>
            )}
            {settings.socialLinks?.website && (
              <a href={settings.socialLinks.website} target="_blank" rel="noreferrer" className="w-10 h-10 rounded-full bg-white/10 border border-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors">
                <Globe className="w-5 h-5" />
              </a>
            )}
          </footer>
        </div>
      </div>
    </div>
  );
}
