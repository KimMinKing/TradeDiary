// [파일 용도] 매매 일기 데이터 저장소

package com.tradediary.journal;

import com.tradediary.user.User;
import com.tradediary.exchange.ExchangeKey;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

// [클래스] trade_journals 테이블 JPA Repository
public interface JournalRepository extends JpaRepository<TradeJournal, Long> {

    // [용도] 사용자 ID와 기간으로 일기 목록 조회 / [호출] JournalService.getJournalsByDateRange()
    List<TradeJournal> findByUserIdAndTradeDateBetweenOrderByTradeDateAsc(@Param("userId") Long userId, @Param("from") LocalDate from, @Param("to") LocalDate to);

    // [용도] 특정 사용자의 모든 일기 조회 (최신순) / [호출] JournalPage
    List<TradeJournal> findByUserIdOrderByTradeDateDescCreatedAtDesc(@Param("userId") Long userId);

    // [용도] 특정 사용자의 모든 일기 조회 / [호출] TradeJournalService.getJournals()
    List<TradeJournal> findAllByUserId(@Param("userId") Long userId);

    // [용도] 특정 사용자의 일기 ID로 조회 / [호출] TradeJournalService.getJournal()
    Optional<TradeJournal> findByIdAndUserId(@Param("id") Long id, @Param("userId") Long userId);

    // [용도] 사용자와 거래소로 일기 조회 / [호출] TradeJournalService.deleteJournalsByExchange()
    List<TradeJournal> findByUserIdAndExchange(@Param("userId") Long userId, @Param("exchange") ExchangeKey.Exchange exchange);
}