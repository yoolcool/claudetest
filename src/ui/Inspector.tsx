import React from 'react';
import type { Overworld, OverworldCell } from '../world/types';

type Props = {
  world: Overworld;
  seed: number;
  cursorX: number;
  cursorY: number;
};

export function Inspector({ world, seed, cursorX, cursorY }: Props) {
  const cell: OverworldCell = world.cells[cursorY * world.width + cursorX];

  return (
    <div className="inspector">
      <h2>Inspector</h2>
      <table>
        <tbody>
          <tr>
            <th>Seed</th>
            <td>{seed}</td>
          </tr>
          <tr>
            <th>X</th>
            <td>{cursorX}</td>
          </tr>
          <tr>
            <th>Y</th>
            <td>{cursorY}</td>
          </tr>
          <tr>
            <th>Biome</th>
            <td>{cell.biome}</td>
          </tr>
          <tr>
            <th>Height</th>
            <td>{cell.height.toFixed(2)}</td>
          </tr>
          <tr>
            <th>Moisture</th>
            <td>{cell.moisture.toFixed(2)}</td>
          </tr>
        </tbody>
      </table>
      <div className="legend">
        <h3>Legend</h3>
        <ul>
          <li><span className="glyph">~</span> water</li>
          <li><span className="glyph">^</span> mountain</li>
          <li><span className="glyph">.</span> desert</li>
          <li><span className="glyph">"</span> swamp</li>
          <li><span className="glyph">,</span> plains</li>
          <li><span className="glyph">@</span> cursor</li>
        </ul>
        <p className="hint">Move: arrow keys / WASD</p>
      </div>
    </div>
  );
}
