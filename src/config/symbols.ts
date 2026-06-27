export type Timeframe = '5m' | '15m' | '30m' | '1h' | '2h' | '3h' | '4h' | '1d';

export interface SymbolConfig {
  symbol: string;
  timeframe: Timeframe;
  candlesRetrieved: boolean;
}

export function createInitialSymbols(): SymbolConfig[] {
  return [
    { symbol: 'EURUSD', timeframe: '15m', candlesRetrieved: false },
    { symbol: 'EURGBP', timeframe: '15m', candlesRetrieved: false },
    { symbol: 'EURCAD', timeframe: '15m', candlesRetrieved: false },
    { symbol: 'EURAUD', timeframe: '15m', candlesRetrieved: false },
    { symbol: 'EURNZD', timeframe: '15m', candlesRetrieved: false },
    { symbol: 'EURCHF', timeframe: '30m', candlesRetrieved: false },
    { symbol: 'GBPUSD', timeframe: '30m', candlesRetrieved: false },
    { symbol: 'GBPCAD', timeframe: '30m', candlesRetrieved: false },
    { symbol: 'GBPNZD', timeframe: '30m', candlesRetrieved: false },
    { symbol: 'GBPAUD', timeframe: '30m', candlesRetrieved: false },
    { symbol: 'GBPJPY', timeframe: '1h', candlesRetrieved: false },
    { symbol: 'GBPCHF', timeframe: '1h', candlesRetrieved: false },
    { symbol: 'USDCAD', timeframe: '1h', candlesRetrieved: false },
    { symbol: 'USDJPY', timeframe: '1h', candlesRetrieved: false },
    { symbol: 'USDCHF', timeframe: '1h', candlesRetrieved: false },
    { symbol: 'CADJPY', timeframe: '2h', candlesRetrieved: false },
    { symbol: 'CADCHF', timeframe: '2h', candlesRetrieved: false },
    { symbol: 'NZDUSD', timeframe: '2h', candlesRetrieved: false },
    { symbol: 'NZDCAD', timeframe: '2h', candlesRetrieved: false },
    { symbol: 'NZDCHF', timeframe: '2h', candlesRetrieved: false },
    { symbol: 'AUDUSD', timeframe: '4h', candlesRetrieved: false },
    { symbol: 'AUDCAD', timeframe: '4h', candlesRetrieved: false },
    { symbol: 'AUDNZD', timeframe: '4h', candlesRetrieved: false },
    { symbol: 'AUDJPY', timeframe: '4h', candlesRetrieved: false },
    { symbol: 'AUDCHF', timeframe: '4h', candlesRetrieved: false },
    { symbol: 'CHFJPY', timeframe: '4h', candlesRetrieved: false },
  ];
}
