import { PersistentState } from './PlayerState';

export interface CurrencyCost {
  obolus?: number;
  drachma?: number;
  stater?: number;
}

/** Check if the player can afford a cost */
export function canAfford(state: PersistentState, cost: CurrencyCost): boolean {
  if ((cost.obolus ?? 0) > state.obolus) return false;
  if ((cost.drachma ?? 0) > state.drachma) return false;
  if ((cost.stater ?? 0) > state.stater) return false;
  return true;
}

/** Deduct cost from player state. Returns false if cannot afford. */
export function spendCurrency(state: PersistentState, cost: CurrencyCost): boolean {
  if (!canAfford(state, cost)) return false;
  state.obolus -= cost.obolus ?? 0;
  state.drachma -= cost.drachma ?? 0;
  state.stater -= cost.stater ?? 0;
  return true;
}

/** Add reward currencies to player state */
export function addCurrency(state: PersistentState, reward: { obolus?: number; drachma?: number; stater?: number; ingot?: number }): void {
  state.obolus += reward.obolus ?? 0;
  state.drachma += reward.drachma ?? 0;
  state.stater += reward.stater ?? 0;
  state.ingot += reward.ingot ?? 0;
}
