export type SingleFlightGuard = {
  current: boolean;
};

export function tryStartSingleFlight(guard: SingleFlightGuard): boolean {
  if (guard.current) return false;

  guard.current = true;
  return true;
}

export function finishSingleFlight(guard: SingleFlightGuard): void {
  guard.current = false;
}
