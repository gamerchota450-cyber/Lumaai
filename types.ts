
export interface GeneratedImage {
  id: string;
  url: string;
  prompt: string;
  timestamp: number;
  model: string;
  aspectRatio?: string;
  isOriginal?: boolean;
  stylePreset?: string;
  negativePrompt?: string;
  seed?: number;
  isFavorite?: boolean;
  resolution?: ImageResolution;
  projectId?: string; // New: Association with a project
}

export interface Project {
  id: string;
  name: string;
  createdAt: number;
}

export enum EditorMode {
  GENERATE = 'GENERATE',
  EDIT = 'EDIT',
  INPAINT = 'INPAINT',
}

export enum TemplateMode {
  NONE = 'NONE',
  YOUTUBE = 'YOUTUBE',
}

export enum ViewMode {
  LANDING = 'LANDING',
  APP = 'APP',
}

export enum AspectRatio {
  SQUARE = '1:1',
  PORTRAIT = '3:4',
  LANDSCAPE = '4:3',
  WIDE = '16:9',
  TALL = '9:16',
}

export enum ModelType {
  FLASH = 'gemini-2.5-flash-image',
  PRO = 'gemini-3-pro-image-preview',
}

export type ImageResolution = '1K' | '2K';

export enum StylePreset {
  NONE = 'None',
  CINEMATIC = 'Cinematic',
  ANIME = 'Anime',
  PHOTOGRAPHIC = 'Photographic',
  DIGITAL_ART = 'Digital Art',
  COMIC_BOOK = 'Comic Book',
  PIXEL_ART = 'Pixel Art',
  LOW_POLY = 'Low Poly',
  NEON_PUNK = 'Neon Punk'
}

export interface ImageFilters {
  blur: number; // px
  sepia: number; // %
  grayscale: number; // %
  grain: number; // opacity %
  brightness: number; // %
  contrast: number; // %
  saturation: number; // %
  hue: number; // deg
  vignette: number; // %
  warmth: number; // %
  pixelate: number; // 0-20
}

export interface ImageTransforms {
  flipH: boolean;
  flipV: boolean;
  rotate: number; // degrees
}

export interface TextLayer {
  id: string;
  text: string;
  x: number;
  y: number;
  color: string;
  fontSize: number;
  fontFamily: string;
  // Generic Layer props
  visible?: boolean;
  opacity?: number;
  blendMode?: string;
  width?: number;
  height?: number;
  rotation?: number;
  scale?: number;
  type?: 'text' | 'shape';
}

export interface AppState {
  currentImage: GeneratedImage | null;
  history: GeneratedImage[];
  projects: Project[]; // New: List of projects
  currentProjectId: string | null; // New: Active project
  isGenerating: boolean;
  isEnhancing: boolean;
  isRemovingBg: boolean; 
  mode: EditorMode;
  template: TemplateMode;
  prompt: string;
  negativePrompt: string;
  selectedModel: ModelType;
  selectedAspectRatio: AspectRatio;
  selectedStyle: StylePreset;
  resolution: ImageResolution;
  seed: number | null;
  error: string | null;
  showFavoritesOnly: boolean;
  brushSize: number;
  brushOpacity: number;
  view: ViewMode;
  // New Features
  referenceImage: string | null; 
  filters: ImageFilters;
  transforms: ImageTransforms;
  showShortcuts: boolean;
  // Creative Tools
  textLayers: TextLayer[];
  paintColor: string;
  activeLayerId: string | null;
}

// Augment window for AI Studio key selection
declare global {
  interface AIStudio {
    hasSelectedApiKey: () => Promise<boolean>;
    openSelectKey: () => Promise<void>;
  }

  interface Window {
    aistudio?: AIStudio;
  }
}
