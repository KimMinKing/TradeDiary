// [파일 용도] 거래 내역 동기화 및 조회 비즈니스 로직

package com.tradediary.trade;

import com.tradediary.common.exception.BusinessException;
import com.tradediary.common.exception.ErrorCode;
import com.tradediary.exchange.ExchangeKey;
import com.tradediary.exchange.ExchangeKeyService;
import com.tradediary.exchange.UpbitClient;
import com.tradediary.user.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

// [클래스] Upbit 거래 내역 동기화 및 거래 목록 조회
@Slf4j
@Service
@RequiredArgsConstructor
public class TradeService {

    private final TradeRepository tradeRepository;
    private final ExchangeKeyService exchangeKeyService;
    private final UserRepository userRepository;
    private final UpbitClient upbitClient;

    // [용도] Upbit 거래 내역 동기화 (신규 건만 저장) / [호출] TradeController.syncTrades()
    @Transactional
    public int syncUpbitTrades(Long userId) {
        ExchangeKeyService.DecryptedKey keys =
                exchangeKeyService.getDecryptedKey(userId, ExchangeKey.Exchange.UPBIT);

        var user = userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));

        // 회원가입 시각 이후 거래만 조회
        List<UpbitClient.UpbitOrder> orders =
                upbitClient.getClosedOrders(keys.apiKey(), keys.secretKey(), user.getCreatedAt());

        int savedCount = 0;
        for (UpbitClient.UpbitOrder order : orders) {
            // 수량이 0인 미체결/취소 주문 제외
            if (order.executed_volume == null || "0".equals(order.executed_volume)) continue;

            // 중복 저장 방지
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

        log.info("Upbit 거래 동기화 완료 - userId: {}, 신규 저장: {}건", userId, savedCount);
        return savedCount;
    }

    // [용도] 거래 목록 조회 / [호출] TradeController.getTrades()
    @Transactional(readOnly = true)
    public List<TradeResponse> getTrades(Long userId) {
        return tradeRepository.findByUserIdOrderByTradedAtDesc(userId).stream()
                .map(TradeResponse::from)
                .toList();
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
