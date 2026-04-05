import { Key, Shield, User, Globe, Lock, ChevronDown } from "lucide-react";
import type { AuthConfig, AuthType, Environment } from "../types";
import { VariableInput } from "./VariableInput";

type Props = {
  auth: AuthConfig;
  onChange: (auth: AuthConfig) => void;
  environments: Environment[];
  activeEnvId: string | null;
  globals: Record<string, string>;
};

export function AuthEditor({ auth, onChange, environments, activeEnvId, globals }: Props) {
  const handleTypeChange = (type: AuthType) => {
    const newAuth: AuthConfig = { ...auth, type };
    if (type === "bearer" && !newAuth.bearer) newAuth.bearer = { token: "" };
    if (type === "basic" && !newAuth.basic) newAuth.basic = { username: "", password: "" };
    if (type === "apikey" && !newAuth.apikey) newAuth.apikey = { key: "", value: "", addTo: "header" };
    onChange(newAuth);
  };

  return (
    <div className="flex-1 flex flex-col bg-background text-[13px]">
      {/* Header / Type Selector */}
      <div className="p-6 border-b border-border/50 bg-surface/5">
        <div className="flex items-center justify-between max-w-2xl">
          <div>
            <h3 className="text-sm font-bold text-gray-200 mb-1 flex items-center gap-2">
              <Shield size={16} className="text-primary" />
              Authentication
            </h3>
            <p className="text-[11px] text-muted leading-relaxed">
              Configure authentication for this request. Credentials will be automatically applied to the outgoing call.
            </p>
          </div>
          <div className="relative group">
            <select
              value={auth.type}
              onChange={(e) => handleTypeChange(e.target.value as AuthType)}
              className="appearance-none bg-surface-hover/50 border border-border/30 rounded-lg py-2 pl-4 pr-10 hover:border-primary/40 focus:outline-none focus:border-primary/60 transition-all font-bold text-gray-200 cursor-pointer min-w-[160px]"
            >
              <option value="none">No Auth</option>
              <option value="bearer">Bearer Token</option>
              <option value="basic">Basic Auth</option>
              <option value="apikey">API Key</option>
            </select>
            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none group-hover:text-primary transition-colors" />
          </div>
        </div>
      </div>

      {/* Auth Forms */}
      <div className="flex-1 overflow-y-auto p-6 max-w-2xl">
        {auth.type === "none" && (
          <div className="flex flex-col items-center justify-center h-40 opacity-40 border-2 border-dashed border-border/20 rounded-xl bg-surface/5">
            <Globe size={32} className="mb-3 text-muted" />
            <p className="font-medium">No Authentication needed for this request.</p>
          </div>
        )}

        {auth.type === "bearer" && (
          <div className="space-y-4 animate-in fade-in slide-in-from-top-1 duration-300">
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-muted uppercase tracking-wider flex items-center gap-2">
                <Key size={12} className="text-primary/70" />
                Token
              </label>
              <VariableInput
                type="textarea"
                value={auth.bearer?.token || ""}
                onChange={(val) => onChange({ ...auth, bearer: { token: val } })}
                placeholder="Enter your Bearer Token (supports {{variables}})..."
                className="w-full bg-surface/30 border border-border/30 rounded-lg p-3 font-mono text-[12px] h-32 focus:outline-none focus:border-primary/50 transition-all placeholder:text-muted/30"
                environments={environments}
                activeEnvId={activeEnvId}
                globals={globals}
                isSensitive={true}
              />
            </div>
            <p className="text-[10px] text-muted leading-tight italic opacity-60">
              Note: The token will be sent in the `Authorization` header as `Bearer &lt;token&gt;`.
            </p>
          </div>
        )}

        {auth.type === "basic" && (
          <div className="space-y-6 animate-in fade-in slide-in-from-top-1 duration-300">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-muted uppercase tracking-wider flex items-center gap-2">
                  <User size={12} className="text-primary/70" />
                  Username
                </label>
                <VariableInput
                  type="input"
                  value={auth.basic?.username || ""}
                  onChange={(val) => onChange({ ...auth, basic: { ...auth.basic!, username: val } })}
                  placeholder="Username"
                  className="w-full h-10 bg-surface/30 border border-border/30 rounded-lg px-4 focus:outline-none focus:border-primary/50 transition-all"
                  environments={environments}
                  activeEnvId={activeEnvId}
                  globals={globals}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-muted uppercase tracking-wider flex items-center gap-2">
                  <Lock size={12} className="text-primary/70" />
                  Password
                </label>
                <VariableInput
                  type="input"
                  value={auth.basic?.password || ""}
                  onChange={(val) => onChange({ ...auth, basic: { ...auth.basic!, password: val } })}
                  placeholder="Password"
                  className="w-full h-10 bg-surface/30 border border-border/30 rounded-lg px-4 focus:outline-none focus:border-primary/50 transition-all"
                  environments={environments}
                  activeEnvId={activeEnvId}
                  globals={globals}
                  isSensitive={true}
                />
              </div>
            </div>
            <p className="text-[10px] text-muted leading-tight italic opacity-60">
              The credentials will be Base64 encoded and sent in the `Authorization` header as `Basic &lt;base64&gt;`.
            </p>
          </div>
        )}

        {auth.type === "apikey" && (
          <div className="space-y-6 animate-in fade-in slide-in-from-top-1 duration-300">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-muted uppercase tracking-wider">Key</label>
                <VariableInput
                  type="input"
                  value={auth.apikey?.key || ""}
                  onChange={(val) => onChange({ ...auth, apikey: { ...auth.apikey!, key: val } })}
                  placeholder="e.g. x-api-key"
                  className="w-full h-10 bg-surface/30 border border-border/30 rounded-lg px-4 focus:outline-none focus:border-primary/50 transition-all"
                  environments={environments}
                  activeEnvId={activeEnvId}
                  globals={globals}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-muted uppercase tracking-wider">Value</label>
                <VariableInput
                  type="input"
                  value={auth.apikey?.value || ""}
                  onChange={(val) => onChange({ ...auth, apikey: { ...auth.apikey!, value: val } })}
                  placeholder="Value"
                  className="w-full h-10 bg-surface/30 border border-border/30 rounded-lg px-4 focus:outline-none focus:border-primary/50 transition-all"
                  environments={environments}
                  activeEnvId={activeEnvId}
                  globals={globals}
                  isSensitive={true}
                />
              </div>
            </div>
            <div className="space-y-2">
                <label className="text-[11px] font-bold text-muted uppercase tracking-wider">Add to</label>
                <div className="flex items-center space-x-6">
                   <label className="flex items-center space-x-2 cursor-pointer group">
                      <input 
                        type="radio" 
                        name="add_to" 
                        checked={auth.apikey?.addTo === "header"}
                        onChange={() => onChange({ ...auth, apikey: { ...auth.apikey!, addTo: "header" } })}
                        className="w-4 h-4 text-primary bg-surface border-border/50 focus:ring-primary/40 focus:ring-offset-background"
                      />
                      <span className="text-gray-300 font-medium group-hover:text-primary transition-colors">Header</span>
                   </label>
                   <label className="flex items-center space-x-2 cursor-pointer group">
                      <input 
                        type="radio" 
                        name="add_to" 
                        checked={auth.apikey?.addTo === "query"}
                        onChange={() => onChange({ ...auth, apikey: { ...auth.apikey!, addTo: "query" } })}
                        className="w-4 h-4 text-primary bg-surface border-border/50 focus:ring-primary/40 focus:ring-offset-background"
                      />
                      <span className="text-gray-300 font-medium group-hover:text-primary transition-colors">Query Parameters</span>
                   </label>
                </div>
              </div>
          </div>
        )}
      </div>
    </div>
  );
}
