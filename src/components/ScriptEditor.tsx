import React, { useRef, useCallback } from "react";

type Props = {
  id: string;
  value: string | null;
  onChange: (val: string) => void;
  placeholder?: string;
  className?: string;
};

export function ScriptEditor({ id, value, onChange, placeholder, className }: Props) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const highlightRef = useRef<HTMLDivElement>(null);
  const gutterRef = useRef<HTMLDivElement>(null);

  const text = value || "";

  // Synchronize scrolling between textarea and highlighting layer
  const handleScroll = useCallback((e: React.UIEvent<HTMLTextAreaElement>) => {
    const target = e.currentTarget;
    if (highlightRef.current) {
      highlightRef.current.scrollTop = target.scrollTop;
      highlightRef.current.scrollLeft = target.scrollLeft;
    }
    if (gutterRef.current) {
      gutterRef.current.scrollTop = target.scrollTop;
    }
  }, []);

  // Basic JavaScript Syntax Highlighting
  const renderHighlightedCode = (code: string) => {
    if (!code) return <span className="text-muted/40 italic">{placeholder}</span>;

    // Tokens:
    // Keywords: pm, expect, to, have, status, body, response, const, let, var, if, else, return, async, await, function
    // Strings: "..." or '...' or `...`
    // Comments: // or /* */
    // Numbers: 0-9
    // Properties: .something
    // Methods: something()
    
    return code.split(/("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`|\/\/.*|\/\*[\s\S]*?\*\/|[:{}\[\]\(\)\s,;]+|\d+|true|false|null)/g).map((token, i) => {
      if (/^["'`].*["'`]$/.test(token)) return <span key={i} className="text-[#CE9178]">{token}</span>; // Strings
      if (/^\/\/.*$|^\/\*[\s\S]*\*\/$/.test(token)) return <span key={i} className="text-[#6A9955]">{token}</span>; // Comments
      if (/^\d+$/.test(token)) return <span key={i} className="text-[#B5CEA8]">{token}</span>; // Numbers
      if (/^(true|false|null)$/.test(token)) return <span key={i} className="text-[#569CD6] font-bold">{token}</span>; // Booleans/Null
      
      // Keywords/Methods
      if (/^(const|let|var|if|else|return|async|await|function|export|import|from|class|extends|new|try|catch|finally|throw|delete|typeof|instanceof|void|yield|break|continue|switch|case|default|do|while|for|in|of)$/.test(token)) {
        return <span key={i} className="text-[#C586C0] font-bold">{token}</span>;
      }
      
      // Postman Specific (pm.*)
      if (/^(pm|expect|responseTime|code|status|response|request|environment|globals|collectionVariables|variables|iterationData|info)$/.test(token)) {
        return <span key={i} className="text-[#9CDCFE] font-bold">{token}</span>;
      }

      const specialPunctuation = /^[:{}\[\]\(\)\s,;.]+$/;
      if (specialPunctuation.test(token)) return <span key={i} className="text-gray-400">{token}</span>;

      return <span key={i} className="text-gray-200">{token}</span>;
    });
  };

  const lineCount = text.split("\n").length;

  return (
    <div className={`flex-1 flex overflow-hidden bg-background relative ${className}`}>
      {/* Line Numbers Gutter */}
      <div 
        ref={gutterRef}
        className="shrink-0 w-12 bg-surface/10 border-r border-border/50 text-right py-4 px-3 text-[11px] text-muted/30 font-mono select-none overflow-hidden"
      >
        {Array.from({ length: Math.max(lineCount, 1) }).map((_, i) => (
          <div key={i} className="h-[21px] leading-[21px]">
            {i + 1}
          </div>
        ))}
      </div>

      {/* Editor Area */}
      <div className="flex-1 relative overflow-hidden group">
        {/* Highlighting Layer */}
        <div
          ref={highlightRef}
          className="absolute inset-0 p-4 font-mono text-[13px] leading-[21px] pointer-events-none whitespace-pre overflow-hidden"
        >
          {renderHighlightedCode(text)}
        </div>

        {/* Real Textarea */}
        <textarea
          id={id}
          ref={textareaRef}
          value={text}
          onChange={(e) => onChange(e.target.value)}
          onScroll={handleScroll}
          placeholder={placeholder}
          spellCheck={false}
          className="w-full h-full bg-transparent p-4 text-[13px] font-mono text-transparent caret-white focus:outline-none resize-none leading-[21px] selection:bg-primary/30 relative z-10 whitespace-pre overflow-auto"
        />
      </div>
    </div>
  );
}
