
import React, { useRef } from 'react';
import { AspectRatio, EditorMode, ImageResolution, ModelType, StylePreset, TemplateMode } from '../types';
import { Button } from './Button';
import { 
  Wand2, Zap, LayoutTemplate, Image as ImageIcon, Sparkles, Download, 
  Dices, Copy, AlertCircle, Info, Hash, ScanEye, MonitorPlay, Maximize, Paintbrush, Droplets, ImagePlus, X, Keyboard, Scissors, Type, Palette, Smile
} from 'lucide-react';

interface SettingsPanelProps {
  prompt: string;
  setPrompt: (val: string) => void;
  negativePrompt: string;
  setNegativePrompt: (val: string) => void;
  onGenerate: () => void;
  isGenerating: boolean;
  isEnhancing: boolean;
  isRemovingBg: boolean;
  onRemoveBg: () => void;
  onEnhance: () => void;
  onDescribe: () => void;
  mode: EditorMode;
  setMode: (mode: EditorMode) => void;
  aspectRatio: AspectRatio;
  setAspectRatio: (ar: AspectRatio) => void;
  model: ModelType;
  setModel: (m: ModelType) => void;
  stylePreset: StylePreset;
  setStylePreset: (s: StylePreset) => void;
  seed: number | null;
  setSeed: (n: number | null) => void;
  template: TemplateMode;
  setTemplate: (t: TemplateMode) => void;
  resolution: ImageResolution;
  setResolution: (r: ImageResolution) => void;
  hasImage: boolean;
  onDownload: () => void;
  brushSize: number;
  setBrushSize: (s: number) => void;
  brushOpacity: number;
  setBrushOpacity: (o: number) => void;
  referenceImage: string | null;
  setReferenceImage: (img: string | null) => void;
  onShowShortcuts: () => void;
  // New Creative Props
  onAddText: () => void;
  paintColor: string;
  setPaintColor: (c: string) => void;
}

const RANDOM_PROMPTS = [
  "A futuristic city with neon lights reflecting in rain puddles, cyberpunk style",
  "A cute robot gardening on Mars, high detail, warm lighting",
  "Portrait of an astronaut made of crystalline shards, digital art",
  "A cozy cottage hidden in a giant mushroom forest, watercolor style",
  "A dragon made of clouds flying over a mountain range at sunset"
];

const COLORS = ['#FFFFFF', '#000000', '#FF3B30', '#FF9500', '#FFCC00', '#4CD964', '#5AC8FA', '#007AFF', '#5856D6', '#FF2D55'];

