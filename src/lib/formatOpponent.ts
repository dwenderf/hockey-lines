export function formatOpponent(opponent: string, isHome: boolean): string {
  return isHome ? `vs ${opponent}` : `@ ${opponent}`;
}
