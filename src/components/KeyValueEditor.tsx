import { Trash } from "lucide-react";
import type { Dispatch, SetStateAction } from "react";
import type { KeyValuePair } from "../types";
import { emptyKeyValueRow } from "../utils";

type Props = {
  items: KeyValuePair[];
  setItems: Dispatch<SetStateAction<KeyValuePair[]>>;
};

export function KeyValueEditor({ items, setItems }: Props) {
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
    <div className="w-full h-full overflow-auto bg-background/50">
      <table className="w-full table-fixed border-collapse">
        <thead className="sticky top-0 z-10 bg-surface/30 text-[11px] text-muted font-medium">
          <tr className="border-b border-border">
            <th className="w-10 py-1.5 border-r border-border"></th>
            <th className="w-[28%] py-1.5 px-3 border-r border-border text-left">
              Key
            </th>
            <th className="w-[36%] py-1.5 px-3 border-r border-border text-left">
              Value
            </th>
            <th className="w-[24%] py-1.5 px-3 border-r border-border text-left">
              Description
            </th>
            <th className="w-10 py-1.5"></th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, index) => (
            <tr
              key={item.id}
              className="group border-b border-border hover:bg-surface/50"
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
                  className="w-full bg-transparent px-3 py-1.5 text-[13px] text-gray-200 placeholder-muted focus:outline-none focus:bg-surface/30 font-mono"
                />
              </td>
              <td className="border-r border-border align-middle p-0">
                <input
                  value={item.value}
                  onChange={(e) => updateItem(index, "value", e.target.value)}
                  placeholder="Value"
                  className="w-full bg-transparent px-3 py-1.5 text-[13px] text-[#ce9178] placeholder-muted focus:outline-none focus:bg-surface/30 font-mono"
                />
              </td>
              <td className="border-r border-border align-middle p-0">
                <input
                  value={item.description || ""}
                  onChange={(e) =>
                    updateItem(index, "description", e.target.value)
                  }
                  placeholder="Description"
                  className="w-full bg-transparent px-3 py-1.5 text-[13px] text-gray-400 placeholder-muted focus:outline-none focus:bg-surface/30"
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
