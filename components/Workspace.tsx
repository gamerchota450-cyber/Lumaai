
import React, { useCallback, useRef, useState, useEffect } from 'react';
import { Upload, X, ZoomIn, ZoomOut, Move, Maximize2, Minimize2, Eye, Grid3X3, Sun, Moon, Monitor, Maximize, Paintbrush, Eraser, Trash2, Sliders, RotateCcw, Download, Activity, FlipHorizontal, FlipVertical, RotateCw, LayoutGrid, Palette, Droplet, Type, Smile, MousePointer2 } from 'lucide-react';
import { GeneratedImage, TemplateMode, EditorMode, ImageFilters, ImageTransforms, TextLayer } from '../types';
import { v4 as uuidv4 } from 'uuid';

interface WorkspaceProps {
  image: GeneratedImage | null;
  onUpload: (base64: string) => void;
  isGenerating: boolean;
  onClear: () => void;
  template: TemplateMode;
  mode: EditorMode;
  brushSize: number;
  onMaskChange: (maskBase64: string | null) => void;
  brushOpacity: number;
  filters: ImageFilters;
  setFilters: (f: ImageFilters) => void;
  transforms: ImageTransforms;
  setTransforms: (t: ImageTransforms) => void;
  // Creative Tools
  textLayers: TextLayer[];
  setTextLayers: (layers: TextLayer[]) => void;
  activeLayerId: string | null;
  setActiveLayerId: (id: string | null) => void;
  paintColor: string;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
}

