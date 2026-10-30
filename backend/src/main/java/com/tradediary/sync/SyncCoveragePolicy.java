package com.tradediary.sync;

import com.tradediary.exchange.ExchangeKey;

import java.time.LocalDateTime;
import java.util.List;

/** The range this importer actually queries; it does not assert that the exchange returned every trade. */
final class SyncCoveragePolicy {
    private SyncCoveragePolicy() {}

    static LocalDateTime requestedFrom(ExchangeKey.Exchange exchange, LocalDateTime now) {
        return exchange == ExchangeKey.Exchange.BINGX ? now.minusDays(90) : now.minusDays(365);
    }

    static List<String> products(ExchangeKey.Exchange exchange) {
        return switch (exchange) {
            case UPBIT, KRAKEN -> List.of("SPOT");
            case BYBIT -> List.of("LINEAR", "INVERSE");
            case BITGET, BINANCE -> List.of("USDT_FUTURES");
            case OKX -> List.of("SWAP", "FUTURES");
            case BINGX -> List.of("PERPETUAL");
        };
    }

    static Coverage range(ExchangeKey.Exchange exchange, LocalDateTime requestedFrom,
                          LocalDateTime finishedAt, LocalDateTime verifiedThrough) {
        LocalDateTime cutoff = switch (exchange) {
            case BINANCE -> finishedAt.minusMonths(3);
            case BITGET, OKX -> finishedAt.minusDays(90);
            default -> requestedFrom;
        };
        LocalDateTime availableFrom = cutoff.isAfter(requestedFrom) ? cutoff : requestedFrom;
        return new Coverage(requestedFrom, availableFrom, verifiedThrough,
                availableFrom.isAfter(requestedFrom) ? "LIMITED_BY_EXCHANGE" : "REQUESTED_RANGE_CHECKED");
    }

    record Coverage(LocalDateTime requestedFrom, LocalDateTime availableFrom,
                    LocalDateTime verifiedThrough, String status) {}
}
