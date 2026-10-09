// [파일 용도] 거래소별 현재 보유 자산 조회 비즈니스 로직

package com.tradediary.exchange;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletableFuture;

// [클래스] 등록된 거래소에서 실시간 잔고를 조회하여 통합 응답 반환
@Slf4j
@Service
@RequiredArgsConstructor
public class BalanceService {

    private final com.tradediary.common.service.PnlCalculationService pnlCalculationService;

    private final ExchangeKeyService exchangeKeyService;
    private final ExchangeKeyRepository exchangeKeyRepository;
    private final UpbitClient   upbitClient;
    private final BybitClient   bybitClient;
    private final BitgetClient  bitgetClient;
    private final OkxClient     okxClient;
    private final BinanceClient binanceClient;
    private final BingxClient   bingxClient;
    private final KrakenClient  krakenClient;
    private final ThreadPoolTaskExecutor exchangeIoExecutor;

    @Autowired
    private ExchangeRateController exchangeRateController;

    // [용도] 사용자가 등록한 모든 거래소의 보유 자산 조회 / [호출] BalanceController.getBalances()
    public List<ExchangeBalance> getAllBalances(Long userId) {
        List<ExchangeKey> keys = exchangeKeyRepository.findAllByUserId(userId).stream()
                .sorted(Comparator.comparingInt(key -> balanceOrder(key.getExchange())))
                .toList();
        return keys.stream()
                .map(key -> CompletableFuture.supplyAsync(
                        () -> fetchExchangeBalance(userId, key), exchangeIoExecutor))
                .toList().stream()
                .map(CompletableFuture::join)
                .toList();
    }

    private ExchangeBalance fetchExchangeBalance(Long userId, ExchangeKey key) {
        String exchange = key.getExchange().name();
        try {
            ExchangeKeyService.DecryptedKey decrypted = exchangeKeyService.getDecryptedKey(userId, key.getExchange());
            BalanceSnapshot snapshot = fetchBalanceSnapshot(key.getExchange(), decrypted);
            return new ExchangeBalance(exchange, snapshot.assets(), snapshot.positions(), null);
        } catch (Exception e) {
            log.error("[Balance] {} balance query failed userId={}: {}", exchange, userId, e.getMessage());
            return new ExchangeBalance(exchange, List.of(), List.of(), "Unable to load balance");
        }
    }

    private int balanceOrder(ExchangeKey.Exchange exchange) {
        return exchange == ExchangeKey.Exchange.BYBIT ? Integer.MAX_VALUE : exchange.ordinal();
    }

    // [용도] 거래소별 잔고 조회 분기 / [호출] getAllBalances()
    private BalanceSnapshot fetchBalanceSnapshot(ExchangeKey.Exchange exchange,
                                                 ExchangeKeyService.DecryptedKey dk) {
        return switch (exchange) {
            case UPBIT   -> new BalanceSnapshot(
                    mapUpbit(upbitClient.getBalance(dk.apiKey(), dk.secretKey())),
                    List.of()
            );
            case BYBIT   -> new BalanceSnapshot(
                    mapBybit(bybitClient.getBalance(dk.apiKey(), dk.secretKey())),
                    List.of()
            );
            case BITGET  -> new BalanceSnapshot(
                    mapBitget(bitgetClient.getBalance(dk.apiKey(), dk.secretKey(), dk.passphrase())),
                    mapBitgetPositions(bitgetClient.getPositions(dk.apiKey(), dk.secretKey(), dk.passphrase()))
            );
            case OKX     -> new BalanceSnapshot(
                    mapOkx(okxClient.getBalance(dk.apiKey(), dk.secretKey(), dk.passphrase())),
                    List.of()
            );
            case BINANCE -> new BalanceSnapshot(
                    mapBinance(binanceClient.getBalance(dk.apiKey(), dk.secretKey())),
                    List.of()
            );
            case BINGX   -> fetchBingxSnapshot(dk);
            case KRAKEN  -> new BalanceSnapshot(
                    krakenClient.getBalance(dk.apiKey(), dk.secretKey()).stream()
                            .map(balance -> new AssetBalance(normalizeKrakenAsset(balance.asset()), balance.balance().toPlainString(),
                                    balance.balance().toPlainString(), null, "USD"))
                            .toList(),
                    List.of()
            );
        };
    }

