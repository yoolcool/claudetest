import React, { useState, useCallback } from 'react';
import { generateOverworld, serializeOverworld } from './world/overworld';
import type { Overworld } from './world/types';
import { GridView } from './ui/GridView';
import { Inspector } from './ui/Inspector';
import './App.css';

const WORLD_WIDTH = 80;
const WORLD_HEIGHT = 40;

function buildWorld(seed: number): Overworld {
  return generateOverworld(seed, WORLD_WIDTH, WORLD_HEIGHT);
}

/** Simple deterministic hash of a string for console verification. */
function simpleHash(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
    h = h >>> 0;
  }
  return h;
}

const INITIAL_SEED = 12345;

export default function App() {
  const [seed, setSeed] = useState<number>(INITIAL_SEED);
  const [inputSeed, setInputSeed] = useState<string>(String(INITIAL_SEED));
  const [world, setWorld] = useState<Overworld>(() => buildWorld(INITIAL_SEED));
  const [cursorX, setCursorX] = useState(0);
  const [cursorY, setCursorY] = useState(0);

  /** Regenerate the world with a given seed. Resets cursor to origin. */
  const regenerate = useCallback((newSeed: number) => {
    const w = buildWorld(newSeed);
    setSeed(newSeed);
    setWorld(w);
    setCursorX(0);
    setCursorY(0);
    // Console hash for determinism verification
    const hash = simpleHash(serializeOverworld(w));
    console.log(`[World] seed=${newSeed}  hash=0x${hash.toString(16).padStart(8, '0')}`);
  }, []);

  const handleGenerate = useCallback(() => {
    const parsed = parseInt(inputSeed, 10);
    const s = isNaN(parsed) ? INITIAL_SEED : parsed;
    regenerate(s);
    setInputSeed(String(s));
  }, [inputSeed, regenerate]);

  const handleRandom = useCallback(() => {
    const s = (Math.floor(Math.random() * 0xffffffff) + 1) >>> 0;
    setInputSeed(String(s));
    regenerate(s);
  }, [regenerate]);

  const handleMoveCursor = useCallback(
    (dx: number, dy: number) => {
      setCursorX((x) => Math.max(0, Math.min(world.width - 1, x + dx)));
      setCursorY((y) => Math.max(0, Math.min(world.height - 1, y + dy)));
    },
    [world.width, world.height],
  );

  return (
    <div className="app">
      <div className="toolbar">
        <label htmlFor="seed-input">Seed</label>
        <input
          id="seed-input"
          type="number"
          value={inputSeed}
          onChange={(e) => setInputSeed(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
        />
        <button onClick={handleGenerate}>Generate</button>
        <button onClick={handleRandom}>Random</button>
      </div>
      <div className="main">
        <GridView
          world={world}
          cursorX={cursorX}
          cursorY={cursorY}
          onMoveCursor={handleMoveCursor}
        />
        <Inspector world={world} seed={seed} cursorX={cursorX} cursorY={cursorY} />
      </div>
    </div>
  );
}
