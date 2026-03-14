import { X, Keyboard } from "lucide-react";
import { useEffect, useState } from "react";

type Props = {
  isOpen: boolean;
  onClose: () => void;
};

const SHORTCUTS = [
  {
    category: "Requests",
    items: [
      { label: "Send Request", keys: ["Ctrl", "Enter"] },
      { label: "Save Request", keys: ["Ctrl", "S"] },
      { label: "New Request", keys: ["Ctrl", "N"] },
      { label: "Toggle History", keys: ["Ctrl", "H"] },
    ]
  },
  {
    category: "Navigation",
    items: [
      { label: "Toggle Sidebar", keys: ["Ctrl", "\\"] },
      { label: "Focus Search", keys: ["Ctrl", "K"] },
    ]
  },
  {
    category: "Environment",
    items: [
      { label: "Toggle Environments", keys: ["Ctrl", "Shift", "E"] },
    ]
  },
  {
    category: "General",
    items: [
      { label: "Keyboard Shortcuts", keys: ["?"] },
    ]
  }
];

export function ShortcutsModal({ isOpen, onClose }: Props) {
  const [isMac, setIsMac] = useState(false);

  useEffect(() => {
    // Basic detection for Mac to display Cmd instead of Ctrl
    if (typeof window !== "undefined") {
      setIsMac(navigator.platform.toUpperCase().indexOf('MAC') >= 0);
    }
  }, []);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative w-full max-w-2xl bg-surface border border-border shadow-2xl rounded-xl animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-primary/10 rounded-lg text-primary">
              <Keyboard size={18} />
            </div>
            <h2 className="text-[16px] font-bold text-gray-100">Keyboard Shortcuts</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-surface-hover rounded-md text-muted hover:text-white transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[70vh] custom-scrollbar">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
            {SHORTCUTS.map((group) => (
              <div key={group.category} className="space-y-4">
                <h3 className="text-[12px] font-black uppercase tracking-widest text-primary/80">
                  {group.category}
                </h3>
                <div className="space-y-3">
                  {group.items.map((item, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <span className="text-[13px] text-gray-300">{item.label}</span>
                      <div className="flex items-center space-x-1.5 shrink-0">
                        {item.keys.map((key, j) => {
                          const displayKey = isMac && key === "Ctrl" ? "⌘" : key;
                          const finalKey = isMac && key === "Shift" ? "⇧" : displayKey;
                          
                          return (
                            <kbd
                              key={j}
                              className="min-w-[24px] px-1.5 h-6 flex items-center justify-center text-[11px] font-mono font-medium text-gray-300 bg-background border border-border rounded shadow-sm"
                            >
                              {finalKey}
                            </kbd>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
