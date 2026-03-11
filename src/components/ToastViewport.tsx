type ToastKind = "success" | "error" | "info";

export type ToastMessage = {
  id: number;
  title: string;
  description?: string;
  kind: ToastKind;
};

type Props = {
  toasts: ToastMessage[];
  onDismiss: (id: number) => void;
};

function toastClass(kind: ToastKind) {
  if (kind === "success") {
    return "border-green-500/40 bg-green-900/20";
  }
  if (kind === "error") {
    return "border-red-500/40 bg-red-900/20";
  }
  return "border-blue-500/40 bg-blue-900/20";
}

export function ToastViewport({ toasts, onDismiss }: Props) {
  return (
    <div className="fixed right-4 bottom-4 z-[100] flex w-[320px] max-w-[90vw] flex-col gap-2 pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`pointer-events-auto rounded-md border px-3 py-2 shadow-md backdrop-blur-sm ${toastClass(toast.kind)}`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[13px] font-semibold text-gray-100">{toast.title}</div>
              {toast.description && <div className="mt-0.5 text-[12px] text-gray-300 break-words">{toast.description}</div>}
            </div>
            <button
              onClick={() => onDismiss(toast.id)}
              className="text-[11px] text-gray-300 hover:text-white"
            >
              Close
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