export const SettingsPanel: React.FC<SettingsPanelProps> = ({
  prompt,
  setPrompt,
  negativePrompt,
  setNegativePrompt,
  onGenerate,
  isGenerating,
  isEnhancing,
  isRemovingBg,
  onRemoveBg,
  onEnhance,
  onDescribe,
  mode,
  setMode,
  aspectRatio,
  setAspectRatio,
  model,
  setModel,
  stylePreset,
  setStylePreset,
  seed,
  setSeed,
  template,
  setTemplate,
  resolution,
  setResolution,
  hasImage,
  onDownload,
  brushSize,
  setBrushSize,
  brushOpacity,
  setBrushOpacity,
  referenceImage,
  setReferenceImage,
  onShowShortcuts,
  onAddText,
  paintColor,
  setPaintColor
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      onGenerate();
    }
  };

  const handleRandomPrompt = () => {
    const random = RANDOM_PROMPTS[Math.floor(Math.random() * RANDOM_PROMPTS.length)];
    setPrompt(random);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(prompt);
  };

  const toggleYouTubeTemplate = () => {
    if (template === TemplateMode.YOUTUBE) {
        setTemplate(TemplateMode.NONE);
    } else {
        setTemplate(TemplateMode.YOUTUBE);
        setAspectRatio(AspectRatio.WIDE); 
        setModel(ModelType.PRO); 
        setResolution('2K'); 
        setMode(EditorMode.GENERATE);
    }
  };

  const handleRefUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          const reader = new FileReader();
          reader.onloadend = () => {
              if (typeof reader.result === 'string') {
                  setReferenceImage(reader.result);
              }
          };
          reader.readAsDataURL(file);
      }
  };

  return (
    <div className="flex flex-col h-full bg-zinc-900/50 border-l border-zinc-800">
      
      {/* Mode Switcher */}
      <div className="p-4 border-b border-zinc-800">
        <div className="flex bg-zinc-950 p-1 rounded-lg border border-zinc-800">
          <button
            onClick={() => setMode(EditorMode.GENERATE)}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-xs font-medium transition-all ${
              mode === EditorMode.GENERATE 
                ? 'bg-zinc-800 text-white shadow-sm' 
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
            title="Generate New Image"
          >
            <Wand2 size={14} />
            Gen
          </button>
          <button
            onClick={() => setMode(EditorMode.EDIT)}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-xs font-medium transition-all ${
              mode === EditorMode.EDIT 
                ? 'bg-zinc-800 text-white shadow-sm' 
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
            title="Edit Global Image"
          >
            <ImageIcon size={14} />
            Edit
          </button>
          <button
            onClick={() => setMode(EditorMode.INPAINT)}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-xs font-medium transition-all ${
              mode === EditorMode.INPAINT 
                ? 'bg-zinc-800 text-white shadow-sm' 
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
            title="Inpaint with Brush"
          >
            <Paintbrush size={14} />
            Inpaint
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
        
        {/* Templates Section */}
        {mode === EditorMode.GENERATE && (
             <div className="space-y-2">
                <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
                    <LayoutTemplate size={12} /> Creator Tools
                </label>
                <button
                    onClick={toggleYouTubeTemplate}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-all ${
                        template === TemplateMode.YOUTUBE
                        ? 'bg-red-500/10 border-red-500/50 ring-1 ring-red-500/20'
                        : 'bg-zinc-950 border-zinc-800 hover:border-zinc-700'
                    }`}
                >
                    <div className={`p-2 rounded-md ${template === TemplateMode.YOUTUBE ? 'bg-red-500 text-white' : 'bg-zinc-800 text-zinc-400'}`}>
                        <MonitorPlay size={18} />
                    </div>
                    <div>
                        <div className={`text-sm font-medium ${template === TemplateMode.YOUTUBE ? 'text-red-200' : 'text-zinc-300'}`}>YouTube Banner Maker</div>
                        <div className="text-[10px] text-zinc-500">Auto-sets 16:9 2K & Safe Zones</div>
                    </div>
                </button>
            </div>
        )}

        {/* Smart Tools (Edit Mode) */}
        {mode === EditorMode.EDIT && hasImage && (
             <div className="space-y-4 animate-in slide-in-from-top-2">
                {/* Creative Toolbox */}
                <div className="space-y-2">
                     <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
                        <Palette size={12} /> Creative Toolbox
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                        <Button variant="secondary" onClick={onAddText} icon={<Type size={14}/>} className="text-xs justify-start h-9">Add Text</Button>
                        <Button variant="secondary" onClick={() => setPaintColor(paintColor)} icon={<Paintbrush size={14}/>} className="text-xs justify-start h-9 relative overflow-hidden">
                             <span className="relative z-10">Paint</span>
                             <span className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full border border-white/20" style={{background: paintColor}}></span>
                        </Button>
                    </div>
                    
                    {/* Color Picker */}
                    <div className="flex gap-1.5 flex-wrap pt-1">
                        {COLORS.map(c => (
                            <button 
                                key={c}
                                onClick={() => setPaintColor(c)}
                                className={`w-6 h-6 rounded-full border transition-transform hover:scale-110 ${paintColor === c ? 'border-white ring-1 ring-white/50 scale-110' : 'border-transparent'}`}
                                style={{backgroundColor: c}}
                            />
                        ))}
                         <input 
                            type="color" 
                            value={paintColor} 
                            onChange={(e) => setPaintColor(e.target.value)}
                            className="w-6 h-6 rounded-full p-0 border-0 overflow-hidden cursor-pointer" 
                        />
                    </div>
                </div>

                <div className="border-t border-zinc-800 pt-4 space-y-2">
                    <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
                        <Sparkles size={12} /> Smart Actions
                    </label>
                    <Button 
                        variant="secondary" 
                        className="w-full justify-start text-xs border-zinc-700 bg-zinc-800 hover:bg-zinc-700"
                        onClick={onRemoveBg}
                        isLoading={isRemovingBg}
                        disabled={isGenerating || isRemovingBg}
                        icon={<Scissors size={14} />}
                    >
                        {isRemovingBg ? 'Removing Background...' : 'Remove Background'}
                    </Button>
                </div>
            </div>
        )}

        {/* Info Box */}
        {(mode === EditorMode.EDIT || mode === EditorMode.INPAINT) && !hasImage && (
            <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg flex gap-3">
                <Info className="w-5 h-5 text-blue-400 shrink-0" />
                <div className="text-xs text-blue-200">
                    Upload an image to the workspace or select one from history to start {mode === EditorMode.INPAINT ? 'inpainting' : 'editing'}.
                </div>
            </div>
        )}

        {/* Reference Image (Img2Img) */}
        {mode === EditorMode.GENERATE && (
            <div className="space-y-2">
                <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider flex items-center justify-between">
                    <span className="flex items-center gap-2"><ImagePlus size={12} /> Reference Image</span>
                    {referenceImage && (
                        <button onClick={() => setReferenceImage(null)} className="text-zinc-500 hover:text-red-400"><X size={12}/></button>
                    )}
                </label>
                
                {!referenceImage ? (
                    <div 
                        onClick={() => fileInputRef.current?.click()}
                        className="border border-dashed border-zinc-800 rounded-lg p-3 text-center cursor-pointer hover:bg-zinc-800/50 hover:border-zinc-600 transition-all"
                    >
                        <span className="text-xs text-zinc-500">Upload image to guide generation</span>
                        <input 
                            type="file" 
                            ref={fileInputRef} 
                            className="hidden" 
                            accept="image/*" 
                            onChange={handleRefUpload}
                        />
                    </div>
                ) : (
                    <div className="relative rounded-lg overflow-hidden border border-zinc-800 h-24">
                        <img src={referenceImage} alt="Reference" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                            <span className="text-[10px] text-white bg-black/50 px-2 py-1 rounded">Using as Reference</span>
                        </div>
                    </div>
                )}
            </div>
        )}

        {/* Inpaint Brush Controls */}
        {mode === EditorMode.INPAINT && hasImage && (
            <div className="space-y-4 animate-in slide-in-from-top-2 p-3 rounded-lg border border-zinc-800 bg-zinc-950/50">
                 <div className="space-y-2">
                    <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider flex items-center justify-between">
                        <span className="flex items-center gap-2"><Paintbrush size={12} /> Brush Size</span>
                        <span className="text-zinc-500 font-mono">{brushSize}px</span>
                    </label>
                    <input 
                        type="range" 
                        min="5" 
                        max="100" 
                        value={brushSize} 
                        onChange={(e) => setBrushSize(parseInt(e.target.value))}
                        className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                    />
                 </div>
                 
                 <div className="space-y-2">
                    <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider flex items-center justify-between">
                        <span className="flex items-center gap-2"><Droplets size={12} /> Opacity</span>
                        <span className="text-zinc-500 font-mono">{brushOpacity}%</span>
                    </label>
                    <input 
                        type="range" 
                        min="10" 
                        max="100" 
                        value={brushOpacity} 
                        onChange={(e) => setBrushOpacity(parseInt(e.target.value))}
                        className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                    />
                 </div>
            </div>
        )}

        {/* Prompt Input */}
        <div className="space-y-2">
          <div className="flex justify-between items-end">
             <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                {mode === EditorMode.GENERATE ? "Prompt" : mode === EditorMode.INPAINT ? "Inpaint Instructions" : "Edit Instructions"}
             </label>
             <div className="flex gap-1">
                {(mode === EditorMode.EDIT || mode === EditorMode.INPAINT) && hasImage && (
                    <button 
                        onClick={onDescribe} 
                        disabled={isGenerating || isEnhancing || isRemovingBg}
                        className="p-1.5 text-zinc-400 hover:text-indigo-400 hover:bg-indigo-500/10 rounded transition-colors"
                        title="Describe Image (Reverse Prompt)"
                    >
                        <ScanEye size={14} />
                    </button>
                )}
                <button 
                    onClick={handleRandomPrompt} 
                    className="p-1.5 text-zinc-400 hover:text-indigo-400 hover:bg-indigo-500/10 rounded transition-colors"
                    title="Random Prompt"
                >
                    <Dices size={14} />
                </button>
                <button 
                    onClick={copyToClipboard}
                    className="p-1.5 text-zinc-400 hover:text-indigo-400 hover:bg-indigo-500/10 rounded transition-colors"
                    title="Copy to Clipboard"
                >
                    <Copy size={14} />
                </button>
             </div>
          </div>
          
          <div className="relative">
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={
                    mode === EditorMode.GENERATE ? "Describe your imagination..." : 
                    mode === EditorMode.INPAINT ? "What should appear in the masked area?" :
                    "What should change globally?"
                }
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-sm text-zinc-200 placeholder-zinc-600 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all resize-none min-h-[120px] pr-8"
                disabled={isGenerating || isRemovingBg}
              />
              <div className="absolute bottom-2 right-2 text-[10px] text-zinc-600 font-mono">
                  {prompt.length} chars
              </div>
          </div>
          
          <Button 
            variant="ghost" 
            className="w-full text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/10 h-8 text-xs border border-dashed border-indigo-500/30"
            onClick={onEnhance}
            disabled={!prompt || isEnhancing || isGenerating || isRemovingBg}
            isLoading={isEnhancing}
            icon={<Sparkles size={12} />}
          >
             Magic Enhance Prompt
          </Button>
        </div>

        {/* Negative Prompt */}
        <div className="space-y-2">
            <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
                <AlertCircle size={12} /> Negative Prompt
            </label>
            <input 
                type="text"
                value={negativePrompt}
                onChange={(e) => setNegativePrompt(e.target.value)}
                placeholder="blurry, bad quality, distorted..."
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 placeholder-zinc-700 focus:border-red-500/50 focus:ring-1 focus:ring-red-500/50 transition-all"
            />
        </div>

        {/* Style Presets */}
        <div className="space-y-2">
             <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                Style Preset
             </label>
             <div className="grid grid-cols-2 gap-2">
                {Object.values(StylePreset).map((style) => (
                    <button
                        key={style}
                        onClick={() => setStylePreset(style)}
                        className={`px-3 py-2 rounded-md text-xs text-left truncate transition-all border ${
                            stylePreset === style
                            ? 'bg-zinc-100 text-zinc-900 border-zinc-100 font-medium'
                            : 'bg-zinc-950 text-zinc-400 border-zinc-800 hover:border-zinc-700'
                        }`}
                    >
                        {style}
                    </button>
                ))}
             </div>
        </div>

        {/* Aspect Ratio */}
        {mode === EditorMode.GENERATE && (
          <div className="space-y-2">
             <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
                <LayoutTemplate size={12} /> Aspect Ratio
             </label>
             <div className="grid grid-cols-3 gap-2">
                {[
                    { label: '1:1', desc: 'Square / IG', val: AspectRatio.SQUARE },
                    { label: '9:16', desc: 'Story / Reel', val: AspectRatio.TALL },
                    { label: '16:9', desc: 'YouTube / Wide', val: AspectRatio.WIDE },
                    { label: '3:4', desc: 'Portrait', val: AspectRatio.PORTRAIT },
                    { label: '4:3', desc: 'Landscape', val: AspectRatio.LANDSCAPE },
                ].map((ar) => (
                    <button
                        key={ar.val}
                        onClick={() => {
                             setAspectRatio(ar.val);
                             if (ar.val !== AspectRatio.WIDE && template === TemplateMode.YOUTUBE) {
                                setTemplate(TemplateMode.NONE);
                             }
                        }}
                        className={`flex flex-col items-center justify-center py-2 px-1 rounded-lg border transition-all ${
                            aspectRatio === ar.val
                            ? 'bg-indigo-600 border-indigo-500 text-white shadow-md shadow-indigo-900/20'
                            : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'
                        }`}
                    >
                        <span className="text-xs font-bold font-mono">{ar.label}</span>
                        <span className="text-[9px] opacity-60 truncate w-full text-center">{ar.desc}</span>
                    </button>
                ))}
             </div>
          </div>
        )}

        {/* Advanced: Model & Seed */}
        <div className="space-y-4 pt-4 border-t border-zinc-800">
           
           <div className="space-y-2">
                <div className="flex justify-between items-center">
                    <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
                        <Hash size={12} /> Seed
                    </label>
                    <button 
                        onClick={() => setSeed(seed === null ? 123456 : null)}
                        className={`text-[10px] px-2 py-0.5 rounded-full border ${seed === null ? 'border-zinc-800 text-zinc-500' : 'border-indigo-500/30 text-indigo-400 bg-indigo-500/10'}`}
                    >
                        {seed === null ? "Random" : "Custom"}
                    </button>
                </div>
                {seed !== null && (
                    <input 
                        type="number"
                        value={seed}
                        onChange={(e) => setSeed(parseInt(e.target.value) || 0)}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded px-2 py-1 text-xs text-zinc-300 font-mono"
                    />
                )}
           </div>

           <div className="space-y-2">
               <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
                  <Sparkles size={12} /> Model
               </label>
               <div className="flex flex-col gap-2">
                  <button
                    onClick={() => {
                        setModel(ModelType.FLASH);
                        if (resolution === '2K' && template !== TemplateMode.YOUTUBE) {
                            setResolution('1K');
                        }
                    }}
                    className={`flex items-start gap-3 p-2.5 rounded-lg border text-left transition-all ${
                        model === ModelType.FLASH
                        ? 'bg-emerald-500/5 border-emerald-500/40'
                        : 'bg-zinc-950 border-zinc-800 hover:border-zinc-700'
                    }`}
                  >
                     <div className={`p-1 rounded ${model === ModelType.FLASH ? 'bg-emerald-500 text-white' : 'bg-zinc-800 text-zinc-500'}`}>
                        <Zap size={14} />
                     </div>
                     <div>
                        <div className={`text-xs font-medium ${model === ModelType.FLASH ? 'text-emerald-400' : 'text-zinc-300'}`}>Flash 2.5</div>
                        <div className="text-[10px] text-zinc-500">Ultra-fast. Great for iterations.</div>
                     </div>
                  </button>

                  <button
                    onClick={() => setModel(ModelType.PRO)}
                    className={`flex items-start gap-3 p-2.5 rounded-lg border text-left transition-all ${
                        model === ModelType.PRO
                        ? 'bg-purple-500/5 border-purple-500/40'
                        : 'bg-zinc-950 border-zinc-800 hover:border-zinc-700'
                    }`}
                  >
                     <div className={`p-1 rounded ${model === ModelType.PRO ? 'bg-purple-500 text-white' : 'bg-zinc-800 text-zinc-500'}`}>
                        <Sparkles size={14} />
                     </div>
                     <div>
                        <div className={`text-xs font-medium ${model === ModelType.PRO ? 'text-purple-400' : 'text-zinc-300'}`}>Pro 3.0</div>
                        <div className="text-[10px] text-zinc-500">Top quality. Photorealistic. High Res.</div>
                     </div>
                  </button>
               </div>
            </div>

            {model === ModelType.PRO && (
               <div className="space-y-2 animate-in slide-in-from-top-2">
                 <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
                    <Maximize size={12} /> Resolution
                 </label>
                 <div className="grid grid-cols-2 gap-2">
                     <button 
                        onClick={() => setResolution('1K')}
                        className={`py-1.5 px-3 rounded text-xs border transition-all ${resolution === '1K' ? 'bg-zinc-800 border-zinc-600 text-white' : 'bg-zinc-950 border-zinc-800 text-zinc-500'}`}
                     >
                        1K (Standard)
                     </button>
                     <button 
                        onClick={() => setResolution('2K')}
                        className={`py-1.5 px-3 rounded text-xs border transition-all ${resolution === '2K' ? 'bg-purple-500/20 border-purple-500/50 text-purple-200' : 'bg-zinc-950 border-zinc-800 text-zinc-500'}`}
                     >
                        2K (Upscale)
                     </button>
                 </div>
               </div>
            )}
        </div>

      </div>

      {/* Action Footer */}
      <div className="p-4 border-t border-zinc-800 bg-zinc-900/80 backdrop-blur space-y-3">
         {hasImage && (
             <Button variant="secondary" className="w-full" onClick={onDownload} icon={<Download size={16} />}>
                Download Comp
             </Button>
         )}
        <Button 
            className="w-full py-3 text-base shadow-indigo-900/20" 
            onClick={onGenerate} 
            isLoading={isGenerating}
            disabled={isGenerating || isRemovingBg || ((mode === EditorMode.EDIT || mode === EditorMode.INPAINT) && !hasImage)}
        >
            {mode === EditorMode.GENERATE ? 'Generate Art' : mode === EditorMode.INPAINT ? 'Regenerate Mask' : 'Render Changes'}
        </Button>
        <div className="flex items-center justify-between text-[10px] text-zinc-600">
            <span>CMD + ENTER to generate</span>
            <button onClick={onShowShortcuts} className="flex items-center gap-1 hover:text-zinc-300 transition-colors">
                <Keyboard size={12} /> Shortcuts
            </button>
        </div>
      </div>
    </div>
  );
};
