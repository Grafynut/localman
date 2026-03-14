import React, { useRef, useState, useCallback, useMemo } from "react";
import { VariableAutocomplete } from "./VariableAutocomplete";
import type { Environment } from "../types";

type Props = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  type?: "input" | "textarea";
  environments: Environment[];
  activeEnvId: string | null;
  onEnter?: () => void;
  onScroll?: (e: React.UIEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  id?: string;
};

export function VariableInput({
  value,
  onChange,
  placeholder,
  className,
  type = "input",
  environments,
  activeEnvId,
  onEnter,
  onScroll,
  id
}: Props) {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<{ key: string; value: string; isLocal: boolean }[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [popupPosition, setPopupPosition] = useState({ top: 0, left: 0 });
  const [triggerPosition, setTriggerPosition] = useState(0);

  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);

  // Extract all available variables
  const allVariables = useMemo(() => {
    const vars: { key: string; value: string; isLocal: boolean; isActive: boolean }[] = [];
    const seen = new Set<string>();

    // Sort to prioritize active environment, then local, then others
    const sortedEnvs = [...environments].sort((a, b) => {
      if (a.id === activeEnvId) return -1;
      if (b.id === activeEnvId) return 1;
      if (a.collection_id && !b.collection_id) return -1;
      if (!a.collection_id && b.collection_id) return 1;
      return 0;
    });

    sortedEnvs.forEach(env => {
      try {
        const parsed = JSON.parse(env.variables);
        Object.entries(parsed).forEach(([key, val]) => {
          if (!seen.has(key)) {
            vars.push({ 
              key, 
              value: String(val), 
              isLocal: !!env.collection_id,
              isActive: env.id === activeEnvId 
            });
            seen.add(key);
          }
        });
      } catch (e) {
        // Ignore invalid JSON
      }
    });

    return vars;
  }, [environments, activeEnvId]);

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
          // For textarea, accurate positioning is harder without a mimic
          // For now, let's keep it simple and show below the cursor roughly
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
    setTimeout(() => setShowSuggestions(false), 200);
  };

  return (
    <div className="relative w-full h-full">
      {type === "input" ? (
        <input
          ref={inputRef as React.RefObject<HTMLInputElement>}
          id={id}
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            updateSuggestions(e.target.value, e.target.selectionStart || 0);
          }}
          onKeyDown={onKeyDown}
          onBlur={onBlur}
          onScroll={onScroll}
          placeholder={placeholder}
          className={className}
        />
      ) : (
        <textarea
          ref={inputRef as React.RefObject<HTMLTextAreaElement>}
          id={id}
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            updateSuggestions(e.target.value, e.target.selectionStart || 0);
          }}
          onKeyDown={onKeyDown}
          onBlur={onBlur}
          onScroll={onScroll}
          placeholder={placeholder}
          className={className}
          spellCheck={false}
        />
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