    private String normalizeKrakenAsset(String asset) {
        return switch (asset) {
            case "XXBT", "XBT" -> "BTC";
            case "XETH" -> "ETH";
            case "ZUSD" -> "USD";
            case "ZEUR" -> "EUR";
            case "ZGBP" -> "GBP";
            default -> asset.startsWith("X") || asset.startsWith("Z") ? asset.substring(1) : asset;
        };
    }

    private BalanceSnapshot fetchBingxSnapshot(ExchangeKeyService.DecryptedKey dk) {
        List<AssetBalance> assets = List.of();
        List<FuturesPosition> positions = List.of();
        RuntimeException balanceError = null;
        RuntimeException positionError = null;

        try {
            assets = mapBingx(bingxClient.getBalance(dk.apiKey(), dk.secretKey()));
        } catch (RuntimeException e) {
            balanceError = e;
            log.warn("[Balance] BINGX balance query failed: {}", e.getMessage());
        }

        try {
            positions = mapBingxPositions(bingxClient.getPositions(dk.apiKey(), dk.secretKey()));
        } catch (RuntimeException e) {
            positionError = e;
            log.warn("[Balance] BINGX position query failed: {}", e.getMessage());
        }

        if (balanceError != null && positionError != null) {
            throw balanceError;
        }

        return new BalanceSnapshot(assets, positions);
    }

    // [용도] Upbit 잔고 → 공통 DTO 변환 / [호출] fetchBalance()
    // Upbit: balance=가용 잔고, locked=주문 중 묶인 금액 → total = balance + locked
    private List<AssetBalance> mapUpbit(List<UpbitClient.UpbitBalance> list) {
        return list.stream().map(b -> new AssetBalance(
                b.currency,
                safeAdd(b.balance, b.locked),  // 전체 잔고
                b.balance,                     // 가용 잔고 (주문 가능)
                b.avg_buy_price,
                b.unit_currency
        )).toList();
    }

    // [용도] Bybit 잔고 → 공통 DTO 변환 / [호출] fetchBalance()
    private List<AssetBalance> mapBybit(List<BybitClient.BybitBalance> list) {
        return list.stream().map(b -> new AssetBalance(
                b.coin,
                firstNonBlank(b.equity, b.walletBalance, "0"),
                resolveBybitAvailable(b),
                null,
                "USD"
        )).toList();
    }

    // [용도] Bitget 잔고 → 공통 DTO 변환 / [호출] fetchBalance()
    private List<AssetBalance> mapBitget(List<BitgetClient.BitgetBalance> list) {
        return list.stream().map(b -> {
            // available + frozen = 전체 잔고
            String total = firstNonBlank(b.equity, safeAdd(b.available, b.frozen), "0");
            return new AssetBalance(b.coin, total, b.available, null, "USD");
        }).toList();
    }

    // [용도] OKX 잔고 → 공통 DTO 변환 / [호출] fetchBalance()
    private List<FuturesPosition> mapBitgetPositions(List<BitgetClient.BitgetPosition> list) {
        return list.stream().map(p -> new FuturesPosition(
                p.symbol,
                p.holdSide,
                firstNonBlank(p.total, "0"),
                firstNonBlank(p.available, "0"),
                firstNonBlank(p.openPriceAvg, "0"),
                firstNonBlank(p.markPrice, "0"),
                firstNonBlank(p.unrealizedPL, "0"),
                firstNonBlank(p.leverage, "0"),
                firstNonBlank(p.marginMode, "-"),
                firstNonBlank(p.liquidationPrice, "0"),
                firstNonBlank(p.marginCoin, "USDT")
        )).toList();
    }

