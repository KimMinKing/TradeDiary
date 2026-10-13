# Public portfolio methodology

## Endpoint

`GET /api/user/public/{userId}/portfolio?period=1d|7d|30d|all`

The endpoint is available only when the trader has made the profile, statistics, and positions public. Filtering happens in PostgreSQL before aggregation, so short-period requests do not load the full position history.

## Currency normalization

- Upbit position PnL and entry capital are treated as KRW.
- Other supported exchange values are treated as USDT/USD and converted to KRW with the cached `KRW-USDT` market rate.
- The response includes `base_currency=KRW` and the exact `krw_per_usdt` rate used.
- The latest account asset value is stored in USD. The API returns both `current_assets_usd` and its current KRW conversion.

No frontend component should apply a hard-coded exchange rate.

## Performance fields

- `realized_trading_pnl`: Sum of normalized PnL for closed positions in the selected period.
- `invested_capital`: Sum of `abs(entry price × quantity)`, normalized to KRW.
- `capital_weighted_return_pct`: `realized trading PnL / invested capital × 100`.
- `maximum_drawdown`: Largest peak-to-trough decline in cumulative realized PnL.
- `maximum_drawdown_pct`: Maximum drawdown divided by invested capital.
- `daily_performance`: Trading-day PnL and cumulative PnL. Days without a closed position are omitted.
- `current_month_pnl`: Current calendar month PnL, independent of the selected chart period.

`capital_weighted_return_pct` is a trading-efficiency metric. It is not an account equity return or a time-weighted return.

## Cash flows and account return

The application currently stores only the latest account asset value. It does not yet retain historical equity snapshots, deposits, or withdrawals. Therefore:

- deposits and withdrawals are returned as `null`, not zero;
- `cash_flow.tracked` is `false`;
- time-weighted return is returned as `null`;
- starting and ending equity return must not be inferred from the latest balance.

Accurate account returns require a future immutable balance snapshot and cash-flow ledger. Once available, daily return should exclude net external cash flows, and period return should chain daily sub-period returns.

## Privacy

The public endpoint returns derived metrics and a limited list of normalized position results. It never returns exchange API keys, encrypted secrets, raw execution identifiers, or private journal content.
