import { ChevronDown, Play } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { BodyViewMode, ResponseState, ResponseTab } from "../types";
import { formatResponseBody } from "../utils";

type Props = {
  reqResponse: ResponseState;
  isSending: boolean;
  respTab: ResponseTab;
  setRespTab: (tab: ResponseTab) => void;
};

export function ResponsePanel({ reqResponse, isSending, respTab, setRespTab }: Props) {
  const [viewMode, setViewMode] = useState<BodyViewMode>("pretty");
  const [viewMenuOpen, setViewMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setViewMenuOpen(false);
      }
    };
    window.addEventListener("mousedown", onClick);
    return () => window.removeEventListener("mousedown", onClick);
  }, []);

  const statusText = useMemo(() => {
    if (!reqResponse) return "";
    return reqResponse.status >= 200 && reqResponse.status < 300 ? "OK" : "ERR";
  }, [reqResponse]);

  const body = useMemo(() => {
    if (!reqResponse) {
      return "";
    }
    if ("error" in reqResponse) {
      return reqResponse.error;
    }
    return formatResponseBody(reqResponse.body || "", viewMode);
  }, [reqResponse, viewMode]);

  const highlightJson = (json: string) => {
    if (!json || viewMode === "raw") return <span className="text-gray-200">{json}</span>;
    
    // Simple but effective regex-based syntax highlighter for JSON
    const tokens = json.split(/(".*?"|[:{}\[\]\s,]+|\d+|true|false|null)/g);
    
    return tokens.map((token, i) => {
      if (/^".*"$/.test(token)) {
        if (tokens[i + 1]?.includes(":")) {
          return <span key={i} className="text-[#9CDCFE]">{token}</span>; // Key
        }
        return <span key={i} className="text-[#CE9178]">{token}</span>; // String value
      }
      if (/^\d+$/.test(token)) return <span key={i} className="text-[#B5CEA8]">{token}</span>; // Number
      if (/^(true|false|null)$/.test(token)) return <span key={i} className="text-[#569CD6] font-bold">{token}</span>; // Keywords
      if (/^[:{}\[\]\s,]+$/.test(token)) return <span key={i} className="text-gray-400">{token}</span>; // Punctuation
      return <span key={i} className="text-gray-200">{token}</span>;
    });
  };

  const headers = useMemo(() => {
    if (!reqResponse) {
      return [];
    }
    return Object.entries(reqResponse.headers || {});
  }, [reqResponse]);

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-background relative border-t border-border/50">
      <div className="flex items-center justify-between px-6 py-3 bg-surface/20 border-b border-border shrink-0">
        <span className="text-[11px] font-bold uppercase tracking-widest text-muted">Response</span>
        {reqResponse && (
          <div className="flex items-center space-x-6 text-[12px] font-bold">
            <div className="flex items-center space-x-2">
              <span className="text-muted font-medium">Status</span>
              <span className={`${reqResponse.status >= 200 && reqResponse.status < 300 ? "text-method-get" : "text-method-delete"}`}>
                {reqResponse.status} {statusText}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-muted font-medium">Time</span>
              <span className="text-gray-200">{reqResponse.time_ms || 0} ms</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-muted font-medium">Size</span>
              <span className="text-gray-200">{((reqResponse.body?.length || 0) / 1024).toFixed(2)} KB</span>
            </div>
          </div>
        )}
      </div>

      <div className="flex border-b border-border px-4 shrink-0 bg-surface/10">
        {(["Body", "Headers", "Tests"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setRespTab(tab)}
            className={`px-4 py-3 text-[11px] font-bold uppercase tracking-wider transition-all relative ${respTab === tab ? "text-primary" : "text-muted hover:text-gray-300"}`}
          >
            {tab === "Body" ? (
              <span className="flex items-center space-x-1">
                <span>Body</span>
                <span className="relative ml-2" ref={menuRef}>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setViewMenuOpen((prev) => !prev);
                    }}
                    className="px-2 py-0.5 rounded bg-surface border border-border text-[10px] font-bold text-muted hover:text-gray-100 flex items-center space-x-1 transition-colors"
                  >
                    <span>{viewMode === "pretty" ? "Pretty" : "Raw"}</span>
                    <ChevronDown size={10} className={`transition-transform ${viewMenuOpen ? "rotate-180" : ""}`} />
                  </button>
                  {viewMenuOpen && (
                    <div className="absolute left-0 top-8 w-[140px] rounded-md border border-border bg-background shadow-2xl py-1 z-30 overflow-hidden">
                      <button
                        onClick={() => {
                          setViewMode("pretty");
                          setViewMenuOpen(false);
                        }}
                        className={`w-full text-left px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider hover:bg-surface-hover transition-colors ${viewMode === "pretty" ? "text-primary" : "text-gray-400"}`}
                      >
                        Pretty
                      </button>
                      <button
                        onClick={() => {
                          setViewMode("raw");
                          setViewMenuOpen(false);
                        }}
                        className={`w-full text-left px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider hover:bg-surface-hover transition-colors ${viewMode === "raw" ? "text-primary" : "text-gray-400"}`}
                      >
                        Raw
                      </button>
                    </div>
                  )}
                </span>
              </span>
            ) : tab}
            {respTab === tab && <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-primary rounded-t-full"></div>}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-auto bg-[#1e1e1e] relative">
        {!reqResponse && !isSending && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-muted text-[13px] font-mono p-8 text-center space-y-4">
            <Play size={32} className="opacity-20" />
            <span>Hit Run to execute request</span>
          </div>
        )}

        {isSending && (
          <div className="absolute inset-0 flex flex-col items-center justify-center space-y-4">
            <div className="w-6 h-6 border-[3px] border-surface border-t-primary rounded-full animate-spin"></div>
            <span className="text-primary text-[11px] font-mono animate-pulse uppercase tracking-widest">Loading</span>
          </div>
        )}

        {reqResponse && respTab === "Body" && (
          <div className="w-full h-full relative overflow-hidden flex bg-background">
            <div className="shrink-0 w-12 bg-surface/5 border-r border-border text-right py-4 px-3 text-[12px] text-muted/30 font-mono select-none">
              {body.split("\n").map((_, i) => (
                <div key={i} className="h-[21px] leading-[21px]">
                  {i + 1}
                </div>
              ))}
            </div>
            <div className="flex-1 overflow-auto custom-scrollbar">
              <pre className="inline-block p-4 text-[14px] font-mono whitespace-pre leading-[21px] focus:outline-none selection:bg-primary/20">
                {"error" in reqResponse ? <span className="text-method-delete">{body}</span> : highlightJson(body)}
              </pre>
            </div>
          </div>
        )}

        {reqResponse && respTab === "Headers" && (
          <div className="p-4 font-mono text-[12px] text-gray-300">
            {headers.length === 0 ? (
              <div className="text-muted">No headers returned.</div>
            ) : (
              headers.map(([key, value]) => (
                <div key={key} className="flex border-b border-border/40 py-1">
                  <span className="w-[220px] text-[#9cdcfe]">{key}</span>
                  <span className="break-all">{value}</span>
                </div>
              ))
            )}
          </div>
        )}

        {reqResponse && respTab === "Tests" && (
          <div className="h-full flex items-center justify-center text-muted text-sm font-mono">
            No response tests available for this request.
          </div>
        )}
      </div>
    </div>
  );
}
