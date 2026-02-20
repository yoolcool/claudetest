import type { EntityKind } from './entities';

export type LogType = 'info' | 'encounter' | 'system' | 'tick';

export type SimEvent = {
  id: number;
  type: LogType;
  text: string;
};

/** Korean encounter messages per entity kind. */
const ENCOUNTER_MESSAGES: Record<EntityKind, string[]> = {
  goat: [
    '염소가 호기심 어린 눈으로 당신을 바라봅니다.',
    '염소가 "메에~" 하고 울며 옆으로 비켜섭니다.',
    '산염소가 발굽으로 바위를 또각또각 두드립니다.',
    '염소가 무심하게 풀을 뜯다가 당신을 발견했습니다.',
  ],
  bird: [
    '새가 깃털을 부르르 떨며 날아오릅니다.',
    '"짹짹!" — 작은 새 한 마리가 가지 위에서 당신을 살핍니다.',
    '화려한 새 한 마리가 머리 위를 선회합니다.',
    '새가 멀리 날아가며 맑은 노래를 남깁니다.',
  ],
  frog: [
    '개구리가 깜짝 놀라 연못 속으로 뛰어듭니다.',
    '"개굴개굴~" 개구리가 돌 위에 앉아 당신을 바라봅니다.',
    '청개구리가 잎사귀 사이에 납작 엎드립니다.',
    '개구리가 긴 혀를 낼름 내밀었다 거둡니다.',
  ],
  wanderer: [
    '낯선 방랑자가 모자를 눌러쓰며 말없이 지나칩니다.',
    '방랑자가 쉰 목소리로 중얼거립니다: "이 길은 위험하오…"',
    '후드를 깊이 눌러쓴 방랑자가 당신에게 고개를 끄덕입니다.',
    '방랑자가 낡은 지도를 잠시 들여다보다 주머니에 넣습니다.',
  ],
};

/** System messages shown at fixed tick intervals. */
export const SYSTEM_MESSAGES: string[] = [
  '바람이 숲 사이를 조용히 스쳐 지나갑니다.',
  '멀리서 천둥소리가 희미하게 들립니다.',
  '하늘에 별이 하나 둘 떠오르기 시작합니다.',
  '서쪽 하늘이 노을빛으로 물들고 있습니다.',
  '풀잎 위에 아침 이슬이 맺혀 있습니다.',
  '어디선가 낙엽 밟히는 소리가 들립니다.',
  '차가운 바람이 불어와 외투 깃을 세우게 합니다.',
  '세상이 잠시 고요해집니다.',
];

/** Chebyshev distance (max of |dx|, |dy|). */
function chebyshev(ax: number, ay: number, bx: number, by: number): number {
  return Math.max(Math.abs(ax - bx), Math.abs(ay - by));
}

/**
 * Check whether the cursor is within `radius` cells (Chebyshev) of any entity.
 * Returns a Korean encounter message string, or null if no encounter.
 */
export function checkProximity(
  cursorX: number,
  cursorY: number,
  entities: { kind: EntityKind; x: number; y: number }[],
  radius: number,
  seed: number,
  tick: number,
): string | null {
  for (const e of entities) {
    if (chebyshev(cursorX, cursorY, e.x, e.y) <= radius) {
      const msgs = ENCOUNTER_MESSAGES[e.kind];
      // Pick a message deterministically from kind + position + tick.
      const idx = (e.x * 7 + e.y * 13 + tick * 3 + seed) % msgs.length;
      return msgs[idx];
    }
  }
  return null;
}

/**
 * Pick a system ambient message for this tick.
 */
export function getSystemMessage(tick: number, seed: number): string {
  const idx = (tick * 17 + seed) % SYSTEM_MESSAGES.length;
  return SYSTEM_MESSAGES[idx];
}
