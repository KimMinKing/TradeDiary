// [파일 용도] 거래 원본 데이터 저장 및 조회 Repository

package com.tradediary.trade;

import com.tradediary.exchange.ExchangeKey;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

// [클래스] trades 테이블 JPA Repository
public interface TradeRepository extends JpaRepository<Trade, Long> {

    // [용도] 특정 거래소 UUID 중복 확인 / [호출] TradeService.syncTrades()
    boolean existsByUserIdAndExchangeAndExchangeTradeId(
            Long userId, ExchangeKey.Exchange exchange, String exchangeTradeId);

    // [용도] 사용자의 특정 거래소 거래 목록 조회 / [호출] TradeService.getTrades()
    List<Trade> findByUserIdAndExchangeOrderByTradedAtDesc(
            Long userId, ExchangeKey.Exchange exchange);

    // [용도] 사용자의 전체 거래 목록 조회 / [호출] TradeService.getTrades()
    List<Trade> findByUserIdOrderByTradedAtDesc(Long userId);
}
