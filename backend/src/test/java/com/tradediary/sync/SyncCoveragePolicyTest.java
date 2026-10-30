package com.tradediary.sync;

import com.tradediary.exchange.ExchangeKey;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;

class SyncCoveragePolicyTest {
    private static final LocalDateTime CHECKED_AT = LocalDateTime.of(2026, 10, 14, 12, 0);

    @Test
    void recordsApiLimitedRangeWithoutClaimingTheRequestedYear() {
        LocalDateTime requested = SyncCoveragePolicy.requestedFrom(ExchangeKey.Exchange.BINANCE, CHECKED_AT);
        var range = SyncCoveragePolicy.range(ExchangeKey.Exchange.BINANCE, requested,
                CHECKED_AT.plusMinutes(2), CHECKED_AT);

        assertThat(range.requestedFrom()).isEqualTo(CHECKED_AT.minusDays(365));
        assertThat(range.availableFrom()).isEqualTo(CHECKED_AT.plusMinutes(2).minusMonths(3));
        assertThat(range.verifiedThrough()).isEqualTo(CHECKED_AT);
        assertThat(range.status()).isEqualTo("LIMITED_BY_EXCHANGE");
        assertThat(SyncCoveragePolicy.products(ExchangeKey.Exchange.BINANCE)).containsExactly("USDT_FUTURES");
    }

    @Test
    void recordsSeparateProductsAndOnlyTheRequestedRangeForBybit() {
        LocalDateTime requested = SyncCoveragePolicy.requestedFrom(ExchangeKey.Exchange.BYBIT, CHECKED_AT);
        var range = SyncCoveragePolicy.range(ExchangeKey.Exchange.BYBIT, requested,
                CHECKED_AT.plusSeconds(1), CHECKED_AT);

        assertThat(range.availableFrom()).isEqualTo(requested);
        assertThat(range.status()).isEqualTo("REQUESTED_RANGE_CHECKED");
        assertThat(SyncCoveragePolicy.products(ExchangeKey.Exchange.BYBIT)).containsExactly("LINEAR", "INVERSE");
    }

    @Test
    void bingxDoesNotClaimAnUnqueriedYear() {
        assertThat(SyncCoveragePolicy.requestedFrom(ExchangeKey.Exchange.BINGX, CHECKED_AT))
                .isEqualTo(CHECKED_AT.minusDays(90));
    }
}