    private List<AssetBalance> mapOkx(List<OkxClient.OkxBalance> list) {
        return list.stream().map(b -> new AssetBalance(
                b.currency,
                safeAdd(b.available, b.frozen),
                b.available,
                null,
                "USD"
        )).toList();
    }

    // [용도] Binance 잔고 → 공통 DTO 변환 / [호출] fetchBalance()
    private List<AssetBalance> mapBinance(List<BinanceClient.BinanceBalance> list) {
        return list.stream().map(b -> new AssetBalance(
                b.asset,
                b.balance,
                b.availableBalance,
                null,
                "USD"
        )).toList();
    }

    // [용도] BingX 잔고 → 공통 DTO 변환 / [호출] fetchBalance()
    private List<AssetBalance> mapBingx(List<BingxClient.BingxBalance> list) {
        return list.stream().map(b -> new AssetBalance(
                b.asset,
                firstNonBlank(b.equity, b.balance, "0"),
                firstNonBlank(b.availableMargin, b.balance, "0"),
                null,
                "USD"
        )).toList();
    }

    private List<FuturesPosition> mapBingxPositions(List<BingxClient.BingxPosition> list) {
        return list.stream().map(p -> new FuturesPosition(
                p.symbol,
                p.side,
                firstNonBlank(p.positionAmt, "0"),
                firstNonBlank(p.availableAmt, "0"),
                firstNonBlank(p.avgPrice, "0"),
                firstNonBlank(p.markPrice, "0"),
                firstNonBlank(p.unrealizedProfit, "0"),
                firstNonBlank(p.leverage, "0"),
                firstNonBlank(p.marginType, "-"),
                firstNonBlank(p.liquidationPrice, "0"),
                firstNonBlank(p.marginAsset, "USDT")
        )).toList();
    }

    // [용도] 두 문자열 숫자 합산 (null 안전) / [호출] mapBitget, mapOkx
    private String safeAdd(String a, String b) {
        try {
            java.math.BigDecimal da = new java.math.BigDecimal(a != null ? a : "0");
            java.math.BigDecimal db = new java.math.BigDecimal(b != null ? b : "0");
            return da.add(db).toPlainString();
        } catch (NumberFormatException e) {
            return a != null ? a : "0";
        }
    }

    private String resolveBybitAvailable(BybitClient.BybitBalance balance) {
        if (isPositive(balance.availableToWithdraw)) {
            return balance.availableToWithdraw;
        }

        String isolatedLike = safeSubtract(
                balance.walletBalance,
                balance.totalPositionIM,
                balance.totalOrderIM,
                balance.locked,
                balance.bonus
        );
        if (isPositive(isolatedLike)) {
            return isolatedLike;
        }

        if (("USDT".equals(balance.coin) || "USDC".equals(balance.coin))
                && isPositive(balance.totalAvailableBalance)) {
            return balance.totalAvailableBalance;
        }

        return firstNonBlank(balance.availableToWithdraw, "0");
    }

    private String safeSubtract(String base, String... subtractors) {
        try {
            BigDecimal result = new BigDecimal(base != null ? base : "0");
            for (String subtractor : subtractors) {
                result = result.subtract(new BigDecimal(subtractor != null ? subtractor : "0"));
            }
            return result.max(BigDecimal.ZERO).toPlainString();
        } catch (NumberFormatException e) {
            return base != null ? base : "0";
        }
    }

    private boolean isPositive(String value) {
        try {
            return value != null && new BigDecimal(value).compareTo(BigDecimal.ZERO) > 0;
        } catch (NumberFormatException e) {
            return false;
        }
    }

    private String firstNonBlank(String... values) {
        for (String value : values) {
            if (value != null && !value.isBlank()) {
                return value;
            }
        }
        return "0";
    }

