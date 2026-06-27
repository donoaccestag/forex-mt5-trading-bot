import type { Timeframe } from './config/symbols.js';
import {
  TIMEFRAME_D1,
  TIMEFRAME_H1,
  TIMEFRAME_H2,
  TIMEFRAME_H3,
  TIMEFRAME_H4,
  TIMEFRAME_M15,
  TIMEFRAME_M30,
  TIMEFRAME_M5,
} from './mt5/types.js';

export function marketIsOpen(now: Date = new Date()): boolean {
  const utcNow = new Date(now.toISOString());
  const weekday = utcNow.getUTCDay();
  const hours = utcNow.getUTCHours();
  const minutes = utcNow.getUTCMinutes();
  const seconds = utcNow.getUTCSeconds();

  const timeValue =
    hours * 3600 + minutes * 60 + seconds;
  const openTime = 22 * 3600;
  const closeTime = 21 * 3600 + 59 * 60;

  if (weekday === 6) {
    return false;
  }
  if (weekday === 0 && timeValue < openTime) {
    return false;
  }
  if (weekday === 5 && timeValue >= closeTime) {
    return false;
  }
  return true;
}

export function newCandleUpdate(tframe: Timeframe, candlesRetrieved: boolean, now: Date = new Date()): boolean | null {
  if (candlesRetrieved) {
    return false;
  }

  const utcNow = new Date(now.toISOString());
  const minute = now.getMinutes();
  const utcHour = utcNow.getUTCHours();
  const utcMinute = utcNow.getUTCMinutes();

  switch (tframe) {
    case '5m':
      return minute % 5 === 0;
    case '15m':
      return minute % 15 === 0;
    case '30m':
      return minute % 30 === 0;
    case '1h':
      return minute === 0;
    case '2h':
      return utcHour % 2 === 0 && utcMinute === 0;
    case '3h':
      return utcHour % 3 === 0 && utcMinute === 0;
    case '4h':
      return utcHour % 4 === 0 && utcMinute === 0;
    case '1d':
      return utcHour === 0 && utcMinute === 0;
    default:
      console.log('Invalid time. Re-enter a timeframe from the list.');
      return null;
  }
}

export function getMt5Interval(tradingFrame: Timeframe): number | null {
  switch (tradingFrame) {
    case '5m':
      return TIMEFRAME_M5;
    case '15m':
      return TIMEFRAME_M15;
    case '30m':
      return TIMEFRAME_M30;
    case '1h':
      return TIMEFRAME_H1;
    case '2h':
      return TIMEFRAME_H2;
    case '3h':
      return TIMEFRAME_H3;
    case '4h':
      return TIMEFRAME_H4;
    case '1d':
      return TIMEFRAME_D1;
    default:
      return null;
  }
}

export function candleRetrievedFlag(candleTimeSec: number, now: Date = new Date()): boolean {
  const candleTime = new Date(candleTimeSec * 1000);
  return (
    candleTime.getMinutes() === now.getMinutes() &&
    candleTime.getHours() === now.getHours()
  );
}
