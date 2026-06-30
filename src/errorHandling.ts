import { randomUUID } from 'node:crypto';

export interface OperationResult<T> {
  ok: boolean;
  data?: T;
  error?: AppError;
}

export class AppError extends Error {
  readonly code: string;
  readonly recoverable: boolean;
  readonly cause?: unknown;
  readonly traceId?: string;

  constructor(message: string, options: { code?: string; recoverable?: boolean; cause?: unknown; traceId?: string } = {}) {
    super(message);
    this.name = 'AppError';
    this.code = options.code ?? 'APP_ERROR';
    this.recoverable = options.recoverable ?? false;
    this.cause = options.cause;
    this.traceId = options.traceId;
  }
}

export interface RetryOptions {
  retries?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  shouldRetry?: (error: unknown) => boolean;
}

export function createTraceId(prefix = 'trace'): string {
  return `${prefix}-${randomUUID().slice(0, 8)}`;
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'Unknown error';
}

function isRetryable(error: unknown): boolean {
  const msg = getErrorMessage(error).toLowerCase();
  return (
    msg.includes('timeout') ||
    msg.includes('temporarily') ||
    msg.includes('network') ||
    msg.includes('bridge') ||
    msg.includes('requote') ||
    msg.includes('busy') ||
    msg.includes('not connected') ||
    msg.includes('connection')
  );
}

export async function withRetry<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {},
): Promise<T> {
  const retries = options.retries ?? 2;
  const baseDelayMs = options.baseDelayMs ?? 250;
  const maxDelayMs = options.maxDelayMs ?? 2000;
  const shouldRetry = options.shouldRetry ?? isRetryable;

  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (attempt >= retries || !shouldRetry(error)) {
        throw error;
      }
      const delay = Math.min(baseDelayMs * 2 ** attempt, maxDelayMs);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

export async function runGuarded<T>(
  name: string,
  operation: () => Promise<T>,
  options: { traceId?: string; retries?: number; recoverable?: boolean } = {},
): Promise<OperationResult<T>> {
  const traceId = options.traceId ?? createTraceId();
  try {
    const data = await withRetry(operation, {
      retries: options.retries ?? 2,
      shouldRetry: (error) => {
        const appError = error instanceof AppError ? error : null;
        return Boolean(appError?.recoverable) || isRetryable(error);
      },
    });
    return { ok: true, data };
  } catch (error) {
    const appError = error instanceof AppError
      ? error
      : new AppError(getErrorMessage(error), {
          code: 'OPERATION_FAILED',
          recoverable: isRetryable(error),
          cause: error,
          traceId,
        });
    return { ok: false, error: appError };
  }
}

export function validateRates(rates: unknown, symbol: string, traceId?: string): asserts rates is Array<{ time: number; open: number; high: number; low: number; close: number }> {
  if (!Array.isArray(rates) || rates.length < 3) {
    throw new AppError(`Invalid rate data for ${symbol}`, { code: 'INVALID_RATE_DATA', recoverable: false, traceId });
  }

  for (const [index, bar] of rates.entries()) {
    if (!bar || typeof bar !== 'object') {
      throw new AppError(`Corrupt bar at index ${index} for ${symbol}`, { code: 'INVALID_RATE_DATA', recoverable: false, traceId });
    }
    const b = bar as { time?: unknown; open?: unknown; high?: unknown; low?: unknown; close?: unknown };
    if ([b.time, b.open, b.high, b.low, b.close].some((value) => typeof value !== 'number' || !Number.isFinite(value))) {
      throw new AppError(`Corrupt price values at index ${index} for ${symbol}`, { code: 'INVALID_RATE_DATA', recoverable: false, traceId });
    }
  }
}

export function validateSymbolInfo(symbolInfo: unknown, symbol: string, traceId?: string): asserts symbolInfo is { volume_min: number; volume_max: number; volume_step: number; trade_tick_size: number; trade_tick_value: number } {
  const info = symbolInfo as Record<string, unknown> | null | undefined;
  if (!info || typeof info !== 'object') {
    throw new AppError(`Invalid symbol metadata for ${symbol}`, { code: 'INVALID_SYMBOL_INFO', recoverable: false, traceId });
  }

  const numericFields = ['volume_min', 'volume_max', 'volume_step', 'trade_tick_size', 'trade_tick_value'];
  for (const field of numericFields) {
    const value = info[field];
    if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
      throw new AppError(`Invalid symbol metadata field ${field} for ${symbol}`, { code: 'INVALID_SYMBOL_INFO', recoverable: false, traceId });
    }
  }
}
