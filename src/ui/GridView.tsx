import { useEffect, useCallback, useRef } from 'react';
import type { Overworld } from '../world/types';

/** ASCII glyph for each biome */
const BIOME_CHAR: Record<string, string> = {
  water: '~',
  mountain: '^',
  desert: '.',
  swamp: '"',
  plains: ',',
};

/** Minimum pointer travel to be treated as a swipe rather than a tap. */
const SWIPE_THRESHOLD = 25;

type Props = {
  world: Overworld;
  cursorX: number;
  cursorY: number;
  onMoveCursor: (dx: number, dy: number) => void;
  onSetCursor: (x: number, y: number) => void;
};

export function GridView({ world, cursorX, cursorY, onMoveCursor, onSetCursor }: Props) {
  const preRef = useRef<HTMLPreElement>(null);
  // Hidden single-char span used to measure actual character cell dimensions.
  const charRef = useRef<HTMLSpanElement>(null);
  const pointerStart = useRef<{ x: number; y: number } | null>(null);

  // ---- Keyboard --------------------------------------------------------
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

  // ---- Pointer (touch + mouse) -----------------------------------------

  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLPreElement>) => {
    pointerStart.current = { x: e.clientX, y: e.clientY };
    // Capture so pointerup fires even if pointer leaves the element
    (e.currentTarget).setPointerCapture(e.pointerId);
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
        // ---- Tap: jump cursor to the tapped cell ----
        if (!preRef.current || !charRef.current) return;
        const charW = charRef.current.offsetWidth;
        const charH = charRef.current.offsetHeight;
        if (charW <= 0 || charH <= 0) return;

        const rect = preRef.current.getBoundingClientRect();
        const style = window.getComputedStyle(preRef.current);
        const relX = e.clientX - rect.left - parseFloat(style.paddingLeft);
        const relY = e.clientY - rect.top - parseFloat(style.paddingTop);

        const col = Math.floor(relX / charW);
        const row = Math.floor(relY / charH);
        onSetCursor(col, row);
      } else {
        // ---- Swipe: move cursor 1 step ----
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

  // ---- Render ----------------------------------------------------------

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

  return (
    <>
      {/* Hidden span to measure a single character's rendered dimensions. */}
      <span ref={charRef} className="char-measure">M</span>
      <pre
        ref={preRef}
        className="grid-view"
        tabIndex={0}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
      >
        {rows.join('\n')}
      </pre>
    </>
  );
}
