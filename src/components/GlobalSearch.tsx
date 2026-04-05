import { useState, useEffect, useRef, useMemo } from "react";
import { Search, Globe, Folder, Terminal, Command, X, ChevronRight } from "lucide-react";
import type { StoredRequest, Folder as FolderType, Environment, Collection } from "../types";

export type SearchItem = {
  id: string;
  type: "request" | "folder" | "environment";
  name: string;
  method?: string;
  collectionName?: string;
  folderName?: string;
  originalItem: any;
};

type Props = {
  isOpen: boolean;
  onClose: () => void;
  requests: Record<string, StoredRequest[]>;
  folders: Record<string, FolderType[]>;
  collections: Collection[];
  environments: Environment[];
  onSelectItem: (item: SearchItem) => void;
};

export function GlobalSearch({
  isOpen,
  onClose,
  requests,
  folders,
  collections,
  environments,
  onSelectItem,
}: Props) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Flatten searching items
  const allItems = useMemo(() => {
    const items: SearchItem[] = [];

    // Add Requests
    Object.entries(requests).forEach(([colId, reqs]) => {
      const collection = collections.find((c) => c.id === colId);
      reqs.forEach((req) => {
        const folder = req.folder_id ? folders[colId]?.find((f) => f.id === req.folder_id) : null;
        items.push({
          id: req.id,
          type: "request",
          name: req.name,
          method: req.method,
          collectionName: collection?.name,
          folderName: folder?.name,
          originalItem: req,
        });
      });
    });

    // Add Folders
    Object.entries(folders).forEach(([colId, folds]) => {
      const collection = collections.find((c) => c.id === colId);
      folds.forEach((f) => {
        items.push({
          id: f.id,
          type: "folder",
          name: f.name,
          collectionName: collection?.name,
          originalItem: f,
        });
      });
    });

    // Add Environments
    environments.forEach((env) => {
      items.push({
        id: env.id,
        type: "environment",
        name: env.name,
        originalItem: env,
      });
    });

    return items;
  }, [requests, folders, collections, environments]);

  // Filter items based on query
  const filteredItems = useMemo(() => {
    if (!query.trim()) return allItems.slice(0, 50); // Show some defaults
    const lowerQuery = query.toLowerCase();
    return allItems.filter((item) => {
      return (
        item.name.toLowerCase().includes(lowerQuery) ||
        item.collectionName?.toLowerCase().includes(lowerQuery) ||
        item.folderName?.toLowerCase().includes(lowerQuery)
      );
    }).slice(0, 100); // Limit results for performance
  }, [allItems, query]);

  // Handle keyboard navigation
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (!isOpen) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % filteredItems.length);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + filteredItems.length) % filteredItems.length);
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (filteredItems[selectedIndex]) {
          onSelectItem(filteredItems[selectedIndex]);
          onClose();
        }
      } else if (e.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, filteredItems, selectedIndex, onClose, onSelectItem]);

  // Auto-focus input
  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 10);
    }
  }, [isOpen]);

  // Scroll to active item
  useEffect(() => {
    const activeEl = scrollRef.current?.querySelector(`[data-index="${selectedIndex}"]`);
    if (activeEl) {
      activeEl.scrollIntoView({ block: "nearest" });
    }
  }, [selectedIndex]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-start justify-center pt-[15vh] px-4">
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" 
        onClick={onClose} 
      />
      
      <div className="relative w-full max-w-2xl bg-surface border border-border shadow-2xl rounded-xl flex flex-col overflow-hidden animate-in slide-in-from-top-4 duration-200">
        <div className="flex items-center px-4 h-14 border-b border-border bg-surface/50">
          <Search size={18} className="text-muted mr-3" />
          <input
            ref={inputRef}
            type="text"
            className="flex-1 bg-transparent border-none text-[15px] text-white placeholder-muted focus:outline-none focus:ring-0"
            placeholder="Search for requests, folders, or environments..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <div className="flex items-center space-x-1.5 px-2 py-1 rounded bg-background border border-border text-[10px] text-muted font-bold">
            <Command size={10} />
            <span>K</span>
          </div>
        </div>

        <div 
          ref={scrollRef}
          className="max-h-[400px] overflow-y-auto py-2 custom-scrollbar"
        >
          {filteredItems.length === 0 ? (
            <div className="px-6 py-10 text-center text-muted">
              <p className="text-[13px] font-medium">No results found for "{query}"</p>
            </div>
          ) : (
            filteredItems.map((item, index) => (
              <div
                key={`${item.type}-${item.id}`}
                data-index={index}
                className={`px-4 py-2.5 cursor-pointer flex items-center group transition-colors ${
                  selectedIndex === index 
                    ? "bg-primary/20 text-primary" 
                    : "text-gray-300 hover:bg-white/5"
                }`}
                onClick={() => {
                  onSelectItem(item);
                  onClose();
                }}
              >
                <div className={`w-8 h-8 rounded flex items-center justify-center shrink-0 mr-3 ${
                  selectedIndex === index ? "bg-primary/20" : "bg-surface-hover border border-border"
                }`}>
                  {item.type === "request" && <Terminal size={14} className={selectedIndex === index ? "text-primary" : "text-muted"} />}
                  {item.type === "folder" && <Folder size={14} className={selectedIndex === index ? "text-primary" : "text-muted"} />}
                  {item.type === "environment" && <Globe size={14} className={selectedIndex === index ? "text-primary" : "text-muted"} />}
                </div>

                <div className="flex-1 min-w-0 mr-3">
                  <div className="flex items-center">
                    <span className={`text-[13px] font-bold truncate ${selectedIndex === index ? "text-primary" : "text-gray-100"}`}>
                      {item.name}
                    </span>
                    {item.method && (
                      <span className={`ml-2 text-[10px] font-black px-1.5 py-0.5 rounded leading-none ${
                        item.method === 'GET' ? 'text-method-get bg-method-get/10' :
                        item.method === 'POST' ? 'text-method-post bg-method-post/10' :
                        item.method === 'PUT' ? 'text-method-put bg-method-put/10' :
                        item.method === 'DELETE' ? 'text-method-delete bg-method-delete/10' :
                        'text-primary bg-primary/10'
                      }`}>
                        {item.method}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center text-[10px] text-muted font-medium mt-0.5 truncate uppercase tracking-wider">
                    {item.collectionName && (
                      <>
                        <span>{item.collectionName}</span>
                        {item.folderName && <ChevronRight size={10} className="mx-1" />}
                      </>
                    )}
                    {item.folderName && <span>{item.folderName}</span>}
                    {item.type === "environment" && <span>Global Environment</span>}
                  </div>
                </div>

                {selectedIndex === index && (
                  <div className="text-[10px] font-black uppercase tracking-widest text-primary/60 border border-primary/30 px-1.5 py-0.5 rounded">
                    Open
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        <div className="flex items-center justify-between px-4 py-2 border-t border-border bg-background/30 shrink-0">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-1.5">
              <kbd className="px-1.5 py-0.5 min-w-[20px] text-[9px] font-mono font-bold bg-surface border border-border rounded shadow-sm text-gray-200">↑↓</kbd>
              <span className="text-[10px] text-muted font-bold uppercase tracking-wider">Navigate</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <kbd className="px-1.5 py-0.5 min-w-[20px] text-[9px] font-mono font-bold bg-surface border border-border rounded shadow-sm text-gray-200">↵</kbd>
              <span className="text-[10px] text-muted font-bold uppercase tracking-wider">Select</span>
            </div>
          </div>
          <div className="flex items-center space-x-1.5">
            <kbd className="px-1.5 py-0.5 min-w-[20px] text-[9px] font-mono font-bold bg-surface border border-border rounded shadow-sm text-gray-200">ESC</kbd>
            <span className="text-[10px] text-muted font-bold uppercase tracking-wider">Close</span>
          </div>
        </div>
      </div>
    </div>
  );
}
