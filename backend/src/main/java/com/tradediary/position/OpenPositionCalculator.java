package com.tradediary.position;

import com.tradediary.trade.Trade;
import com.tradediary.trade.TradeSide;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;

/** Calculates the remaining cost basis from chronological executions. */
final class OpenPositionCalculator {
    private static final BigDecimal ZERO_THRESHOLD = new BigDecimal("0.000001");

    private OpenPositionCalculator() {}

    static OpenPosition calculate(List<Trade> trades) {
        BigDecimal netQty = BigDecimal.ZERO;
        BigDecimal averageEntry = BigDecimal.ZERO;
        int windowTradeCount = 0;

        for (Trade trade : trades) {
            BigDecimal qty = trade.getQty();
            if (qty == null || qty.signum() <= 0) continue;
            BigDecimal delta = trade.getSide() == TradeSide.BUY ? qty : qty.negate();
            BigDecimal nextQty = netQty.add(delta);

            if (netQty.signum() == 0 || netQty.signum() == delta.signum()) {
                BigDecimal oldValue = averageEntry.multiply(netQty.abs());
                averageEntry = oldValue.add(trade.getPrice().multiply(qty))
                        .divide(nextQty.abs(), 10, RoundingMode.HALF_UP);
                windowTradeCount++;
            } else if (nextQty.signum() != 0 && nextQty.signum() != netQty.signum()) {
                // One execution closes the previous position and opens the remainder.
                averageEntry = trade.getPrice();
                windowTradeCount = 1;
            } else {
                // A partial close does not change the cost basis of the remaining units.
                windowTradeCount++;
            }

            netQty = nextQty.abs().compareTo(ZERO_THRESHOLD) < 0 ? BigDecimal.ZERO : nextQty;
            if (netQty.signum() == 0) {
                averageEntry = BigDecimal.ZERO;
                windowTradeCount = 0;
            }
        }

        if (netQty.signum() == 0) return null;
        return new OpenPosition(netQty, averageEntry,
                netQty.signum() > 0 ? PositionSide.LONG : PositionSide.SHORT, windowTradeCount);
    }

    record OpenPosition(BigDecimal netQty, BigDecimal averageEntry, PositionSide side, int tradeCount) {}
}
