import React, { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Bold, Italic, Link, Code, Eye, Edit3, Info } from "lucide-react";

interface DocumentationEditorProps {
  description: string | null;
  onUpdate: (value: string) => void;
  placeholder?: string;
}

export const DocumentationEditor: React.FC<DocumentationEditorProps> = ({
  description,
  onUpdate,
  placeholder = "Add documentation for this entity... (Markdown supported)",
}) => {
  const [isEditing, setIsEditing] = useState(!description);
  const [content, setContent] = useState(description || "");

  // Sync content when description prop changes (e.g. switching tabs)
  React.useEffect(() => {
    setContent(description || "");
  }, [description]);

  const handleContentChange = (newValue: string) => {
    setContent(newValue);
    onUpdate(newValue);
  };

  const insertText = (before: string, after: string = "") => {
    const textarea = document.getElementById("docs-textarea") as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const selected = text.substring(start, end);
    const result = text.substring(0, start) + before + selected + after + text.substring(end);
    
    handleContentChange(result);
    // Focus back and set selection would be nice, but simple update for now
  };

  return (
    <div className="flex flex-col h-full bg-[#1a1a1a] rounded-xl border border-white/5 overflow-hidden shadow-inner shadow-black/20 animate-in fade-in slide-in-from-bottom-2 duration-300">
      {/* Toolbar */}
      <div className="flex items-center justify-between p-2.5 bg-[#252525] border-b border-white/5">
        <div className="flex bg-black/20 p-1 rounded-lg">
          <button
            onClick={() => setIsEditing(true)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
              isEditing 
                ? "bg-blue-600 text-white shadow-lg shadow-blue-900/10" 
                : "text-gray-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <Edit3 className="w-3.5 h-3.5" /> Write
          </button>
          <button
            onClick={() => setIsEditing(false)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
              !isEditing 
                ? "bg-blue-600 text-white shadow-lg shadow-blue-900/10" 
                : "text-gray-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <Eye className="w-3.5 h-3.5" /> Preview
          </button>
        </div>

        {isEditing && (
          <div className="flex items-center gap-1">
            <button onClick={() => insertText("**", "**")} className="p-1.5 text-gray-500 hover:text-white hover:bg-white/5 rounded transition-all" title="Bold"><Bold className="w-3.5 h-3.5" /></button>
            <button onClick={() => insertText("_", "_")} className="p-1.5 text-gray-500 hover:text-white hover:bg-white/5 rounded transition-all" title="Italic"><Italic className="w-3.5 h-3.5" /></button>
            <button onClick={() => insertText("[", "](url)")} className="p-1.5 text-gray-500 hover:text-white hover:bg-white/5 rounded transition-all" title="Link"><Link className="w-3.5 h-3.5" /></button>
            <button onClick={() => insertText("`", "`")} className="p-1.5 text-gray-500 hover:text-white hover:bg-white/5 rounded transition-all" title="Code"><Code className="w-3.5 h-3.5" /></button>
          </div>
        )}
      </div>

      {/* Editor / Preview Area */}
      <div className="flex-1 overflow-hidden">
        {isEditing ? (
          <textarea
            id="docs-textarea"
            className="w-full h-full p-6 bg-transparent text-gray-300 text-sm font-mono leading-relaxed resize-none focus:outline-none custom-scrollbar"
            placeholder={placeholder}
            value={content}
            onChange={(e) => handleContentChange(e.target.value)}
          />
        ) : (
          <div className="h-full overflow-y-auto p-8 prose prose-invert prose-sm max-w-none prose-blue custom-scrollbar">
            {content ? (
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {content}
              </ReactMarkdown>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-gray-600 gap-4 italic select-none">
                <div className="p-4 bg-white/5 rounded-full">
                   <Info className="w-8 h-8 opacity-20" />
                </div>
                <p>No documentation added yet. Click "Write" to get started.</p>
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* Mini Help Info */}
      <div className="p-2 border-t border-white/5 bg-black/10 flex items-center justify-center">
        <span className="text-[10px] text-gray-600 uppercase tracking-widest font-bold">
          Markdown Optimized Documentation System
        </span>
      </div>
    </div>
  );
};
