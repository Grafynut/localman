import { MoreHorizontal } from "lucide-react";
import type { Dispatch, SetStateAction } from "react";
import type { KeyValuePair } from "../types";
import { emptyKeyValueRow } from "../utils";

type Props = {
  items: KeyValuePair[];
  setItems: Dispatch<SetStateAction<KeyValuePair[]>>;
};

export function KeyValueEditor({ items, setItems }: Props) {
  const updateItem = (index: number, field: keyof KeyValuePair, value: string | boolean) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    if (index === items.length - 1 && field === "key" && String(value).trim() !== "") {
      newItems.push(emptyKeyValueRow());
    }
    setItems(newItems);
  };

  return (
    <div className="flex flex-col w-full h-full overflow-y-auto bg-background/50">
      <div className="flex w-full border-b border-border text-[11px] text-muted font-medium bg-surface/30">
        <div className="w-10 py-1.5 flex items-center justify-center border-r border-border"></div>
        <div className="flex-[1.5] py-1.5 px-3 border-r border-border">Key</div>
        <div className="flex-[2] py-1.5 px-3 border-r border-border">Value</div>
        <div className="flex-1 py-1.5 px-3 border-r border-border">Description</div>
        <div className="w-10 flex items-center justify-center"></div>
      </div>
      <div className="flex flex-col">
        {items.map((item, index) => (
          <div key={item.id} className="flex w-full border-b border-border group bg-transparent hover:bg-surface/50">
            <div className="w-10 py-1 flex items-center justify-center border-r border-border">
              {item.key && (
                <input
                  type="checkbox"
                  checked={item.enabled}
                  onChange={(e) => updateItem(index, "enabled", e.target.checked)}
                  className="accent-primary w-3.5 h-3.5 cursor-pointer rounded-sm"
                />
              )}
            </div>
            <div className="flex-[1.5] border-r border-border relative">
              <input
                value={item.key}
                onChange={(e) => updateItem(index, "key", e.target.value)}
                placeholder="Key"
                className="w-full bg-transparent px-3 py-1.5 text-[13px] text-gray-200 placeholder-muted focus:outline-none focus:bg-surface/30 font-mono"
              />
            </div>
            <div className="flex-[2] border-r border-border relative">
              <input
                value={item.value}
                onChange={(e) => updateItem(index, "value", e.target.value)}
                placeholder="Value"
                className="w-full bg-transparent px-3 py-1.5 text-[13px] text-[#ce9178] placeholder-muted focus:outline-none focus:bg-surface/30 font-mono"
              />
            </div>
            <div className="flex-1 border-r border-border">
              <input
                value={item.description || ""}
                onChange={(e) => updateItem(index, "description", e.target.value)}
                placeholder="Description"
                className="w-full bg-transparent px-3 py-1.5 text-[13px] text-gray-400 placeholder-muted focus:outline-none focus:bg-surface/30"
              />
            </div>
            <div className="w-10 flex items-center justify-center">
              {items.length > 1 && item.key && (
                <button
                  onClick={() => setItems(items.filter((_, i) => i !== index))}
                  className="opacity-0 group-hover:opacity-100 text-muted hover:text-red-400 p-1 focus:outline-none"
                >
                  <MoreHorizontal size={14} />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
