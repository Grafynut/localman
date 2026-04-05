import { X, Palette, Check, Shield, Globe, Github } from "lucide-react";

export type ThemeId = "default" | "midnight-orange" | "ocean" | "forest" | "cyberpunk" | "light";

interface ThemeOption {
  id: ThemeId;
  name: string;
  description: string;
  colors: {
    primary: string;
    bg: string;
    surface: string;
  };
}

const THEME_OPTIONS: ThemeOption[] = [
  {
    id: "default",
    name: "Midnight Green",
    description: "The classic Localman look with emerald accents.",
    colors: { primary: "#50ad5c", bg: "#090909", surface: "#121212" },
  },
  {
    id: "midnight-orange",
    name: "Midnight Orange",
    description: "A warm, high-contrast dark theme with sunset orange.",
    colors: { primary: "#FF6A13", bg: "#090909", surface: "#121212" },
  },
  {
    id: "ocean",
    name: "Deep Ocean",
    description: "Calm navy depths with vibrant blue highlights.",
    colors: { primary: "#097BED", bg: "#0a111b", surface: "#141d2b" },
  },
  {
    id: "forest",
    name: "Forest Stealth",
    description: "Deep jungle greens for a focused, natural vibe.",
    colors: { primary: "#3d5a44", bg: "#121412", surface: "#1b1f1b" },
  },
  {
    id: "cyberpunk",
    name: "Cyberpunk Neon",
    description: "Retro-futuristic style with neon pink energy.",
    colors: { primary: "#FF00FF", bg: "#0d0221", surface: "#1a054d" },
  },
  {
    id: "light",
    name: "Soft Light",
    description: "Clean, professional light mode for bright environments.",
    colors: { primary: "#50ad5c", bg: "#f8f9fa", surface: "#ffffff" },
  },
];

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTheme: ThemeId;
  onThemeChange: (theme: ThemeId) => void;
}

export function SettingsModal({ isOpen, onClose, currentTheme, onThemeChange }: SettingsModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="bg-surface border border-border w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-surface-hover/30">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <Palette size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-100">Settings</h2>
              <p className="text-xs text-muted font-medium">Personalize your development environment</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-white/5 rounded-full text-muted hover:text-gray-200 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar space-y-8">
          {/* Theme Section */}
          <section className="space-y-4">
            <div className="flex items-center space-x-2 text-primary">
              <Palette size={16} />
              <h3 className="text-[11px] font-black uppercase tracking-widest">Interface Appearance</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {THEME_OPTIONS.map((theme) => (
                <button
                  key={theme.id}
                  onClick={() => onThemeChange(theme.id)}
                  className={`group relative flex flex-col text-left p-4 rounded-xl border-2 transition-all hover:scale-[1.02] active:scale-[0.98] ${
                    currentTheme === theme.id 
                      ? "border-primary bg-primary/5 shadow-lg shadow-primary/10" 
                      : "border-border bg-surface-hover/20 hover:border-border-hover hover:bg-surface-hover/40"
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className={`text-sm font-bold ${currentTheme === theme.id ? "text-primary" : "text-gray-100"}`}>
                      {theme.name}
                    </span>
                    {currentTheme === theme.id && (
                      <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center text-white">
                        <Check size={12} strokeWidth={3} />
                      </div>
                    )}
                  </div>
                  
                  {/* Theme Preview Box */}
                  <div className="w-full h-12 rounded-lg mb-3 flex overflow-hidden border border-border/50">
                    <div style={{ backgroundColor: theme.colors.bg }} className="flex-1" />
                    <div style={{ backgroundColor: theme.colors.surface }} className="flex-2 border-x border-border/20" />
                    <div style={{ backgroundColor: theme.colors.primary }} className="w-1/4" />
                  </div>
                  
                  <p className="text-[11px] text-muted leading-relaxed font-medium">
                    {theme.description}
                  </p>
                </button>
              ))}
            </div>
          </section>

          {/* Dummy Sections for future settings */}
          <section className="space-y-4 opacity-60">
            <div className="flex items-center space-x-2 text-muted">
              <Shield size={16} />
              <h3 className="text-[11px] font-black uppercase tracking-widest">Privacy & Security</h3>
            </div>
            <div className="p-4 rounded-xl border border-border bg-surface-hover/10 flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-sm font-bold text-gray-400">Local-only Mode</span>
                <p className="text-[11px] text-muted">All data remains on your machine.</p>
              </div>
              <div className="w-10 h-5 rounded-full bg-primary/20 relative cursor-not-allowed">
                <div className="absolute right-1 top-1 w-3 h-3 rounded-full bg-primary"></div>
              </div>
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border bg-surface-hover/30 flex items-center justify-between">
          <div className="flex items-center space-x-4 text-muted">
             <div className="flex items-center space-x-1 hover:text-gray-200 cursor-pointer transition-colors text-xs font-bold">
               <Github size={14} />
               <span>GitHub</span>
             </div>
             <div className="flex items-center space-x-1 hover:text-gray-200 cursor-pointer transition-colors text-xs font-bold">
               <Globe size={14} />
               <span>Website</span>
             </div>
          </div>
          <p className="text-[11px] font-bold text-muted">Version 0.1.6 (Stable)</p>
        </div>
      </div>
    </div>
  );
}
