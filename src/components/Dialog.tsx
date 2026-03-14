import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

type DialogProps = {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  width?: string;
};

export function Dialog({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  width = "450px",
}: DialogProps) {
  const [shouldRender, setShouldRender] = useState(isOpen);

  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
      document.body.style.overflow = "hidden";
    } else {
      const timer = setTimeout(() => {
        setShouldRender(false);
        document.body.style.overflow = "";
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  if (!shouldRender) return null;

  return createPortal(
    <div className={`fixed inset-0 z-[100] flex items-center justify-center p-4 transition-all duration-200 ${isOpen ? "opacity-100" : "opacity-0"}`}>
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Content */}
      <div 
        style={{ width }}
        className={`relative bg-[#1e1e1e] border border-border rounded-xl shadow-2xl overflow-hidden transition-all duration-200 ${
          isOpen ? "scale-100 translate-y-0" : "scale-95 translate-y-4"
        }`}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-surface/50">
          <h3 className="text-[15px] font-black uppercase tracking-wider text-gray-100">{title}</h3>
          <button 
            onClick={onClose}
            className="p-1 hover:bg-surface-hover rounded-md text-muted hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>
        
        <div className="px-6 py-6">
          {description && (
            <p className="text-[13px] text-muted mb-6 leading-relaxed font-medium">
              {description}
            </p>
          )}
          {children}
        </div>
        
        {footer && (
          <div className="px-6 py-4 bg-surface/30 border-t border-border flex justify-end space-x-3">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}

type PromptDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (value: string) => void;
  title: string;
  description?: string;
  defaultValue?: string;
  confirmLabel?: string;
  placeholder?: string;
};

export function PromptDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  defaultValue = "",
  confirmLabel = "Confirm",
  placeholder = "Enter value...",
}: PromptDialogProps) {
  const [value, setValue] = useState(defaultValue);

  useEffect(() => {
    if (isOpen) setValue(defaultValue);
  }, [isOpen, defaultValue]);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    onConfirm(value);
    onClose();
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      description={description}
      footer={
        <>
          <button 
            onClick={onClose}
            className="px-4 py-2 text-[12px] font-bold text-muted hover:text-white transition-colors uppercase tracking-widest"
          >
            Cancel
          </button>
          <button 
            onClick={() => handleSubmit()}
            disabled={!value.trim()}
            className="px-5 py-2 bg-primary hover:bg-primary-hover text-white text-[12px] font-black rounded-md transition-all active:scale-95 shadow-lg shadow-primary/20 disabled:opacity-50 disabled:grayscale uppercase tracking-widest"
          >
            {confirmLabel}
          </button>
        </>
      }
    >
      <form onSubmit={handleSubmit}>
        <input
          autoFocus
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={placeholder}
          className="w-full bg-background border border-border rounded-lg px-4 py-2.5 text-[14px] text-gray-100 focus:outline-none focus:border-primary/50 focus:ring-4 focus:ring-primary/5 transition-all font-medium"
        />
      </form>
    </Dialog>
  );
}

type ConfirmDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmLabel?: string;
  isDestructive?: boolean;
};

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "Confirm",
  isDestructive = false,
}: ConfirmDialogProps) {
  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      description={description}
      footer={
        <>
          <button 
            onClick={onClose}
            className="px-4 py-2 text-[12px] font-bold text-muted hover:text-white transition-colors uppercase tracking-widest"
          >
            Cancel
          </button>
          <button 
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={`px-5 py-2 text-white text-[12px] font-black rounded-md transition-all active:scale-95 shadow-lg uppercase tracking-widest ${
              isDestructive 
                ? "bg-red-500 hover:bg-red-600 shadow-red-500/20" 
                : "bg-primary hover:bg-primary-hover shadow-primary/20"
            }`}
          >
            {confirmLabel}
          </button>
        </>
      }
    />
  );
}
