import { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Instagram, Twitter, Facebook, Globe, Loader2 } from 'lucide-react';

export default function Layout() {
  const [settings, setSettings] = useState<any>(null);

  useEffect(() => {
    fetch('/api/settings')
      .then(res => res.json())
      .then(data => setSettings(data));
  }, []);

  if (!settings) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-pink-500" />
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

  const bgStyle: React.CSSProperties = {
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundAttachment: 'fixed'
  };

  if (settings.bgType === 'image' && settings.backgroundImage) {
    bgStyle.backgroundImage = `url(${settings.backgroundImage})`;
  } else if (settings.bgType === 'gradient' && settings.bgGradient) {
    bgStyle.backgroundImage = settings.bgGradient;
  } else {
    bgStyle.backgroundColor = settings.primaryColor || '#0a0a0c';
  }

  const bgOverlayOpacity = typeof settings.bgOverlayOpacity === 'number' ? settings.bgOverlayOpacity / 100 : 0.8;
  const bgBlurAmount = typeof settings.bgBlurAmount === 'number' ? settings.bgBlurAmount : 10;

  return (
    <div className="min-h-screen relative font-sans flex flex-col items-center justify-center sm:p-4 text-white">
      {/* Fixed Page Background */}
      <div 
        className="fixed inset-0 z-0 pointer-events-none" 
        style={bgStyle}
      />

      {/* Background Mesh Gradients */}
      {(!settings.bgType || settings.bgType === 'solid') && (
        <>
          <div className="fixed top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full blur-[120px] pointer-events-none z-0" style={{ backgroundColor: getHexRgba(settings.primaryColor, 30) || 'rgba(236, 72, 153, 0.2)' }}></div>
          <div className="fixed bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full blur-[120px] pointer-events-none z-0" style={{ backgroundColor: getHexRgba(settings.primaryColor, 30) || 'rgba(168, 85, 247, 0.2)' }}></div>
        </>
      )}
      
      <div className="relative z-10 w-full max-w-md sm:rounded-[3rem] sm:border-[8px] border-[#2a2a35]/50 shadow-2xl flex flex-col overflow-hidden min-h-[100dvh] sm:min-h-[85vh]">
        <div className="flex-1 flex flex-col relative" style={{ backgroundColor: `rgba(26, 26, 36, ${bgOverlayOpacity})`, backdropFilter: `blur(${bgBlurAmount}px)` }}>
          
          <div className="flex justify-center p-4">
            <div className="w-16 h-1 bg-white/20 rounded-full"></div>
          </div>

          <header className="px-6 flex justify-center mt-2">
            {settings.logoImage ? (
              <img src={settings.logoImage} alt="Logo" className="h-16 max-w-full object-contain drop-shadow-md" />
            ) : (
              <h1 className="text-2xl font-black text-center tracking-tighter" style={{ color: getHexRgba(settings.titleColor || '#ffffff', settings.titleOpacity ?? 100) }}>
                {settings.appTitle || (
                  <>STRAY KIDS<br/><span style={{ color: settings.primaryColor || '#ec4899' }} className="uppercase text-lg">Excursão 2024</span></>
                )}
              </h1>
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
