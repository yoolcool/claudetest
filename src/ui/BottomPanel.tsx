import { useState, useRef, useCallback } from 'react';
import type { Overworld } from '../world/types';
import type { SimEvent } from '../world/simulation';
import { ConsoleLog } from './ConsoleLog';
import { Inspector } from './Inspector';
import { BIOME_CLASS } from './tileClasses';

type Tab = 'console' | 'inspector';

/** Snap-point heights in px. */
const H_COLLAPSED = 40;
const H_MINI      = 100;
const H_EXPANDED  = 200;

/** Min/max drag range relative to window height. */
const MIN_H_RATIO = 0.08;   // 8% — allows the collapsed strip
const MAX_H_RATIO = 0.45;   // 45%

const SNAP_CYCLE: [number, number, number] = [H_COLLAPSED, H_MINI, H_EXPANDED];

/** Snap raw drag height to the nearest defined snap point. */
function snap(h: number): number {
  const dists = SNAP_CYCLE.map((s) => Math.abs(h - s));
  const minDist = Math.min(...dists);
  return SNAP_CYCLE[dists.indexOf(minDist)];
}

/** Advance through the snap cycle. */
function cycleSnap(h: number): number {
  if (h <= H_COLLAPSED + 4) return H_MINI;
  if (h <= H_MINI + 4)      return H_EXPANDED;
  return H_COLLAPSED;
}

type Props = {
  world: Overworld;
  seed: number;
  cursorX: number;
  cursorY: number;
  events: SimEvent[];
};

export function BottomPanel({ world, seed, cursorX, cursorY, events }: Props) {
  const [height, setHeight] = useState<number>(H_MINI);
  const [activeTab, setActiveTab] = useState<Tab>('console');

  const dragStart = useRef<{ clientY: number; startH: number } | null>(null);
  const didDrag = useRef(false);

  const isCollapsed = height <= H_COLLAPSED + 4;

  const cell = world.cells[cursorY * world.width + cursorX];
  const biomeClass = BIOME_CLASS[cell.biome] ?? '';

  // ---- Drag handle pointer events ----------------------------------------
  const onHandleDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    dragStart.current = { clientY: e.clientY, startH: height };
    didDrag.current = false;
  }, [height]);

  const onHandleMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragStart.current) return;
    const delta = dragStart.current.clientY - e.clientY; // drag up = grow
    if (Math.abs(delta) > 6) didDrag.current = true;
    const minH = Math.floor(window.innerHeight * MIN_H_RATIO);
    const maxH = Math.floor(window.innerHeight * MAX_H_RATIO);
    const rawH = dragStart.current.startH + delta;
    setHeight(Math.min(maxH, Math.max(minH, rawH)));
  }, []);

  const onHandleUp = useCallback(() => {
    if (!dragStart.current) return;
    if (!didDrag.current) {
      // Tap: cycle snap states
      setHeight((h) => cycleSnap(h));
    } else {
      // Release: snap to nearest
      setHeight((h) => snap(h));
    }
    dragStart.current = null;
  }, []);

  const onHandleCancel = useCallback(() => {
    if (dragStart.current) setHeight((h) => snap(h));
    dragStart.current = null;
  }, []);

  // ---- Tab click must not trigger drag -----------------------------------
  const stopProp = useCallback((e: React.MouseEvent) => e.stopPropagation(), []);

  return (
    <div className="bottom-panel" style={{ height: `${height}px` }}>
      {/* ── Handle bar ─────────────────────────────────────────────────── */}
      <div
        className="bp-handle"
        onPointerDown={onHandleDown}
        onPointerMove={onHandleMove}
        onPointerUp={onHandleUp}
        onPointerCancel={onHandleCancel}
      >
        <span className="bp-grip" aria-hidden>━━━━━━━</span>

        {isCollapsed ? (
          /* Collapsed: show 1-line summary on the handle itself */
          <span className="bp-summary">
            <span className="bp-summary__item">시드 {seed}</span>
            <span className="bp-summary__sep">|</span>
            <span className="bp-summary__item">({cursorX},{cursorY})</span>
            <span className="bp-summary__sep">|</span>
            <span className={`bp-summary__item ${biomeClass}`}>{cell.biome}</span>
          </span>
        ) : (
          /* Expanded/Mini: show tabs (clicks must not bubble to drag handler) */
          <div className="bp-tabs" onClick={stopProp} onPointerDown={stopProp}>
            <button
              className={`bp-tab${activeTab === 'console' ? ' bp-tab--active' : ''}`}
              onClick={() => setActiveTab('console')}
            >
              콘솔
            </button>
            <button
              className={`bp-tab${activeTab === 'inspector' ? ' bp-tab--active' : ''}`}
              onClick={() => setActiveTab('inspector')}
            >
              맵정보
            </button>
          </div>
        )}
      </div>

      {/* ── Content area ───────────────────────────────────────────────── */}
      {!isCollapsed && (
        <div className="bp-content">
          {activeTab === 'console' ? (
            <ConsoleLog events={events} />
          ) : (
            <div className="bp-inspector-wrap">
              <Inspector
                world={world}
                seed={seed}
                cursorX={cursorX}
                cursorY={cursorY}
                noCollapse
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
