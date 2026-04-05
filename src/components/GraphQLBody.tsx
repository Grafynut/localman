import { VariableInput } from "./VariableInput";
import type { Environment } from "../types";
import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

type Props = {
  query: string;
  variables: string;
  onQueryChange: (val: string) => void;
  onVariablesChange: (val: string) => void;
  environments: Environment[];
  activeEnvId: string | null;
  globals: Record<string, string>;
};

export function GraphQLBody({
  query,
  variables,
  onQueryChange,
  onVariablesChange,
  environments,
  activeEnvId,
  globals
}: Props) {
  const [isVariablesOpen, setIsVariablesOpen] = useState(true);

  return (
    <div className="flex-1 flex flex-col h-full bg-background overflow-hidden font-sans">
      <div className="flex-1 flex flex-col min-h-0 relative">
        <div className="px-3 py-1.5 border-b border-border bg-surface/10 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2">
            <ChevronDown size={14} className="text-primary" />
            <span className="text-[10px] font-black uppercase tracking-wider text-muted">Query</span>
          </div>
          <span className="text-[9px] font-mono opacity-40">GraphQL Query</span>
        </div>
        
        <div className="flex-1 relative bg-background group/editor flex overflow-hidden">
          <div className="shrink-0 w-12 bg-surface/5 border-r border-border text-right py-4 px-3 text-[12px] text-muted/30 font-mono select-none overflow-hidden">
            {query.split("\n").map((_, i) => (
              <div key={i} className="h-[21px] leading-[21px]">{i + 1}</div>
            ))}
          </div>
          <div className="flex-1 relative overflow-hidden">
             <VariableInput
              value={query}
              onChange={onQueryChange}
              type="textarea"
              placeholder="# Write your GraphQL query here..."
              environments={environments}
              activeEnvId={activeEnvId}
              globals={globals}
              className="w-full h-full bg-transparent p-4 text-[14px] font-mono text-gray-100 caret-primary focus:outline-none resize-none leading-[21px] selection:bg-primary/20 relative z-10 whitespace-pre overflow-auto"
            />
          </div>
        </div>
      </div>

      <div className={`flex flex-col border-t border-border transition-all duration-300 ${isVariablesOpen ? 'h-64' : 'h-10'}`}>
        <button
          onClick={() => setIsVariablesOpen(!isVariablesOpen)}
          className="px-3 py-2 bg-surface/20 flex items-center justify-between hover:bg-surface/40 transition-colors shrink-0"
        >
          <div className="flex items-center space-x-2">
            {isVariablesOpen ? <ChevronDown size={14} className="text-primary" /> : <ChevronRight size={14} className="text-muted" />}
            <span className="text-[10px] font-black uppercase tracking-wider text-muted">Variables</span>
          </div>
          {!isVariablesOpen && (
             <span className="text-[9px] font-mono opacity-40 truncate max-w-[200px]">
               {variables || "{}"}
             </span>
          )}
        </button>
        
        {isVariablesOpen && (
          <div className="flex-1 relative bg-background group/vars flex overflow-hidden">
            <div className="shrink-0 w-12 bg-surface/5 border-r border-border text-right py-4 px-3 text-[12px] text-muted/30 font-mono select-none overflow-hidden">
              {variables.split("\n").map((_, i) => (
                <div key={i} className="h-[21px] leading-[21px]">{i + 1}</div>
              ))}
            </div>
            <div className="flex-1 relative overflow-hidden">
               <VariableInput
                value={variables}
                onChange={onVariablesChange}
                type="textarea"
                placeholder='{ "key": "value" }'
                environments={environments}
                activeEnvId={activeEnvId}
                globals={globals}
                className="w-full h-full bg-transparent p-4 text-[14px] font-mono text-gray-100 caret-primary focus:outline-none resize-none leading-[21px] selection:bg-primary/20 relative z-10 whitespace-pre overflow-auto"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
