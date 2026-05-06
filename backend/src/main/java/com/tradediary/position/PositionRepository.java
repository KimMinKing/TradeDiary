// [파일 용도] 포지션 저장 및 조회 Repository

package com.tradediary.position;

import com.tradediary.exchange.ExchangeKey;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

// [클래스] positions 테이블 JPA Repository
public interface PositionRepository extends JpaRepository<Position, Long> {

    // [용도] 특정 거래소 포지션 전체 삭제 (재계산 전 초기화) / [호출] PositionService.rebuildPositions()
    @Modifying
    @Transactional
    @Query("DELETE FROM Position p WHERE p.user.id = :userId AND p.exchange = :exchange")
    void deleteByUserIdAndExchange(Long userId, ExchangeKey.Exchange exchange);

    // [용도] 사용자 포지션 전체 조회 (최신순) / [호출] PositionController, UserService, StatsService
    List<Position> findByUserIdOrderByClosedAtDesc(Long userId);

    // [용도] 특정 거래소 포지션 조회 (최신순) / [호출] PositionController.getPositions()
    List<Position> findByUserIdAndExchangeOrderByClosedAtDesc(Long userId, ExchangeKey.Exchange exchange);

    // [용도] 기간 내 포지션 조회 (최신순) / [호출] DashboardService, StatsService
    @Query("SELECT p FROM Position p WHERE p.user.id = :userId AND p.closedAt >= :from AND p.closedAt < :to ORDER BY p.closedAt DESC")
    List<Position> findByUserIdAndClosedAtBetween(@Param("userId") Long userId,
                                                   @Param("from") LocalDateTime from,
                                                   @Param("to") LocalDateTime to);

    // [용도] 이번 달 랭킹용 전체 유저 포지션 월간 집계 / [호출] RankingService
    @Query("SELECT p FROM Position p WHERE p.closedAt >= :from AND p.closedAt < :to ORDER BY p.user.id, p.closedAt DESC")
    List<Position> findAllClosedInPeriod(@Param("from") LocalDateTime from, @Param("to") LocalDateTime to);

    // [용도] 사용자 최근 N개 포지션 / [호출] DashboardService
    @Query("SELECT p FROM Position p WHERE p.user.id = :userId ORDER BY p.closedAt DESC LIMIT :limit")
    List<Position> findRecentByUserId(@Param("userId") Long userId, @Param("limit") int limit);

    // [용도] 특정 날짜에 청산된 포지션 조회 (계획 vs 실적 비교용) / [호출] DashboardService
    @Query("SELECT p FROM Position p WHERE p.user.id = :userId AND p.closedAt >= :from AND p.closedAt < :to")
    List<Position> findByUserIdAndClosedAtRange(@Param("userId") Long userId,
                                                 @Param("from") LocalDateTime from,
                                                 @Param("to") LocalDateTime to);
}
