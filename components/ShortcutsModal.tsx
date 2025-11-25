
import React from 'react';
import { X, Command, Move, ZoomIn, ZoomOut, Check } from 'lucide-react';

interface ShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ShortcutsModal: React.FC<ShortcutsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const shortcuts = [
    { keys: ['⌘', 'Enter'], desc: 'Generate / Render', icon: <Check size={14}/> },
    { keys: ['Space', 'Drag'], desc: 'Pan Canvas', icon: <Move size={14}/> },
    { keys: ['Wheel'], desc: 'Zoom In/Out', icon: null },
    { keys: ['Esc'], desc: 'Close / Clear', icon: <X size={14}/> },
  ];

  return (
    <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="p-4 border-b border-zinc-800 flex justify-between items-center bg-zinc-950/50">
           <h3 className="text-sm font-semibold text-zinc-200 flex items-center gap-2">
               <Command size={16} /> Keyboard Shortcuts
           </h3>
           <button onClick={onClose} className="text-zinc-500 hover:text-white"><X size={18} /></button>
        </div>
        <div className="p-2">
            {shortcuts.map((s, i) => (
                <div key={i} className="flex items-center justify-between p-3 hover:bg-zinc-800/50 rounded-lg group">
                    <span className="text-sm text-zinc-400 flex items-center gap-2">
                        {s.icon && <span className="opacity-50">{s.icon}</span>}
                        {s.desc}
                    </span>
                    <div className="flex gap-1">
                        {s.keys.map(k => (
                            <span key={k} className="px-2 py-1 rounded bg-zinc-800 border border-zinc-700 text-xs font-mono text-zinc-300 min-w-[24px] text-center shadow-sm">
                                {k}
                            </span>
                        ))}
                    </div>
                </div>
            ))}
        </div>
      </div>
    </div>
  );
};
