import { useEffect, useCallback } from 'react';
import type { Overworld } from '../world/types';

/** ASCII glyph for each biome */
const BIOME_CHAR: Record<string, string> = {
  water: '~',
  mountain: '^',
  desert: '.',
  swamp: '"',
  plains: ',',
};

type Props = {
  world: Overworld;
  cursorX: number;
  cursorY: number;
  onMoveCursor: (dx: number, dy: number) => void;
};

export function GridView({ world, cursorX, cursorY, onMoveCursor }: Props) {
  // Keyboard handler for arrow keys and WASD
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

  // Build the text grid row by row
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
    <pre className="grid-view" tabIndex={0}>
      {rows.join('\n')}
    </pre>
  );
}
