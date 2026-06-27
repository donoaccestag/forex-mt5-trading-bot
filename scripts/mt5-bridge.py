"""Minimal JSON-RPC bridge exposing MetaTrader5 to the TypeScript bot."""

from __future__ import annotations

import json
import sys
from typing import Any

import MetaTrader5 as mt5


def _serialize(value: Any) -> Any:
    if value is None:
        return None
    if hasattr(value, "_asdict"):
        return value._asdict()
    if isinstance(value, (list, tuple)):
        return [_serialize(item) for item in value]
    return value


def handle(method: str, args: dict[str, Any]) -> Any:
    if method == "initialize":
        return bool(
            mt5.initialize(
                login=args["login"],
                password=args["password"],
                server=args["server"],
            )
        )
    if method == "login":
        return bool(
            mt5.login(
                login=args["login"],
                password=args["password"],
                server=args["server"],
            )
        )
    if method == "shutdown":
        mt5.shutdown()
        return True
    if method == "last_error":
        return list(mt5.last_error())
    if method == "terminal_info":
        info = mt5.terminal_info()
        return _serialize(info)
    if method == "symbol_select":
        return bool(mt5.symbol_select(args["symbol"]))
    if method == "positions_get":
        positions = mt5.positions_get(symbol=args["symbol"])
        return _serialize(positions or [])
    if method == "copy_rates_from_pos":
        rates = mt5.copy_rates_from_pos(
            args["symbol"],
            args["timeframe"],
            args["start_pos"],
            args["count"],
        )
        return _serialize(rates)
    if method == "account_info":
        return _serialize(mt5.account_info())
    if method == "symbol_info":
        return _serialize(mt5.symbol_info(args["symbol"]))
    if method == "symbol_info_tick":
        return _serialize(mt5.symbol_info_tick(args["symbol"]))
    if method == "order_send":
        result = mt5.order_send(args["request"])
        return _serialize(result)

    raise ValueError(f"Unknown method: {method}")


def main() -> None:
    for line in sys.stdin:
        line = line.strip()
        if not line:
            continue

        request = json.loads(line)
        response: dict[str, Any] = {"id": request["id"]}

        try:
            response["ok"] = True
            response["result"] = handle(request["method"], request.get("args", {}))
        except Exception as exc:  # noqa: BLE001
            response["ok"] = False
            response["error"] = str(exc)

        print(json.dumps(response), flush=True)


if __name__ == "__main__":
    main()