    // [용도] 통합 자산 계산 (모든 자산을 USD 기준으로 합산) / [호출] AssetController.getPortfolio()
    public Map<String, Object> getPortfolio(Long userId) {
        // 1. 거래소별 잔고 조회
        List<ExchangeBalance> exchangeBalances = getAllBalances(userId);

        // 2. 환율 조회
        Map<String, BigDecimal> exchangeRates = getExchangeRates();
        BigDecimal krwPerUsd = exchangeRates.get("krwPerUsd");
        BigDecimal cnyPerUsd = exchangeRates.get("cnyPerUsd");
        BigDecimal jpyPerUsd = exchangeRates.get("jpyPerUsd");

        // 3. 자산별 통계 저장
        Map<String, BigDecimal> coinUsdValues = new HashMap<>();
        BigDecimal totalUsd = BigDecimal.ZERO;
        BigDecimal totalKrw = BigDecimal.ZERO;

        // 4. 거래소별로 자산 합산
        for (ExchangeBalance exchangeBalance : exchangeBalances) {
            if (exchangeBalance.error() != null) continue;

            for (AssetBalance asset : exchangeBalance.assets()) {
                BigDecimal balance = new BigDecimal(asset.balance());
                BigDecimal assetUsdValue;

                // 기준 통화에 따라 USD로 변환
                switch (asset.unitCurrency()) {
                    case "KRW":
                        assetUsdValue = balance.divide(krwPerUsd, 8, RoundingMode.HALF_UP);
                        totalKrw = totalKrw.add(balance);
                        break;
                    case "USD":
                    case "USDT":
                        assetUsdValue = balance;
                        break;
                    case "CNY":
                        assetUsdValue = balance.divide(cnyPerUsd, 8, RoundingMode.HALF_UP);
                        break;
                    case "JPY":
                        assetUsdValue = balance.divide(jpyPerUsd, 8, RoundingMode.HALF_UP);
                        break;
                    default:
                        // 다른 코인은 USD 기준으로 가정
                        assetUsdValue = balance;
                        break;
                }

                // 코인별 USD 가치 합산
                coinUsdValues.merge(asset.currency(), assetUsdValue, BigDecimal::add);
                totalUsd = totalUsd.add(assetUsdValue);
            }
        }

        // 5. 통합 자산 응답 생성
        Map<String, Object> portfolio = new HashMap<>();
        portfolio.put("totalUsd", totalUsd.setScale(2, RoundingMode.HALF_UP));
        portfolio.put("totalKrw", totalKrw.setScale(0, RoundingMode.HALF_UP));
        portfolio.put("exchangeRates", Map.of(
            "krwPerUsd", krwPerUsd,
            "krwPerUsdFormatted", String.format("%.2f", krwPerUsd)
        ));

        // 6. 개별 자산 목록 생성 (USD 기준)
        List<Map<String, Object>> assets = new ArrayList<>();
        for (Map.Entry<String, BigDecimal> entry : coinUsdValues.entrySet()) {
            Map<String, Object> asset = new HashMap<>();
            String currency = entry.getKey();
            BigDecimal usdValue = entry.getValue();

            asset.put("currency", currency);
            asset.put("usdValue", usdValue.setScale(2, RoundingMode.HALF_UP));
            asset.put("krwValue", usdValue.multiply(krwPerUsd).setScale(0, RoundingMode.HALF_UP));

            // 비중 계산
            if (totalUsd.compareTo(BigDecimal.ZERO) > 0) {
                BigDecimal percentage = usdValue.divide(totalUsd, 4, RoundingMode.HALF_UP)
                                           .multiply(new BigDecimal("100"));
                asset.put("percentage", percentage.setScale(2, RoundingMode.HALF_UP));
            } else {
                asset.put("percentage", BigDecimal.ZERO);
            }

            assets.add(asset);
        }

        // 7. 자산 가치 순으로 정렬
        assets.sort((a, b) -> ((BigDecimal) b.get("usdValue")).compareTo((BigDecimal) a.get("usdValue")));

        portfolio.put("assets", assets);
        portfolio.put("lastUpdated", System.currentTimeMillis());

        return portfolio;
    }

