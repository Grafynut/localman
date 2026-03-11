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

  const headers = useMemo(() => {
    if (!reqResponse) {
      return [];
    }
    return Object.entries(reqResponse.headers || {});
  }, [reqResponse]);

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[#1e1e1e] relative">
      <div className="flex items-center justify-between px-4 py-2 bg-surface/40 border-b border-border shrink-0">
        <span className="text-[13px] font-bold text-gray-200">Response Panel</span>
        {reqResponse && (
          <div className="flex items-center space-x-6 pr-2 text-[12px] font-mono">
            <div className="flex items-center space-x-1.5">
              <span className="text-muted">Status</span>
              <span className={`${reqResponse.status >= 200 && reqResponse.status < 300 ? "text-green-500" : "text-red-400"} font-bold`}>
                {reqResponse.status} {statusText}
              </span>
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="text-muted">Time</span>
              <span className="text-gray-300 font-bold">{reqResponse.time_ms || 0}ms</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="text-muted">Size</span>
              <span className="text-gray-300 font-bold">{((reqResponse.body?.length || 0) / 1000).toFixed(2)} KB</span>
            </div>
          </div>
        )}
      </div>

      <div className="flex border-b border-border px-2 shrink-0 bg-[#1e1e1e]">
        {(["Body", "Headers", "Tests"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setRespTab(tab)}
            className={`px-4 py-2 text-[13px] font-medium transition-all duration-200 relative ${respTab === tab ? "text-primary" : "text-muted hover:text-gray-300"}`}
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
                    className="px-1.5 py-0.5 rounded bg-surface border border-border text-xs text-gray-300 flex items-center space-x-1"
                  >
                    <span>{viewMode === "pretty" ? "Pretty JSON Viewer" : "Raw Viewer"}</span>
                    <ChevronDown size={12} className={`transition-transform ${viewMenuOpen ? "rotate-180" : ""}`} />
                  </button>
                  {viewMenuOpen && (
                    <div className="absolute left-0 top-7 w-[160px] rounded border border-border bg-surface text-[12px] z-20">
                      <button
                        onClick={() => {
                          setViewMode("pretty");
                          setViewMenuOpen(false);
                        }}
                        className={`w-full text-left px-2 py-1.5 hover:bg-white/5 ${viewMode === "pretty" ? "text-primary" : "text-gray-300"}`}
                      >
                        Pretty JSON
                      </button>
                      <button
                        onClick={() => {
                          setViewMode("raw");
                          setViewMenuOpen(false);
                        }}
                        className={`w-full text-left px-2 py-1.5 hover:bg-white/5 ${viewMode === "raw" ? "text-primary" : "text-gray-300"}`}
                      >
                        Raw
                      </button>
                    </div>
                  )}
                </span>
              </span>
            ) : tab}
            {respTab === tab && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"></div>}
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
          <div className="w-full h-full relative">
            <div className="absolute left-0 top-0 bottom-0 w-12 bg-surface/10 border-r border-border text-right py-4 px-3 text-[13px] text-muted font-mono select-none">
              {body.split("\n").map((_, i) => <div key={i} className="mb-[2px] opacity-70 leading-[21px]">{i + 1}</div>)}
            </div>
            <pre className="w-full h-full bg-transparent p-4 pl-16 text-[14px] font-mono text-[#9cdcfe] whitespace-pre-wrap word-break-all leading-[21px] focus:outline-none">
              {"error" in reqResponse ? <span className="text-red-400">{body}</span> : body}
            </pre>
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
            Tests view coming soon
          </div>
        )}
      </div>
    </div>
  );
}
