import { X, Plus } from "lucide-react";
import type { TabState } from "../types";
import { methodColor } from "../utils";

interface RequestTabsProps {
  tabs: TabState[];
  activeTabId: string | null;
  onTabSelect: (tabId: string) => void;
  onTabClose: (tabId: string, e: React.MouseEvent) => void;
  onNewTab: () => void;
}

export function RequestTabs({
  tabs,
  activeTabId,
  onTabSelect,
  onTabClose,
  onNewTab,
}: RequestTabsProps) {
  return (
    <div className="flex items-center h-[34px] bg-[#1a1a1a] border-b border-border overflow-x-auto overflow-y-hidden custom-scrollbar shrink-0">
      {tabs.map((tab) => {
        const isActive = tab.id === activeTabId;
        return (
          <div
            key={tab.id}
            onClick={() => onTabSelect(tab.id)}
            className={`
              group relative flex items-center h-full px-3 pr-8 min-w-[120px] max-w-[200px] border-r border-border cursor-pointer select-none
              transition-colors duration-100 ease-in
              ${isActive ? "bg-[#1e1e1e] border-t-2 border-t-primary" : "bg-[#161616] hover:bg-[#1c1c1c] border-t-2 border-t-transparent"}
            `}
          >
            <span className={`text-[10px] font-black uppercase tracking-wider mr-2 ${methodColor(tab.method)} shrink-0`}>
              {tab.method}
            </span>
            <span
              className={`text-[12px] truncate ${isActive ? "text-gray-200 font-medium" : "text-muted"}`}
              title={tab.name}
            >
              {tab.name}
            </span>

            {/* Close Button / Dirty Indicator */}
            <div className="absolute right-2 flex items-center justify-center w-4 h-4">
              {tab.isDirty && !isActive ? (
                <div className="w-2 h-2 rounded-full bg-orange-500/80 group-hover:hidden" />
              ) : null}
              <button
                onClick={(e) => onTabClose(tab.id, e)}
                className={`
                  p-0.5 rounded-sm hover:bg-white/10 text-muted hover:text-white transition-colors
                  ${tab.isDirty && !isActive ? "hidden group-hover:flex" : "hidden group-hover:flex md:flex"}
                  ${isActive ? "opacity-100" : "opacity-0 group-hover:opacity-100"}
                `}
                title={tab.isDirty ? "Close (Unsaved changes)" : "Close tab"}
              >
                {tab.isDirty ? (
                  // Show a subtle dot when dirty but active, which turns into X on hover
                  <div className="relative flex items-center justify-center w-full h-full group/btn">
                    <div className="w-1.5 h-1.5 rounded-full bg-orange-500/80 group-hover/btn:hidden" />
                    <X size={12} className="hidden group-hover/btn:block text-orange-400" />
                  </div>
                ) : (
                  <X size={12} />
                )}
              </button>
            </div>
          </div>
        );
      })}

      <button
        onClick={onNewTab}
        className="flex items-center justify-center w-8 h-full hover:bg-white/5 text-muted hover:text-white transition-colors border-r border-border"
        title="New Tab"
      >
        <Plus size={14} />
      </button>

      <div className="flex-1 min-w-[20px]" />
    </div>
  );
}
