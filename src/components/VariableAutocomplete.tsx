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
          className={`px-3 py-1.5 cursor-pointer flex items-center justify-between transition-colors border-l-2 ${
            index === selectedIndex 
              ? "bg-primary/10 text-primary border-primary" 
              : "text-gray-300 hover:bg-white/5 hover:text-white border-transparent"
          }`}
        >
          <div className="flex items-center space-x-2.5 min-w-0">
            <div className={`p-1 rounded flex items-center justify-center shrink-0 ${suggestion.isLocal ? "bg-primary/20 text-primary" : "bg-muted/20 text-muted"}`}>
              {suggestion.isLocal ? <Layers size={11} strokeWidth={2.5} /> : <Globe size={11} strokeWidth={2.5} />}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="font-bold text-[12px] truncate leading-tight">{suggestion.key}</span>
              <span className="text-[10px] text-muted font-bold uppercase tracking-wider tabular-nums truncate">
                {suggestion.isLocal ? "Environment" : "Global"}
              </span>
            </div>
          </div>
          <div className="flex flex-col items-end shrink-0 ml-4 max-w-[120px]">
            <span className={`text-[11px] truncate italic ${index === selectedIndex ? "text-primary/80" : "text-muted"}`}>
              {suggestion.value || "(empty)"}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
