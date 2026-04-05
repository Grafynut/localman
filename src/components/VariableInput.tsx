import React, { useState, useRef, useCallback, useMemo } from "react";
import { VariableAutocomplete } from "./VariableAutocomplete";
import type { Environment } from "../types";
import { Braces, Info, Eye, EyeOff } from "lucide-react";

type Props = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  type?: "input" | "textarea";
  environments: Environment[];
  activeEnvId: string | null;
  globals?: Record<string, string>;
  onEnter?: () => void;
  onScroll?: (e: React.UIEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  id?: string;
  isSensitive?: boolean;
};

export function VariableInput({
  value,
  onChange,
  placeholder,
  className,
  type = "input",
  environments,
  activeEnvId,
  globals = {},
  onEnter,
  onScroll,
  id,
  isSensitive
}: Props) {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [isMasked, setIsMasked] = useState(isSensitive);
  const [suggestions, setSuggestions] = useState<{ key: string; value: string; isLocal: boolean }[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [popupPosition, setPopupPosition] = useState({ top: 0, left: 0 });
  const [triggerPosition, setTriggerPosition] = useState(0);

  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);

  // Extract all available variables
  const allVariables = useMemo(() => {
    const vars: { key: string; value: string; isLocal: boolean }[] = [];
    const seen = new Set<string>();

    const activeEnv = environments.find((e) => e.id === activeEnvId);
    if (activeEnv && activeEnv.variables) {
      try {
        const parsed = JSON.parse(activeEnv.variables);
        Object.entries(parsed).forEach(([key, val]) => {
          vars.push({ key, value: String(val), isLocal: true });
          seen.add(key);
        });
      } catch (e) {
        console.error("Failed to parse env variables", e);
      }
    }

    // Add Globals
    Object.entries(globals).forEach(([key, val]) => {
      if (!seen.has(key)) {
        vars.push({ key, value: String(val), isLocal: false });
        seen.add(key);
      }
    });

    return vars;
  }, [environments, activeEnvId, globals]);

  const updateSuggestions = useCallback((text: string, pos: number) => {
    const beforeCursor = text.slice(0, pos);
    const match = beforeCursor.match(/{{([^}]*)$/);
    
    if (match) {
      const query = match[1].trim().toLowerCase();
      const filtered = allVariables.filter(v => v.key.toLowerCase().includes(query));
      setSuggestions(filtered);
      setSelectedIndex(0);
      setShowSuggestions(true);
      setTriggerPosition(pos - match[1].length);
      
      // Position calculation
      if (inputRef.current) {
        const rect = inputRef.current.getBoundingClientRect();
        if (type === "input") {
          setPopupPosition({ top: rect.bottom + window.scrollY, left: rect.left + window.scrollX });
        } else {
          setPopupPosition({ top: rect.bottom + window.scrollY, left: rect.left + window.scrollX });
        }
      }
    } else {
      setShowSuggestions(false);
    }
  }, [allVariables, type]);

  const handleSelect = (suggestion: { key: string; value: string }) => {
    if (!inputRef.current) return;
    const before = value.slice(0, triggerPosition - 2); // Remove {{
    const after = value.slice(inputRef.current.selectionStart || 0);
    const newValue = before + "{{" + suggestion.key + "}}" + after;
    onChange(newValue);
    setShowSuggestions(false);
    
    // Focus back and move cursor
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
        const newPos = (before + "{{" + suggestion.key + "}}").length;
        inputRef.current.setSelectionRange(newPos, newPos);
      }
    }, 0);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (showSuggestions && suggestions.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % suggestions.length);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + suggestions.length) % suggestions.length);
      } else if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        handleSelect(suggestions[selectedIndex]);
      } else if (e.key === "Escape") {
        setShowSuggestions(false);
      }
    } else if (e.key === "Enter" && onEnter && type === "input") {
      onEnter();
    }
  };

  const onBlur = () => {
    // Delay to allow click on suggestion
    setTimeout(() => {
      setShowSuggestions(false);
      setIsFocused(false);
    }, 200);
  };

  const onFocus = () => {
    setIsFocused(true);
  };

  const handleQuickPicker = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (inputRef.current) {
      inputRef.current.focus();
      const pos = inputRef.current.selectionStart || value.length;
      
      // If we are not already in a variable, add {{ to trigger
      if (!showSuggestions) {
        const before = value.slice(0, pos);
        const after = value.slice(pos);
        onChange(before + "{{" + after);
        setTimeout(() => {
          if (inputRef.current) {
            inputRef.current.setSelectionRange(pos + 2, pos + 2);
            updateSuggestions(before + "{{" + after, pos + 2);
          }
        }, 0);
      }
    }
  };

  // Simple resolution helper for preview
  const resolvedPreview = useMemo(() => {
    if (!value.includes("{{")) return null;
    let resolved = value;
    allVariables.forEach(v => {
      // Escape regex special characters in key
      const escapedKey = v.key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      resolved = resolved.replace(new RegExp(`{{${escapedKey}}}`, 'g'), v.value);
    });
    return resolved;
  }, [value, allVariables]);

  return (
    <div className="relative w-full h-full group/vinput">
      {type === "input" ? (
        <div className="relative flex items-center w-full h-full">
          <input
            ref={inputRef as React.RefObject<HTMLInputElement>}
            id={id}
            value={value}
            type={isMasked ? "password" : "text"}
            onChange={(e) => {
              onChange(e.target.value);
              updateSuggestions(e.target.value, e.target.selectionStart || 0);
            }}
            onKeyDown={onKeyDown}
            onFocus={onFocus}
            onBlur={onBlur}
            onScroll={onScroll}
            placeholder={placeholder}
            className={`${className} pr-14`}
          />
          <div className="absolute right-2 flex items-center space-x-1 duration-200">
            {isSensitive && (
              <button
                onClick={() => setIsMasked(!isMasked)}
                tabIndex={-1}
                className="p-1 text-muted hover:text-primary transition-colors hover:scale-110 active:scale-90"
                title={isMasked ? "Show Value" : "Hide Value"}
              >
                {isMasked ? <Eye size={14} /> : <EyeOff size={14} />}
              </button>
            )}
            <button
              onClick={handleQuickPicker}
              tabIndex={-1}
              className="p-1 text-muted hover:text-primary transition-colors opacity-0 group-hover/vinput:opacity-100 focus:opacity-100 hover:scale-110 active:scale-90"
              title="Choose Variable"
            >
              <Braces size={14} />
            </button>
          </div>
        </div>
      ) : (
        <div className="relative w-full h-full">
          <textarea
            ref={inputRef as React.RefObject<HTMLTextAreaElement>}
            id={id}
            value={value}
            onChange={(e) => {
              onChange(e.target.value);
              updateSuggestions(e.target.value, e.target.selectionStart || 0);
            }}
            onKeyDown={onKeyDown}
            onFocus={onFocus}
            onBlur={onBlur}
            onScroll={onScroll}
            placeholder={placeholder}
            className={`${className} pr-8`}
            spellCheck={false}
          />
          <button
            onClick={handleQuickPicker}
            tabIndex={-1}
            className="absolute right-2 top-2 p-1 text-muted hover:text-primary transition-colors opacity-0 group-hover/vinput:opacity-100 focus:opacity-100"
            title="Choose Variable"
          >
            <Braces size={14} />
          </button>
        </div>
      )}

      {/* Resolved Preview Tooltip */}
      {isFocused && resolvedPreview && resolvedPreview !== value && (
        <div className="absolute left-0 bottom-full mb-2 z-[50] animate-in fade-in slide-in-from-bottom-1 duration-200">
          <div className="bg-surface/95 backdrop-blur-xl border border-border px-3 py-1.5 rounded-lg shadow-2xl flex items-center space-x-2 max-w-sm">
            <Info size={12} className="text-primary shrink-0" />
            <div className="flex flex-col min-w-0">
              <span className="text-[9px] font-black text-muted uppercase tracking-widest">Resolves to:</span>
              <span className="text-[11px] text-gray-200 truncate font-mono">
                {isMasked ? "••••••••••••" : resolvedPreview}
              </span>
            </div>
          </div>
          <div className="w-2 h-2 bg-surface border-r border-b border-border rotate-45 mx-3 -mt-1" />
        </div>
      )}

      {showSuggestions && (
        <VariableAutocomplete
          suggestions={suggestions}
          selectedIndex={selectedIndex}
          onSelect={handleSelect}
          position={popupPosition}
        />
      )}
    </div>
  );
}

// Helper to keep code clean
// Removed redundant useMemo re-definition
