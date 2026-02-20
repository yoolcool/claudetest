import { useState } from 'react';
import type { Overworld, OverworldCell } from '../world/types';
import { BIOME_CLASS } from './tileClasses';

type Props = {
  world: Overworld;
  seed: number;
  cursorX: number;
  cursorY: number;
};

/** Legend entries: [cssClass, glyph, label] */
const LEGEND: [string, string, string][] = [
  ['tile-water',          '~', 'water'],
  ['tile-rocky-mountain', '^', 'rocky mountain'],
  ['tile-alpine',         'A', 'alpine'],
  ['tile-desert',         '.', 'desert'],
  ['tile-plains',         ',', 'plains'],
  ['tile-forest',         'T', 'forest'],
  ['tile-player',         '@', 'cursor'],
];

export function Inspector({ world, seed, cursorX, cursorY }: Props) {
  const [collapsed, setCollapsed] = useState(true);
  const cell: OverworldCell = world.cells[cursorY * world.width + cursorX];
  const biomeClass = BIOME_CLASS[cell.biome] ?? '';

  return (
    <div className={`inspector${collapsed ? ' inspector--collapsed' : ''}`}>
      <div className="inspector-header">
        <span className="inspector-title">Inspector</span>
        <button
          className="inspector-toggle"
          onClick={() => setCollapsed((v) => !v)}
          aria-label={collapsed ? 'Expand inspector' : 'Collapse inspector'}
        >
          {collapsed ? '▼' : '▲'}
        </button>
      </div>

      {collapsed ? (
        /* Compact one-line summary */
        <div className="inspector-compact">
          <span className="ic-item">seed <b>{seed}</b></span>
          <span className="ic-sep">|</span>
          <span className="ic-item">({cursorX},{cursorY})</span>
          <span className="ic-sep">|</span>
          {/* Biome name coloured to match the tile */}
          <span className={`ic-item ${biomeClass}`}>{cell.biome}</span>
        </div>
      ) : (
        /* Full detail view */
        <>
          <table>
            <tbody>
              <tr><th>Seed</th><td>{seed}</td></tr>
              <tr><th>X</th><td>{cursorX}</td></tr>
              <tr><th>Y</th><td>{cursorY}</td></tr>
              <tr>
                <th>Biome</th>
                <td><span className={biomeClass}>{cell.biome}</span></td>
              </tr>
              <tr><th>Height</th><td>{cell.height.toFixed(2)}</td></tr>
              <tr><th>Moisture</th><td>{cell.moisture.toFixed(2)}</td></tr>
            </tbody>
          </table>
          <div className="legend">
            <h3>Legend</h3>
            <ul>
              {LEGEND.map(([cls, glyph, label]) => (
                <li key={label}>
                  <span className={`glyph ${cls}`}>{glyph}</span>
                  {label}
                </li>
              ))}
            </ul>
            <p className="hint">Move: arrow keys / WASD / D-pad</p>
          </div>
        </>
      )}
    </div>
  );
}
