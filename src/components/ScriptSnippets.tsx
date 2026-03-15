import { Code, Zap } from "lucide-react";

type Snippet = {
  name: string;
  code: string;
  description: string;
};

const CORRECTED_SNIPPETS: Snippet[] = [
  {
    name: "Test status code is 200",
    code: 'pm.test("Status code is 200", () => {\n  pm.expect(pm.response.code).to.equal(200);\n});',
    description: "Verify if the response status code is 200."
  },
  {
    name: "Check JSON property",
    code: 'pm.test("Check property", () => {\n  const data = pm.response.json();\n  pm.expect(data.id).to.equal(1);\n});',
    description: "Check a property in the JSON response."
  },
  {
    name: "Set Environment Variable",
    code: 'pm.environment.set("token", "my-secret-token");',
    description: "Set an environment variable."
  },
  {
    name: "Set Global Variable",
    code: 'pm.globals.set("baseUrl", "https://api.example.com");',
    description: "Set a global variable."
  },
  {
    name: "Get Variable",
    code: 'const myVar = pm.variables.get("myVar");',
    description: "Get a variable (Env or Global)."
  },
];

type Props = {
  onInsert: (code: string) => void;
};

export function ScriptSnippets({ onInsert }: Props) {
  return (
    <div className="h-full flex flex-col bg-surface-hover/20 border-l border-border rounded-r-lg overflow-hidden">
      <div className="px-4 py-3 border-b border-border bg-surface-hover/30 flex items-center space-x-2">
        <Zap size={14} className="text-primary" />
        <span className="text-[11px] font-black uppercase tracking-widest text-muted">Snippets</span>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-2 custom-scrollbar">
        {CORRECTED_SNIPPETS.map((snippet, idx) => (
          <button
            key={idx}
            onClick={() => onInsert(snippet.code)}
            className="w-full text-left p-2.5 rounded-lg border border-border/50 bg-background/40 hover:bg-surface-hover hover:border-primary/30 transition-all group"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-[12px] font-bold text-gray-200 group-hover:text-primary transition-colors">
                {snippet.name}
              </span>
              <Code size={12} className="text-muted group-hover:text-primary/50" />
            </div>
            <p className="text-[10px] text-muted line-clamp-2 leading-relaxed italic">
              {snippet.description}
            </p>
          </button>
        ))}
      </div>
      <div className="p-3 bg-surface-hover/10 border-t border-border">
        <p className="text-[9px] text-muted leading-tight">
          Click a snippet to insert it into the editor at the current position.
        </p>
      </div>
    </div>
  );
}
