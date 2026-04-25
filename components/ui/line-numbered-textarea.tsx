"use client";

import {
  forwardRef,
  useRef,
  type TextareaHTMLAttributes,
  type ReactNode,
  type UIEvent,
} from "react";

type Props = Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "wrap"> & {
  label?: ReactNode;
  showLineNumbers: boolean;
};

export const LineNumberedTextarea = forwardRef<HTMLTextAreaElement, Props>(
  ({ label, className = "", showLineNumbers, value, onScroll, ...rest }, ref) => {
    const gutterRef = useRef<HTMLDivElement | null>(null);

    if (!showLineNumbers) {
      return (
        <div className="flex flex-col w-full h-full">
          {label && (
            <label className="block text-sm font-medium text-fg-secondary mb-1 flex-shrink-0">
              {label}
            </label>
          )}
          <textarea
            ref={ref}
            value={value}
            onScroll={onScroll}
            className={`w-full flex-1 min-h-0 bg-bg-input border border-border-default rounded-lg px-3 py-2 text-fg-primary placeholder:text-fg-muted focus:outline-none focus:border-accent-cyan focus:shadow-input-focus transition-all duration-200 resize-none scrollbar-thin ${className}`}
            {...rest}
          />
        </div>
      );
    }

    const text = typeof value === "string" ? value : Array.isArray(value) ? value.join("") : "";
    const lineCount = Math.max(1, text.split("\n").length);

    function handleScroll(e: UIEvent<HTMLTextAreaElement>) {
      if (gutterRef.current) {
        gutterRef.current.scrollTop = e.currentTarget.scrollTop;
      }
      if (onScroll) onScroll(e);
    }

    return (
      <div className="flex flex-col w-full h-full">
        {label && (
          <label className="block text-sm font-medium text-fg-secondary mb-1 flex-shrink-0">
            {label}
          </label>
        )}
        <div className="flex w-full flex-1 min-h-0 bg-bg-input border border-border-default rounded-lg overflow-hidden focus-within:border-accent-cyan focus-within:shadow-input-focus transition-all duration-200">
          <div
            ref={gutterRef}
            aria-hidden="true"
            className="w-12 flex-shrink-0 h-full overflow-hidden border-r border-border-default text-end pr-2 pl-2 select-none text-fg-muted text-sm font-mono leading-5 py-2"
          >
            {Array.from({ length: lineCount }, (_, i) => (
              <div key={i + 1}>{i + 1}</div>
            ))}
          </div>
          <textarea
            ref={ref}
            wrap="off"
            value={value}
            onScroll={handleScroll}
            className={`flex-1 min-w-0 h-full bg-bg-input px-3 py-2 text-fg-primary placeholder:text-fg-muted focus:outline-none resize-none font-mono text-sm leading-5 overflow-auto scrollbar-thin ${className}`}
            {...rest}
          />
        </div>
      </div>
    );
  }
);

LineNumberedTextarea.displayName = "LineNumberedTextarea";
