import { useState, useCallback, useEffect, useRef } from 'react';
import { generateOverworld, serializeOverworld } from './world/overworld';
import type { Overworld } from './world/types';
import { spawnEntities, tickEntities } from './world/entities';
import type { Entity } from './world/entities';
import { checkProximity, getSystemMessage } from './world/simulation';
import type { SimEvent } from './world/simulation';
import { GridView } from './ui/GridView';
import { Inspector } from './ui/Inspector';
import { TouchPad } from './ui/TouchPad';
import { ConsoleLog } from './ui/ConsoleLog';
import './App.css';

const WORLD_WIDTH  = 80;
const WORLD_HEIGHT = 40;
const TICK_INTERVAL_MS  = 1000;  // 1 s per tick
const SYSTEM_MSG_EVERY  = 8;     // system message every N ticks
const PROXIMITY_RADIUS  = 2;     // Chebyshev distance for encounters

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
  const [seed, setSeed]         = useState<number>(INITIAL_SEED);
  const [inputSeed, setInputSeed] = useState<string>(String(INITIAL_SEED));
  const [world, setWorld]       = useState<Overworld>(() => buildWorld(INITIAL_SEED));
  const [cursorX, setCursorX]   = useState(0);
  const [cursorY, setCursorY]   = useState(0);
  const [entities, setEntities] = useState<Entity[]>(() =>
    spawnEntities(INITIAL_SEED, buildWorld(INITIAL_SEED)),
  );
  const [tick, setTick]         = useState(0);
  const [logs, setLogs]         = useState<SimEvent[]>([]);

  const logIdRef    = useRef(0);
  const cursorRef   = useRef({ x: 0, y: 0 });
  const entitiesRef = useRef<Entity[]>(entities);
  const seedRef     = useRef(seed);

  // Keep refs in sync.
  useEffect(() => { entitiesRef.current = entities; }, [entities]);
  useEffect(() => { seedRef.current = seed; }, [seed]);
  useEffect(() => { cursorRef.current = { x: cursorX, y: cursorY }; }, [cursorX, cursorY]);

  /** Append one log entry. */
  const addLog = useCallback((type: SimEvent['type'], text: string) => {
    const id = ++logIdRef.current;
    setLogs((prev) => {
      const next = [...prev, { id, type, text }];
      return next.length > 60 ? next.slice(next.length - 60) : next;
    });
  }, []);

  /** Regenerate the world with a given seed. Resets cursor + entities. */
  const regenerate = useCallback((newSeed: number) => {
    const w = buildWorld(newSeed);
    const ents = spawnEntities(newSeed, w);
    setSeed(newSeed);
    setWorld(w);
    setCursorX(0);
    setCursorY(0);
    setEntities(ents);
    setTick(0);
    setLogs([]);
    logIdRef.current = 0;
    // Console hash for determinism verification
    const hash = simpleHash(serializeOverworld(w));
    console.log(`[World] seed=${newSeed}  hash=0x${hash.toString(16).padStart(8, '0')}`);
    addLog('system', `세계가 생성되었습니다. (시드: ${newSeed})`);
  }, [addLog]);

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

  // ---- Tick timer --------------------------------------------------------
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), TICK_INTERVAL_MS);
    return () => clearInterval(id);
  }, []);

  // ---- Entity tick + proximity check on tick -----------------------------
  useEffect(() => {
    if (tick === 0) return;

    setEntities((prev) => {
      const next = tickEntities(prev, seedRef.current, tick, world);
      entitiesRef.current = next;

      // Check if any entity is now near the cursor.
      const { x, y } = cursorRef.current;
      const msg = checkProximity(x, y, next, PROXIMITY_RADIUS, seedRef.current, tick);
      if (msg) addLog('encounter', msg);

      return next;
    });

    // System ambient message every N ticks.
    if (tick % SYSTEM_MSG_EVERY === 0) {
      addLog('tick', getSystemMessage(tick, seedRef.current));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick, world]);

  // ---- Cursor movement ---------------------------------------------------
  const handleMoveCursor = useCallback(
    (dx: number, dy: number) => {
      setCursorX((x) => {
        const nx = Math.max(0, Math.min(world.width - 1, x + dx));
        // Proximity check with new x and current y (approximate; full check below).
        return nx;
      });
      setCursorY((y) => {
        const ny = Math.max(0, Math.min(world.height - 1, y + dy));
        return ny;
      });
    },
    [world.width, world.height],
  );

  const handleSetCursor = useCallback(
    (x: number, y: number) => {
      setCursorX(Math.max(0, Math.min(world.width - 1, x)));
      setCursorY(Math.max(0, Math.min(world.height - 1, y)));
    },
    [world.width, world.height],
  );

  // Check proximity whenever cursor actually changes.
  const prevCursorRef = useRef({ x: cursorX, y: cursorY });
  useEffect(() => {
    const prev = prevCursorRef.current;
    if (prev.x === cursorX && prev.y === cursorY) return;
    prevCursorRef.current = { x: cursorX, y: cursorY };

    const msg = checkProximity(cursorX, cursorY, entitiesRef.current, PROXIMITY_RADIUS, seed, tick);
    if (msg) addLog('encounter', msg);
  }, [cursorX, cursorY, seed, tick, addLog]);

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
        <div className="grid-col">
          <GridView
            world={world}
            cursorX={cursorX}
            cursorY={cursorY}
            entities={entities}
            onMoveCursor={handleMoveCursor}
            onSetCursor={handleSetCursor}
          />
          <TouchPad onMoveCursor={handleMoveCursor} />
        </div>
        <Inspector world={world} seed={seed} cursorX={cursorX} cursorY={cursorY} />
      </div>
      <ConsoleLog events={logs} />
    </div>
  );
}
