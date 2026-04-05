import { useState, useEffect } from "react";
import { 
  Play, 
  Pause, 
  Square, 
  X, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Zap, 
  Settings2,
  ListRestart,
  ChevronDown,
  Download,
  Table,
  FileText,
  Upload
} from "lucide-react";
import type { StoredRequest, RunnerStatus, RunnerReport, Environment } from "../types";
import { methodColor } from "../utils";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  requests: StoredRequest[];
  onRun: (config: RunnerConfig) => Promise<void>;
  status: RunnerStatus;
  report: RunnerReport | null;
  onStop: () => void;
  onPause: () => void;
  onResume: () => void;
  environments: Environment[];
  activeEnvId: string | null;
};

export type RunnerConfig = {
  iterations: number;
  delay: number;
  requestIds: string[];
  environmentId: string | null;
  iterationData?: Record<string, any>[];
};

export function CollectionRunnerModal({
  isOpen,
  onClose,
  title,
  requests,
  onRun,
  status,
  report,
  onStop,
  onPause,
  onResume,
  environments,
  activeEnvId,
}: Props) {
  const [iterations, setIterations] = useState(1);
  const [delay, setDelay] = useState(0);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [envId, setEnvId] = useState<string | null>(activeEnvId);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const [iterationData, setIterationData] = useState<any[] | null>(null);

  useEffect(() => {
    setSelectedIds(requests.map(r => r.id));
  }, [requests]);

  useEffect(() => {
    setEnvId(activeEnvId);
  }, [activeEnvId]);

  const handleDownloadReport = () => {
    if (!report) return;
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `localman-report-${new Date().toISOString().slice(0, 19).replace(/:/g, "-")}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (!isOpen) return null;

  const handleToggleRequest = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleRun = () => {
    onRun({ 
      iterations, 
      delay, 
      requestIds: selectedIds, 
      environmentId: envId,
      iterationData: iterationData || undefined 
    });
  };

  // Progress calculations
  const totalSteps = selectedIds.length * (iterationData && iterationData.length > 0 ? iterationData.length : iterations);
  const completedSteps = report?.results.length || 0;
  const progressPercent = totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0;

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-6 sm:p-12">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md animate-in fade-in duration-300" onClick={status === "idle" || status === "completed" || status === "stopped" ? onClose : undefined} />
      
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-surface border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-border bg-surface-hover/10">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <Zap size={20} />
            </div>
            <div>
              <h2 className="text-[16px] font-black text-white italic tracking-tight">{title}</h2>
              <p className="text-[11px] text-muted font-bold uppercase tracking-widest opacity-60">Collection Runner</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-surface-hover rounded-full text-muted hover:text-white transition-all">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 flex min-h-0">
          {/* Main Panel */}
          <div className="flex-1 flex flex-col min-w-0 border-r border-border">
            {status === "idle" ? (
              <div className="flex-1 overflow-y-auto p-6 space-y-8">
                {/* Config Section */}
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[11px] font-black uppercase tracking-widest text-muted flex items-center space-x-2">
                      <ListRestart size={12} />
                      <span>Iterations</span>
                    </label>
                    <input 
                      type="number" 
                      min="1" 
                      value={iterations} 
                      onChange={e => setIterations(parseInt(e.target.value) || 1)}
                      className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-[14px] font-bold text-gray-200 focus:border-primary/50 focus:ring-4 focus:ring-primary/5 outline-none transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[11px] font-black uppercase tracking-widest text-muted flex items-center space-x-2">
                      <Clock size={12} />
                      <span>Delay (ms)</span>
                    </label>
                    <input 
                      type="number" 
                      min="0" 
                      step="100"
                      value={delay} 
                      onChange={e => setDelay(parseInt(e.target.value) || 0)}
                      className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-[14px] font-bold text-gray-200 focus:border-primary/50 focus:ring-4 focus:ring-primary/5 outline-none transition-all"
                    />
                  </div>
                </div>

                {/* Data File Selector */}
                <div className="space-y-2">
                  <label className="text-[11px] font-black uppercase tracking-widest text-muted flex items-center space-x-2">
                    <Table size={12} />
                    <span>Iteration Data (JSON)</span>
                  </label>
                  <div className="relative group">
                    <input 
                      type="file" 
                      accept=".json"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = (event) => {
                            try {
                              const json = JSON.parse(event.target?.result as string);
                              if (Array.isArray(json)) {
                                setIterationData(json);
                              } else {
                                alert("Data must be a JSON array of objects");
                              }
                            } catch (e) {
                              alert("Invalid JSON file");
                            }
                          };
                          reader.readAsText(file);
                        }
                      }}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    />
                    <div className="w-full bg-background border border-border rounded-xl px-4 py-2.5 flex items-center justify-between group-hover:border-primary/50 transition-all">
                      <div className="flex items-center space-x-2">
                        <FileText size={16} className="text-muted" />
                        <span className="text-[13px] text-gray-200">
                          {iterationData ? `${iterationData.length} records loaded` : "Select JSON file..."}
                        </span>
                      </div>
                      {iterationData ? (
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setIterationData(null);
                          }}
                          className="p-1 hover:bg-surface rounded-md text-muted hover:text-red-400 z-20"
                        >
                          <X size={14} />
                        </button>
                      ) : (
                        <Upload size={14} className="text-muted" />
                      )}
                    </div>
                  </div>
                  {iterationData && (
                    <p className="text-[10px] text-primary/70 font-bold px-1">
                      Runner will execute {iterationData.length} iterations (one per record).
                    </p>
                  )}
                </div>

                {/* Env Selector */}
                <div className="space-y-2">
                  <label className="text-[11px] font-black uppercase tracking-widest text-muted flex items-center space-x-2">
                    <Settings2 size={12} />
                    <span>Environment</span>
                  </label>
                  <select 
                    value={envId || ""} 
                    onChange={e => setEnvId(e.target.value || null)}
                    className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-[14px] font-bold text-gray-200 focus:border-primary/50 focus:ring-4 focus:ring-primary/5 outline-none transition-all appearance-none cursor-pointer"
                  >
                    <option value="">No Environment</option>
                    {environments.map(env => (
                      <option key={env.id} value={env.id}>{env.name}</option>
                    ))}
                  </select>
                </div>

                {/* Requests List */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-black uppercase tracking-widest text-muted">Select Requests ({selectedIds.length}/{requests.length})</label>
                    <div className="flex space-x-3">
                      <button onClick={() => setSelectedIds(requests.map(r => r.id))} className="text-[10px] font-bold text-primary hover:underline">Select All</button>
                      <button onClick={() => setSelectedIds([])} className="text-[10px] font-bold text-muted hover:text-white">Deselect All</button>
                    </div>
                  </div>
                  <div className="space-y-1 bg-surface-hover/20 rounded-xl p-2 max-h-[300px] overflow-y-auto">
                    {requests.map(req => (
                      <div 
                        key={req.id}
                        onClick={() => handleToggleRequest(req.id)}
                        className={`flex items-center space-x-3 p-3 rounded-lg cursor-pointer transition-all border ${
                          selectedIds.includes(req.id) 
                            ? "bg-primary/5 border-primary/20 text-gray-100" 
                            : "bg-transparent border-transparent text-muted hover:bg-white/5"
                        }`}
                      >
                        <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${
                          selectedIds.includes(req.id) ? "bg-primary border-primary" : "border-border"
                        }`}>
                          {selectedIds.includes(req.id) && <CheckCircle2 size={12} className="text-white bg-primary rounded-full" />}
                        </div>
                        <span className={`text-[11px] font-black uppercase min-w-[45px] ${methodColor(req.method)}`}>{req.method}</span>
                        <span className="text-[13px] font-bold flex-1 truncate">{req.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col p-6 space-y-6 overflow-hidden bg-background/30">
                {/* Progress Bar */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[12px] font-bold">
                    <span className="text-muted uppercase tracking-widest">Running Requests</span>
                    <span className="text-white">{completedSteps} / {totalSteps}</span>
                  </div>
                  <div className="h-2 w-full bg-surface-hover rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-primary to-primary-hover transition-all duration-300"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>

                {/* Execution Log */}
                <div className="flex-1 overflow-y-auto rounded-xl border border-border bg-black/20 p-4 space-y-2 font-mono text-[12px]">
                   {report?.results.map((res, i) => (
                     <div key={i} className="flex flex-col border-b border-white/5 last:border-0">
                        <div 
                          onClick={() => setExpandedIndex(expandedIndex === i ? null : i)}
                          className="flex items-center space-x-3 py-2 cursor-pointer hover:bg-white/5 px-2 rounded-lg transition-colors group"
                        >
                          <span className="text-muted/50 w-6 italic text-[10px]">{i+1}</span>
                          <span className={`${methodColor(res.method)} w-12 font-black text-[10px]`}>{res.method}</span>
                          <span className="text-gray-200 flex-1 truncate font-bold">{res.name}</span>
                          <span className={`w-10 text-right ${res.status < 400 ? "text-method-get" : "text-method-delete"}`}>{res.status}</span>
                          <span className="text-muted italic w-16 text-right">{res.time_ms}ms</span>
                          <div className="flex items-center justify-center w-6">
                            {res.passed ? (
                              <CheckCircle2 size={14} className="text-method-get" />
                            ) : (
                              <XCircle size={14} className="text-method-delete" />
                            )}
                          </div>
                          <ChevronDown size={14} className={`text-muted transition-transform ${expandedIndex === i ? "rotate-180" : ""}`} />
                        </div>
                        
                        {expandedIndex === i && (
                          <div className="pl-12 pr-4 py-3 space-y-2 bg-white/[0.02] border-x border-white/5 animate-in slide-in-from-top-1 duration-200">
                             {res.error && (
                               <div className="text-red-400 p-2 bg-red-400/10 rounded border border-red-400/20 text-[11px] mb-2">
                                 Error: {res.error}
                               </div>
                             )}
                             {res.testResults.length > 0 ? (
                               <div className="space-y-1.5">
                                 <p className="text-[10px] text-muted font-black uppercase tracking-tighter mb-1 select-none">Assertions ({res.testResults.filter(t => t.passed).length}/{res.testResults.length})</p>
                                 {res.testResults.map((test, idx) => (
                                   <div key={idx} className="flex items-center space-x-2 text-[11px]">
                                     {test.passed ? (
                                       <CheckCircle2 size={10} className="text-method-get shrink-0" />
                                     ) : (
                                       <XCircle size={10} className="text-method-delete shrink-0" />
                                     )}
                                     <span className={test.passed ? "text-gray-300" : "text-red-400"}>{test.name}</span>
                                     {!test.passed && test.error && <span className="text-red-400/60 italic">— {test.error}</span>}
                                   </div>
                                 ))}
                               </div>
                             ) : (
                               <p className="text-[10px] text-muted italic">No assertions defined for this request.</p>
                             )}
                             <p className="text-[10px] text-muted/40 font-mono mt-2 truncate underline opacity-50">{res.url}</p>
                          </div>
                        )}
                     </div>
                   ))}
                   {status === "running" && (
                     <div className="flex items-center space-x-3 py-1 animate-pulse">
                        <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                        <span className="text-primary font-bold">Executing next request...</span>
                     </div>
                   )}
                </div>
              </div>
            )}
          </div>

          {/* Right Sidebar (Report Summary) */}
          <div className="w-72 flex flex-col bg-surface-hover/10 p-6 space-y-8 overflow-y-auto">
             <div className="space-y-4">
               <div className="flex items-center justify-between">
                 <h3 className="text-[11px] font-black uppercase tracking-widest text-muted">Run Summary</h3>
                 {report && (
                   <button 
                     onClick={handleDownloadReport}
                     className="p-1.5 bg-primary/10 text-primary hover:bg-primary/20 rounded-md transition-colors"
                     title="Download JSON Report"
                   >
                     <Download size={14} />
                   </button>
                 )}
               </div>
               {report ? (
                 <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 rounded-xl bg-background border border-border flex flex-col items-center">
                        <span className="text-[20px] font-black text-method-get">{report.passedRequests}</span>
                        <span className="text-[10px] font-black text-muted uppercase">Passed</span>
                      </div>
                      <div className="p-4 rounded-xl bg-background border border-border flex flex-col items-center">
                        <span className="text-[20px] font-black text-method-delete">{report.failedRequests}</span>
                        <span className="text-[10px] font-black text-muted uppercase">Failed</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                       <div className="flex justify-between text-[12px]">
                         <span className="text-muted">Total Requests:</span>
                         <span className="text-white font-bold">{report.totalRequests}</span>
                       </div>
                       <div className="flex justify-between text-[12px]">
                         <span className="text-muted">Total Time:</span>
                         <span className="text-white font-bold">{report.totalTime} ms</span>
                       </div>
                       <div className="flex justify-between text-[12px]">
                         <span className="text-muted">Avg. Time:</span>
                         <span className="text-white font-bold">
                           {report.totalRequests > 0 ? Math.round(report.totalTime / report.totalRequests) : 0} ms
                         </span>
                       </div>
                    </div>
                 </div>
               ) : (
                 <div className="flex flex-col items-center justify-center p-8 text-center space-y-3 opacity-30 italic">
                    <Clock size={32} />
                    <p className="text-[12px]">Complete a run to see the summary data</p>
                 </div>
               )}
             </div>

             {/* Footer Actions */}
             <div className="flex-1 flex flex-col justify-end space-y-3 pt-4">
                {status === "idle" || status === "completed" || status === "stopped" ? (
                  <button 
                    onClick={handleRun}
                    disabled={selectedIds.length === 0}
                    className="w-full h-11 bg-primary hover:bg-primary-hover text-white font-black rounded-xl shadow-lg shadow-primary/20 flex items-center justify-center space-x-2 transition-all active:scale-95 disabled:opacity-30 disabled:grayscale"
                  >
                    <Play size={16} fill="currentColor" />
                    <span>RUN COLLECTION</span>
                  </button>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      {status === "paused" ? (
                        <button 
                          onClick={onResume}
                          className="h-11 bg-method-get/10 border border-method-get/30 text-method-get font-black rounded-xl flex items-center justify-center space-x-2 transition-all hover:bg-method-get/20"
                        >
                          <Play size={16} fill="currentColor" />
                          <span>RESUME</span>
                        </button>
                      ) : (
                        <button 
                          onClick={onPause}
                          className="h-11 bg-amber-500/10 border border-amber-500/30 text-amber-500 font-black rounded-xl flex items-center justify-center space-x-2 transition-all hover:bg-amber-500/20"
                        >
                          <Pause size={16} fill="currentColor" />
                          <span>PAUSE</span>
                        </button>
                      )}
                      <button 
                        onClick={onStop}
                        className="h-11 bg-method-delete/10 border border-method-delete/30 text-method-delete font-black rounded-xl flex items-center justify-center space-x-2 transition-all hover:bg-method-delete/20"
                      >
                        <Square size={16} fill="currentColor" />
                        <span>STOP</span>
                      </button>
                    </div>
                  </>
                )}
                {report && (status === "completed" || status === "stopped") && (
                  <button 
                    onClick={() => {
                      setIterations(1);
                      setDelay(0);
                    }}
                    className="w-full h-11 bg-white/5 hover:bg-white/10 text-gray-300 font-bold rounded-xl flex items-center justify-center space-x-2 transition-all"
                  >
                    <Square size={16} className="rotate-45" />
                    <span>Reset Settings</span>
                  </button>
                )}
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
