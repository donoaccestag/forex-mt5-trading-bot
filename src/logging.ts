import fs from 'node:fs';
import path from 'node:path';
import {
  CIRCUIT_BREAKER_FAILURES,
  CIRCUIT_BREAKER_COOLDOWN_MS,
  MAX_DAILY_DRAWDOWN_FRACTION,
} from './config/risk.js';

const STATE_DIR = path.join(process.cwd(), '.state');
const EVENTS_FILE = path.join(STATE_DIR, 'events.log');
const EXECUTED_FILE = path.join(STATE_DIR, 'executedOrders.json');
const CIRCUIT_FILE = path.join(STATE_DIR, 'circuit.json');

try {
  fs.mkdirSync(STATE_DIR, { recursive: true });
} catch {
  // ignore
}

export function logEvent(type: string, payload: unknown): void {
  const entry = { ts: new Date().toISOString(), type, payload };
  try {
    fs.appendFileSync(EVENTS_FILE, `${JSON.stringify(entry)}\n`, 'utf8');
  } catch (err) {
    // best-effort
    console.error('Failed to write log event', err);
  }
}

export function loadExecuted(): Record<string, any> {
  try {
    if (!fs.existsSync(EXECUTED_FILE)) return {};
    const raw = fs.readFileSync(EXECUTED_FILE, 'utf8');
    return JSON.parse(raw || '{}');
  } catch {
    return {};
  }
}

function loadCircuit(): Record<string, any> {
  try {
    if (!fs.existsSync(CIRCUIT_FILE)) return {};
    const raw = fs.readFileSync(CIRCUIT_FILE, 'utf8');
    return JSON.parse(raw || '{}');
  } catch {
    return {};
  }
}

function saveCircuit(obj: Record<string, any>) {
  try {
    fs.writeFileSync(CIRCUIT_FILE, JSON.stringify(obj, null, 2), 'utf8');
  } catch (err) {
    console.error('Failed to write circuit state', err);
  }
}

export function getFailureCount(): number {
  const s = loadCircuit();
  return Number(s.failures || 0);
}

export function resetFailures(): void {
  const s = loadCircuit();
  s.failures = 0;
  s.lastFailureTs = null;
  s.openUntil = null;
  saveCircuit(s);
}

export function isCircuitOpen(): { open: boolean; until?: number } {
  const s = loadCircuit();
  const until = s.openUntil ? Number(s.openUntil) : null;
  if (until && Date.now() < until) {
    return { open: true, until };
  }
  return { open: false };
}

export function setCircuitOpen(durationMs: number, reason?: unknown): void {
  const s = loadCircuit();
  s.openUntil = Date.now() + durationMs;
  s.openReason = reason ?? null;
  saveCircuit(s);
}

export function recordFailure(symbol: string, info: unknown): { failures: number; opened: boolean } {
  const s = loadCircuit();
  s.failures = Number(s.failures || 0) + 1;
  s.lastFailureTs = Date.now();
  s.lastFailure = { symbol, info };
  let opened = false;
  if (s.failures >= CIRCUIT_BREAKER_FAILURES) {
    s.openUntil = Date.now() + CIRCUIT_BREAKER_COOLDOWN_MS;
    opened = true;
  }
  saveCircuit(s);
  return { failures: s.failures, opened };
}

export function getDailyStartBalance(): number | null {
  const s = loadCircuit();
  return s.dailyStartBalance ?? null;
}

export function setDailyStartBalanceIfMissing(balance: number): void {
  const s = loadCircuit();
  if (!s.dailyStartBalance) {
    s.dailyStartBalance = balance;
    s.dailyStartTs = Date.now();
    saveCircuit(s);
  }
}

export function clearCircuitOpen(): void {
  const s = loadCircuit();
  s.openUntil = null;
  s.openReason = null;
  s.failures = 0;
  saveCircuit(s);
}

export function hasExecuted(signature: string): boolean {
  const map = loadExecuted();
  return Boolean(map[signature]);
}

export function markExecuted(signature: string, info: unknown): void {
  const map = loadExecuted();
  map[signature] = { info, ts: new Date().toISOString() };
  try {
    fs.writeFileSync(EXECUTED_FILE, JSON.stringify(map, null, 2), 'utf8');
  } catch (err) {
    console.error('Failed to mark executed order', err);
  }
}
