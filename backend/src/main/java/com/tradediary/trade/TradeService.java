// [파일 용도] 거래 내역 동기화 및 조회 비즈니스 로직

package com.tradediary.trade;

import com.tradediary.common.exception.BusinessException;
import com.tradediary.common.exception.ErrorCode;
import com.tradediary.exchange.ExchangeKey;
import com.tradediary.exchange.ExchangeKeyService;
import com.tradediary.exchange.BybitClient;
import com.tradediary.exchange.UpbitClient;
import com.tradediary.user.User;
import com.tradediary.user.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

// [클래스] Upbit/Bybit 거래 내역 동기화 및 거래 목록 조회
@Slf4j
@Service
@RequiredArgsConstructor
public class TradeService {

    private final TradeRepository tradeRepository;
    private final ExchangeKeyService exchangeKeyService;
    private final UserRepository userRepository;
    private final UpbitClient upbitClient;
    private final BybitClient bybitClient;

    // [용도] Upbit 거래 내역 동기화 (신규 건만 저장) / [호출] TradeController.syncTrades()
    // - 초기 동기화: DB에 거래 없으면 최근 1년 전체 조회
    // - 증분 동기화: DB 마지막 거래 이후만 조회
    @Transactional
    public int syncUpbitTrades(Long userId) {
        ExchangeKeyService.DecryptedKey keys =
                exchangeKeyService.getDecryptedKey(userId, ExchangeKey.Exchange.UPBIT);

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));

        // 초기 동기화: 최근 1년 / 증분 동기화: DB 마지막 거래 시각 이후
        LocalDateTime startTime = tradeRepository
                .findTopByUserIdAndExchangeOrderByTradedAtDesc(userId, ExchangeKey.Exchange.UPBIT)
                .map(Trade::getTradedAt)
                .orElse(LocalDateTime.now(java.time.ZoneId.of("Asia/Seoul")).minusYears(1));

        log.info("Upbit 동기화 시작 - userId: {}, startTime: {}, 방식: {}",
                userId, startTime, isInitialSync(userId) ? "초기(1년)" : "증분");

        List<UpbitClient.UpbitOrder> orders =
                upbitClient.getClosedOrders(keys.apiKey(), keys.secretKey(), startTime);

        int savedCount = 0;
        for (UpbitClient.UpbitOrder order : orders) {
            // 수량이 0인 미체결/취소 주문 제외
            if (order.executed_volume == null || "0".equals(order.executed_volume)) continue;

            // 중복 저장 방지 (exchange_trade_id unique)
            if (tradeRepository.existsByUserIdAndExchangeAndExchangeTradeId(
                    userId, ExchangeKey.Exchange.UPBIT, order.uuid)) continue;

            UpbitClient.NormalizedTrade normalized = UpbitClient.NormalizedTrade.from(order);

            // 가격/수량이 0인 유효하지 않은 주문 제외
            if (!normalized.isValid()) continue;

            tradeRepository.save(Trade.builder()
                    .user(user)
                    .exchange(ExchangeKey.Exchange.UPBIT)
                    .exchangeTradeId(normalized.exchangeTradeId())
                    .symbol(normalized.symbol())
                    .side(normalized.side())
                    .qty(normalized.qty())
                    .price(normalized.price())
                    .fee(normalized.fee())
                    .tradedAt(normalized.tradedAt())
                    .build());
            savedCount++;
        }

        log.info("Upbit 거래 동기화 완료 - userId: {}, 조회: {}건, 신규 저장: {}건",
                userId, orders.size(), savedCount);
        return savedCount;
    }

    // [용도] 거래 목록 조회 (exchange 필터 선택) / [호출] TradeController.getTrades()
    @Transactional(readOnly = true)
    public List<TradeResponse> getTrades(Long userId, String exchange) {
        if (exchange != null && !exchange.isBlank()) {
            ExchangeKey.Exchange exchangeEnum = ExchangeKey.Exchange.valueOf(exchange.toUpperCase());
            return tradeRepository.findByUserIdAndExchangeOrderByTradedAtDesc(userId, exchangeEnum)
                    .stream().map(TradeResponse::from).toList();
        }
        return tradeRepository.findByUserIdOrderByTradedAtDesc(userId).stream()
                .map(TradeResponse::from).toList();
    }

    // [용도] Bybit 거래 내역 동기화 (신규 건만 저장) / [호출] TradeController.syncBybitTrades()
    // - 초기 동기화: DB에 Bybit 거래 없으면 최근 1년
    // - 증분 동기화: DB 마지막 Bybit 거래 이후
    @Transactional
    public int syncBybitTrades(Long userId) {
        ExchangeKeyService.DecryptedKey keys =
                exchangeKeyService.getDecryptedKey(userId, ExchangeKey.Exchange.BYBIT);

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));

        LocalDateTime startTime = tradeRepository
                .findTopByUserIdAndExchangeOrderByTradedAtDesc(userId, ExchangeKey.Exchange.BYBIT)
                .map(Trade::getTradedAt)
                .orElse(LocalDateTime.now(java.time.ZoneId.of("Asia/Seoul")).minusYears(1));

        log.info("Bybit 동기화 시작 - userId: {}, startTime: {}", userId, startTime);

        List<BybitClient.BybitExecution> executions =
                bybitClient.getExecutions(keys.apiKey(), keys.secretKey(), startTime);

        int savedCount = 0;
        for (BybitClient.BybitExecution exec : executions) {
            // 중복 저장 방지
            if (tradeRepository.existsByUserIdAndExchangeAndExchangeTradeId(
                    userId, ExchangeKey.Exchange.BYBIT, exec.execId)) continue;

            BybitClient.NormalizedTrade normalized = BybitClient.NormalizedTrade.from(exec);
            if (!normalized.isValid()) continue;

            tradeRepository.save(Trade.builder()
                    .user(user)
                    .exchange(ExchangeKey.Exchange.BYBIT)
                    .exchangeTradeId(normalized.exchangeTradeId())
                    .symbol(normalized.symbol())
                    .side(normalized.side())
                    .qty(normalized.qty())
                    .price(normalized.price())
                    .fee(normalized.fee())
                    .tradedAt(normalized.tradedAt())
                    .build());
            savedCount++;
        }

        log.info("Bybit 거래 동기화 완료 - userId: {}, 조회: {}건, 신규 저장: {}건",
                userId, executions.size(), savedCount);
        return savedCount;
    }

    // [용도] 초기 동기화 여부 확인 / [호출] syncUpbitTrades()
    private boolean isInitialSync(Long userId) {
        return !tradeRepository.existsByUserIdAndExchange(userId, ExchangeKey.Exchange.UPBIT);
    }

    // 거래 응답 DTO
    public record TradeResponse(
            Long id,
            String exchange,
            String symbol,
            String side,
            String qty,
            String price,
            String fee,
            String tradedAt
    ) {
        public static TradeResponse from(Trade trade) {
            return new TradeResponse(
                    trade.getId(),
                    trade.getExchange().name(),
                    trade.getSymbol(),
                    trade.getSide().name(),
                    trade.getQty().toPlainString(),
                    trade.getPrice().toPlainString(),
                    trade.getFee().toPlainString(),
                    trade.getTradedAt().toString()
            );
        }
    }
}
