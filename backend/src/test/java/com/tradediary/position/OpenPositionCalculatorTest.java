package com.tradediary.position;

import com.tradediary.trade.Trade;
import com.tradediary.trade.TradeSide;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class OpenPositionCalculatorTest {
    @Test
    void partialCloseKeepsRemainingLongCostBasis() {
        var open = OpenPositionCalculator.calculate(List.of(
                trade(TradeSide.BUY, "2", "100"),
                trade(TradeSide.BUY, "2", "120"),
                trade(TradeSide.SELL, "1", "150")));

        assertThat(open.netQty()).isEqualByComparingTo("3");
        assertThat(open.averageEntry()).isEqualByComparingTo("110");
        assertThat(open.side()).isEqualTo(PositionSide.LONG);
    }

    @Test
    void partialCloseKeepsRemainingShortCostBasis() {
        var open = OpenPositionCalculator.calculate(List.of(
                trade(TradeSide.SELL, "2", "120"),
                trade(TradeSide.SELL, "2", "100"),
                trade(TradeSide.BUY, "1", "80")));

        assertThat(open.netQty()).isEqualByComparingTo("-3");
        assertThat(open.averageEntry()).isEqualByComparingTo("110");
        assertThat(open.side()).isEqualTo(PositionSide.SHORT);
    }

    @Test
    void reversalUsesOnlyRemainingQuantityAtReversalPrice() {
        var open = OpenPositionCalculator.calculate(List.of(
                trade(TradeSide.BUY, "2", "100"),
                trade(TradeSide.SELL, "3", "120")));

        assertThat(open.netQty()).isEqualByComparingTo("-1");
        assertThat(open.averageEntry()).isEqualByComparingTo("120");
        assertThat(open.tradeCount()).isEqualTo(1);
    }

    @Test
    void flatPositionHasNoOpenResult() {
        assertThat(OpenPositionCalculator.calculate(List.of(
                trade(TradeSide.BUY, "1", "100"),
                trade(TradeSide.SELL, "1", "120")))).isNull();
    }

    private Trade trade(TradeSide side, String qty, String price) {
        return Trade.builder().side(side).qty(new BigDecimal(qty)).price(new BigDecimal(price))
                .fee(BigDecimal.ZERO).tradedAt(LocalDateTime.of(2026, 1, 1, 0, 0)).build();
    }
}
