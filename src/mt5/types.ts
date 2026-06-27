export type Timeframe = '5m' | '15m' | '30m' | '1h' | '2h' | '3h' | '4h' | '1d';

export interface SymbolConfig {
  symbol: string;
  timeframe: Timeframe;
  candlesRetrieved: boolean;
}

export interface RateBar {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  tick_volume: number;
  spread: number;
  real_volume: number;
}

export interface AccountInfo {
  balance: number;
  equity: number;
  margin: number;
  margin_free: number;
}

export interface TerminalInfo {
  connected: boolean;
}

export interface SymbolInfo {
  volume_min: number;
  volume_max: number;
  volume_step: number;
  trade_tick_size: number;
  trade_tick_value: number;
}

export interface SymbolTick {
  bid: number;
  ask: number;
}

export interface Position {
  ticket: number;
  symbol: string;
}

export interface TradeRequest {
  action: number;
  symbol: string;
  volume: number;
  type: number;
  price: number;
  sl: number;
  tp: number;
  deviation: number;
  type_time: number;
  type_filling: number;
}

export interface OrderResult {
  retcode: number;
  order: number;
}

export const TRADE_ACTION_DEAL = 1;
export const ORDER_TYPE_BUY = 0;
export const ORDER_TYPE_SELL = 1;
export const ORDER_TIME_GTC = 0;
export const ORDER_FILLING_FOK = 0;
export const TRADE_RETCODE_DONE = 10009;
export const TRADE_RETCODE_REQUOTE = 10004;

export const TIMEFRAME_M1 = 1;
export const TIMEFRAME_M5 = 5;
export const TIMEFRAME_M15 = 15;
export const TIMEFRAME_M30 = 30;
export const TIMEFRAME_H1 = 16385;
export const TIMEFRAME_H2 = 16386;
export const TIMEFRAME_H3 = 16387;
export const TIMEFRAME_H4 = 16388;
export const TIMEFRAME_D1 = 16408;

export interface Mt5Client {
  initialize(login: number, password: string, server: string): Promise<boolean>;
  login(login: number, password: string, server: string): Promise<boolean>;
  shutdown(): Promise<void>;
  lastError(): Promise<[number, string]>;
  terminalInfo(): Promise<TerminalInfo | null>;
  symbolSelect(symbol: string): Promise<boolean>;
  positionsGet(symbol: string): Promise<Position[]>;
  copyRatesFromPos(symbol: string, timeframe: number, startPos: number, count: number): Promise<RateBar[] | null>;
  accountInfo(): Promise<AccountInfo | null>;
  symbolInfo(symbol: string): Promise<SymbolInfo | null>;
  symbolInfoTick(symbol: string): Promise<SymbolTick | null>;
  orderSend(request: TradeRequest): Promise<OrderResult>;
}