export const Workspace: React.FC<WorkspaceProps> = ({ 
    image, 
    onUpload, 
    isGenerating, 
    onClear, 
    template, 
    mode, 
    brushSize,
    onMaskChange,
    brushOpacity,
    filters,
    setFilters,
    transforms,
    setTransforms,
    textLayers,
    setTextLayers,
    activeLayerId,
    setActiveLayerId,
    paintColor
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null); // Main paint/mask canvas
  const fxCanvasRef = useRef<HTMLCanvasElement>(null);
  const cursorRef = useRef<HTMLDivElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const requestRef = useRef<number | null>(null);
  
  // Smoothing Refs
  const targetPosRef = useRef<{x: number, y: number} | null>(null);
  
  // Workspace State with persistence
  const getSavedState = () => {
    try {
        const saved = localStorage.getItem('lumina-workspace-state');
        if (saved) return JSON.parse(saved);
    } catch (e) { console.error(e); }
    return null;
  };
  const savedState = getSavedState();

  const [zoom, setZoom] = useState(savedState?.zoom ?? 1);
  const [pan, setPan] = useState(savedState?.pan ?? { x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [bgMode, setBgMode] = useState<'checkered' | 'dark' | 'light'>(savedState?.bgMode ?? 'checkered');
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [showOriginal, setShowOriginal] = useState(false);
  
  // Visual Adjustments State - Sync with filters
  const [showAdjustments, setShowAdjustments] = useState(false);
  
  // New Features State
  const [guideMode, setGuideMode] = useState<'none' | 'thirds' | 'golden' | 'center'>('none');
  const [palette, setPalette] = useState<string[]>([]);
  const [showPalette, setShowPalette] = useState(false);
  
  // Brush State
  const [isDrawing, setIsDrawing] = useState(false);
  const [tool, setTool] = useState<'brush' | 'eraser'>(savedState?.tool ?? 'brush');
  const [brushSmoothing, setBrushSmoothing] = useState<boolean>(savedState?.brushSmoothing ?? false);
  
  const lastPos = useRef<{x: number, y: number} | null>(null);

  // Persistence Effect
  useEffect(() => {
    const timeoutId = setTimeout(() => {
        const stateToSave = {
            zoom, pan, bgMode, tool, brushSmoothing
        };
        localStorage.setItem('lumina-workspace-state', JSON.stringify(stateToSave));
    }, 500);
    return () => clearTimeout(timeoutId);
  }, [zoom, pan, bgMode, tool, brushSmoothing]);
  
  // Initialize canvas
  useEffect(() => {
    if (imageRef.current && canvasRef.current && fxCanvasRef.current) {
        const img = imageRef.current;
        const canvas = canvasRef.current;
        const fxCanvas = fxCanvasRef.current;

        if (canvas.width !== img.naturalWidth || canvas.height !== img.naturalHeight) {
            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;
            fxCanvas.width = img.naturalWidth;
            fxCanvas.height = img.naturalHeight;
            const ctx = canvas.getContext('2d');
            // If changing image, we might want to clear. 
            // BUT if we want paint to persist on Edit mode for same image session, we should check IDs.
            // For now, clear on mode switch or image change.
            // if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height); 
        }
    }
  }, [image?.id, mode]);

  // Extract Palette Logic
  const extractPalette = () => {
    if (!imageRef.current) return;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    canvas.width = imageRef.current.naturalWidth;
    canvas.height = imageRef.current.naturalHeight;
    ctx.drawImage(imageRef.current, 0, 0);
    
    // Simple quantization
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    const colorCounts: Record<string, number> = {};
    const step = 4 * 500; // Sample every 500th pixel for speed

    for (let i = 0; i < imageData.length; i += step) {
        const r = Math.round(imageData[i] / 32) * 32;
        const g = Math.round(imageData[i+1] / 32) * 32;
        const b = Math.round(imageData[i+2] / 32) * 32;
        const hex = `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
        colorCounts[hex] = (colorCounts[hex] || 0) + 1;
    }

    const sorted = Object.entries(colorCounts).sort((a, b) => b[1] - a[1]).slice(0, 5).map(x => x[0]);
    setPalette(sorted);
    setShowPalette(true);
  };

  // Animation Loop
  const animate = useCallback(() => {
    const canvas = fxCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (isDrawing && brushSmoothing && targetPosRef.current && lastPos.current) {
        const dx = targetPosRef.current.x - lastPos.current.x;
        const dy = targetPosRef.current.y - lastPos.current.y;
        if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5) {
            const easing = 0.2; 
            const newX = lastPos.current.x + dx * easing;
            const newY = lastPos.current.y + dy * easing;
            drawBrush(newX, newY, false);
        }
    }

    particlesRef.current.forEach((p) => {
        p.life--;
        p.x += p.vx;
        p.y += p.vy;
        p.size *= 0.92; 
        const opacity = Math.max(0, p.life / p.maxLife);
        ctx.fillStyle = p.color.replace('OPACITY', opacity.toString());
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
    });

    particlesRef.current = particlesRef.current.filter(p => p.life > 0);
    requestRef.current = requestAnimationFrame(animate);
  }, [mode, isDrawing, brushSmoothing, paintColor]);

  useEffect(() => {
    if (mode === EditorMode.INPAINT || mode === EditorMode.EDIT) {
        requestRef.current = requestAnimationFrame(animate);
    } else {
        if (requestRef.current) cancelAnimationFrame(requestRef.current);
    }
    return () => {
        if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [mode, animate]);

  useEffect(() => {
    if (image?.id) handleFitToScreen();
  }, [image?.id]);

  const handleFitToScreen = () => {
     if (containerRef.current && imageRef.current) {
         setZoom(0.8); 
         setPan({ x: 0, y: 0 });
         const container = containerRef.current.getBoundingClientRect();
         if (imageRef.current.naturalWidth) {
             const scaleX = (container.width * 0.9) / imageRef.current.naturalWidth;
             const scaleY = (container.height * 0.9) / imageRef.current.naturalHeight;
             const fitScale = Math.min(scaleX, scaleY, 1);
             setZoom(fitScale);
         }
     }
  };

  const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          onUpload(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  }, [onUpload]);

  const triggerUpload = () => fileInputRef.current?.click();

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          onUpload(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  }, [onUpload]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!image) return;
    
    // Check if clicking on text layer
    // (This is handled by onClick on the layer itself, but if we click canvas, deselect)
    if (e.target === canvasRef.current || e.target === imageRef.current) {
        setActiveLayerId(null);
    }

    if (mode === EditorMode.INPAINT || (mode === EditorMode.EDIT && tool === 'brush')) {
        if (!canvasRef.current) return;
        setIsDrawing(true);
        const { x, y } = getCanvasCoordinates(e);
        lastPos.current = { x, y };
        targetPosRef.current = { x, y };
        drawBrush(x, y, true);
    } else {
        setIsDragging(true);
        setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (cursorRef.current && (mode === EditorMode.INPAINT || (mode === EditorMode.EDIT && tool === 'brush'))) {
        cursorRef.current.style.transform = `translate(${e.clientX}px, ${e.clientY}px)`;
        cursorRef.current.style.opacity = '1';
    } else if (cursorRef.current) {
        cursorRef.current.style.opacity = '0';
    }

    if (isDrawing) {
        const { x, y } = getCanvasCoordinates(e);
        if (brushSmoothing) {
            targetPosRef.current = { x, y };
        } else {
            drawBrush(x, y, false);
        }
    } else if (isDragging) {
        setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
    }
  };

  const handleMouseUp = () => {
    if (isDrawing) {
        setIsDrawing(false);
        lastPos.current = null;
        targetPosRef.current = null;
        if (mode === EditorMode.INPAINT) exportMask();
    }
    setIsDragging(false);
  };

  const getCanvasCoordinates = (e: React.MouseEvent) => {
    if (!canvasRef.current) return { x: 0, y: 0 };
    const rect = canvasRef.current.getBoundingClientRect();
    const scaleX = canvasRef.current.width / rect.width;
    const scaleY = canvasRef.current.height / rect.height;
    return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY
    };
  };

  const drawBrush = (x: number, y: number, isDot: boolean) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      if (Math.random() > 0.3) { 
          const particleCount = isDot ? 5 : 2;
          const isEraser = tool === 'eraser';
          const pColor = mode === EditorMode.INPAINT 
            ? (isEraser ? 'rgba(255,255,255,OPACITY)' : 'rgba(255, 100, 100, OPACITY)')
            : (isEraser ? 'rgba(255,255,255,OPACITY)' : paintColor.replace(')', ',OPACITY)').replace('rgb', 'rgba').replace('#', '')); // Rough hex handle

          for(let i=0; i<particleCount; i++) {
              particlesRef.current.push({
                  x: x + (Math.random() - 0.5) * brushSize * 0.5,
                  y: y + (Math.random() - 0.5) * brushSize * 0.5,
                  vx: (Math.random() - 0.5) * 4,
                  vy: (Math.random() - 0.5) * 4,
                  life: 20 + Math.random() * 10,
                  maxLife: 30,
                  size: Math.random() * (brushSize / 4),
                  color: pColor.includes('#') ? hexToRgbA(paintColor, 'OPACITY') : pColor
              });
          }
      }

      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.lineWidth = brushSize;

      if (tool === 'eraser') {
          ctx.globalCompositeOperation = 'destination-out';
          ctx.strokeStyle = 'rgba(0,0,0,1)';
          ctx.shadowBlur = 0;
      } else {
          ctx.globalCompositeOperation = 'source-over';
          
          if (mode === EditorMode.INPAINT) {
            const alpha = brushOpacity / 100;
            const shadowAlpha = Math.min(1, alpha + 0.2);
            ctx.strokeStyle = `rgba(255, 0, 0, ${alpha})`;
            ctx.shadowBlur = brushSize / 2;
            ctx.shadowColor = `rgba(255, 50, 50, ${shadowAlpha})`;
          } else {
            // Paint Mode
            ctx.strokeStyle = paintColor;
            ctx.shadowBlur = brushSize / 4;
            ctx.shadowColor = paintColor;
          }
      }

      ctx.beginPath();
      if (isDot || !lastPos.current) {
         ctx.moveTo(x, y);
         ctx.lineTo(x + 0.01, y);
      } else {
         ctx.moveTo(lastPos.current.x, lastPos.current.y);
         ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.shadowBlur = 0;
      lastPos.current = { x, y };
  };

  const hexToRgbA = (hex: string, alpha: string) => {
    let c: any;
    if(/^#([A-Fa-f0-9]{3}){1,2}$/.test(hex)){
        c= hex.substring(1).split('');
        if(c.length== 3){
            c= [c[0], c[0], c[1], c[1], c[2], c[2]];
        }
        c= '0x'+c.join('');
        return 'rgba('+[(c>>16)&255, (c>>8)&255, c&255].join(',')+','+alpha+')';
    }
    return `rgba(255,255,255,${alpha})`;
  }

  const clearMask = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
      onMaskChange(null);
  };

  // Compose all layers and download
  const handleDownloadComposite = () => {
    if (!imageRef.current || !canvasRef.current) return;
    
    // Create temp canvas at full resolution
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = imageRef.current.naturalWidth;
    tempCanvas.height = imageRef.current.naturalHeight;
    const ctx = tempCanvas.getContext('2d');
    if (!ctx) return;

    // 1. Draw transformed base image with filters
    ctx.save();
    
    // Apply transforms
    ctx.translate(tempCanvas.width/2, tempCanvas.height/2);
    ctx.rotate(transforms.rotate * Math.PI / 180);
    ctx.scale(transforms.flipH ? -1 : 1, transforms.flipV ? -1 : 1);
    ctx.translate(-tempCanvas.width/2, -tempCanvas.height/2);
    
    // Apply Filters (Canvas API filter string)
    ctx.filter = `brightness(${filters.brightness}%) contrast(${filters.contrast}%) saturate(${filters.saturation}%) hue-rotate(${filters.hue}deg) blur(${filters.blur}px) sepia(${filters.sepia}%) grayscale(${filters.grayscale}%)`;
    
    ctx.drawImage(imageRef.current, 0, 0);
    ctx.restore();

    // 2. Draw Paint Layer (Canvas)
    // The paint canvas is already aligned, just draw it on top
    // Note: Canvas layer doesn't get transforms automatically if we drew on it *before* rotating view?
    // Actually, in our UI, the canvas sits inside the transform div. So visual match is good.
    // But data match? The paint coordinates are relative to un-transformed image.
    // So we need to apply transforms to paint layer too IF the paint was meant to be attached to image?
    // Typically paint is attached to image.
    ctx.save();
    ctx.translate(tempCanvas.width/2, tempCanvas.height/2);
    ctx.rotate(transforms.rotate * Math.PI / 180);
    ctx.scale(transforms.flipH ? -1 : 1, transforms.flipV ? -1 : 1);
    ctx.translate(-tempCanvas.width/2, -tempCanvas.height/2);
    ctx.drawImage(canvasRef.current, 0, 0);
    ctx.restore();

    // 3. Draw Text Layers
    // Text layers coords are relative to image.
    ctx.save();
    ctx.translate(tempCanvas.width/2, tempCanvas.height/2);
    ctx.rotate(transforms.rotate * Math.PI / 180);
    ctx.scale(transforms.flipH ? -1 : 1, transforms.flipV ? -1 : 1);
    ctx.translate(-tempCanvas.width/2, -tempCanvas.height/2);
    
    textLayers.forEach(layer => {
        ctx.font = `bold ${layer.fontSize}px sans-serif`;
        ctx.fillStyle = layer.color;
        ctx.strokeStyle = 'black';
        ctx.lineWidth = layer.fontSize / 15;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.strokeText(layer.text, layer.x, layer.y);
        ctx.fillText(layer.text, layer.x, layer.y);
    });
    ctx.restore();

    // 4. Post-Pro Effects (Vignette, Grain, etc) drawn on top
    ctx.save();
    // Vignette
    if (filters.vignette > 0) {
        const grad = ctx.createRadialGradient(tempCanvas.width/2, tempCanvas.height/2, tempCanvas.width*0.3, tempCanvas.width/2, tempCanvas.height/2, tempCanvas.width*0.8);
        grad.addColorStop(0, "rgba(0,0,0,0)");
        grad.addColorStop(1, `rgba(0,0,0,${filters.vignette/100})`);
        ctx.fillStyle = grad;
        ctx.fillRect(0,0,tempCanvas.width, tempCanvas.height);
    }
    // Warmth (Color overlay)
    if (filters.warmth !== 0) {
        ctx.fillStyle = filters.warmth > 0 ? `rgba(255, 160, 0, ${filters.warmth/200})` : `rgba(0, 100, 255, ${Math.abs(filters.warmth)/200})`;
        ctx.globalCompositeOperation = 'overlay';
        ctx.fillRect(0,0,tempCanvas.width, tempCanvas.height);
    }
    ctx.restore();

    const link = document.createElement('a');
    link.download = `lumina-comp-${Date.now()}.png`;
    link.href = tempCanvas.toDataURL('image/png');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportMask = () => {
      const sourceCanvas = canvasRef.current;
      if (!sourceCanvas) return;
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = sourceCanvas.width;
      tempCanvas.height = sourceCanvas.height;
      const ctx = tempCanvas.getContext('2d');
      if (!ctx) return;
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
      ctx.drawImage(sourceCanvas, 0, 0); 
      const imageData = ctx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
      const data = imageData.data;
      let hasPixels = false;
      for (let i = 0; i < data.length; i += 4) {
          if (data[i+3] > 10) {
              data[i] = 255; data[i+1] = 255; data[i+2] = 255; data[i+3] = 255; 
              hasPixels = true;
          } else {
              data[i] = 0; data[i+1] = 0; data[i+2] = 0; data[i+3] = 255; 
          }
      }
      ctx.putImageData(imageData, 0, 0);
      onMaskChange(hasPixels ? tempCanvas.toDataURL('image/png') : null);
  };

  const toggleFullScreen = () => {
     if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen();
        setIsFullScreen(true);
     } else {
        if (document.exitFullscreen) {
           document.exitFullscreen();
           setIsFullScreen(false);
        }
     }
  };

  const updateTextLayer = (id: string, updates: Partial<TextLayer>) => {
      setTextLayers(textLayers.map(l => l.id === id ? { ...l, ...updates } : l));
  };

  const deleteActiveLayer = () => {
      if(activeLayerId) setTextLayers(textLayers.filter(l => l.id !== activeLayerId));
      setActiveLayerId(null);
  };

  // Handle Dragging Text
  const handleTextDragStart = (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      setActiveLayerId(id);
      // Logic for dragging is handled by absolute positioning in DOM for preview
      // But we need to update the actual coordinates in state when done?
      // For simplicity, we can listen to mouse move on container.
  };

  const cycleGuide = () => {
      const guides: Array<'none' | 'thirds' | 'golden' | 'center'> = ['none', 'thirds', 'golden', 'center'];
      const next = guides[(guides.indexOf(guideMode) + 1) % guides.length];
      setGuideMode(next);
  };

  return (
    <div className={`relative flex-1 flex flex-col overflow-hidden bg-zinc-950 transition-colors ${isFullScreen ? 'fixed inset-0 z-50' : ''}`}>
      
      {/* Custom Cursor */}
      {(mode === EditorMode.INPAINT || (mode === EditorMode.EDIT && tool === 'brush')) && image && (
          <div 
            ref={cursorRef}
            className="fixed top-0 left-0 pointer-events-none z-[100] rounded-full border-2 border-white/50 shadow-[0_0_10px_rgba(255,255,255,0.5)] mix-blend-difference opacity-0 transition-opacity"
            style={{
                width: `${brushSize * zoom}px`,
                height: `${brushSize * zoom}px`,
                marginLeft: `-${(brushSize * zoom) / 2}px`,
                marginTop: `-${(brushSize * zoom) / 2}px`,
                backgroundColor: tool === 'eraser' ? 'rgba(255,255,255,0.1)' : (mode === EditorMode.INPAINT ? 'rgba(255,0,0,0.1)' : paintColor),
                transition: brushSmoothing ? 'width 0.1s, height 0.1s, transform 0.15s ease-out' : 'width 0.1s, height 0.1s'
            }}
          />
      )}

      {/* Toolbar */}
      {image && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1 p-1 bg-zinc-900/90 backdrop-blur border border-zinc-800 rounded-lg shadow-xl">
             
             {(mode === EditorMode.INPAINT || (mode === EditorMode.EDIT && tool === 'brush')) ? (
                 <>
                    <button onClick={() => setTool('brush')} className={`p-2 rounded ${tool === 'brush' ? 'bg-indigo-600 text-white' : 'text-zinc-400 hover:text-white'}`} title="Brush"><Paintbrush size={16}/></button>
                    <button onClick={() => setTool('eraser')} className={`p-2 rounded ${tool === 'eraser' ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-white'}`} title="Eraser"><Eraser size={16}/></button>
                    <div className="w-px h-4 bg-zinc-800 mx-1"></div>
                    <button onClick={() => setBrushSmoothing(!brushSmoothing)} className={`p-2 rounded transition-all ${brushSmoothing ? 'bg-indigo-500/20 text-indigo-400' : 'text-zinc-400 hover:text-white'}`} title="Brush Smoothing"><Activity size={16}/></button>
                    {mode === EditorMode.INPAINT && (
                        <>
                             <div className="w-px h-4 bg-zinc-800 mx-1"></div>
                             <button onClick={clearMask} className="p-2 hover:bg-red-500/20 text-red-400 rounded" title="Clear Mask"><Trash2 size={16}/></button>
                             <button onClick={exportMask} className="p-2 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded" title="Export Mask"><Download size={16}/></button>
                        </>
                    )}
                    {mode === EditorMode.EDIT && (
                         <button onClick={() => setTool(tool === 'brush' ? 'eraser' : 'brush')} className="p-2 hover:bg-zinc-800 text-zinc-400 rounded"><X size={16} /></button>
                    )}
                 </>
             ) : (
                <>
                    <button onClick={() => setZoom(Math.max(0.1, zoom - 0.1))} className="p-2 hover:bg-zinc-800 rounded text-zinc-400 hover:text-white"><ZoomOut size={16}/></button>
                    <span className="text-xs w-12 text-center font-mono text-zinc-500">{Math.round(zoom * 100)}%</span>
                    <button onClick={() => setZoom(Math.min(5, zoom + 0.1))} className="p-2 hover:bg-zinc-800 rounded text-zinc-400 hover:text-white"><ZoomIn size={16}/></button>
                    <div className="w-px h-4 bg-zinc-800 mx-1"></div>
                    
                    {/* View Controls */}
                    <button onClick={handleFitToScreen} className="p-2 hover:bg-zinc-800 rounded text-zinc-400 hover:text-white" title="Fit"><Maximize size={16}/></button>
                    <button onClick={() => setBgMode(b => b === 'checkered' ? 'dark' : b === 'dark' ? 'light' : 'checkered')} className="p-2 hover:bg-zinc-800 rounded text-zinc-400 hover:text-white" title="Background"><Grid3X3 size={16}/></button>
                    <div className="w-px h-4 bg-zinc-800 mx-1"></div>

                    {/* New Transform Controls */}
                    <button onClick={() => setTransforms({...transforms, flipH: !transforms.flipH})} className={`p-2 rounded ${transforms.flipH ? 'text-indigo-400 bg-indigo-500/10' : 'text-zinc-400 hover:text-white'}`} title="Flip Horizontal"><FlipHorizontal size={16}/></button>
                    <button onClick={() => setTransforms({...transforms, flipV: !transforms.flipV})} className={`p-2 rounded ${transforms.flipV ? 'text-indigo-400 bg-indigo-500/10' : 'text-zinc-400 hover:text-white'}`} title="Flip Vertical"><FlipVertical size={16}/></button>
                    <button onClick={() => setTransforms({...transforms, rotate: (transforms.rotate + 90) % 360})} className="p-2 hover:bg-zinc-800 rounded text-zinc-400 hover:text-white" title="Rotate"><RotateCw size={16}/></button>
                    <div className="w-px h-4 bg-zinc-800 mx-1"></div>

                    {/* New Features */}
                    <button onClick={cycleGuide} className={`p-2 rounded ${guideMode !== 'none' ? 'text-indigo-400' : 'text-zinc-400 hover:text-white'}`} title="Guides"><LayoutGrid size={16}/></button>
                    <button onClick={extractPalette} className="p-2 hover:bg-zinc-800 rounded text-zinc-400 hover:text-white" title="Extract Colors"><Palette size={16}/></button>
                    <div className="w-px h-4 bg-zinc-800 mx-1"></div>

                    <button onClick={() => setShowAdjustments(!showAdjustments)} className={`p-2 rounded ${showAdjustments ? 'bg-zinc-800 text-indigo-400' : 'text-zinc-400 hover:text-white'}`} title="Filters & Adjustments"><Sliders size={16}/></button>
                    {!image.isOriginal && (
                        <button onMouseDown={() => setShowOriginal(true)} onMouseUp={() => setShowOriginal(false)} onMouseLeave={() => setShowOriginal(false)} className="p-2 hover:bg-zinc-800 rounded text-zinc-400 hover:text-indigo-400" title="Hold to Compare"><Eye size={16}/></button>
                    )}
                    <button onClick={handleDownloadComposite} className="p-2 hover:bg-zinc-800 rounded text-emerald-400 hover:text-emerald-300" title="Download Composition"><Download size={16}/></button>
                </>
             )}
          </div>
      )}

      {/* Adjustments & Filters Popover */}
      {showAdjustments && image && mode !== EditorMode.INPAINT && (
          <div className="absolute top-16 left-1/2 -translate-x-1/2 z-30 bg-zinc-900/90 backdrop-blur border border-zinc-800 p-4 rounded-xl shadow-2xl w-72 animate-in slide-in-from-top-2 overflow-y-auto max-h-[80vh] custom-scrollbar">
              <div className="space-y-4">
                  <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-widest border-b border-zinc-800 pb-2">Basic</h4>
                  {/* Basic Sliders */}
                  <SliderControl label="Brightness" val={filters.brightness} set={(v) => setFilters({...filters, brightness: v})} min={50} max={150} unit="%" />
                  <SliderControl label="Contrast" val={filters.contrast} set={(v) => setFilters({...filters, contrast: v})} min={50} max={150} unit="%" />
                  <SliderControl label="Saturation" val={filters.saturation} set={(v) => setFilters({...filters, saturation: v})} min={0} max={200} unit="%" />
                  <SliderControl label="Hue" val={filters.hue} set={(v) => setFilters({...filters, hue: v})} min={-180} max={180} unit="°" />

                  <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-widest border-b border-zinc-800 pb-2 pt-2">Effects</h4>
                  {/* New Filter Sliders */}
                  <SliderControl label="Vignette" val={filters.vignette} set={(v) => setFilters({...filters, vignette: v})} min={0} max={100} unit="%" />
                  <SliderControl label="Warmth" val={filters.warmth} set={(v) => setFilters({...filters, warmth: v})} min={-100} max={100} unit="" />
                  <SliderControl label="Blur" val={filters.blur} set={(v) => setFilters({...filters, blur: v})} min={0} max={20} unit="px" />
                  <SliderControl label="Film Grain" val={filters.grain} set={(v) => setFilters({...filters, grain: v})} min={0} max={50} unit="%" />
                   <SliderControl label="Pixelate" val={filters.pixelate} set={(v) => setFilters({...filters, pixelate: v})} min={0} max={20} unit="px" />
                  
                  <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-widest border-b border-zinc-800 pb-2 pt-2">Style</h4>
                  <SliderControl label="Sepia" val={filters.sepia} set={(v) => setFilters({...filters, sepia: v})} min={0} max={100} unit="%" />
                  <SliderControl label="Grayscale" val={filters.grayscale} set={(v) => setFilters({...filters, grayscale: v})} min={0} max={100} unit="%" />

                  <button 
                    onClick={() => { 
                        setFilters({ brightness: 100, contrast: 100, saturation: 100, hue: 0, blur: 0, sepia: 0, grayscale: 0, grain: 0, vignette: 0, warmth: 0, pixelate: 0 });
                    }}
                    className="w-full py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-xs text-zinc-300 flex items-center justify-center gap-2"
                  >
                      <RotateCcw size={12} /> Reset All
                  </button>
              </div>
          </div>
      )}

      {/* Color Palette Modal */}
      {showPalette && palette.length > 0 && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-40 bg-zinc-900 border border-zinc-800 rounded-full p-2 flex gap-2 shadow-2xl animate-in slide-in-from-bottom-4">
              {palette.map((color) => (
                  <button 
                    key={color}
                    onClick={() => { navigator.clipboard.writeText(color); setShowPalette(false); }}
                    className="w-8 h-8 rounded-full border border-white/10 hover:scale-110 transition-transform relative group"
                    style={{ backgroundColor: color }}
                    title={color}
                  >
                      <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-black text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap">{color}</span>
                  </button>
              ))}
              <button onClick={() => setShowPalette(false)} className="w-8 h-8 rounded-full bg-zinc-800 text-zinc-400 hover:text-white flex items-center justify-center"><X size={14}/></button>
          </div>
      )}

      {/* Canvas Area */}
      <div 
        ref={containerRef}
        className={`flex-1 overflow-hidden relative flex items-center justify-center
            ${mode === EditorMode.INPAINT || tool === 'brush' ? 'cursor-none' : 'cursor-move'} 
            ${bgMode === 'checkered' ? "bg-[url('https://grainy-gradients.vercel.app/noise.svg')] bg-zinc-950" : ''}
            ${bgMode === 'dark' ? 'bg-zinc-950' : ''}
            ${bgMode === 'light' ? 'bg-zinc-100' : ''}
        `}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
      >
        {bgMode === 'checkered' && <div className="absolute inset-0 bg-grid-zinc-900/[0.2] bg-[length:32px_32px] pointer-events-none" />}
        
        {image ? (
          <div 
            className="transition-transform duration-75 ease-out shadow-2xl relative"
            style={{ 
                transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                maxWidth: '90%',
                maxHeight: '90%'
            }}
          >
             {/* Transform Container */}
             <div className="relative" style={{
                 transform: `rotate(${transforms.rotate}deg) scaleX(${transforms.flipH ? -1 : 1}) scaleY(${transforms.flipV ? -1 : 1})`,
                 transition: 'transform 0.3s'
             }}>
                 {/* Main Image with CSS Filters */}
                 <img 
                   ref={imageRef}
                   src={image.url} 
                   alt="Content" 
                   className={`block max-w-none shadow-2xl ${showOriginal ? 'opacity-50 blur-sm grayscale' : ''}`}
                   style={{ 
                       pointerEvents: 'none',
                       filter: `brightness(${filters.brightness}%) contrast(${filters.contrast}%) saturate(${filters.saturation}%) hue-rotate(${filters.hue}deg) blur(${filters.blur}px) sepia(${filters.sepia}%) grayscale(${filters.grayscale}%)`
                   }}
                   draggable={false}
                   onLoad={handleFitToScreen} 
                 />

                 {/* Pixelate Overlay */}
                 {filters.pixelate > 0 && (
                     <div className="absolute inset-0 pointer-events-none" style={{
                         backdropFilter: `blur(${filters.pixelate/2}px)`,
                         maskImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='10' height='10'><rect width='5' height='5' fill='black'/><rect x='5' y='5' width='5' height='5' fill='black'/></svg>")`,
                         maskSize: `${filters.pixelate * 4}px`,
                     }} />
                 )}
                 
                 {/* Grain Overlay */}
                 {filters.grain > 0 && (
                     <div className="absolute inset-0 pointer-events-none mix-blend-overlay" style={{
                         backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='${filters.grain/100}'/%3E%3C/svg%3E")`,
                         opacity: filters.grain / 100
                     }}/>
                 )}

                 {/* Warmth/Tint Overlay */}
                 {filters.warmth !== 0 && (
                     <div className="absolute inset-0 pointer-events-none mix-blend-overlay" style={{
                         backgroundColor: filters.warmth > 0 ? `rgba(255, 160, 0, ${filters.warmth/200})` : `rgba(0, 100, 255, ${Math.abs(filters.warmth)/200})`
                     }}/>
                 )}

                 {/* Vignette Overlay */}
                 {filters.vignette > 0 && (
                     <div className="absolute inset-0 pointer-events-none" style={{
                         background: `radial-gradient(circle, transparent ${100 - filters.vignette}%, rgba(0,0,0,${filters.vignette/100}) 100%)`
                     }}/>
                 )}
                 
                 {/* Paint Canvas (Attached to image transforms) */}
                 <canvas ref={canvasRef} className="absolute inset-0 w-full h-full opacity-90" style={{ mixBlendMode: mode === EditorMode.INPAINT ? 'normal' : 'normal' }} />
                 <canvas ref={fxCanvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />

                 {/* Text Layers */}
                 {textLayers.map(layer => (
                     <div
                        key={layer.id}
                        className={`absolute cursor-move select-none whitespace-nowrap group ${activeLayerId === layer.id ? 'ring-2 ring-indigo-500' : 'hover:ring-1 hover:ring-white/50'}`}
                        style={{
                            left: layer.x,
                            top: layer.y,
                            transform: 'translate(-50%, -50%)', // Center origin
                            color: layer.color,
                            fontSize: `${layer.fontSize}px`,
                            fontFamily: layer.fontFamily,
                            textShadow: '0 2px 4px rgba(0,0,0,0.5)',
                            fontWeight: 'bold'
                        }}
                        onMouseDown={(e) => handleTextDragStart(e, layer.id)}
                        onClick={(e) => { e.stopPropagation(); setActiveLayerId(layer.id); }}
                     >
                        {layer.text}
                        {activeLayerId === layer.id && (
                             <button 
                                onClick={(e) => { e.stopPropagation(); deleteActiveLayer(); }}
                                className="absolute -top-3 -right-3 bg-red-500 text-white rounded-full p-1 shadow-md scale-0 group-hover:scale-100 transition-transform"
                             >
                                 <X size={10} />
                             </button>
                        )}
                     </div>
                 ))}
             </div>
             
             {/* Guide Overlays (Outside transform to stay aligned to image frame) */}
             {guideMode !== 'none' && (
                 <div className="absolute inset-0 pointer-events-none border border-white/20">
                     {guideMode === 'thirds' && (
                         <>
                            <div className="absolute left-1/3 top-0 bottom-0 w-px bg-white/30 shadow-sm"></div>
                            <div className="absolute right-1/3 top-0 bottom-0 w-px bg-white/30 shadow-sm"></div>
                            <div className="absolute top-1/3 left-0 right-0 h-px bg-white/30 shadow-sm"></div>
                            <div className="absolute bottom-1/3 left-0 right-0 h-px bg-white/30 shadow-sm"></div>
                         </>
                     )}
                     {guideMode === 'center' && (
                         <>
                            <div className="absolute left-1/2 top-0 bottom-0 w-px bg-red-500/50"></div>
                            <div className="absolute top-1/2 left-0 right-0 h-px bg-red-500/50"></div>
                         </>
                     )}
                     {guideMode === 'golden' && (
                         <>
                            <div className="absolute left-[38.2%] top-0 bottom-0 w-px bg-yellow-500/30"></div>
                            <div className="absolute right-[38.2%] top-0 bottom-0 w-px bg-yellow-500/30"></div>
                            <div className="absolute top-[38.2%] left-0 right-0 h-px bg-yellow-500/30"></div>
                            <div className="absolute bottom-[38.2%] left-0 right-0 h-px bg-yellow-500/30"></div>
                         </>
                     )}
                 </div>
             )}
             
             {showOriginal && <div className="absolute inset-0 flex items-center justify-center text-white bg-black/50 font-bold backdrop-blur-sm">Original</div>}

             {template === TemplateMode.YOUTUBE && (
                 <div className="absolute inset-0 pointer-events-none border-2 border-red-500/50">
                    <div className="absolute top-2 left-2 text-[10px] bg-red-500 text-white px-1 rounded opacity-50">TV</div>
                    <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-[29.375%] border-y border-red-400/50 bg-red-500/5"></div>
                    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[60.39%] h-[29.375%] border-2 border-green-500/50 bg-green-500/10"></div>
                 </div>
             )}

             <div className="absolute top-2 right-2 flex gap-2">
                <button onClick={(e) => { e.stopPropagation(); onClear(); }} className="p-1.5 bg-black/60 backdrop-blur rounded-full text-white hover:bg-red-500 transition-colors shadow-lg pointer-events-auto"><X size={14} /></button>
             </div>
          </div>
        ) : (
          <div onClick={triggerUpload} className="w-full max-w-xl aspect-video border-2 border-dashed border-zinc-800 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:border-indigo-500/50 hover:bg-zinc-900/50 transition-all group p-8">
             <div className="p-5 rounded-full bg-zinc-900 group-hover:bg-zinc-800 transition-colors mb-6 border border-zinc-800 shadow-xl">
                <Upload className="w-10 h-10 text-zinc-500 group-hover:text-indigo-400 transition-colors" />
             </div>
             <h3 className="text-xl font-semibold text-zinc-200">Upload an image</h3>
             <p className="text-sm text-zinc-500 mt-2 text-center max-w-xs leading-relaxed">Drag and drop or click to browse.<br/><span className="text-zinc-600">Supports JPG, PNG, WEBP</span></p>
          </div>
        )}

        {isGenerating && (
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center z-30 cursor-wait">
                <div className="relative w-24 h-24">
                    <div className="absolute inset-0 border-t-4 border-indigo-500 rounded-full animate-spin"></div>
                    <div className="absolute inset-4 border-t-4 border-purple-500 rounded-full animate-spin reverse-spin opacity-70"></div>
                </div>
                <div className="mt-8 text-center space-y-1"><p className="text-indigo-200 font-medium tracking-widest uppercase text-sm animate-pulse">Generating</p></div>
            </div>
        )}
      </div>
      <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
    </div>
  );
};

const SliderControl = ({ label, val, set, min, max, unit }: { label: string, val: number, set: (v: number) => void, min: number, max: number, unit: string }) => (
    <div className="space-y-1">
        <div className="flex justify-between text-[10px] text-zinc-400 uppercase font-semibold tracking-wider">
            <span>{label}</span>
            <span>{val}{unit}</span>
        </div>
        <input type="range" min={min} max={max} value={val} onChange={(e) => set(Number(e.target.value))} className="w-full h-1.5 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-indigo-500" />
    </div>
);
