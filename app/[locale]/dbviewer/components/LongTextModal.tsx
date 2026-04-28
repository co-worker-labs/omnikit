"use client";

import { Dialog, DialogPanel, DialogTitle } from "@headlessui/react";
import { X } from "lucide-react";
import { CopyButton } from "../../../../components/ui/copy-btn";

interface LongTextModalProps {
  text: string;
  open: boolean;
  onClose: () => void;
}

export function LongTextModal({ text, open, onClose }: LongTextModalProps) {
  return (
    <Dialog open={open} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/40" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <DialogPanel className="w-full max-w-3xl rounded-xl border border-border-default bg-bg-elevated shadow-2xl">
          <div className="flex items-center justify-between border-b border-border-default px-4 py-3">
            <DialogTitle className="text-sm font-medium text-fg-primary">Full text</DialogTitle>
            <div className="flex items-center gap-2">
              <CopyButton getContent={() => text} />
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg p-1 text-fg-muted hover:text-fg-primary transition-colors"
              >
                <X size={16} />
              </button>
            </div>
          </div>
          <div className="max-h-[70vh] overflow-auto p-4">
            <pre className="whitespace-pre-wrap break-words font-mono text-xs text-fg-primary leading-relaxed">
              {text}
            </pre>
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  );
}
