// [파일 용도] 매매 일기 저장 및 조회 Repository

package com.tradediary.journal;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

// [클래스] trade_journals 테이블 JPA Repository
public interface TradeJournalRepository extends JpaRepository<TradeJournal, Long> {

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
}
