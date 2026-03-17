import { Trash, File } from "lucide-react";
import { open } from "@tauri-apps/plugin-dialog";
import type { Dispatch, SetStateAction } from "react";
import type { FormDataEntry, Environment } from "../types";
import { emptyFormDataRow } from "../utils";
import { VariableInput } from "./VariableInput";

type Props = {
  items: FormDataEntry[];
  setItems: Dispatch<SetStateAction<FormDataEntry[]>>;
  environments: Environment[];
  activeEnvId: string | null;
};

export function FormDataEditor({ items, setItems, environments, activeEnvId }: Props) {
  const updateItem = (
    index: number,
    field: keyof FormDataEntry,
    value: string | boolean,
  ) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    if (
      index === items.length - 1 &&
      field === "key" &&
      String(value).trim() !== ""
    ) {
      newItems.push(emptyFormDataRow());
    }
    setItems(newItems);
  };

  const handleFileSelect = async (index: number) => {
    try {
      const selected = await open({
        multiple: false,
        directory: false,
      });
      if (selected && typeof selected === "string") {
        updateItem(index, "value", selected);
      }
    } catch (err) {
      console.error("Failed to select file:", err);
    }
  };

  return (
    <div className="w-full h-full overflow-auto bg-background/20 selection:bg-primary/20">
      <table className="w-full table-fixed border-collapse">
        <thead className="sticky top-0 z-10 bg-surface/50 text-[10px] text-muted font-black uppercase tracking-widest">
          <tr className="border-b border-border">
            <th className="w-10 py-2 border-r border-border"></th>
            <th className="w-[30%] py-2 px-3 border-r border-border text-left">
              Key
            </th>
            <th className="w-[10%] py-2 px-3 border-r border-border text-left">
              Type
            </th>
            <th className="w-[50%] py-2 px-3 border-r border-border text-left">
              Value
            </th>
            <th className="w-10 py-2"></th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, index) => (
            <tr
              key={item.id}
              className="group border-b border-border bg-background/40 hover:bg-surface-hover/20 transition-colors"
            >
              <td className="w-10 py-1 border-r border-border text-center align-middle">
                {item.key ? (
                  <input
                    type="checkbox"
                    checked={item.enabled}
                    onChange={(e) =>
                      updateItem(index, "enabled", e.target.checked)
                    }
                    className="accent-primary w-3.5 h-3.5 cursor-pointer rounded-sm"
                  />
                ) : null}
              </td>
              <td className="border-r border-border align-middle p-0">
                <input
                  value={item.key}
                  onChange={(e) => updateItem(index, "key", e.target.value)}
                  placeholder="Key"
                  className="w-full bg-transparent px-3 py-2 text-[12px] text-gray-100 placeholder-muted/30 focus:outline-none focus:bg-primary/5 font-bold transition-all"
                />
              </td>
              <td className="border-r border-border align-middle p-0">
                <select
                  value={item.type}
                  onChange={(e) => updateItem(index, "type", e.target.value as "text" | "file")}
                  className="w-full bg-transparent px-2 py-2 text-[11px] text-muted font-bold uppercase tracking-wider focus:outline-none bg-surface/10 cursor-pointer"
                >
                  <option value="text">Text</option>
                  <option value="file">File</option>
                </select>
              </td>
              <td className="border-r border-border align-middle p-0">
                <div className="flex items-center w-full">
                  {item.type === "file" ? (
                    <div className="flex-1 flex items-center px-4 py-1.5 space-x-2">
                       <button 
                        onClick={() => handleFileSelect(index)}
                         className="flex items-center space-x-2 bg-surface hover:bg-surface-hover border border-border px-2 py-1 rounded text-[11px] text-gray-300 transition-colors"
                       >
                         <File size={14} className="text-primary" />
                         <span>{item.value ? (item.value.split(/[\\/]/).pop()) : "Select File"}</span>
                       </button>
                       {item.value && (
                         <span className="text-[10px] text-muted truncate max-w-[150px]" title={item.value}>
                           {item.value}
                         </span>
                       )}
                    </div>
                  ) : (
                    <VariableInput
                      value={item.value}
                      onChange={(val) => updateItem(index, "value", val)}
                      placeholder="Value"
                      environments={environments}
                      activeEnvId={activeEnvId}
                      className="w-full bg-transparent px-3 py-2 text-[12px] text-primary/90 placeholder-muted/30 focus:outline-none focus:bg-primary/5 font-mono selection:bg-primary/30 transition-all"
                    />
                  )}
                </div>
              </td>
              <td className="w-10 align-middle text-center">
                {items.length > 1 && item.key ? (
                  <button
                    onClick={() =>
                      setItems(items.filter((_, i) => i !== index))
                    }
                    className=" text-muted hover:text-red-400 p-1 focus:outline-none"
                  >
                    <Trash size={14} />
                  </button>
                ) : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
