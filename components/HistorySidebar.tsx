
import React, { useState } from 'react';
import { GeneratedImage, ModelType, Project } from '../types';
import { Trash2, Clock, Heart, Filter, Sparkles, Zap, Image as ImageIcon, Folder, FolderPlus, MoreVertical, Plus } from 'lucide-react';

interface HistorySidebarProps {
  history: GeneratedImage[];
  projects: Project[];
  currentProjectId: string | null;
  onSelectProject: (id: string) => void;
  onCreateProject: () => void;
  onDeleteProject: (id: string) => void;
  onSelectImage: (image: GeneratedImage) => void;
  onDeleteImage: (id: string) => void;
  onToggleFavorite: (id: string) => void;
  currentImageId?: string;
}

export const HistorySidebar: React.FC<HistorySidebarProps> = ({ 
    history, 
    projects,
    currentProjectId,
    onSelectProject,
    onCreateProject,
    onDeleteProject,
    onSelectImage, 
    onDeleteImage, 
    onToggleFavorite, 
    currentImageId 
}) => {
  const [filterFavs, setFilterFavs] = useState(false);
  const [showProjectMenu, setShowProjectMenu] = useState<string | null>(null);

  // Filter images by current project
  const projectImages = history.filter(img => img.projectId === currentProjectId);
  const filteredHistory = filterFavs ? projectImages.filter(i => i.isFavorite) : projectImages;

  return (
    <div className="flex flex-col h-full bg-zinc-950">
      
      {/* Projects Section */}
      <div className="flex-shrink-0 p-4 border-b border-zinc-800 bg-zinc-950">
        <div className="flex items-center justify-between mb-3">
             <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider flex items-center gap-2">
                <Folder size={12} /> Projects
            </h3>
            <button 
                onClick={onCreateProject}
                className="p-1 hover:bg-indigo-500/20 hover:text-indigo-400 text-zinc-500 rounded transition-colors"
                title="New Project"
            >
                <Plus size={14} />
            </button>
        </div>
        
        <div className="space-y-1 max-h-40 overflow-y-auto custom-scrollbar -mx-2 px-2">
            {projects.map(project => (
                <div 
                    key={project.id}
                    onClick={() => onSelectProject(project.id)}
                    className={`group flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer text-sm transition-all ${
                        project.id === currentProjectId 
                        ? 'bg-zinc-800 text-white shadow-sm' 
                        : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200'
                    }`}
                >
                    <div className="flex items-center gap-2 truncate">
                        <Folder size={14} className={project.id === currentProjectId ? 'text-indigo-400' : 'text-zinc-600'} />
                        <span className="truncate max-w-[140px]">{project.name}</span>
                    </div>
                    
                    {/* Delete Project Button (only if more than 1 project) */}
                    {projects.length > 1 && (
                        <button
                            onClick={(e) => { e.stopPropagation(); onDeleteProject(project.id); }}
                            className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-400 text-zinc-600 transition-opacity"
                        >
                            <Trash2 size={12} />
                        </button>
                    )}
                </div>
            ))}
            
            {projects.length === 0 && (
                <button onClick={onCreateProject} className="w-full py-3 border border-dashed border-zinc-800 rounded-lg text-zinc-600 hover:text-zinc-400 text-xs flex items-center justify-center gap-2">
                    <FolderPlus size={14} /> Create first project
                </button>
            )}
        </div>
      </div>

      {/* Assets Header */}
      <div className="p-4 pb-2 border-b border-zinc-800 sticky top-0 bg-zinc-950 z-10 flex-shrink-0">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider flex items-center gap-2">
                <Clock size={12} /> Project Assets
            </h3>
            <div className="flex gap-1">
                 <span className="text-[10px] bg-zinc-900 text-zinc-500 px-1.5 py-0.5 rounded border border-zinc-800">{projectImages.length}</span>
                <button 
                    onClick={() => setFilterFavs(!filterFavs)}
                    className={`p-1 rounded transition-colors ${filterFavs ? 'bg-red-500/10 text-red-400' : 'text-zinc-500 hover:text-zinc-300'}`}
                    title="Filter Favorites"
                >
                    <Filter size={12} />
                </button>
            </div>
          </div>
      </div>

      {/* Assets List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-zinc-950/50">
        {projectImages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-zinc-600 text-center">
                <ImageIcon className="w-8 h-8 mb-2 opacity-20" />
                <p className="text-xs">This project is empty.</p>
                <p className="text-[10px] mt-1 opacity-50">Generate images to fill it up.</p>
            </div>
        ) : filteredHistory.length === 0 ? (
            <div className="text-center py-8 text-zinc-600 text-xs">No favorites in this project.</div>
        ) : (
            filteredHistory.map((item) => (
                <div 
                key={item.id} 
                className={`group relative rounded-xl overflow-hidden border transition-all ${
                    item.id === currentImageId 
                    ? 'border-indigo-500 ring-1 ring-indigo-500/50 shadow-lg shadow-indigo-900/20' 
                    : 'border-zinc-800 hover:border-zinc-600 hover:shadow-md'
                }`}
                >
                <button 
                    onClick={() => onSelectImage(item)}
                    className="w-full aspect-square bg-zinc-900 block relative"
                >
                    <img 
                    src={item.url} 
                    alt="Thumbnail" 
                    className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity" 
                    loading="lazy"
                    />
                    
                    {/* Badge Overlay */}
                    <div className="absolute top-2 left-2 flex gap-1">
                        {item.isOriginal && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-black/60 backdrop-blur text-zinc-300 border border-white/10">ORIG</span>
                        )}
                        {!item.isOriginal && (
                            <span className={`p-1 rounded bg-black/60 backdrop-blur border border-white/10 text-white ${item.model === ModelType.PRO ? 'text-purple-400' : 'text-emerald-400'}`}>
                                {item.model === ModelType.PRO ? <Sparkles size={8}/> : <Zap size={8}/>}
                            </span>
                        )}
                    </div>
                </button>
                
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col gap-1">
                    <button
                        onClick={(e) => { e.stopPropagation(); onToggleFavorite(item.id); }}
                        className={`p-1.5 rounded-md backdrop-blur transition-colors ${item.isFavorite ? 'bg-red-500 text-white' : 'bg-black/60 text-zinc-400 hover:text-red-400'}`}
                        title="Favorite"
                    >
                        <Heart size={12} fill={item.isFavorite ? "currentColor" : "none"} />
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); onDeleteImage(item.id); }}
                        className="p-1.5 rounded-md bg-black/60 text-zinc-400 hover:bg-red-500 hover:text-white transition-colors backdrop-blur"
                        title="Delete"
                    >
                        <Trash2 size={12} />
                    </button>
                </div>
                
                <div className="p-2.5 bg-zinc-900/80 border-t border-zinc-800 backdrop-blur-sm">
                    <div className="flex justify-between items-center mb-1">
                        <span className="text-[10px] text-zinc-500 font-mono">
                            {new Date(item.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </span>
                        {item.aspectRatio && <span className="text-[9px] px-1 rounded bg-zinc-800 text-zinc-500 border border-zinc-700">{item.aspectRatio}</span>}
                    </div>
                    {item.prompt && (
                        <p className="text-[11px] text-zinc-300 line-clamp-2 leading-tight" title={item.prompt}>
                            {item.prompt}
                        </p>
                    )}
                </div>
                </div>
            ))
        )}
      </div>
    </div>
  );
};
