-- Binance trade IDs are scoped to a symbol; preserve existing rows when switching
-- to the symbol:tradeId key used by new imports.
UPDATE trades
SET exchange_trade_id = symbol || ':' || exchange_trade_id
WHERE exchange = 'BINANCE'
  AND exchange_trade_id NOT LIKE '%:%';
