import { useEffect, useRef, useState } from 'react';
import { useLocation, Navigate, useOutletContext } from 'react-router-dom';
import * as motion from "motion/react-client";

export default function Scratchcard() {
  const { settings } = useOutletContext<{ settings: any }>();
  const location = useLocation();
  const state = location.state as { wonPrize?: string };
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isScratched, setIsScratched] = useState(false);

  // If accessed directly without submitting the form
  if (!state || typeof state.wonPrize === 'undefined') {
    return <Navigate to="/" replace />;
  }

  const { wonPrize } = state;
  const isMoney = /^\d+$/.test(wonPrize);
  let resultMsg = "";
  if (wonPrize === "0") {
    resultMsg = settings.loseMessage || "Que pena! Você não ganhou desta vez.";
  } else {
    // We try to be smart about R$ prefixing
    let winTpl = settings.winMessage || "PARABÉNS! Você ganhou [PRIZE] em nossa excursão!";
    // If template has "R$ [PRIZE]" and we already added "R$" or if it doesn't have it and we should
    const displayPrize = isMoney ? `R$ ${wonPrize}` : wonPrize;
    
    // If the template already has R$ [PRIZE], we just replace [PRIZE]
    if (winTpl.includes('R$ [PRIZE]')) {
       resultMsg = winTpl.replace('[PRIZE]', wonPrize);
    } else {
       resultMsg = winTpl.replace('[PRIZE]', displayPrize);
    }
  }

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Fill with a 'scratchable' surface
    const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    gradient.addColorStop(0, '#f472b6'); // pink-400
    gradient.addColorStop(1, '#9333ea'); // purple-600
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Add some pattern or text on the cover
    ctx.font = 'bold 24px Inter, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🎁 RASPE AQUI 🎁', canvas.width / 2, canvas.height / 2);

    let isDrawing = false;
    let scratchedPixels = 0;
    const totalPixels = canvas.width * canvas.height;

    const getPos = (e: MouseEvent | TouchEvent) => {
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;

      let clientX, clientY;
      if (e instanceof MouseEvent) {
        clientX = e.clientX;
        clientY = e.clientY;
      } else {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      }

      return {
        x: (clientX - rect.left) * scaleX,
        y: (clientY - rect.top) * scaleY
      };
    };

    const scratch = (e: MouseEvent | TouchEvent) => {
      if (!isDrawing) return;
      e.preventDefault(); // prevent scrolling
      const { x, y } = getPos(e);

      ctx.globalCompositeOperation = 'destination-out';
      ctx.beginPath();
      ctx.arc(x, y, 20, 0, Math.PI * 2);
      ctx.fill();

      // Simple heuristic: after certain amount of moves, reveal
      scratchedPixels++;
      if (scratchedPixels > 100 && !isScratched) {
        // Wait, perfect pixel calculation is heavy, so we approximate based on drag events
        setIsScratched(true);
      }
    };

    const handleDown = (e: MouseEvent | TouchEvent) => {
      isDrawing = true;
      scratch(e);
    };

    const handleUp = () => {
      isDrawing = false;
    };

    canvas.addEventListener('mousedown', handleDown);
    canvas.addEventListener('mousemove', scratch);
    canvas.addEventListener('mouseup', handleUp);
    canvas.addEventListener('mouseleave', handleUp);

    canvas.addEventListener('touchstart', handleDown, { passive: false });
    canvas.addEventListener('touchmove', scratch, { passive: false });
    canvas.addEventListener('touchend', handleUp);

    return () => {
      canvas.removeEventListener('mousedown', handleDown);
      canvas.removeEventListener('mousemove', scratch);
      canvas.removeEventListener('mouseup', handleUp);
      canvas.removeEventListener('mouseleave', handleUp);

      canvas.removeEventListener('touchstart', handleDown);
      canvas.removeEventListener('touchmove', scratch);
      canvas.removeEventListener('touchend', handleUp);
    };
  }, [isScratched]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center py-6"
    >
      <h2 className="text-2xl font-bold text-center mb-6" style={{ color: settings.titleColor || '#ffffff', opacity: (settings.titleOpacity ?? 100) / 100 }}>Sorteio da Sorte</h2>
      
      <div className="relative w-full max-w-[300px] aspect-square bg-white/10 backdrop-blur-xl border-2 border-dashed border-white/20 rounded-3xl overflow-hidden shadow-2xl pointer-events-none select-none">
        {/* The underlying result */}
        <div className="absolute inset-0 flex items-center justify-center p-6 text-center z-0">
          <div>
            {wonPrize !== "0" ? (
              <motion.div initial={{ scale: 0.5 }} animate={isScratched ? { scale: 1.1 } : {}}>
                <span className="block text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-purple-400 mb-2">
                  {/^\d+$/.test(wonPrize) ? `R$ ${wonPrize}` : wonPrize}
                </span>
                <span className="font-bold tracking-widest uppercase text-[10px] block" style={{ color: settings.textColor || '#ffffff', opacity: (settings.textOpacity ?? 100) / 100 }}>
                  {/^\d+$/.test(wonPrize) ? 'de desconto' : 'Prêmio Especial'}
                </span>
              </motion.div>
            ) : (
              <span className="font-bold tracking-widest uppercase text-sm block" style={{ color: settings.textColor || '#94a3b8', opacity: (settings.textOpacity ?? 100) / 100 }}>Não foi dessa vez.</span>
            )}
          </div>
        </div>

        {/* The scratchable canvas */}
        <canvas 
          ref={canvasRef}
          width={300}
          height={300}
          className={`absolute inset-0 z-10 w-full h-full pointer-events-auto touch-none transition-opacity duration-1000 ${isScratched ? 'opacity-0' : 'opacity-100'}`}
        />
      </div>

      <motion.div 
        animate={{ opacity: isScratched ? 1 : 0, y: isScratched ? 0 : 20 }}
        className="mt-8 text-center p-6 bg-white/5 border border-white/10 rounded-2xl backdrop-blur-md"
      >
        <p className="text-lg font-bold" style={{ color: settings.textColor || '#ffffff', opacity: (settings.textOpacity ?? 100) / 100 }}>{resultMsg}</p>
        <p className="text-xs mt-3 uppercase tracking-widest font-bold" style={{ color: settings.primaryColor || '#f9a8d4' }}>Tire um print desta tela para comprovar</p>
      </motion.div>

    </motion.div>
  );
}