    // [용도] 환율 정보 조회 / [호출] getPortfolio()
    private Map<String, BigDecimal> getExchangeRates() {
        try {
            Map<String, Object> rates = exchangeRateController.getExchangeRate().getBody();
            Map<String, BigDecimal> result = new HashMap<>();
            result.put("krwPerUsd", new BigDecimal(rates.get("krwPerUsdt").toString()));
            result.put("cnyPerUsd", new BigDecimal(rates.get("cnyPerUsdt").toString()));
            result.put("jpyPerUsd", new BigDecimal(rates.get("jpyPerUsdt").toString()));
            return result;
        } catch (Exception e) {
            log.error("환율 조회 실패, 기본값 사용: {}", e.getMessage());
            return Map.of(
                "krwPerUsd", new BigDecimal("1400"),
                "cnyPerUsd", new BigDecimal("7.2"),
                "jpyPerUsd", new BigDecimal("150")
            );
        }
    }

    // [용도] 거래소 잔고 응답 DTO
    public record ExchangeBalance(
            String exchange,
            List<AssetBalance> assets,
            List<FuturesPosition> positions,
            String error   // null이면 정상, 오류 시 메시지
    ) {}

    // 개별 자산 잔고 DTO
    public record AssetBalance(
            String currency,      // 코인명 (BTC, USDT, KRW 등)
            String balance,       // 전체 잔고
            String available,     // 가용 잔고 (주문 가능)
            String avgBuyPrice,   // 평균 매수가 (Upbit only)
            String unitCurrency   // 기준 통화 (KRW 또는 USD)
    ) {}

    // 스테이블코인 목록 (USD 기준으로 바로 합산)
    public record FuturesPosition(
            String symbol,
            String side,
            String size,
            String availableSize,
            String entryPrice,
            String markPrice,
            String unrealizedPnl,
            String leverage,
            String marginMode,
            String liquidationPrice,
            String marginCoin
    ) {}

    private record BalanceSnapshot(
            List<AssetBalance> assets,
            List<FuturesPosition> positions
    ) {}

    private static final java.util.Set<String> STABLECOINS = java.util.Set.of("USDT", "USDC", "BUSD", "DAI", "TUSD");

    // [용도] 거래소 잔고 리스트에서 총 자산(USD) 계산 / [호출] BalanceController.getBalances()
    public java.math.BigDecimal calculateTotalAssetsValue(List<ExchangeBalance> balances) {
        java.math.BigDecimal total = java.math.BigDecimal.ZERO;
        java.math.BigDecimal krwPerUsd = pnlCalculationService.getKrwPerUsdt();

        for (ExchangeBalance eb : balances) {
            if (eb.error() != null) continue;  // 오류난 거래소는 스킵
            for (AssetBalance ab : eb.assets()) {
                try {
                    java.math.BigDecimal bal = new java.math.BigDecimal(ab.balance());
                    if (bal.compareTo(java.math.BigDecimal.ZERO) <= 0) continue;

                    // 스테이블코인은 USD 그대로 합산
                    if (STABLECOINS.contains(ab.currency())) {
                        total = total.add(bal);
                    }
                    // KRW는 환율 적용 (1 USD ≈ 1350 KRW)
                    else if ("KRW".equals(ab.currency())) {
                        total = total.add(bal.divide(krwPerUsd, 2, java.math.RoundingMode.HALF_UP));
                    }
                    // Upbit 코인: avgBuyPrice가 KRW면 환율 적용
                    else if ("KRW".equals(ab.unitCurrency()) && ab.avgBuyPrice() != null) {
                        java.math.BigDecimal krwValue = bal.multiply(new java.math.BigDecimal(ab.avgBuyPrice()));
                        total = total.add(krwValue.divide(krwPerUsd, 2, java.math.RoundingMode.HALF_UP));
                    }
                    // USD 단위 코인: balance 그대로 (정확하려면 현재가 필요하지만 스냅샷이므로 생략)
                    else if ("USD".equals(ab.unitCurrency())) {
                        total = total.add(bal);
                    }
                } catch (NumberFormatException e) {
                    // 파싱 실패 시 스킵
                }
            }
        }
        return total;
    }
}
