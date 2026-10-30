package com.tradediary.position;

import com.tradediary.exchange.ExchangeKey;
import com.tradediary.exchange.ExchangeKeyRepository;
import com.tradediary.notification.NotificationService;
import com.tradediary.trade.Trade;
import com.tradediary.trade.TradeRepository;
import com.tradediary.trade.TradeSide;
import com.tradediary.user.User;
import com.tradediary.user.UserRepository;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class PositionReversalTest {
    @Test
    void reversalClosesOnlyPreviousQuantityAndKeepsRemainingShortOpen() {
        PositionRepository positions = mock(PositionRepository.class);
        TradeRepository trades = mock(TradeRepository.class);
        UserRepository users = mock(UserRepository.class);
        PositionService service = new PositionService(positions, trades, users,
                mock(ExchangeKeyRepository.class), mock(NotificationService.class));
        User user = User.builder().email("test@example.com").nickname("Test").build();
        List<Trade> history = List.of(
                trade(TradeSide.BUY, "2", "100", "0", 1),
                trade(TradeSide.SELL, "3", "120", "3", 2));
        when(users.findById(7L)).thenReturn(Optional.of(user));
        when(trades.findByUserIdAndExchangeOrderBySymbolAscTradedAtAsc(7L, ExchangeKey.Exchange.UPBIT))
                .thenReturn(history);
        when(positions.save(any(Position.class))).thenAnswer(call -> call.getArgument(0));

        service.rebuildPositions(7L, ExchangeKey.Exchange.UPBIT);
        ArgumentCaptor<Position> saved = ArgumentCaptor.forClass(Position.class);
        verify(positions).save(saved.capture());
        assertThat(saved.getValue().getSide()).isEqualTo(PositionSide.LONG);
        assertThat(saved.getValue().getQty()).isEqualByComparingTo("2");
        assertThat(saved.getValue().getPnl()).isEqualByComparingTo("38");

        var open = service.getOpenPositions(7L, ExchangeKey.Exchange.UPBIT);
        assertThat(open).hasSize(1);
        assertThat(open.get(0).qty()).isEqualByComparingTo("-1");
        assertThat(open.get(0).avgBuyPrice()).isEqualByComparingTo("120");
    }

    private Trade trade(TradeSide side, String qty, String price, String fee, int minute) {
        return Trade.builder().exchange(ExchangeKey.Exchange.UPBIT).exchangeTradeId("trade-" + minute)
                .symbol("KRW-BTC").side(side).qty(new BigDecimal(qty)).price(new BigDecimal(price))
                .fee(new BigDecimal(fee)).tradedAt(LocalDateTime.of(2026, 1, 1, 0, minute)).build();
    }
}
