import { useEffect, useCallback, useRef, useState } from 'react';
import type { Overworld } from '../world/types';

/** ASCII glyph for each biome */
const BIOME_CHAR: Record<string, string> = {
  water: '~',
  mountain: '^',
  desert: '.',
  swamp: '"',
  plains: ',',
};

const SWIPE_THRESHOLD = 25;

/**
 * Courier New character width / font-size ratio (~0.601).
 * Used by ResizeObserver to compute the largest font that still fits the grid.
 */
const CHAR_ASPECT = 0.601;

/** Desktop default font-size in px (≈ 0.85rem). Font never exceeds this. */
const MAX_FONT_SIZE = 13.6;

/** Line-height multiplier — matches CSS line-height: 1.25. */
const LINE_HEIGHT = 1.25;

type Props = {
  world: Overworld;
  cursorX: number;
  cursorY: number;
  onMoveCursor: (dx: number, dy: number) => void;
  onSetCursor: (x: number, y: number) => void;
};

export function GridView({ world, cursorX, cursorY, onMoveCursor, onSetCursor }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const preRef = useRef<HTMLPreElement>(null);
  // Invisible single-char span — measures actual rendered char dimensions.
  const charRef = useRef<HTMLSpanElement>(null);
  const pointerStart = useRef<{ x: number; y: number } | null>(null);

  const [fontSize, setFontSize] = useState(MAX_FONT_SIZE);

  // ---- Dynamic font-size: fit grid into wrapper via ResizeObserver --------
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      if (width <= 0 || height <= 0) return;
      // Compute max font-size that keeps all cols and rows inside the wrapper.
      const fsByW = width / (world.width * CHAR_ASPECT);
      const fsByH = height / (world.height * LINE_HEIGHT);
      setFontSize(Math.max(1, Math.min(fsByW, fsByH, MAX_FONT_SIZE)));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [world.width, world.height]);

  // ---- Keyboard -----------------------------------------------------------
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
          e.preventDefault();
          onMoveCursor(0, -1);
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          e.preventDefault();
          onMoveCursor(0, 1);
          break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
          e.preventDefault();
          onMoveCursor(-1, 0);
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          e.preventDefault();
          onMoveCursor(1, 0);
          break;
      }
    },
    [onMoveCursor],
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // ---- Pointer events (swipe + tap-to-jump) --------------------------------
  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLPreElement>) => {
    pointerStart.current = { x: e.clientX, y: e.clientY };
    e.currentTarget.setPointerCapture(e.pointerId);
  }, []);

  const handlePointerUp = useCallback(
    (e: React.PointerEvent<HTMLPreElement>) => {
      if (!pointerStart.current) return;
      const dx = e.clientX - pointerStart.current.x;
      const dy = e.clientY - pointerStart.current.y;
      pointerStart.current = null;

      const absDx = Math.abs(dx);
      const absDy = Math.abs(dy);

      if (absDx < SWIPE_THRESHOLD && absDy < SWIPE_THRESHOLD) {
        // Tap: jump cursor to tapped cell using measured char dimensions.
        if (!preRef.current || !charRef.current) return;
        const charW = charRef.current.offsetWidth;
        const charH = charRef.current.offsetHeight;
        if (charW <= 0 || charH <= 0) return;
        const rect = preRef.current.getBoundingClientRect();
        const style = window.getComputedStyle(preRef.current);
        const relX = e.clientX - rect.left - parseFloat(style.paddingLeft);
        const relY = e.clientY - rect.top - parseFloat(style.paddingTop);
        onSetCursor(Math.floor(relX / charW), Math.floor(relY / charH));
      } else {
        // Swipe: move 1 step in dominant direction.
        if (absDx > absDy) {
          onMoveCursor(dx > 0 ? 1 : -1, 0);
        } else {
          onMoveCursor(0, dy > 0 ? 1 : -1);
        }
      }
    },
    [onMoveCursor, onSetCursor],
  );

  const handlePointerCancel = useCallback(() => {
    pointerStart.current = null;
  }, []);

  // ---- Render -------------------------------------------------------------
  const rows: string[] = [];
  for (let y = 0; y < world.height; y++) {
    let row = '';
    for (let x = 0; x < world.width; x++) {
      if (x === cursorX && y === cursorY) {
        row += '@';
      } else {
        const cell = world.cells[y * world.width + x];
        row += BIOME_CHAR[cell.biome] ?? '?';
      }
    }
    rows.push(row);
  }

  // Applied to both pre and the measurement span so tap coords are accurate.
  const cellStyle: React.CSSProperties = {
    fontSize: `${fontSize}px`,
    lineHeight: String(LINE_HEIGHT),
  };

  return (
    <div ref={wrapRef} className="grid-wrap">
      {/* Hidden span — actual rendered char width/height for tap-to-jump. */}
      <span ref={charRef} className="char-measure" style={cellStyle}>M</span>
      <pre
        ref={preRef}
        className="grid-view"
        style={cellStyle}
        tabIndex={0}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
      >
        {rows.join('\n')}
      </pre>
    </div>
  );
}
