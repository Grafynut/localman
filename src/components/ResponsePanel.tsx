import { ChevronDown, Play, Code, Search, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { JSONPath } from "jsonpath-plus";
import type { BodyViewMode, ResponseState, ResponseTab } from "../types";
import { formatResponseBody } from "../utils";

type Props = {
  reqResponse: ResponseState;
  isSending: boolean;
  respTab: ResponseTab;
  setRespTab: (tab: ResponseTab) => void;
  height?: number;
  onOpenCode: () => void;
};

export function ResponsePanel({ reqResponse, isSending, respTab, setRespTab, height, onOpenCode }: Props) {
  const [viewMode, setViewMode] = useState<BodyViewMode>("pretty");
  const [viewMenuOpen, setViewMenuOpen] = useState(false);
  const [jsonPathQuery, setJsonPathQuery] = useState("");
  const [searchText, setSearchText] = useState("");
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

  const parsedBody = useMemo(() => {
    if (!reqResponse || "error" in reqResponse || !reqResponse.body) return null;
    try {
      return JSON.parse(reqResponse.body);
    } catch {
      return null;
    }
  }, [reqResponse]);

  const body = useMemo(() => {
    if (!reqResponse) {
      return "";
    }
    if ("error" in reqResponse) {
      return reqResponse.error;
    }

    if (parsedBody && jsonPathQuery.trim()) {
      try {
        const result = JSONPath({ path: jsonPathQuery, json: parsedBody });
        return formatResponseBody(JSON.stringify(result), viewMode);
      } catch (err) {
        return `// Invalid JSONPath query\n${err}`;
      }
    }

    return formatResponseBody(reqResponse.body || "", viewMode);
  }, [reqResponse, viewMode, parsedBody, jsonPathQuery]);

  const highlightContent = (text: string) => {
    if (!text || viewMode === "raw") {
      return renderWithSearchHighlight(text);
    }

    const trimmed = text.trim();
    // HTML/XML Highlighting
    if (trimmed.startsWith("<")) {
      const tokens = text.split(/(<[^>]*>|[^<]+)/g).filter(t => t !== "");
      return tokens.map((token, i) => {
        if (token.startsWith("<")) {
          return <span key={i} className="text-[#569CD6]">{token}</span>; // Tag
        }
        return <span key={i} className="text-[#D4D4D4]">{renderWithSearchHighlight(token)}</span>;
      });
    }

    // JSON Highlighting
    const tokens = text.split(/(".*?"|[:{}\[\]\s,]+|\d+|true|false|null)/g);
    return tokens.map((token, i) => {
      if (/^".*"$/.test(token)) {
        if (tokens[i + 1]?.includes(":")) {
          return <span key={i} className="text-[#9CDCFE]">{token}</span>; // Key
        }
        return <span key={i} className="text-[#CE9178]">{renderWithSearchHighlight(token)}</span>; // String value
      }
      if (/^\d+$/.test(token)) return <span key={i} className="text-[#B5CEA8]">{token}</span>; // Number
      if (/^(true|false|null)$/.test(token)) return <span key={i} className="text-[#569CD6] font-bold">{token}</span>; // Keywords
      if (/^[:{}\[\]\s,]+$/.test(token)) return <span key={i} className="text-gray-400">{token}</span>; // Punctuation
      return <span key={i} className="text-gray-200">{renderWithSearchHighlight(token)}</span>;
    });
  };

  const renderWithSearchHighlight = (text: string) => {
    if (!searchText) return text;
    const parts = text.split(new RegExp(`(${searchText})`, "gi"));
    return parts.map((part, i) => 
      part.toLowerCase() === searchText.toLowerCase() 
        ? <mark key={i} className="bg-yellow-500/40 text-white rounded-sm px-0.5">{part}</mark>
        : part
    );
  };

  const headers = useMemo(() => {
    if (!reqResponse) {
      return [];
    }
    return Object.entries(reqResponse.headers || {});
  }, [reqResponse]);

  return (
    <div 
      className={`flex flex-col min-h-0 bg-background relative border-t border-border/50 ${!height ? 'flex-1' : ''}`}
      style={height ? { height: `${height}px`, maxHeight: '80vh' } : {}}
    >
      <div className="flex items-center justify-between px-4 py-2 bg-surface/20 border-b border-border shrink-0">
        <span className="text-[11px] font-bold uppercase tracking-widest text-muted">Response</span>
        {reqResponse && (
          <div className="flex items-center space-x-4 text-[11px] font-bold">
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
            <div className="w-px h-4 bg-border"></div>
            <button
              onClick={onOpenCode}
              className="flex items-center space-x-1.5 text-muted hover:text-primary transition-colors hover:scale-105 active:scale-95"
              title="Generate Code Snippet"
            >
              <Code size={14} />
              <span className="uppercase">Code</span>
            </button>
          </div>
        )}
      </div>

      <div className="flex border-b border-border px-4 shrink-0 bg-surface/10">
        {(["Body", "Headers", "Tests"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setRespTab(tab)}
            className={`px-3 py-2 text-[11px] font-bold uppercase tracking-wider transition-all relative ${respTab === tab ? "text-primary" : "text-muted hover:text-gray-300"}`}
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
                      <button
                        onClick={() => {
                          setViewMode("preview");
                          setViewMenuOpen(false);
                        }}
                        className={`w-full text-left px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider hover:bg-surface-hover transition-colors ${viewMode === "preview" ? "text-primary" : "text-gray-400"}`}
                      >
                        Preview
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
          <div className="w-full h-full relative overflow-hidden flex flex-col bg-background">
            <div className="flex items-center space-x-2 px-3 py-1.5 bg-surface/30 border-b border-border/50 shrink-0">
              <div className="flex-1 flex items-center space-x-2">
                <Search size={14} className="text-muted" />
                <input
                  type="text"
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  placeholder="Search in response..."
                  className="flex-1 bg-transparent border-none text-[12px] font-mono focus:outline-none focus:ring-0 text-gray-200 placeholder-muted/50"
                />
                {searchText && (
                  <button onClick={() => setSearchText("")} className="p-1 hover:bg-surface rounded-md text-muted"><X size={14} /></button>
                )}
              </div>
              {parsedBody && (
                <>
                  <div className="w-px h-4 bg-border mx-2"></div>
                  <input
                    type="text"
                    value={jsonPathQuery}
                    onChange={(e) => setJsonPathQuery(e.target.value)}
                    placeholder="JSONPath (e.g., $.data)"
                    className="w-48 bg-transparent border-none text-[12px] font-mono focus:outline-none focus:ring-0 text-primary placeholder-primary/40"
                  />
                  {jsonPathQuery && (
                    <button onClick={() => setJsonPathQuery("")} className="p-1 hover:bg-surface rounded-md text-primary"><X size={14} /></button>
                  )}
                </>
              )}
            </div>
            
            <div className="flex-1 flex overflow-hidden">
               {viewMode === "preview" ? (
                 <div className="w-full h-full bg-white overflow-auto flex items-center justify-center">
                    {body.startsWith("data:image/") ? (
                      <img src={body} alt="Response Preview" className="max-w-full max-h-full object-contain shadow-lg" />
                    ) : body.startsWith("data:audio/") ? (
                      <audio controls src={body} className="w-96" />
                    ) : body.startsWith("data:video/") ? (
                      <video controls src={body} className="max-w-full max-h-full" />
                    ) : body.startsWith("data:") ? (
                       <div className="text-gray-800 p-8 text-center">
                          <p className="font-bold">Binary Content</p>
                          <p className="text-sm opacity-60">Cannot preview this type ({headers.find(([k]) => k.toLowerCase() === 'content-type')?.[1]})</p>
                       </div>
                    ) : (
                      <iframe 
                        srcDoc={body} 
                        className="w-full h-full border-none" 
                        title="Response Preview"
                        sandbox="allow-scripts"
                      />
                    )}
                 </div>
               ) : (
                 <>
                   <div className="shrink-0 w-10 bg-surface/5 border-r border-border text-right py-3 px-2 text-[11px] text-muted/30 font-mono select-none overflow-hidden">
                    {body.split("\n").map((_, i) => (
                      <div key={i} className="h-[21px] leading-[21px]">{i + 1}</div>
                    ))}
                  </div>
                  <div className="flex-1 overflow-auto custom-scrollbar">
                    <pre className="inline-block p-3 text-[13px] font-mono whitespace-pre leading-[19px] focus:outline-none selection:bg-primary/20">
                      {"error" in reqResponse || body.startsWith("// Invalid JSONPath") ? <span className="text-method-delete">{body}</span> : highlightContent(body)}
                    </pre>
                  </div>
                 </>
               )}
            </div>
          </div>
        )}

        {reqResponse && respTab === "Headers" && (
          <div className="p-3 font-mono text-[11px] text-gray-300">
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
          <div className="p-4 font-mono text-[13px]">
            {(!reqResponse.testResults || reqResponse.testResults.length === 0) ? (
              <div className="h-full flex items-center justify-center text-muted mt-8">
                No response tests available for this request.
              </div>
            ) : (
              <div className="space-y-2">
                <div className="font-bold flex items-center justify-between text-gray-300 pb-2 border-b border-border/40">
                  <span>Test Results</span>
                  <span className="text-xs font-normal opacity-70">
                    {reqResponse.testResults.filter(t => t.passed).length}/{reqResponse.testResults.length} Passed
                  </span>
                </div>
                {reqResponse.testResults.map((test, i) => (
                  <div key={i} className="flex flex-col py-1.5 border-b border-border/10">
                    <div className="flex items-center space-x-3">
                      <span className={test.passed ? "text-green-500 font-bold" : "text-method-delete font-bold"}>
                        {test.passed ? "PASS" : "FAIL"}
                      </span>
                      <span className="text-gray-200">{test.name}</span>
                    </div>
                    {test.error && (
                      <div className="text-method-delete mt-1 ml-10 text-[11px] whitespace-pre-wrap">
                        {test.error}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
