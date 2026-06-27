/** Estimated win probability for Kelly sizing (tune via backtesting). */
export const KELLY_WIN_PROBABILITY = 0.55;

/** Fractional Kelly multiplier (0.5 = half-Kelly). */
export const KELLY_FRACTION = 0.5;

/** Cap Kelly stake at this fraction of bankroll. */
export const MAX_BANKROLL_FRACTION = 0.05;

/** Risk-to-reward ratio used for stop-loss placement. */
export const RISK_REWARD_RATIO = 1.2;
