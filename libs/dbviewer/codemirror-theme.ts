import { EditorView } from "@codemirror/view";
import { Extension } from "@codemirror/state";

function commonTheme(dark: boolean): Extension {
  return EditorView.theme(
    {
      "&": {
        backgroundColor: "var(--bg-input)",
        color: "var(--fg-primary)",
        height: "100%",
      },
      ".cm-content": {
        caretColor: "var(--accent-cyan)",
        fontFamily: "JetBrains Mono, ui-monospace, monospace",
        fontSize: "13px",
      },
      ".cm-cursor, .cm-dropCursor": {
        borderLeftColor: "var(--accent-cyan)",
      },
      "&.cm-focused .cm-selectionBackground, ::selection": {
        backgroundColor: "var(--accent-cyan-dim)",
      },
      ".cm-gutters": {
        backgroundColor: "var(--bg-input)",
        color: "var(--fg-muted)",
        border: "none",
        borderRight: "1px solid var(--border-default)",
      },
      ".cm-activeLineGutter": {
        backgroundColor: "transparent",
        color: "var(--fg-secondary)",
      },
      ".cm-activeLine": {
        backgroundColor: "color-mix(in oklab, var(--accent-cyan) 6%, transparent)",
      },
      ".cm-matchingBracket, .cm-nonmatchingBracket": {
        outline: "1px solid var(--accent-cyan)",
        backgroundColor: "transparent",
      },
      ".cm-tooltip": {
        backgroundColor: "var(--bg-elevated)",
        color: "var(--fg-primary)",
        border: "1px solid var(--border-default)",
        borderRadius: "8px",
      },
      ".cm-tooltip.cm-tooltip-autocomplete > ul > li[aria-selected]": {
        backgroundColor: "var(--accent-cyan-dim)",
        color: "var(--fg-primary)",
      },
      ".cm-panels": {
        backgroundColor: "var(--bg-elevated)",
        color: "var(--fg-primary)",
      },
    },
    { dark }
  );
}

export const lightTheme: Extension = commonTheme(false);
export const darkTheme: Extension = commonTheme(true);
