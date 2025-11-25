
import React, { useState, useEffect } from 'react';
import { AppState, AspectRatio, EditorMode, GeneratedImage, ModelType, Project, StylePreset, TemplateMode, ViewMode, TextLayer } from './types';
import { generateImage, editImage, enhancePrompt, describeImage } from './services/geminiService';
import { processRemoveBackground } from './services/imageUtils';
import { HistorySidebar } from './components/HistorySidebar';
import { SettingsPanel } from './components/SettingsPanel';
import { Workspace } from './components/Workspace';
import { LandingPage } from './components/LandingPage';
import { ShortcutsModal } from './components/ShortcutsModal';
import { Menu, AlertCircle, X, CheckCircle2, Home } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

const simpleId = () => Math.random().toString(36).substr(2, 9);

function App() {
  const [state, setState] = useState<AppState>(() => {
    try {
        const saved = localStorage.getItem('lumina-app-settings');
        const parsed = saved ? JSON.parse(saved) : {};
        
        // --- Migration Logic for Projects ---
        // If we have history but no projects, create a default one and assign history to it.
        let initialProjects = parsed.projects || [];
        let initialHistory = parsed.history || [];
        let initialProjectId = parsed.currentProjectId || null;

        if (initialProjects.length === 0) {
            const defaultProject: Project = {
                id: uuidv4(),
                name: "My First Project",
                createdAt: Date.now()
            };
            initialProjects = [defaultProject];
            initialProjectId = defaultProject.id;
            
            // Migrate existing images
            initialHistory = initialHistory.map((img: GeneratedImage) => ({
                ...img,
                projectId: img.projectId || defaultProject.id
            }));
        }
        // ------------------------------------

        return {
            currentImage: null,
            history: initialHistory,
            projects: initialProjects,
            currentProjectId: initialProjectId,
            isGenerating: false,
            isEnhancing: false,
            isRemovingBg: false,
            mode: EditorMode.GENERATE,
            template: TemplateMode.NONE,
            prompt: '',
            negativePrompt: '',
            selectedModel: ModelType.FLASH,
            selectedAspectRatio: AspectRatio.SQUARE,
            selectedStyle: StylePreset.NONE,
            resolution: '1K',
            seed: null,
            error: null,
            showFavoritesOnly: false,
            brushSize: parsed.brushSize || 40,
            brushOpacity: parsed.brushOpacity || 50,
            view: ViewMode.LANDING,
            referenceImage: null,
            filters: { brightness: 100, contrast: 100, saturation: 100, hue: 0, blur: 0, sepia: 0, grayscale: 0, grain: 0, vignette: 0, warmth: 0, pixelate: 0 },
            transforms: { flipH: false, flipV: false, rotate: 0 },
            showShortcuts: false,
            textLayers: [],
            paintColor: '#FF3B30',
            activeLayerId: null
        };
    } catch (e) {
        // Fallback default
        const defaultProjectId = uuidv4();
        return {
            currentImage: null,
            history: [],
            projects: [{ id: defaultProjectId, name: "My First Project", createdAt: Date.now() }],
            currentProjectId: defaultProjectId,
            isGenerating: false,
            isEnhancing: false,
            isRemovingBg: false,
            mode: EditorMode.GENERATE,
            template: TemplateMode.NONE,
            prompt: '',
            negativePrompt: '',
            selectedModel: ModelType.FLASH,
            selectedAspectRatio: AspectRatio.SQUARE,
            selectedStyle: StylePreset.NONE,
            resolution: '1K',
            seed: null,
            error: null,
            showFavoritesOnly: false,
            brushSize: 40,
            brushOpacity: 50,
            view: ViewMode.LANDING,
            referenceImage: null,
            filters: { brightness: 100, contrast: 100, saturation: 100, hue: 0, blur: 0, sepia: 0, grayscale: 0, grain: 0, vignette: 0, warmth: 0, pixelate: 0 },
            transforms: { flipH: false, flipV: false, rotate: 0 },
            showShortcuts: false,
            textLayers: [],
            paintColor: '#FF3B30',
            activeLayerId: null
        };
    }
  });

  const [maskData, setMaskData] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [toast, setToast] = useState<{msg: string, type: 'error' | 'success'} | null>(null);

  // Persistence
  useEffect(() => {
    const settings = { 
        brushSize: state.brushSize,
        brushOpacity: state.brushOpacity,
        projects: state.projects,
        currentProjectId: state.currentProjectId,
        history: state.history // Save history in main object for simplicity, though it can get large
    };
    localStorage.setItem('lumina-app-settings', JSON.stringify(settings));
  }, [state.brushSize, state.brushOpacity, state.projects, state.currentProjectId, state.history]);

  const showToast = (msg: string, type: 'error' | 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  // --- Project Management Functions ---

  const handleCreateProject = () => {
      const name = window.prompt("Enter Project Name:", "New Project");
      if (!name) return;

      const newProject: Project = {
          id: uuidv4(),
          name: name,
          createdAt: Date.now()
      };

      setState(prev => ({
          ...prev,
          projects: [...prev.projects, newProject],
          currentProjectId: newProject.id, // Switch to new project
          currentImage: null, // Clear workspace
          mode: EditorMode.GENERATE
      }));
      showToast(`Project "${name}" created`, 'success');
  };

  const handleDeleteProject = (id: string) => {
      if (state.projects.length <= 1) {
          showToast("Cannot delete the last project.", 'error');
          return;
      }
      
      const projectToDelete = state.projects.find(p => p.id === id);
      if(!window.confirm(`Are you sure you want to delete "${projectToDelete?.name}" and all its images?`)) return;

      setState(prev => {
          const newProjects = prev.projects.filter(p => p.id !== id);
          // Determine new active project if we deleted the current one
          const newActiveId = prev.currentProjectId === id ? newProjects[0].id : prev.currentProjectId;
          
          return {
              ...prev,
              projects: newProjects,
              currentProjectId: newActiveId,
              history: prev.history.filter(img => img.projectId !== id), // Cascade delete images
              currentImage: prev.currentImage?.projectId === id ? null : prev.currentImage
          };
      });
      showToast("Project deleted", 'success');
  };

  const handleSelectProject = (id: string) => {
      setState(prev => ({
          ...prev,
          currentProjectId: id,
          currentImage: null, // Clear workspace when switching context
          mode: EditorMode.GENERATE
      }));
      // On mobile, maybe close sidebar? 
      // setIsSidebarOpen(false);
  };

  // ------------------------------------

  const handleGenerate = async () => {
    if (!state.prompt.trim()) {
      showToast("Please enter a prompt description.", 'error');
      return;
    }

    if (!state.currentProjectId) {
        showToast("No active project selected.", 'error');
        return;
    }

    setState(prev => ({ ...prev, isGenerating: true }));

    try {
      let resultImageBase64 = '';

      if (state.mode === EditorMode.GENERATE) {
        resultImageBase64 = await generateImage(
          state.prompt, 
          state.selectedModel, 
          state.selectedAspectRatio,
          state.selectedStyle,
          state.negativePrompt,
          state.seed,
          state.resolution,
          state.referenceImage || undefined
        );
      } else {
        if (!state.currentImage) {
            showToast("Please upload or select an image to edit.", 'error');
            setState(prev => ({ ...prev, isGenerating: false }));
            return;
        }

        const isMasked = state.mode === EditorMode.INPAINT && maskData;
        
        resultImageBase64 = await editImage(
          state.currentImage.url, 
          state.prompt, 
          state.selectedModel,
          state.selectedStyle,
          state.negativePrompt,
          state.resolution,
          isMasked ? maskData : undefined 
        );
      }

      const newImage: GeneratedImage = {
        id: simpleId(),
        url: resultImageBase64,
        prompt: state.prompt,
        timestamp: Date.now(),
        model: state.selectedModel,
        aspectRatio: state.selectedAspectRatio,
        stylePreset: state.selectedStyle,
        negativePrompt: state.negativePrompt,
        seed: state.seed || undefined,
        resolution: state.resolution,
        isOriginal: false,
        isFavorite: false,
        projectId: state.currentProjectId // Assign to current project
      };

      setState(prev => ({
        ...prev,
        isGenerating: false,
        currentImage: newImage,
        history: [newImage, ...prev.history],
        filters: { brightness: 100, contrast: 100, saturation: 100, hue: 0, blur: 0, sepia: 0, grayscale: 0, grain: 0, vignette: 0, warmth: 0, pixelate: 0 },
        transforms: { flipH: false, flipV: false, rotate: 0 },
        textLayers: [] 
      }));
      
      showToast("Image generated successfully", 'success');

    } catch (err: any) {
      showToast(err.message || "An unexpected error occurred during generation.", 'error');
      setState(prev => ({ ...prev, isGenerating: false }));
    }
  };

  const handleEnhancePrompt = async () => {
    if (!state.prompt) return;
    setState(prev => ({ ...prev, isEnhancing: true }));
    try {
        const enhanced = await enhancePrompt(state.prompt);
        setState(prev => ({ ...prev, prompt: enhanced, isEnhancing: false }));
        showToast("Prompt enhanced with magic", 'success');
    } catch (e) {
        setState(prev => ({ ...prev, isEnhancing: false }));
        showToast("Failed to enhance prompt", 'error');
    }
  };

  const handleDescribeImage = async () => {
    if (!state.currentImage) return;
    setState(prev => ({ ...prev, isEnhancing: true })); 
    try {
        const desc = await describeImage(state.currentImage.url);
        setState(prev => ({ ...prev, prompt: desc, isEnhancing: false }));
        showToast("Image description generated", 'success');
    } catch (e) {
        setState(prev => ({ ...prev, isEnhancing: false }));
        showToast("Failed to describe image", 'error');
    }
  };

  const handleRemoveBackground = async () => {
    if (!state.currentImage || !state.currentProjectId) return;
    setState(prev => ({ ...prev, isRemovingBg: true }));
    
    try {
        const processedImageBase64 = await processRemoveBackground(state.currentImage.url);
        
        const newImage: GeneratedImage = {
            id: simpleId(),
            url: processedImageBase64,
            prompt: state.currentImage.prompt + " (BG Removed)",
            timestamp: Date.now(),
            model: "bg-removal",
            isOriginal: false,
            resolution: state.currentImage.resolution,
            projectId: state.currentProjectId
        };

        setState(prev => ({
            ...prev,
            isRemovingBg: false,
            currentImage: newImage,
            history: [newImage, ...prev.history]
        }));
        showToast("Background removed successfully", 'success');
    } catch (e: any) {
        console.error(e);
        setState(prev => ({ ...prev, isRemovingBg: false }));
        showToast("Failed to remove background. Try a simpler image.", 'error');
    }
  };

  const handleUpload = (base64: string) => {
    if (!state.currentProjectId) return;
    const newImage: GeneratedImage = {
        id: simpleId(),
        url: base64,
        prompt: "Original Upload",
        timestamp: Date.now(),
        model: "upload",
        isOriginal: true,
        projectId: state.currentProjectId
    };
    setState(prev => ({
        ...prev,
        currentImage: newImage,
        history: [newImage, ...prev.history],
        mode: EditorMode.EDIT, 
    }));
  };

  const handleHistorySelect = (img: GeneratedImage) => {
      setState(prev => ({
          ...prev,
          currentImage: img,
          mode: img.isOriginal ? EditorMode.EDIT : prev.mode,
          prompt: img.prompt,
          selectedAspectRatio: (img.aspectRatio as AspectRatio) || prev.selectedAspectRatio,
          selectedStyle: (img.stylePreset as StylePreset) || StylePreset.NONE,
          negativePrompt: img.negativePrompt || '',
          seed: img.seed || null,
          resolution: img.resolution || '1K',
          filters: { brightness: 100, contrast: 100, saturation: 100, hue: 0, blur: 0, sepia: 0, grayscale: 0, grain: 0, vignette: 0, warmth: 0, pixelate: 0 },
          transforms: { flipH: false, flipV: false, rotate: 0 },
          textLayers: []
      }));
      setMaskData(null); 
  };

  const handleToggleFavorite = (id: string) => {
      setState(prev => ({
          ...prev,
          history: prev.history.map(i => i.id === id ? { ...i, isFavorite: !i.isFavorite } : i)
      }));
  };

  const handleDelete = (id: string) => {
    setState(prev => {
        const newHistory = prev.history.filter(i => i.id !== id);
        return {
            ...prev,
            history: newHistory,
            currentImage: prev.currentImage?.id === id ? null : prev.currentImage
        };
    });
  };

  const handleDownload = () => {
    if (!state.currentImage) return;
    const link = document.createElement('a');
    link.href = state.currentImage.url;
    link.download = `lumina-${state.currentImage.id}-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleAddText = () => {
    if(!state.currentImage) return;
    const newLayer: TextLayer = {
        id: uuidv4(),
        text: "Double Tap to Edit",
        x: 150, 
        y: 150,
        color: state.paintColor,
        fontSize: 40,
        fontFamily: 'sans-serif'
    };
    setState(prev => ({
        ...prev,
        textLayers: [...prev.textLayers, newLayer],
        activeLayerId: newLayer.id
    }));
  };

  if (state.view === ViewMode.LANDING) {
      return <LandingPage onStart={() => setState(prev => ({ ...prev, view: ViewMode.APP }))} />;
  }

  // Find active project name
  const activeProject = state.projects.find(p => p.id === state.currentProjectId);

  return (
    <div className="flex h-screen w-full bg-zinc-950 text-zinc-100 overflow-hidden font-sans selection:bg-indigo-500/30">
      <ShortcutsModal isOpen={state.showShortcuts} onClose={() => setState(prev => ({ ...prev, showShortcuts: false }))} />

      {toast && (
          <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[60] animate-in fade-in slide-in-from-top-4 duration-300">
              <div className={`backdrop-blur-md px-4 py-3 rounded-lg shadow-2xl flex items-center gap-3 border ${
                  toast.type === 'error' ? 'bg-red-500/10 border-red-500/50 text-red-200' : 'bg-emerald-500/10 border-emerald-500/50 text-emerald-200'
              }`}>
                  {toast.type === 'error' ? <AlertCircle size={20} /> : <CheckCircle2 size={20} />}
                  <span className="text-sm font-medium">{toast.msg}</span>
                  <button onClick={() => setToast(null)} className="ml-2 hover:opacity-70"><X size={14}/></button>
              </div>
          </div>
      )}

      {isSidebarOpen && <div className="fixed inset-0 bg-black/50 z-30 md:hidden" onClick={() => setIsSidebarOpen(false)} />}

      <div className={`fixed inset-y-0 left-0 z-40 w-72 bg-zinc-950 border-r border-zinc-800 transform transition-transform duration-300 ease-in-out ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0 flex flex-col`}>
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between h-14 bg-zinc-950 flex-shrink-0">
            <button 
                onClick={() => setState(prev => ({...prev, view: ViewMode.LANDING}))}
                className="flex items-center gap-2 font-bold tracking-tight hover:opacity-80 transition-opacity"
            >
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center text-white text-xs shadow-lg shadow-indigo-500/20">
                    AI
                </div>
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-white to-zinc-400">Lumina Studio</span>
            </button>
            <button className="md:hidden text-zinc-500" onClick={() => setIsSidebarOpen(false)}><X size={20}/></button>
        </div>
        <HistorySidebar 
            history={state.history} 
            projects={state.projects}
            currentProjectId={state.currentProjectId}
            onSelectProject={handleSelectProject}
            onCreateProject={handleCreateProject}
            onDeleteProject={handleDeleteProject}
            onSelectImage={handleHistorySelect}
            onDeleteImage={handleDelete}
            onToggleFavorite={handleToggleFavorite}
            currentImageId={state.currentImage?.id}
        />
      </div>

      <div className="flex-1 flex flex-col h-full relative min-w-0">
        <header className="h-14 border-b border-zinc-800 flex items-center justify-between px-4 bg-zinc-950/80 backdrop-blur z-20">
             <div className="flex items-center gap-3">
                 <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 hover:bg-zinc-800 rounded-md text-zinc-400 md:hidden">
                    <Menu size={20} />
                 </button>
                 <div className="flex flex-col">
                    <h1 className="text-sm font-medium text-zinc-200 truncate max-w-[200px] md:max-w-md flex items-center gap-2">
                        <span className="opacity-50 text-xs font-mono border border-zinc-800 px-1.5 rounded">{activeProject?.name || 'Project'}</span>
                        {state.currentImage ? (state.currentImage.prompt || 'Untitled') : 'New Canvas'}
                    </h1>
                    {state.currentImage && (
                        <span className="text-[10px] text-zinc-500 font-mono uppercase">
                             {state.currentImage.model.replace('gemini-', '').replace('-preview', '')} • {state.currentImage.aspectRatio || '1:1'} • {state.currentImage.resolution || '1K'}
                        </span>
                    )}
                 </div>
             </div>
             
             <div className="flex items-center gap-2">
                 <button 
                    onClick={() => setState(prev => ({...prev, view: ViewMode.LANDING}))}
                    className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-full transition-colors"
                    title="Return to Home"
                 >
                    <Home size={18} />
                 </button>
                 <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-900 border border-zinc-800">
                    <span className={`w-1.5 h-1.5 rounded-full ${state.isGenerating || state.isEnhancing || state.isRemovingBg ? 'bg-indigo-500 animate-pulse' : 'bg-emerald-500'}`}></span>
                    <span className="text-[10px] font-medium text-zinc-400 uppercase tracking-wider">
                        {state.isGenerating ? 'Processing' : state.isEnhancing ? 'Thinking' : state.isRemovingBg ? 'Removing BG' : 'Ready'}
                    </span>
                 </div>
             </div>
        </header>

        <div className="flex-1 flex overflow-hidden flex-col md:flex-row">
            <Workspace 
                image={state.currentImage}
                onUpload={handleUpload}
                isGenerating={state.isGenerating || state.isRemovingBg}
                onClear={() => setState(prev => ({...prev, currentImage: null, mode: EditorMode.GENERATE}))}
                template={state.template}
                mode={state.mode}
                brushSize={state.brushSize}
                onMaskChange={setMaskData}
                brushOpacity={state.brushOpacity}
                filters={state.filters}
                setFilters={(f) => setState(prev => ({...prev, filters: f}))}
                transforms={state.transforms}
                setTransforms={(t) => setState(prev => ({...prev, transforms: t}))}
                textLayers={state.textLayers}
                setTextLayers={(layers) => setState(prev => ({...prev, textLayers: layers}))}
                activeLayerId={state.activeLayerId}
                setActiveLayerId={(id) => setState(prev => ({...prev, activeLayerId: id}))}
                paintColor={state.paintColor}
            />
            
            <div className="w-full md:w-80 border-l border-zinc-800 bg-zinc-950 z-30 h-1/3 md:h-full flex-shrink-0">
                <SettingsPanel 
                    prompt={state.prompt}
                    setPrompt={(val) => setState(prev => ({...prev, prompt: val}))}
                    negativePrompt={state.negativePrompt}
                    setNegativePrompt={(val) => setState(prev => ({...prev, negativePrompt: val}))}
                    onGenerate={handleGenerate}
                    isGenerating={state.isGenerating}
                    isEnhancing={state.isEnhancing}
                    isRemovingBg={state.isRemovingBg}
                    onRemoveBg={handleRemoveBackground}
                    onEnhance={handleEnhancePrompt}
                    onDescribe={handleDescribeImage}
                    mode={state.mode}
                    setMode={(m) => setState(prev => ({...prev, mode: m}))}
                    aspectRatio={state.selectedAspectRatio}
                    setAspectRatio={(ar) => setState(prev => ({...prev, selectedAspectRatio: ar}))}
                    model={state.selectedModel}
                    setModel={(m) => setState(prev => ({...prev, selectedModel: m}))}
                    stylePreset={state.selectedStyle}
                    setStylePreset={(s) => setState(prev => ({...prev, selectedStyle: s}))}
                    seed={state.seed}
                    setSeed={(s) => setState(prev => ({...prev, seed: s}))}
                    hasImage={!!state.currentImage}
                    onDownload={handleDownload}
                    template={state.template}
                    setTemplate={(t) => setState(prev => ({...prev, template: t}))}
                    resolution={state.resolution}
                    setResolution={(r) => setState(prev => ({...prev, resolution: r}))}
                    brushSize={state.brushSize}
                    setBrushSize={(s) => setState(prev => ({...prev, brushSize: s}))}
                    brushOpacity={state.brushOpacity}
                    setBrushOpacity={(o) => setState(prev => ({...prev, brushOpacity: o}))}
                    referenceImage={state.referenceImage}
                    setReferenceImage={(img) => setState(prev => ({...prev, referenceImage: img}))}
                    onShowShortcuts={() => setState(prev => ({...prev, showShortcuts: true}))}
                    onAddText={handleAddText}
                    paintColor={state.paintColor}
                    setPaintColor={(c) => setState(prev => ({...prev, paintColor: c}))}
                />
            </div>
        </div>
      </div>
    </div>
  );
}

export default App;
