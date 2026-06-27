declare module 'stake-math' {
  export interface KellyStakeParams {
    probability: number;
    allInPrice: number;
    bankroll: number;
    maxStake: number;
    minStake?: number;
    kellyFraction?: number;
  }

  export function computeKellyStake(params: KellyStakeParams): number;
  export function formatStakeUsd(value: number): string;
  export function roundStake(value: number): number;
}
