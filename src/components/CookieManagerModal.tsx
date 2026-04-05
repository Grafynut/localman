import React, { useState } from "react";
import { X, Trash2, Plus, Globe, Search, Cookie as CookieIcon, Info } from "lucide-react";

type CookieEntry = {
  domain: string;
  name: string;
  value: string;
};

interface CookieManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  cookies: Record<string, Record<string, string>>;
  onUpdateCookies: (newCookies: Record<string, Record<string, string>>) => void;
}

export const CookieManagerModal: React.FC<CookieManagerModalProps> = ({
  isOpen,
  onClose,
  cookies,
  onUpdateCookies,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [newCookie, setNewCookie] = useState<Partial<CookieEntry>>({});
  const [isAddingMode, setIsAddingMode] = useState(false);

  if (!isOpen) return null;

  const handleDeleteCookie = (domain: string, name: string) => {
    const next = { ...cookies };
    if (next[domain]) {
      const { [name]: _, ...rest } = next[domain];
      if (Object.keys(rest).length === 0) {
        delete next[domain];
      } else {
        next[domain] = rest;
      }
      onUpdateCookies(next);
    }
  };

  const handleDeleteDomain = (domain: string) => {
    const next = { ...cookies };
    delete next[domain];
    onUpdateCookies(next);
  };

  const handleAddCookie = () => {
    if (!newCookie.domain || !newCookie.name || !newCookie.value) return;

    const next = { ...cookies };
    if (!next[newCookie.domain]) next[newCookie.domain] = {};
    next[newCookie.domain][newCookie.name] = newCookie.value;
    
    onUpdateCookies(next);
    setNewCookie({});
    setIsAddingMode(false);
  };

  const filteredDomains = Object.keys(cookies).filter(domain =>
    domain.toLowerCase().includes(searchQuery.toLowerCase()) ||
    Object.keys(cookies[domain]).some(name => name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-[#1e1e1e] border border-[#333] rounded-xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#333] bg-[#252525]">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <CookieIcon className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Manage Cookies</h2>
              <p className="text-xs text-gray-400">View and edit captured domain cookies</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-white hover:bg-white/5 rounded-md transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toolbar */}
        <div className="p-4 border-b border-[#333] flex gap-3 items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              placeholder="Search by domain or cookie name..."
              className="w-full pl-9 pr-4 py-2 bg-[#2a2a2a] border border-[#333] rounded-lg text-sm text-gray-200 focus:outline-none focus:border-blue-500/50 transition-colors"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <button
            onClick={() => setIsAddingMode(!isAddingMode)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              isAddingMode 
                ? "bg-red-500/10 text-red-400 border border-red-500/20" 
                : "bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-900/10"
            }`}
          >
            {isAddingMode ? "Cancel" : <><Plus className="w-4 h-4" /> Add Cookie</>}
          </button>
        </div>

        {/* Add Cookie Form */}
        {isAddingMode && (
          <div className="p-4 bg-[#252525] border-b border-[#333] flex flex-wrap gap-3 animate-in slide-in-from-top-2 duration-200">
            <input
              placeholder="Domain (e.g. google.com)"
              className="px-3 py-2 bg-[#1a1a1a] border border-[#333] rounded-md text-sm text-white flex-1 min-w-[150px]"
              value={newCookie.domain || ""}
              onChange={e => setNewCookie(p => ({ ...p, domain: e.target.value }))}
            />
            <input
              placeholder="Cookie Name"
              className="px-3 py-2 bg-[#1a1a1a] border border-[#333] rounded-md text-sm text-white flex-1 min-w-[150px]"
              value={newCookie.name || ""}
              onChange={e => setNewCookie(p => ({ ...p, name: e.target.value }))}
            />
            <input
              placeholder="Value"
              className="px-3 py-2 bg-[#1a1a1a] border border-[#333] rounded-md text-sm text-white flex-1 min-w-[150px]"
              value={newCookie.value || ""}
              onChange={e => setNewCookie(p => ({ ...p, value: e.target.value }))}
            />
            <button
              onClick={handleAddCookie}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium"
            >
              Add
            </button>
          </div>
        )}

        {/* Cookie List */}
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
          {filteredDomains.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-gray-500 gap-3 italic">
              <Globe className="w-8 h-8 opacity-20" />
              <p>No cookies found{searchQuery ? " matching your search" : ""}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredDomains.map(domain => (
                <div key={domain} className="bg-[#252525] rounded-xl border border-[#333] overflow-hidden shadow-lg">
                  <div className="flex items-center justify-between px-4 py-3 bg-[#2a2a2a]/50 border-b border-[#333]">
                    <div className="flex items-center gap-2">
                      <Globe className="w-4 h-4 text-blue-400" />
                      <span className="text-sm font-bold text-gray-200">{domain}</span>
                      <span className="text-[10px] bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded-full border border-blue-500/20 font-mono uppercase tracking-wider">
                        {Object.keys(cookies[domain]).length} Active
                      </span>
                    </div>
                    <button 
                      onClick={() => handleDeleteDomain(domain)}
                      className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                      title="Delete all for this domain"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="divide-y divide-[#333]">
                    {Object.entries(cookies[domain]).map(([name, value]) => (
                      <div key={name} className="flex items-center justify-between px-4 py-3 hover:bg-white/5 transition-colors group">
                        <div className="flex-1 min-w-0 pr-4">
                          <div className="text-xs font-semibold text-gray-300 mb-1 flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-500/60 shadow-[0_0_8px_rgba(34,197,94,0.4)]"></span>
                            {name}
                          </div>
                          <div className="text-sm text-gray-500 font-mono truncate bg-[#1a1a1a]/50 px-2 py-1 rounded border border-white/5">
                            {value}
                          </div>
                        </div>
                        <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleDeleteCookie(domain, name)}
                            className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg"
                            title="Delete cookie"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer Info */}
        <div className="p-4 bg-[#1a1a1a] border-t border-[#333] flex items-start gap-3">
          <Info className="w-4 h-4 text-gray-500 mt-0.5 shrink-0" />
          <p className="text-[11px] text-gray-500 leading-relaxed italic">
            Cookies are captured automatically from "Set-Cookie" headers and stored locally. They are injected into outgoing requests based on domain matching.
          </p>
        </div>
      </div>
    </div>
  );
};
