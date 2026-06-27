import { spawn, ChildProcessWithoutNullStreams } from 'node:child_process';
import { createInterface } from 'node:readline';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import type {
  AccountInfo,
  Mt5Client,
  OrderResult,
  Position,
  RateBar,
  SymbolInfo,
  SymbolTick,
  TerminalInfo,
  TradeRequest,
} from './types.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BRIDGE_SCRIPT = join(__dirname, '../../scripts/mt5-bridge.py');

interface BridgeResponse<T = unknown> {
  ok: boolean;
  result?: T;
  error?: string;
}

export class Mt5BridgeClient implements Mt5Client {
  private process: ChildProcessWithoutNullStreams | null = null;
  private nextId = 1;
  private pending = new Map<number, { resolve: (value: unknown) => void; reject: (reason: Error) => void }>();

  async start(): Promise<void> {
    if (this.process) {
      return;
    }

    this.process = spawn('python', [BRIDGE_SCRIPT], {
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    const rl = createInterface({ input: this.process.stdout });

    rl.on('line', (line) => {
      try {
        const message = JSON.parse(line) as { id: number } & BridgeResponse;
        const handler = this.pending.get(message.id);
        if (!handler) {
          return;
        }
        this.pending.delete(message.id);
        if (message.ok) {
          handler.resolve(message.result);
        } else {
          handler.reject(new Error(message.error ?? 'MT5 bridge error'));
        }
      } catch {
        // Ignore malformed bridge output.
      }
    });

    this.process.stderr.on('data', (chunk: Buffer) => {
      process.stderr.write(chunk);
    });

    this.process.on('exit', (code) => {
      for (const [, handler] of this.pending) {
        handler.reject(new Error(`MT5 bridge exited with code ${code ?? 'unknown'}`));
      }
      this.pending.clear();
      this.process = null;
    });
  }

  private call<T>(method: string, args: Record<string, unknown> = {}): Promise<T> {
    if (!this.process?.stdin.writable) {
      return Promise.reject(new Error('MT5 bridge is not running'));
    }

    const id = this.nextId++;
    const payload = JSON.stringify({ id, method, args });

    return new Promise<T>((resolve, reject) => {
      this.pending.set(id, {
        resolve: resolve as (value: unknown) => void,
        reject,
      });
      this.process!.stdin.write(`${payload}\n`);
    });
  }

  async initialize(login: number, password: string, server: string): Promise<boolean> {
    await this.start();
    return this.call<boolean>('initialize', { login, password, server });
  }

  async login(login: number, password: string, server: string): Promise<boolean> {
    return this.call<boolean>('login', { login, password, server });
  }

  async shutdown(): Promise<void> {
    if (!this.process) {
      return;
    }
    try {
      await this.call('shutdown');
    } finally {
      this.process.kill();
      this.process = null;
    }
  }

  async lastError(): Promise<[number, string]> {
    return this.call<[number, string]>('last_error');
  }

  async terminalInfo(): Promise<TerminalInfo | null> {
    return this.call<TerminalInfo | null>('terminal_info');
  }

  async symbolSelect(symbol: string): Promise<boolean> {
    return this.call<boolean>('symbol_select', { symbol });
  }

  async positionsGet(symbol: string): Promise<Position[]> {
    return this.call<Position[]>('positions_get', { symbol });
  }

  async copyRatesFromPos(
    symbol: string,
    timeframe: number,
    startPos: number,
    count: number,
  ): Promise<RateBar[] | null> {
    return this.call<RateBar[] | null>('copy_rates_from_pos', {
      symbol,
      timeframe,
      start_pos: startPos,
      count,
    });
  }

  async accountInfo(): Promise<AccountInfo | null> {
    return this.call<AccountInfo | null>('account_info');
  }

  async symbolInfo(symbol: string): Promise<SymbolInfo | null> {
    return this.call<SymbolInfo | null>('symbol_info', { symbol });
  }

  async symbolInfoTick(symbol: string): Promise<SymbolTick | null> {
    return this.call<SymbolTick | null>('symbol_info_tick', { symbol });
  }

  async orderSend(request: TradeRequest): Promise<OrderResult> {
    return this.call<OrderResult>('order_send', { request });
  }
}

export const mt5 = new Mt5BridgeClient();
