// [파일 용도] 거래 원본 데이터 저장 및 조회 Repository

package com.tradediary.trade;

import com.tradediary.exchange.ExchangeKey;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

// [클래스] trades 테이블 JPA Repository
public interface TradeRepository extends JpaRepository<Trade, Long> {

    // [용도] 특정 거래소 거래 존재 여부 (초기 동기화 판단용) / [호출] TradeService.isInitialSync()
    boolean existsByUserIdAndExchange(Long userId, ExchangeKey.Exchange exchange);

    // [용도] 특정 거래소 UUID 중복 확인 / [호출] TradeService.syncUpbitTrades()
    boolean existsByUserIdAndExchangeAndExchangeTradeId(
            Long userId, ExchangeKey.Exchange exchange, String exchangeTradeId);

    // [용도] 사용자의 특정 거래소 거래 목록 조회 / [호출] TradeService.getTrades()
    List<Trade> findByUserIdAndExchangeOrderByTradedAtDesc(
            Long userId, ExchangeKey.Exchange exchange);

    // [용도] 사용자의 전체 거래 목록 조회 / [호출] TradeService.getTrades()
    List<Trade> findByUserIdOrderByTradedAtDesc(Long userId);

    // [용도] 특정 거래소의 마지막 저장 거래 조회 (증분 동기화용 cursor 결정) / [호출] TradeService.syncUpbitTrades()
    Optional<Trade> findTopByUserIdAndExchangeOrderByTradedAtDesc(
            Long userId, ExchangeKey.Exchange exchange);

    // [용도] 포지션 재계산용 거래 목록 (심볼 오름차순 → 시간 오름차순) / [호출] PositionService.rebuildPositions()
    List<Trade> findByUserIdAndExchangeOrderBySymbolAscTradedAtAsc(
            Long userId, ExchangeKey.Exchange exchange);

    // [용도] 특정 거래소 거래 전체 삭제 (Bitget 재동기화 시 side 오류 정정용) / [호출] TradeService.syncBitgetTrades()
    void deleteAllByUserIdAndExchange(Long userId, ExchangeKey.Exchange exchange);
}
