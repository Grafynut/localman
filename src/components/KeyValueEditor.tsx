import { Trash } from "lucide-react";
import type { Dispatch, SetStateAction } from "react";
import type { KeyValuePair, Environment } from "../types";
import { emptyKeyValueRow } from "../utils";
import { VariableInput } from "./VariableInput";

type Props = {
  items: KeyValuePair[];
  setItems: Dispatch<SetStateAction<KeyValuePair[]>>;
  environments: Environment[];
  activeEnvId: string | null;
};

export function KeyValueEditor({ items, setItems, environments, activeEnvId }: Props) {
  const updateItem = (
    index: number,
    field: keyof KeyValuePair,
    value: string | boolean,
  ) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    if (
      index === items.length - 1 &&
      field === "key" &&
      String(value).trim() !== ""
    ) {
      newItems.push(emptyKeyValueRow());
    }
    setItems(newItems);
  };

  return (
    <div className="w-full h-full overflow-auto bg-background/20 selection:bg-primary/20">
      <table className="w-full table-fixed border-collapse">
        <thead className="sticky top-0 z-10 bg-surface/50 text-[10px] text-muted font-black uppercase tracking-widest">
          <tr className="border-b border-border">
            <th className="w-12 py-3 border-r border-border"></th>
            <th className="w-[30%] py-3 px-4 border-r border-border text-left">
              Key
            </th>
            <th className="w-[35%] py-3 px-4 border-r border-border text-left">
              Value
            </th>
            <th className="w-[30%] py-3 px-4 border-r border-border text-left">
              Description
            </th>
            <th className="w-12 py-3"></th>
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
              <td className="w-12 border-r border-border align-middle p-0">
                <input
                  value={item.key}
                  onChange={(e) => updateItem(index, "key", e.target.value)}
                  placeholder="Key"
                  className="w-full bg-transparent px-4 py-3 text-[13px] text-gray-100 placeholder-muted/30 focus:outline-none focus:bg-primary/5 font-bold transition-all"
                />
              </td>
              <td className="border-r border-border align-middle p-0">
                <VariableInput
                  value={item.value}
                  onChange={(val) => updateItem(index, "value", val)}
                  placeholder="Value"
                  environments={environments}
                  activeEnvId={activeEnvId}
                  className="w-full bg-transparent px-4 py-3 text-[13px] text-primary/90 placeholder-muted/30 focus:outline-none focus:bg-primary/5 font-mono selection:bg-primary/30 transition-all"
                />
              </td>
              <td className="border-r border-border align-middle p-0">
                <VariableInput
                  value={item.description || ""}
                  onChange={(val) => updateItem(index, "description", val)}
                  placeholder="Description"
                  environments={environments}
                  activeEnvId={activeEnvId}
                  className="w-full bg-transparent px-4 py-3 text-[13px] text-muted placeholder-muted/20 focus:outline-none focus:bg-primary/5 transition-all italic"
                />
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
