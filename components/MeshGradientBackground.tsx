import React from 'react';

export const MeshGradientBackground: React.FC = () => {
  return (
    <div className="fixed inset-0 z-0 overflow-hidden bg-white">
      {/* Mesh Gradient Shapes - Soft Reds for Light Mode */}
      <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-[#8B1D22] rounded-full mix-blend-multiply filter blur-[100px] opacity-15 animate-blob"></div>
      <div className="absolute top-[-5%] right-[-10%] w-[55%] h-[55%] bg-[#D7282F] rounded-full mix-blend-multiply filter blur-[110px] opacity-15 animate-blob animation-delay-2000"></div>
      <div className="absolute bottom-[-15%] left-[5%] w-[65%] h-[65%] bg-[#F26522] rounded-full mix-blend-multiply filter blur-[120px] opacity-15 animate-blob animation-delay-4000"></div>
      <div className="absolute bottom-[-5%] right-[-5%] w-[55%] h-[55%] bg-[#BE123C] rounded-full mix-blend-multiply filter blur-[100px] opacity-15 animate-blob"></div>
      
      {/* Subtle Noise Texture Overlay */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')]"></div>

      <style>{`
        @keyframes blob {
          0% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        .animate-blob {
          animation: blob 10s infinite alternate ease-in-out;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
      `}</style>
    </div>
  );
};
