import { useState, useEffect } from "react";
import { X, Upload, Terminal, FileJson, AlertCircle, CheckCircle2, Globe } from "lucide-react";
import yaml from "js-yaml";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onImportCurl: (curl: string) => void;
  onImportPostman: (json: any) => void;
  onImportOpenAPI: (spec: any) => void;
};

export function ImportModal({ isOpen, onClose, onImportCurl, onImportPostman, onImportOpenAPI }: Props) {
  const [activeTab, setActiveTab] = useState<"curl" | "postman" | "openapi">("curl");
  const [inputText, setInputText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setInputText("");
      setError(null);
      setSuccess(false);
      setIsImporting(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleImport = () => {
    setError(null);
    setSuccess(false);

    if (!inputText.trim()) {
      setError("Please provide some input text.");
      return;
    }

    try {
      if (activeTab === "curl") {
        if (!inputText.toLowerCase().includes("curl")) {
          setError("Input does not look like a cURL command.");
          return;
        }
        setIsImporting(true);
        onImportCurl(inputText.trim());
        setSuccess(true);
        setTimeout(onClose, 800);
      } else if (activeTab === "postman") {
        const json = JSON.parse(inputText);
        if (!json.info || !json.item) {
          setError("Invalid Postman Collection format (v2.1 expected).");
          return;
        }
        setIsImporting(true);
        onImportPostman(json);
        setSuccess(true);
        setTimeout(onClose, 800);
      } else {
        // OpenAPI
        let spec: any;
        try {
          spec = JSON.parse(inputText);
        } catch {
          try {
            spec = yaml.load(inputText);
          } catch (e) {
            setError("Invalid OpenAPI format (JSON or YAML expected).");
            return;
          }
        }

        if (!spec.openapi && !spec.swagger) {
          setError("Invalid OpenAPI/Swagger specification.");
          return;
        }
        setIsImporting(true);
        onImportOpenAPI(spec);
        setSuccess(true);
        setTimeout(onClose, 800);
      }
    } catch (e) {
      setError(activeTab === "curl" ? "Failed to parse cURL command." : "Invalid JSON format.");
      setIsImporting(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setInputText(content);
      if (file.name.endsWith(".json")) {
        setActiveTab("postman");
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300"
        onClick={onClose}
      />
      
      <div className="relative w-full max-w-2xl bg-surface border border-border rounded-xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="h-14 border-b border-border px-6 flex items-center justify-between bg-surface/50">
          <div className="flex items-center space-x-3">
            <h2 className="text-[15px] font-bold text-white">Import Requests</h2>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-white/5 rounded-full text-muted hover:text-white transition-all"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex border-b border-border bg-background/30">
          <button
            onClick={() => setActiveTab("curl")}
            className={`flex-1 flex items-center justify-center space-x-2 py-3 text-[12px] font-bold transition-all border-b-2 ${
              activeTab === "curl" ? "border-primary text-primary" : "border-transparent text-muted hover:text-gray-300"
            }`}
          >
            <Terminal size={14} />
            <span>Raw cURL</span>
          </button>
          <button
            onClick={() => setActiveTab("postman")}
            className={`flex-1 flex items-center justify-center space-x-2 py-3 text-[12px] font-bold transition-all border-b-2 ${
              activeTab === "postman" ? "border-primary text-primary" : "border-transparent text-muted hover:text-gray-300"
            }`}
          >
            <FileJson size={14} />
            <span>Postman Collection</span>
          </button>
          <button
            onClick={() => setActiveTab("openapi")}
            className={`flex-1 flex items-center justify-center space-x-2 py-3 text-[12px] font-bold transition-all border-b-2 ${
              activeTab === "openapi" ? "border-primary text-primary" : "border-transparent text-muted hover:text-gray-300"
            }`}
          >
            <Globe size={14} />
            <span>OpenAPI / Swagger</span>
          </button>
        </div>

        <div className="p-6 flex-1 flex flex-col space-y-4">
          <div className="flex-1 min-h-[240px] flex flex-col space-y-2">
            <label className="text-[11px] font-black uppercase tracking-widest text-muted ml-1">
              {activeTab === "curl" ? "Paste cURL Command" : "Paste Collection JSON or Upload File"}
            </label>
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={
                activeTab === "curl" ? "curl -X POST https://api.example.com..." : 
                activeTab === "postman" ? '{\n  "info": { "name": "My Collection", ... },\n  "item": [ ... ]\n}' :
                'openapi: 3.0.0\ninfo:\n  title: My API\n...'
              }
              className="flex-1 w-full bg-[#1a1a1a] border border-border rounded-lg px-4 py-3 text-[13px] font-mono text-gray-300 focus:outline-none focus:border-primary/50 transition-all resize-none"
            />
          </div>

          <div className="flex items-center justify-between p-1">
            <div className="flex-1 mr-4">
              {error && (
                <div className="flex items-center space-x-2 text-method-delete text-[12px] animate-in slide-in-from-left-2">
                  <AlertCircle size={14} />
                  <span className="font-semibold">{error}</span>
                </div>
              )}
              {success && (
                <div className="flex items-center space-x-2 text-method-get text-[12px] animate-in slide-in-from-left-2">
                  <CheckCircle2 size={14} />
                  <span className="font-semibold">Import successful!</span>
                </div>
              )}
            </div>
            
            <div className="flex items-center space-x-3">
              <label className="cursor-pointer group">
                <input type="file" className="hidden" onChange={handleFileUpload} accept=".json,.txt" />
                <div className="flex items-center space-x-2 px-4 py-2 border border-border rounded-lg hover:border-primary/50 text-muted group-hover:text-primary transition-all text-[12px] font-bold">
                  <Upload size={16} />
                  <span>Choose File</span>
                </div>
              </label>
              
              <button
                onClick={handleImport}
                disabled={!inputText.trim() || success}
                className="flex items-center space-x-2 px-6 py-2 bg-primary hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-all shadow-lg shadow-primary/20 text-[12px] font-black uppercase tracking-wider"
              >
                <span>{isImporting ? "Importing..." : "Import"}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
