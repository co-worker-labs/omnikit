# Draggable FloatingToolbar — Design Spec

**Date**: 2026-04-30
**Status**: Approved

## Summary

Allow users to drag the FloatingToolbar to reposition it when in fullscreen mode. The toolbar snaps to the nearest screen edge on release and persists its position across sessions via localStorage.

## Context

The FloatingToolbar is only rendered in fullscreen mode (no Header/Footer). It currently sits fixed at `top-3 right-3` with no way to move it. Some tools (e.g. Markdown editor, Diff) have content that the toolbar may overlap. Repositioning solves this.

## Requirements

1. **Draggable area**: The entire toolbar surface is the drag target.
2. **Click vs drag**: Moving < 5px after pointer-down is a click (button fires normally). ≥ 5px initiates a drag.
3. **Edge snap**: On pointer-up, the toolbar snaps to the nearest screen edge (top/bottom/left/right), keeping the perpendicular axis coordinate unchanged.
4. **Viewport constraint**: The toolbar cannot be dragged outside the viewport at any point.
5. **Position persistence**: After snapping, the final position is saved to localStorage. On mount, the saved position is restored (re-constrained to viewport; if out of bounds, reset to default).
6. **Resize handling**: On window resize, the position is re-constrained to remain within the viewport.
7. **Touch support**: Pointer Events API ensures both mouse and touch work.
8. **No new dependencies**: Implemented as a custom React hook.

## Approach

Custom `useDraggable` hook with Pointer Events. Zero external dependencies.

### Why not a library (@dnd-kit)?

- The feature is a simple reposition, not a sortable/droppable scenario.
- Adds ~15KB gzipped for trivial functionality.
- Conflicts with the project's "less is more" philosophy.

### Why `fixed` + `transform` over `absolute` + `top/left`?

- `transform` is GPU-accelerated; changing `top`/`left` triggers layout reflow.
- `fixed` positioning is relative to the viewport — simpler math, no offsetParent issues.
- The toolbar already uses `position: fixed`.

## Design

### New file: `hooks/use-draggable.ts`

```
Interface: UseDraggableOptions
  - storageKey: string           // localStorage key
  - defaultPosition: { x, y }   // fallback if no saved position

Interface: UseDraggableReturn
  - position: { x, y }
  - isDragging: boolean
  - bind: {
      onPointerDown: (e) => void
      style: CSSProperties       // position: fixed, transform, cursor, touch-action
    }
```

**Internal logic**:

1. **Initialization**: Read saved position from localStorage. If missing or out of viewport bounds, use `defaultPosition`. Re-constrain to current viewport.

2. **Pointer down**: Record start position (pointer coords + current translate). Set `pointerCapture` for reliable tracking.

3. **Pointer move**: Calculate delta from start. If total displacement < 5px, do nothing (still in click territory). Once ≥ 5px, set `isDragging = true`, update transform = start translate + delta, clamped to viewport bounds.

4. **Pointer up**: If dragging, snap to nearest edge. Save snapped position to localStorage. Reset `isDragging`.

5. **Resize**: Listen to `resize` events. Re-constrain current position to viewport. Save if position changed.

**Edge snap algorithm**:

- Calculate distance from toolbar center to all 4 viewport edges.
- Pick the nearest edge.
- Move toolbar so its nearest side aligns with that viewport edge.
- Keep the perpendicular axis unchanged.

**Viewport constraint**: At every position update, clamp `x` to `[0, window.innerWidth - toolbarWidth]` and `y` to `[0, window.innerHeight - toolbarHeight]`.

### Modified file: `components/floating-toolbar.tsx`

- Remove `top-3 right-3` from outer div classes.
- Call `useDraggable({ storageKey: STORAGE_KEYS.floatingToolbarPosition, defaultPosition: computedTopRight })`.
- Spread `bind` props onto outer div (style + onPointerDown).
- `defaultPosition` computed from `window.innerWidth - elementWidth - 12, 12` to match current visual position.

### Modified file: `libs/storage-keys.ts`

Add:

```ts
floatingToolbarPosition: "okrun:ftp",
```

### Unchanged files

- `hooks/use-fullscreen.ts` — no changes needed.
- `components/layout.tsx` — no changes needed.
- All page components — no changes needed.

## Interaction Details

| State      | Cursor     | Visual                      |
| ---------- | ---------- | --------------------------- |
| Idle       | `grab`     | Normal appearance           |
| Hover      | `grab`     | Normal appearance           |
| Dragging   | `grabbing` | Slight opacity change (0.9) |
| After snap | `grab`     | Smooth transition (150ms)   |

The snap animation uses CSS `transition: transform 150ms ease-out`, added only during the snap phase (not during active drag, to avoid lag).

## Edge Cases

- **Window resize**: Position re-constrained immediately. If toolbar would be off-screen, it moves to the nearest valid position.
- **Very small viewport**: If viewport is smaller than toolbar width/height, toolbar is positioned at (0, 0) with overflow visible.
- **localStorage corrupted/missing**: Falls back to `defaultPosition`.
- **Rapid click-drag-click**: Each pointer-down starts fresh; state is not carried between interactions.
- **Multiple pointers**: First pointer captured wins; subsequent pointers ignored until release.

## Out of Scope

- Non-fullscreen toolbar dragging (toolbar only exists in fullscreen).
- Toolbar orientation change (always horizontal).
- Multiple toolbar positions per page/tool.
- Keyboard repositioning.
