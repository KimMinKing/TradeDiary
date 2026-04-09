// [파일 용도] 거래소별 현재 보유 자산 조회 비즈니스 로직

package com.tradediary.exchange;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

// [클래스] 등록된 거래소에서 실시간 잔고를 조회하여 통합 응답 반환
@Slf4j
@Service
@RequiredArgsConstructor
public class BalanceService {

    private final ExchangeKeyService exchangeKeyService;
    private final ExchangeKeyRepository exchangeKeyRepository;
    private final UpbitClient   upbitClient;
    private final BybitClient   bybitClient;
    private final BitgetClient  bitgetClient;
    private final OkxClient     okxClient;
    private final BinanceClient binanceClient;
    private final BingxClient   bingxClient;

    // [용도] 사용자가 등록한 모든 거래소의 보유 자산 조회 / [호출] BalanceController.getBalances()
    public List<ExchangeBalance> getAllBalances(Long userId) {
        List<ExchangeKey> keys = exchangeKeyRepository.findAllByUserId(userId);
        List<ExchangeBalance> result = new ArrayList<>();

        for (ExchangeKey key : keys) {
            String exchange = key.getExchange().name();
            try {
                ExchangeKeyService.DecryptedKey dk = exchangeKeyService.getDecryptedKey(userId, key.getExchange());
                List<AssetBalance> assets = fetchBalance(key.getExchange(), dk);
                result.add(new ExchangeBalance(exchange, assets, null));
            } catch (Exception e) {
                log.error("[Balance] {} 잔고 조회 실패 userId={}: {}", exchange, userId, e.getMessage());
                result.add(new ExchangeBalance(exchange, List.of(), e.getMessage()));
            }
        }
        return result;
    }

    // [용도] 거래소별 잔고 조회 분기 / [호출] getAllBalances()
    private List<AssetBalance> fetchBalance(ExchangeKey.Exchange exchange,
                                            ExchangeKeyService.DecryptedKey dk) {
        return switch (exchange) {
            case UPBIT   -> mapUpbit(upbitClient.getBalance(dk.apiKey(), dk.secretKey()));
            case BYBIT   -> mapBybit(bybitClient.getBalance(dk.apiKey(), dk.secretKey()));
            case BITGET  -> mapBitget(bitgetClient.getBalance(dk.apiKey(), dk.secretKey(), dk.passphrase()));
            case OKX     -> mapOkx(okxClient.getBalance(dk.apiKey(), dk.secretKey(), dk.passphrase()));
            case BINANCE -> mapBinance(binanceClient.getBalance(dk.apiKey(), dk.secretKey()));
            case BINGX   -> mapBingx(bingxClient.getBalance(dk.apiKey(), dk.secretKey()));
        };
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
                b.walletBalance,
                b.availableToWithdraw,
                null,
                "USD"
        )).toList();
    }

    // [용도] Bitget 잔고 → 공통 DTO 변환 / [호출] fetchBalance()
    private List<AssetBalance> mapBitget(List<BitgetClient.BitgetBalance> list) {
        return list.stream().map(b -> {
            // available + frozen = 전체 잔고
            String total = safeAdd(b.available, b.frozen);
            return new AssetBalance(b.coin, total, b.available, null, "USD");
        }).toList();
    }

    // [용도] OKX 잔고 → 공통 DTO 변환 / [호출] fetchBalance()
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
                b.balance,
                b.availableMargin,
                null,
                "USD"
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

    // 거래소 잔고 응답 DTO
    public record ExchangeBalance(
            String exchange,
            List<AssetBalance> assets,
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
}
