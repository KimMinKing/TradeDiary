// [파일 용도] 포지션 저장 및 조회 Repository

package com.tradediary.position;

import com.tradediary.exchange.ExchangeKey;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

// [클래스] positions 테이블 JPA Repository
public interface PositionRepository extends JpaRepository<Position, Long> {

    // [용도] 특정 거래소 포지션 전체 삭제 (재계산 전 초기화) / [호출] PositionService.rebuildPositions()
    @Modifying
    @Transactional
    @Query("DELETE FROM Position p WHERE p.user.id = :userId AND p.exchange = :exchange")
    void deleteByUserIdAndExchange(Long userId, ExchangeKey.Exchange exchange);

    // [용도] 사용자 포지션 전체 조회 (최신순) / [호출] PositionController.getPositions()
    List<Position> findByUserIdOrderByClosedAtDesc(Long userId);

    // [용도] 특정 거래소 포지션 조회 (최신순) / [호출] PositionController.getPositions()
    List<Position> findByUserIdAndExchangeOrderByClosedAtDesc(Long userId, ExchangeKey.Exchange exchange);
}
