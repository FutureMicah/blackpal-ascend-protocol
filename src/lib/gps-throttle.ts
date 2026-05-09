// Pure helpers for the Trader Atlas GPS throttling slider. Extracted so the
// E2E-style tests can verify that:
//   1. the throttle (ms) directly controls the displayed update frequency (Hz)
//   2. coalescing skips near-duplicate samples (< ~50 m) so the map never flickers
//   3. the displayed Hz remains accurate across remounts (stateless math)
export function throttleMsToHz(throttleMs: number): number {
  // Mirrors the live formula in WorldMap: 1000 / max(throttleMs, 50)
  return 1000 / Math.max(throttleMs, 50);
}

export function shouldCoalesceGps(
  prev: [number, number] | null,
  next: [number, number],
  epsilon = 0.0005,
): boolean {
  if (!prev) return false;
  return Math.abs(prev[0] - next[0]) < epsilon && Math.abs(prev[1] - next[1]) < epsilon;
}
