import { createRNG, hashSeed } from './rng';
import type { Biome, Overworld, OverworldCell } from './types';

/** Classify a cell into a biome based on height and moisture. */
function classifyBiome(height: number, moisture: number): Biome {
  if (height < 0.3) return 'water';
  if (height > 0.75) return 'mountain';
  if (moisture < 0.3) return 'desert';
  if (moisture > 0.7) return 'swamp';
  return 'plains';
}

/**
 * Generate a deterministic overworld grid.
 * Each cell uses its own per-cell RNG seeded by (globalSeed, x, y),
 * so the map is fully reproducible from the seed alone.
 */
export function generateOverworld(
  seed: number,
  width: number,
  height: number,
): Overworld {
  const cells: OverworldCell[] = [];

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const rng = createRNG(hashSeed(seed, x, y));
      const cellHeight = rng();
      const cellMoisture = rng();
      const biome = classifyBiome(cellHeight, cellMoisture);
      cells.push({ height: cellHeight, moisture: cellMoisture, biome });
    }
  }

  return { width, height, cells };
}

/** Convert the overworld to a compact string for hash verification. */
export function serializeOverworld(world: Overworld): string {
  return world.cells.map((c) => `${c.biome[0]}${c.height.toFixed(2)}`).join('');
}
