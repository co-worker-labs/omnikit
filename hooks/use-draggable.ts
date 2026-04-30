"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { STORAGE_KEYS } from "../libs/storage-keys";

interface Position {
  x: number;
  y: number;
}

interface UseDraggableOptions {
  storageKey: keyof typeof STORAGE_KEYS;
  defaultPosition: Position;
}

const DRAG_THRESHOLD = 5;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function constrainToViewport(pos: Position, width: number, height: number): Position {
  const maxX = Math.max(0, window.innerWidth - width);
  const maxY = Math.max(0, window.innerHeight - height);
  return {
    x: clamp(pos.x, 0, maxX),
    y: clamp(pos.y, 0, maxY),
  };
}

function snapToNearestEdge(pos: Position, width: number, height: number): Position {
  const distLeft = pos.x;
  const distRight = window.innerWidth - (pos.x + width);
  const distTop = pos.y;
  const distBottom = window.innerHeight - (pos.y + height);

  const minDist = Math.min(distLeft, distRight, distTop, distBottom);

  const maxX = Math.max(0, window.innerWidth - width);
  const maxY = Math.max(0, window.innerHeight - height);

  if (minDist === distLeft) {
    return { x: 0, y: clamp(pos.y, 0, maxY) };
  }
  if (minDist === distRight) {
    return { x: maxX, y: clamp(pos.y, 0, maxY) };
  }
  if (minDist === distTop) {
    return { x: clamp(pos.x, 0, maxX), y: 0 };
  }
  return { x: clamp(pos.x, 0, maxX), y: maxY };
}

function loadPosition(storageKey: string, defaultPosition: Position): Position {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return defaultPosition;
    const parsed = JSON.parse(raw);
    if (typeof parsed.x === "number" && typeof parsed.y === "number") {
      return parsed;
    }
  } catch {
    // corrupted or unavailable
  }
  return defaultPosition;
}

function savePosition(storageKey: string, pos: Position): void {
  try {
    localStorage.setItem(storageKey, JSON.stringify(pos));
  } catch {
    // quota exceeded or unavailable
  }
}

export function useDraggable(options: UseDraggableOptions) {
  const { storageKey, defaultPosition } = options;
  const resolvedKey = STORAGE_KEYS[storageKey];

  const elementRef = useRef<HTMLDivElement | null>(null);
  const [position, setPosition] = useState<Position>(() => {
    if (typeof window === "undefined") return defaultPosition;
    const saved = loadPosition(resolvedKey, defaultPosition);
    return saved;
  });
  const [isDragging, setIsDragging] = useState(false);
  const [isSnapping, setIsSnapping] = useState(false);

  const dragState = useRef<{
    startX: number;
    startY: number;
    originX: number;
    originY: number;
    moved: boolean;
    pointerId: number | null;
  }>({
    startX: 0,
    startY: 0,
    originX: 0,
    originY: 0,
    moved: false,
    pointerId: null,
  });

  // Re-constrain on resize
  useEffect(() => {
    const handleResize = () => {
      if (!elementRef.current) return;
      const { offsetWidth, offsetHeight } = elementRef.current;
      setPosition((prev) => {
        const constrained = constrainToViewport(prev, offsetWidth, offsetHeight);
        if (constrained.x !== prev.x || constrained.y !== prev.y) {
          savePosition(resolvedKey, constrained);
          return constrained;
        }
        return prev;
      });
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [resolvedKey]);

  // Constrain initial position on mount once element has dimensions
  useEffect(() => {
    if (!elementRef.current) return;
    const { offsetWidth, offsetHeight } = elementRef.current;
    setPosition((prev) => constrainToViewport(prev, offsetWidth, offsetHeight));
  }, []);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      // Only respond to primary button / single touch
      if (!e.isPrimary) return;
      // Don't initiate drag from interactive children (buttons, dropdown triggers)
      const target = e.target as HTMLElement;
      if (
        target.closest("button") ||
        target.closest("[role='menu']") ||
        target.closest("[role='listbox']")
      )
        return;

      e.currentTarget.setPointerCapture(e.pointerId);
      dragState.current = {
        startX: e.clientX,
        startY: e.clientY,
        originX: position.x,
        originY: position.y,
        moved: false,
        pointerId: e.pointerId,
      };
    },
    [position.x, position.y]
  );

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const handlePointerMove = (e: PointerEvent) => {
      const state = dragState.current;
      if (state.pointerId === null || e.pointerId !== state.pointerId) return;

      const dx = e.clientX - state.startX;
      const dy = e.clientY - state.startY;

      if (!state.moved) {
        if (Math.abs(dx) < DRAG_THRESHOLD && Math.abs(dy) < DRAG_THRESHOLD) return;
        state.moved = true;
        setIsDragging(true);
        setIsSnapping(false);
      }

      const { offsetWidth, offsetHeight } = element;
      const newX = clamp(state.originX + dx, 0, Math.max(0, window.innerWidth - offsetWidth));
      const newY = clamp(state.originY + dy, 0, Math.max(0, window.innerHeight - offsetHeight));

      setPosition({ x: newX, y: newY });
    };

    const handlePointerUp = (e: PointerEvent) => {
      const state = dragState.current;
      if (state.pointerId === null || e.pointerId !== state.pointerId) return;

      if (state.moved) {
        const { offsetWidth, offsetHeight } = element;
        const snapped = snapToNearestEdge(position, offsetWidth, offsetHeight);
        setIsSnapping(true);
        setPosition(snapped);
        savePosition(resolvedKey, snapped);
      }

      setIsDragging(false);
      state.pointerId = null;
    };

    element.addEventListener("pointermove", handlePointerMove);
    element.addEventListener("pointerup", handlePointerUp);
    element.addEventListener("pointercancel", handlePointerUp);

    return () => {
      element.removeEventListener("pointermove", handlePointerMove);
      element.removeEventListener("pointerup", handlePointerUp);
      element.removeEventListener("pointercancel", handlePointerUp);
    };
  }, [position, resolvedKey]);

  const style: React.CSSProperties = {
    position: "fixed",
    transform: `translate(${position.x}px, ${position.y}px)`,
    cursor: isDragging ? "grabbing" : "grab",
    touchAction: "none",
    userSelect: isDragging ? "none" : "auto",
    opacity: isDragging ? 0.9 : 1,
    ...(isSnapping && !isDragging ? { transition: "transform 150ms ease-out" } : {}),
    top: 0,
    left: 0,
  };

  return {
    position,
    isDragging,
    isSnapping,
    ref: elementRef,
    style,
    handlePointerDown,
  };
}
