"use client";

import { forwardRef, type UIEvent } from "react";

export interface PreviewViewProps {
  html: string;
  emptyMessage: string;
  onScroll?: (ev: UIEvent<HTMLDivElement>) => void;
  className?: string;
}

export const PreviewView = forwardRef<HTMLDivElement, PreviewViewProps>(
  ({ html, emptyMessage, onScroll, className = "" }, ref) => {
    if (!html) {
      return (
        <div
          ref={ref}
          className={`flex items-center justify-center h-full bg-bg-input border border-border-default rounded-lg text-fg-muted text-sm ${className}`}
        >
          {emptyMessage}
        </div>
      );
    }

    return (
      <div
        ref={ref}
        onScroll={onScroll}
        className={`prose-md h-full overflow-auto bg-bg-input border border-border-default rounded-lg p-4 scrollbar-thin ${className}`}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  }
);

PreviewView.displayName = "PreviewView";
