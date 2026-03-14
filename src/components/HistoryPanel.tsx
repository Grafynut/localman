import { useState, useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { History, Search, Trash2, X, RotateCcw, ChevronDown } from "lucide-react";
import { methodColor } from "../utils";

type HistoryEntry = {
  id: string;
  workspace_id: string;
  request_id: string | null;
  method: string;
  url: string;
  request_headers: string | null;
  request_body: string | null;
  status_code: number | null;
  response_body: string | null;
  response_headers: string | null;
  time_ms: number | null;
  executed_at: string;
};

type Props = {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: string;
  onRestore: (entry: HistoryEntry) => void;
};

export function HistoryPanel({ isOpen, onClose, workspaceId, onRestore }: Props) {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const loadHistory = useCallback(async () => {
    if (!workspaceId) return;
    setIsLoading(true);
    try {
      const result = await invoke<HistoryEntry[]>("get_history", { workspaceId });
      setEntries(result);
    } catch (e) {
      console.error("Failed to load history", e);
    } finally {
      setIsLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    if (isOpen) loadHistory();
  }, [isOpen, loadHistory]);

  const handleClear = async () => {
    try {
      await invoke("clear_history", { workspaceId });
      setEntries([]);
    } catch (e) {
      console.error("Failed to clear history", e);
    }
  };

  const filtered = entries.filter((e) => {
    const q = search.toLowerCase();
    return (
      e.url.toLowerCase().includes(q) ||
      e.method.toLowerCase().includes(q) ||
      String(e.status_code).includes(q)
    );
  });

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    const today = new Date();
    if (d.toDateString() === today.toDateString()) return "Today";
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
    return d.toLocaleDateString();
  };

  const statusColor = (code: number | null) => {
    if (!code) return "text-muted";
    if (code < 300) return "text-method-get";
    if (code < 400) return "text-method-put";
    return "text-method-delete";
  };

  // Group entries by date
  const grouped = filtered.reduce((acc, entry) => {
    const label = formatDate(entry.executed_at);
    if (!acc[label]) acc[label] = [];
    acc[label].push(entry);
    return acc;
  }, {} as Record<string, HistoryEntry[]>);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex justify-end">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative h-full w-[440px] bg-surface border-l border-border flex flex-col shadow-2xl animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <div className="flex items-center space-x-3">
            <History size={18} className="text-primary" />
            <h2 className="text-[14px] font-black text-white">Request History</h2>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={loadHistory}
              className="p-1.5 hover:bg-surface-hover rounded text-muted hover:text-white transition-all"
              title="Refresh"
            >
              <RotateCcw size={14} />
            </button>
            {entries.length > 0 && (
              <button
                onClick={handleClear}
                className="p-1.5 hover:bg-red-500/10 rounded text-muted hover:text-red-400 transition-all"
                title="Clear all history"
              >
                <Trash2 size={14} />
              </button>
            )}
            <button onClick={onClose} className="p-1.5 hover:bg-surface-hover rounded text-muted hover:text-white transition-all">
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="px-4 py-3 border-b border-border shrink-0">
          <div className="flex items-center space-x-3 bg-background border border-border rounded-lg px-3 py-2 focus-within:border-primary/50 transition-all">
            <Search size={14} className="text-muted shrink-0" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by URL, method, status..."
              className="bg-transparent flex-1 text-[13px] text-gray-200 placeholder-muted/50 focus:outline-none"
            />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {isLoading && (
            <div className="flex items-center justify-center p-12 text-muted text-[13px]">
              <div className="w-4 h-4 border-2 border-surface border-t-primary rounded-full animate-spin mr-3" />
              Loading...
            </div>
          )}

          {!isLoading && entries.length === 0 && (
            <div className="flex flex-col items-center justify-center p-12 text-muted text-[13px] space-y-3 text-center">
              <History size={32} className="opacity-20" />
              <span>No history yet. Send a request to get started.</span>
            </div>
          )}

          {!isLoading && Object.keys(grouped).length > 0 && (
            <div>
              {Object.entries(grouped).map(([date, dateEntries]) => (
                <div key={date}>
                  <div className="px-5 py-2 text-[10px] font-black uppercase tracking-widest text-muted bg-background/40 border-b border-border/50 sticky top-0 z-10">
                    {date}
                  </div>
                  {dateEntries.map((entry) => (
                    <div
                      key={entry.id}
                      className="border-b border-border/50 hover:bg-surface-hover/50 transition-all"
                    >
                      <div
                        className="flex items-center justify-between px-4 py-3 cursor-pointer"
                        onClick={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
                      >
                        <div className="flex items-center space-x-3 min-w-0">
                          <span className={`text-[11px] font-black uppercase min-w-[48px] ${methodColor(entry.method)}`}>
                            {entry.method}
                          </span>
                          <span className="text-[12px] text-gray-300 truncate font-mono">
                            {entry.url}
                          </span>
                        </div>
                        <div className="flex items-center space-x-3 shrink-0 ml-3">
                          <span className={`text-[11px] font-bold ${statusColor(entry.status_code)}`}>
                            {entry.status_code ?? "—"}
                          </span>
                          <span className="text-[10px] text-muted">
                            {formatTime(entry.executed_at)}
                          </span>
                          <ChevronDown
                            size={12}
                            className={`text-muted transition-transform ${expandedId === entry.id ? "rotate-180" : ""}`}
                          />
                        </div>
                      </div>

                      {expandedId === entry.id && (
                        <div className="px-4 pb-3 space-y-2">
                          <div className="flex items-center space-x-3 text-[11px] text-muted">
                            {entry.time_ms !== null && (
                              <span>{entry.time_ms} ms</span>
                            )}
                          </div>
                          <button
                            onClick={() => {
                              onRestore(entry);
                              onClose();
                            }}
                            className="flex items-center space-x-2 px-3 py-1.5 bg-primary/10 hover:bg-primary/20 border border-primary/30 text-primary rounded-lg text-[11px] font-bold transition-all"
                          >
                            <RotateCcw size={12} />
                            <span>Restore this request</span>
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
