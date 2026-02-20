import { useState, useCallback, useEffect, useRef } from 'react';
import { generateOverworld, serializeOverworld } from './world/overworld';
import type { Overworld } from './world/types';
import { spawnEntities, tickEntities } from './world/entities';
import type { Entity } from './world/entities';
import { updateProximity } from './world/simulation';
import type { SimEvent, NearStateMap } from './world/simulation';
import { initNarration, maybeEmitNarration } from './world/narration';
import type { NarrationState } from './world/narration';
import { GridView } from './ui/GridView';
import { Inspector } from './ui/Inspector';
import { TouchPad } from './ui/TouchPad';
import { ConsoleLog } from './ui/ConsoleLog';
import { BottomPanel } from './ui/BottomPanel';
import './App.css';

const WORLD_WIDTH  = 80;
const WORLD_HEIGHT = 40;
const TICK_INTERVAL_MS = 1000;

function buildWorld(seed: number): Overworld {
  return generateOverworld(seed, WORLD_WIDTH, WORLD_HEIGHT);
}

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
  const [seed, setSeed]           = useState<number>(INITIAL_SEED);
  const [inputSeed, setInputSeed] = useState<string>(String(INITIAL_SEED));
  const [world, setWorld]         = useState<Overworld>(() => buildWorld(INITIAL_SEED));
  const [cursorX, setCursorX]     = useState(0);
  const [cursorY, setCursorY]     = useState(0);
  const [entities, setEntities]   = useState<Entity[]>(() =>
    spawnEntities(INITIAL_SEED, buildWorld(INITIAL_SEED)),
  );
  const [tick, setTick]   = useState(0);
  const [logs, setLogs]   = useState<SimEvent[]>([]);

  const logIdRef      = useRef(0);
  const seedRef       = useRef(seed);
  const cursorRef     = useRef({ x: 0, y: 0 });
  const entitiesRef   = useRef<Entity[]>(entities);
  // NearState is mutated in-place by updateProximity — a ref avoids re-renders.
  const nearStateRef      = useRef<NearStateMap>(new Map());
  const narrationStateRef = useRef<NarrationState>(initNarration(INITIAL_SEED));
  // worldRef lets the cursor-move effect read the current world without being
  // added to that effect's dependency array (world only changes on regenerate).
  const worldRef = useRef(world);

  // Keep refs in sync with state.
  useEffect(() => { seedRef.current = seed; }, [seed]);
  useEffect(() => { cursorRef.current = { x: cursorX, y: cursorY }; }, [cursorX, cursorY]);
  useEffect(() => { entitiesRef.current = entities; }, [entities]);
  useEffect(() => { worldRef.current = world; }, [world]);

  /** Append at most one log entry per call. */
  const addLog = useCallback((type: SimEvent['type'], text: string) => {
    const id = ++logIdRef.current;
    setLogs((prev) => {
      const next = [...prev, { id, type, text }];
      return next.length > 60 ? next.slice(next.length - 60) : next;
    });
  }, []);

  // ---- Regenerate world --------------------------------------------------
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
    nearStateRef.current = new Map();
    narrationStateRef.current = initNarration(newSeed);
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

  // ---- Entity tick + proximity check on each tick ------------------------
  useEffect(() => {
    if (tick === 0) return;

    setEntities((prev) => {
      const next = tickEntities(prev, seedRef.current, tick, world);
      entitiesRef.current = next;

      // updateProximity mutates nearStateRef.current in-place.
      const { x, y } = cursorRef.current;
      const msg = updateProximity(x, y, next, nearStateRef.current, tick, seedRef.current);
      if (msg) addLog('encounter', msg);

      return next;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick, world]);

  // ---- Cursor movement ---------------------------------------------------
  const handleMoveCursor = useCallback(
    (dx: number, dy: number) => {
      setCursorX((x) => Math.max(0, Math.min(world.width - 1, x + dx)));
      setCursorY((y) => Math.max(0, Math.min(world.height - 1, y + dy)));
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

  // On cursor move: proximity check + narration (uses mutable refs; no re-render).
  const prevCursorRef = useRef({ x: 0, y: 0 });
  useEffect(() => {
    const prev = prevCursorRef.current;
    if (prev.x === cursorX && prev.y === cursorY) return;
    prevCursorRef.current = { x: cursorX, y: cursorY };

    // 1. Encounter message (entity proximity entry).
    const encounterMsg = updateProximity(
      cursorX, cursorY,
      entitiesRef.current,
      nearStateRef.current,
      tick,
      seed,
    );
    if (encounterMsg) addLog('encounter', encounterMsg);

    // 2. Narration — skipped when an encounter fired this move.
    const biome = worldRef.current.cells[cursorY * worldRef.current.width + cursorX]?.biome ?? 'plains';
    const { state: nextNarState, line } = maybeEmitNarration(
      seed,
      tick,
      biome,
      !!encounterMsg,
      narrationStateRef.current,
    );
    narrationStateRef.current = nextNarState;
    if (line) addLog('narration', line.text);
  }, [cursorX, cursorY, tick, seed, addLog]);

  return (
    <div className="app">
      {/* ── Toolbar ──────────────────────────────────────────────────────── */}
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

      {/* ── Main content ─────────────────────────────────────────────────── */}
      <div className="main">
        {/* Map area: grid + D-pad overlay */}
        <div className="map-area">
          <GridView
            world={world}
            cursorX={cursorX}
            cursorY={cursorY}
            entities={entities}
            onMoveCursor={handleMoveCursor}
            onSetCursor={handleSetCursor}
          />
          {/* D-pad overlay — absolute positioned inside .map-area */}
          <div className="touchpad-overlay">
            <TouchPad onMoveCursor={handleMoveCursor} />
          </div>
        </div>

        {/* Inspector — hidden on mobile via CSS */}
        <div className="inspector-desktop-wrap">
          <Inspector world={world} seed={seed} cursorX={cursorX} cursorY={cursorY} />
        </div>
      </div>

      {/* Console log — hidden on mobile via CSS */}
      <ConsoleLog events={logs} className="console-desktop" />

      {/* Bottom panel — hidden on desktop via CSS, shown on mobile only */}
      <BottomPanel
        world={world}
        seed={seed}
        cursorX={cursorX}
        cursorY={cursorY}
        events={logs}
      />
    </div>
  );
}
