"use client";

import { forwardRef, useCallback, useEffect, useRef, type UIEvent } from "react";

export interface PreviewViewProps {
  html: string;
  emptyMessage: string;
  onScroll?: (ev: UIEvent<HTMLDivElement>) => void;
  className?: string;
}

/** Mermaid runtime — lazily imported only when the HTML contains mermaid blocks. */
let mermaidModule: typeof import("mermaid") | null = null;
let mermaidLoading: Promise<typeof import("mermaid")> | null = null;

function loadMermaid(): Promise<typeof import("mermaid")> {
  if (mermaidModule) return Promise.resolve(mermaidModule);
  if (!mermaidLoading) {
    mermaidLoading = import("mermaid").then((mod) => {
      mermaidModule = mod;
      mermaidLoading = null;
      return mod;
    });
  }
  return mermaidLoading;
}

export const PreviewView = forwardRef<HTMLDivElement, PreviewViewProps>(
  ({ html, emptyMessage, onScroll, className = "" }, ref) => {
    const internalRef = useRef<HTMLDivElement | null>(null);

    const setRefs = useCallback(
      (node: HTMLDivElement | null) => {
        internalRef.current = node;
        if (typeof ref === "function") {
          ref(node);
        } else if (ref) {
          (ref as React.MutableRefObject<HTMLDivElement | null>).current = node;
        }
      },
      [ref]
    );

    // Detect and render mermaid diagrams after HTML is committed to DOM.
    // The module is lazy-loaded only when <pre class="mermaid"> blocks exist.
    useEffect(() => {
      const node = internalRef.current;
      if (!node || !html) return;

      const blocks = node.querySelectorAll<HTMLPreElement>("pre.mermaid");
      if (blocks.length === 0) return;

      let cancelled = false;

      const renderDiagrams = async () => {
        try {
          const mermaid = await loadMermaid();

          // Re-check: the DOM may have changed while we were loading
          if (cancelled || !internalRef.current) return;
          const currentBlocks = internalRef.current.querySelectorAll<HTMLPreElement>("pre.mermaid");
          if (currentBlocks.length === 0) return;

          mermaid.default.initialize({
            startOnLoad: false,
            theme: document.documentElement.classList.contains("dark") ? "dark" : "default",
            securityLevel: "strict",
          });

          // Assign stable IDs so mermaid can track incremental updates
          currentBlocks.forEach((b, i) => {
            if (!b.id) b.id = `mermaid-${Date.now()}-${i}`;
          });

          await mermaid.default.run({ nodes: Array.from(currentBlocks) });
        } catch (err) {
          if (!cancelled) {
            console.error("Mermaid render failed:", err);
          }
        }
      };

      // Micro-delay to let the layout commit settle before SVG calculation
      const timer = setTimeout(renderDiagrams, 30);
      return () => {
        cancelled = true;
        clearTimeout(timer);
      };
    }, [html]);

    if (!html) {
      return (
        <div
          ref={setRefs}
          className={`flex items-center justify-center min-h-[50vh] bg-bg-input border border-border-default rounded-lg text-fg-muted text-sm ${className}`}
        >
          {emptyMessage}
        </div>
      );
    }

    return (
      <div
        ref={setRefs}
        onScroll={onScroll}
        className={`prose-md min-h-[50vh] bg-bg-input border border-border-default rounded-lg p-4 overflow-x-auto ${className}`}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  }
);

PreviewView.displayName = "PreviewView";
