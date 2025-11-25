import React from 'react';
import { Sparkles, Wand2, MonitorPlay, Zap, Image as ImageIcon, Paintbrush, ArrowRight, Layers, Maximize } from 'lucide-react';

interface LandingPageProps {
  onStart: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onStart }) => {
  return (
    <div className="min-h-screen bg-zinc-950 text-white selection:bg-indigo-500/30 overflow-y-auto custom-scrollbar">
      
      {/* Background Grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none"></div>
      <div className="absolute inset-0 bg-gradient-to-b from-zinc-950 via-transparent to-zinc-950 pointer-events-none"></div>

      {/* Hero Section */}
      <div className="relative z-10 flex flex-col items-center justify-center pt-32 pb-20 px-4 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-medium mb-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <Sparkles size={12} />
          <span>Powered by Gemini 2.5 & 3.0 Pro</span>
        </div>
        
        <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6 bg-clip-text text-transparent bg-gradient-to-b from-white via-white to-zinc-500 animate-in fade-in slide-in-from-bottom-5 duration-700 delay-100">
          Lumina AI Studio
        </h1>
        
        <p className="text-lg md:text-xl text-zinc-400 max-w-2xl mx-auto mb-10 leading-relaxed animate-in fade-in slide-in-from-bottom-6 duration-700 delay-200">
          The professional AI image editor. Generate photorealistic art, inpaint details, and create YouTube banners with precision control.
        </p>
        
        <button 
          onClick={onStart}
          className="group relative inline-flex items-center gap-3 px-8 py-4 bg-white text-zinc-950 rounded-full font-bold text-lg transition-all hover:scale-105 hover:shadow-[0_0_40px_-10px_rgba(255,255,255,0.3)] animate-in fade-in slide-in-from-bottom-7 duration-700 delay-300"
        >
          Start Creating
          <ArrowRight className="group-hover:translate-x-1 transition-transform" />
          <div className="absolute inset-0 rounded-full ring-2 ring-white/20 group-hover:ring-white/40 animate-pulse"></div>
        </button>

        {/* Hero Image / Placeholder */}
        <div className="mt-20 relative w-full max-w-5xl aspect-video rounded-xl border border-zinc-800 bg-zinc-900/50 shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-1000 delay-300 group">
             <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500/10 via-purple-500/5 to-transparent"></div>
             <div className="absolute inset-0 flex items-center justify-center">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 p-8 opacity-50 blur-sm group-hover:blur-0 transition-all duration-700 scale-105 group-hover:scale-100">
                    <div className="aspect-square rounded-lg bg-zinc-800"></div>
                    <div className="aspect-square rounded-lg bg-zinc-800 md:block hidden"></div>
                    <div className="aspect-square rounded-lg bg-zinc-800"></div>
                </div>
                <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-zinc-500 font-mono text-sm tracking-widest uppercase">Interactive Workspace Preview</span>
                </div>
             </div>
        </div>
      </div>

      {/* Features Grid */}
      <div className="relative z-10 max-w-6xl mx-auto px-4 py-20">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <FeatureCard 
                icon={<Wand2 className="text-indigo-400" />}
                title="Generative Art"
                desc="Create stunning visuals from text prompts using the latest Gemini Flash 2.5 and Pro 3.0 models."
            />
            <FeatureCard 
                icon={<Paintbrush className="text-pink-400" />}
                title="Magic Inpainting"
                desc="Use the precision brush to edit specific areas of an image. Add or remove objects seamlessly."
            />
            <FeatureCard 
                icon={<MonitorPlay className="text-red-400" />}
                title="YouTube Banners"
                desc="Dedicated mode with TV, Desktop, and Mobile safe zones. Auto-upscales to 2K resolution."
            />
            <FeatureCard 
                icon={<Maximize className="text-emerald-400" />}
                title="High Res & Upscale"
                desc="Generate crystal clear 2K images with Pro models. Perfect for professional use."
            />
            <FeatureCard 
                icon={<ImageIcon className="text-blue-400" />}
                title="Smart Editing"
                desc="Adjust brightness, contrast, hue, and saturation. Describe images to generate prompts."
            />
            <FeatureCard 
                icon={<Layers className="text-amber-400" />}
                title="History & Assets"
                desc="Auto-saves your work. Organize favorites, copy prompts, and remix previous generations."
            />
        </div>
      </div>

      {/* Footer */}
      <footer className="relative z-10 border-t border-zinc-900 bg-zinc-950 py-10 text-center text-zinc-600 text-sm">
        <p>&copy; {new Date().getFullYear()} Lumina AI Studio. All rights reserved.</p>
        <p className="mt-2 opacity-50">Powered by Google Gemini API</p>
      </footer>
    </div>
  );
};

const FeatureCard = ({ icon, title, desc }: { icon: React.ReactNode, title: string, desc: string }) => (
    <div className="p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900 transition-all group">
        <div className="w-12 h-12 rounded-xl bg-zinc-800 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            {icon}
        </div>
        <h3 className="text-xl font-bold text-zinc-200 mb-2">{title}</h3>
        <p className="text-zinc-400 text-sm leading-relaxed">{desc}</p>
    </div>
);