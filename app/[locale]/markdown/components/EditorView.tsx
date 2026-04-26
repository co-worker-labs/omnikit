"use client";

import { useRef, type KeyboardEvent } from "react";
import { LineNumberedTextarea } from "../../../../components/ui/line-numbered-textarea";

const TAB_INDENT = "  "; // two spaces

export interface EditorViewProps {
  value: string;
  onChange: (next: string) => void;
  placeholder: string;
  scrollRef?: React.RefObject<HTMLTextAreaElement | null>;
  onScroll?: (ev: React.UIEvent<HTMLTextAreaElement>) => void;
}

export function EditorView({ value, onChange, placeholder, scrollRef, onScroll }: EditorViewProps) {
  const localRef = useRef<HTMLTextAreaElement | null>(null);
  const ref = scrollRef ?? localRef;

  const lineCount = value.split("\n").length;
  const showLineNumbers = lineCount <= 5000 && value.length < 512 * 1024;

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key !== "Tab") return;
    e.preventDefault();
    const ta = e.currentTarget;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;

    if (!e.shiftKey && start === end) {
      // Simple insert
      const next = value.slice(0, start) + TAB_INDENT + value.slice(end);
      onChange(next);
      // Restore caret after React updates DOM
      requestAnimationFrame(() => {
        ta.selectionStart = ta.selectionEnd = start + TAB_INDENT.length;
      });
      return;
    }

    // Indent or dedent the selected line range
    const before = value.slice(0, start);
    const lineStart = before.lastIndexOf("\n") + 1;
    const block = value.slice(lineStart, end);
    const lines = block.split("\n");

    let modified: string[];
    let delta = 0;
    if (e.shiftKey) {
      // Dedent: strip up to 2 leading spaces per line
      modified = lines.map((line) => {
        if (line.startsWith(TAB_INDENT)) {
          delta -= TAB_INDENT.length;
          return line.slice(TAB_INDENT.length);
        }
        if (line.startsWith(" ")) {
          delta -= 1;
          return line.slice(1);
        }
        return line;
      });
    } else {
      // Indent
      modified = lines.map((line) => {
        delta += TAB_INDENT.length;
        return TAB_INDENT + line;
      });
    }

    const next = value.slice(0, lineStart) + modified.join("\n") + value.slice(end);
    onChange(next);
    requestAnimationFrame(() => {
      const firstLineDelta = e.shiftKey
        ? -Math.min(TAB_INDENT.length, lines[0].match(/^ */)![0].length)
        : TAB_INDENT.length;
      ta.selectionStart = start + firstLineDelta;
      ta.selectionEnd = end + delta;
    });
  }

  return (
    <LineNumberedTextarea
      ref={ref}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={handleKeyDown}
      onScroll={onScroll}
      placeholder={placeholder}
      showLineNumbers={showLineNumbers}
      spellCheck={false}
      className="h-full"
    />
  );
}
