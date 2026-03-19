import { PersistentState } from './PlayerState';

export interface CurrencyCost {
  obol?: number;
}

/** Check if the player can afford a cost */
export function canAfford(state: PersistentState, cost: CurrencyCost): boolean {
  if ((cost.obol ?? 0) > state.obol) return false;
  return true;
}

/** Deduct cost from player state. Returns false if cannot afford. */
export function spendCurrency(state: PersistentState, cost: CurrencyCost): boolean {
  if (!canAfford(state, cost)) return false;
  state.obol -= cost.obol ?? 0;
  return true;
}

/** Add reward currencies to player state */
export function addCurrency(state: PersistentState, reward: { obol?: number; ingot?: number }): void {
  state.obol += reward.obol ?? 0;
  state.ingot += reward.ingot ?? 0;
}
