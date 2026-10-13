// [파일 용도] 매매 일기 저장 및 조회 Repository

package com.tradediary.journal;

import com.tradediary.exchange.ExchangeKey;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

// [클래스] trade_journals 테이블 JPA Repository
public interface TradeJournalRepository extends JpaRepository<TradeJournal, Long> {

    @Query("SELECT j FROM TradeJournal j JOIN FETCH j.user WHERE j.user.id IN :userIds AND j.visibility = :visibility ORDER BY j.createdAt DESC")
    List<TradeJournal> findPublicFeedJournals(@Param("userIds") List<Long> userIds, @Param("visibility") TradeJournal.Visibility visibility);

    // [용도] 특정 유저의 일기 목록 (최신순) / [호출] TradeJournalService.getJournals()
    @Query("SELECT j FROM TradeJournal j " +
           "LEFT JOIN FETCH j.journalStrategyTags jst " +
           "LEFT JOIN FETCH jst.tag " +
           "WHERE j.user.id = :userId " +
           "ORDER BY j.tradeDate DESC, j.createdAt DESC")
    List<TradeJournal> findAllByUserId(@Param("userId") Long userId);


    // [용도] 단건 조회 (태그 포함) / [호출] TradeJournalService.getJournal()
    @Query("SELECT j FROM TradeJournal j " +
           "LEFT JOIN FETCH j.journalStrategyTags jst " +
           "LEFT JOIN FETCH jst.tag " +
           "WHERE j.id = :id AND j.user.id = :userId")
    Optional<TradeJournal> findByIdAndUserId(@Param("id") Long id, @Param("userId") Long userId);

    // [용도] 특정 기간 내 일기 조회 / [호출] TradeJournalService.getMonthlyJournals()
    @Query("SELECT j FROM TradeJournal j " +
           "LEFT JOIN FETCH j.journalStrategyTags jst " +
           "LEFT JOIN FETCH jst.tag " +
           "WHERE j.user.id = :userId AND j.tradeDate >= :from AND j.tradeDate < :to " +
           "ORDER BY j.tradeDate DESC, j.createdAt DESC")
    List<TradeJournal> findByUserIdAndTradeDateBetween(@Param("userId") Long userId,
                                                       @Param("from") java.time.LocalDate from,
                                                       @Param("to") java.time.LocalDate to);

    // [용도] 특정 거래소의 모든 일기 조회 / [호출] TradeJournalService.deleteJournalsByExchange()
    @Query("SELECT j FROM TradeJournal j " +
           "LEFT JOIN FETCH j.journalStrategyTags jst " +
           "LEFT JOIN FETCH jst.tag " +
           "WHERE j.user.id = :userId AND j.exchange = :exchange " +
           "ORDER BY j.tradeDate DESC")
    List<TradeJournal> findByUserIdAndExchange(@Param("userId") Long userId, @Param("exchange") ExchangeKey.Exchange exchange);

    // [용도] exchange가 NULL인 일기 개수 조회 / [호출] JournalExchangeUpdater
    long countByExchangeIsNull();

    // [용도] exchange가 NULL인 일기 목록 조회 / [호출] JournalExchangeUpdater
    List<TradeJournal> findByExchangeIsNull();

    List<TradeJournal> findByUserIdAndVisibilityOrderByTradeDateDescIdDesc(
            Long userId, TradeJournal.Visibility visibility);

    Optional<TradeJournal> findByIdAndUserIdAndVisibility(
            Long id, Long userId, TradeJournal.Visibility visibility);

    // [용도] trade_id가 있는 일기의 exchange를 해당 거래의 값으로 업데이트 / [호출] JournalExchangeUpdater
    @Modifying
    @Transactional
    @Query(value = "UPDATE trade_journals j " +
                   "SET j.exchange = t.exchange " +
                   "FROM trades t " +
                   "WHERE j.trade_id IS NOT NULL " +
                   "  AND j.exchange IS NULL " +
                   "  AND j.trade_id = t.id", nativeQuery = true)
    int updateExchangeFromTrade();

    // [용도] trade_id가 없고 symbol이 있는 일기의 exchange를 기본값으로 업데이트 / [호출] JournalExchangeUpdater
    @Modifying
    @Transactional
    @Query(value = "UPDATE trade_journals j " +
                   "SET j.exchange = 'UPBIT' " +
                   "WHERE j.exchange IS NULL " +
                   "  AND j.symbol IS NOT NULL " +
                   "  AND j.symbol LIKE 'KRW-%'", nativeQuery = true)
    int updateExchangeFromSymbol();

    // [용도] 나머지 NULL 값은 'UNKNOWN'으로 설정 / [호출] JournalExchangeUpdater
    @Modifying
    @Transactional
    @Query(value = "UPDATE trade_journals j " +
                   "SET j.exchange = 'UNKNOWN' " +
                   "WHERE j.exchange IS NULL", nativeQuery = true)
    int updateExchangeUnknown();
}
