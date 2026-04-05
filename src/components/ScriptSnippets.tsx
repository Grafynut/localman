import { useState, useMemo } from "react";
import { Code, Zap, Search, ChevronRight } from "lucide-react";

type Snippet = {
  name: string;
  code: string;
  description: string;
  category: "Response" | "Variables" | "Request" | "Utility";
};

const SNIPPETS: Snippet[] = [
  {
    category: "Response",
    name: "Status code is 200",
    code: 'pm.test("Status code is 200", () => {\n  pm.expect(pm.response.code).to.equal(200);\n});',
    description: "Verify if the response status code is 200."
  },
  {
    category: "Response",
    name: "Check response time",
    code: 'pm.test("Response time is less than 200ms", () => {\n  pm.expect(pm.response.responseTime).to.be.below(200);\n});',
    description: "Verify that the response returns quickly."
  },
  {
    category: "Response",
    name: "JSON body matches value",
    code: 'pm.test("Body matches string", () => {\n  pm.response.to.have.jsonBody("status", "success");\n});',
    description: "Check if a specific field in the JSON response matches."
  },
  {
    category: "Variables",
    name: "Set an environment variable",
    code: 'pm.environment.set("key", "value");',
    description: "Save a value to the current environment."
  },
  {
    category: "Variables",
    name: "Get an environment variable",
    code: 'const val = pm.environment.get("key");',
    description: "Retrieve a value from the current environment."
  },
  {
    category: "Request",
    name: "Send a request",
    code: 'pm.sendRequest("https://postman-echo.com/get", (err, res) => {\n  console.log(res.json());\n});',
    description: "Send an asynchronous request from the script."
  },
  {
    category: "Utility",
    name: "Check JSON schema",
    code: 'const schema = {\n  "type": "object",\n  "properties": {\n    "id": { "type": "number" }\n  }\n};\npm.test("JSON Schema is valid", () => {\n  pm.response.to.have.jsonSchema(schema);\n});',
    description: "Validate the JSON response against a schema."
  }
];

type Props = {
  onInsert: (code: string) => void;
};

export function ScriptSnippets({ onInsert }: Props) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredSnippets = useMemo(() => {
    return SNIPPETS.filter(s => 
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      s.description.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery]);

  const groupedSnippets = useMemo(() => {
    const groups: Record<string, Snippet[]> = {};
    filteredSnippets.forEach(s => {
      if (!groups[s.category]) groups[s.category] = [];
      groups[s.category].push(s);
    });
    return groups;
  }, [filteredSnippets]);

  return (
    <div className="h-full flex flex-col bg-surface/30 border-l border-border/50 rounded-r-lg overflow-hidden backdrop-blur-sm">
      <div className="px-4 py-3 border-b border-border/50 bg-background/50 flex items-center justify-between shrink-0">
        <div className="flex items-center space-x-2">
          <Zap size={14} className="text-primary fill-primary/20" />
          <span className="text-[11px] font-black uppercase tracking-[0.2em] text-primary/80">Snippets</span>
        </div>
        <div className="px-1.5 py-0.5 rounded-full bg-white/5 border border-white/10 text-[9px] text-muted font-mono">
          JS
        </div>
      </div>
      
      <div className="px-3 py-2 border-b border-border/30 bg-background/20 relative group">
        <Search size={12} className="absolute left-5 top-1/2 -translate-y-1/2 text-muted/50 group-focus-within:text-primary transition-colors" />
        <input
          type="text"
          placeholder="Search snippets..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-surface-hover/30 border border-border/20 rounded-md py-1.5 pl-8 pr-3 text-[11px] text-gray-300 placeholder:text-muted/40 focus:outline-none focus:border-primary/30 transition-all font-medium"
        />
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-4 custom-scrollbar bg-background/10">
        {Object.entries(groupedSnippets).length > 0 ? (
          Object.entries(groupedSnippets).map(([category, items]) => (
            <div key={category} className="space-y-1.5">
              <div className="px-2 py-1 flex items-center justify-between">
                <span className="text-[10px] font-bold text-muted uppercase tracking-widest flex items-center gap-1.5">
                  <ChevronRight size={10} className="text-primary/40" />
                  {category}
                </span>
                <div className="h-px flex-1 bg-border/20 ml-2" />
              </div>
              <div className="space-y-1">
                {items.map((snippet, idx) => (
                  <button
                    key={idx}
                    onClick={() => onInsert(snippet.code)}
                    className="w-full text-left p-2 rounded-lg border border-transparent hover:border-primary/20 hover:bg-primary/5 transition-all group relative overflow-hidden"
                  >
                    <div className="flex items-center justify-between mb-0.5 relative z-10">
                      <span className="text-[11px] font-bold text-gray-300 group-hover:text-primary transition-colors">
                        {snippet.name}
                      </span>
                      <Code size={11} className="text-muted/30 group-hover:text-primary/40 transition-colors" />
                    </div>
                    <p className="text-[10px] text-muted/60 line-clamp-2 leading-tight relative z-10 font-medium italic">
                      {snippet.description}
                    </p>
                    <div className="absolute inset-0 bg-gradient-to-r from-primary/0 to-primary/0 group-hover:from-primary/5 transition-all duration-500" />
                  </button>
                ))}
              </div>
            </div>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center py-10 opacity-40">
             <Search size={24} className="mb-2 text-muted" />
             <span className="text-xs italic text-muted">No snippets found</span>
          </div>
        )}
      </div>
      
      <div className="p-3 bg-surface-hover/10 border-t border-border/30">
        <p className="text-[9px] text-muted/50 leading-tight flex items-center gap-2">
          <div className="w-1 h-1 rounded-full bg-primary/40" />
          Click to insert at cursor position.
        </p>
      </div>
    </div>
  );
}
