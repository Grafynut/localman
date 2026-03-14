import { useRef, useEffect } from "react";
import { Layers, Globe } from "lucide-react";

type Suggestion = {
  key: string;
  value: string;
  isLocal: boolean;
};

type Props = {
  suggestions: Suggestion[];
  selectedIndex: number;
  onSelect: (suggestion: Suggestion) => void;
  position: { top: number; left: number };
};

export function VariableAutocomplete({ 
  suggestions, 
  selectedIndex, 
  onSelect, 
  position 
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (containerRef.current) {
      const selectedItem = containerRef.current.children[selectedIndex] as HTMLElement;
      if (selectedItem) {
        selectedItem.scrollIntoView({ block: "nearest" });
      }
    }
  }, [selectedIndex]);

  if (suggestions.length === 0) return null;

  return (
    <div 
      ref={containerRef}
      className="fixed z-[999] w-72 max-h-60 bg-surface border border-border rounded-lg shadow-2xl overflow-y-auto py-1 custom-scrollbar animate-in fade-in zoom-in-95 duration-100 backdrop-blur-xl"
      style={{ top: position.top, left: position.left }}
    >
      <div className="px-3 py-1.5 border-b border-border bg-background/50">
        <span className="text-[10px] font-black uppercase tracking-widest text-muted">Variables</span>
      </div>
      {suggestions.map((suggestion, index) => (
        <div
          key={suggestion.key}
          onMouseDown={(e) => {
            e.preventDefault(); // Prevent input blur
            onSelect(suggestion);
          }}
          className={`px-3 py-2 cursor-pointer flex items-center justify-between transition-colors ${
            index === selectedIndex 
              ? "bg-primary/20 text-primary" 
              : "text-gray-300 hover:bg-white/5 hover:text-white"
          }`}
        >
          <div className="flex items-center space-x-2 min-w-0">
            {suggestion.isLocal ? <Layers size={12} className="shrink-0" /> : <Globe size={12} className="shrink-0" />}
            <span className="font-bold text-[12px] truncate">{suggestion.key}</span>
          </div>
          <span className="text-[11px] text-muted truncate ml-4 italic">
            {suggestion.value}
          </span>
        </div>
      ))}
    </div>
  );
}
