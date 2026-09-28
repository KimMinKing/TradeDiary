// [파일 용도] trade_journals 테이블의 exchange 컬럼 NULL 값 업데이트 스크립트 실행

package com.tradediary.journal.scripts;

import com.tradediary.common.exception.BusinessException;
import com.tradediary.common.exception.ErrorCode;
import com.tradediary.journal.TradeJournal;
import com.tradediary.journal.TradeJournalRepository;
import com.tradediary.trade.Trade;
import com.tradediary.trade.TradeRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class JournalExchangeUpdater {

    private final TradeJournalRepository journalRepository;
    private final TradeRepository tradeRepository;

    // [용도] 일기의 exchange 필드 NULL 값 업데이트 / [호출] 직접 실행 또는 관리자 기능
    @Transactional
    public void updateNullExchanges() {
        log.info("[JournalExchangeUpdater] NULL 값 업데이트 시작");

        // 1. trade_id가 있는 경우 해당 거래의 exchange 값으로 업데이트
        int updatedFromTrade = journalRepository.updateExchangeFromTrade();
        log.info("[JournalExchangeUpdater] trade_id 기반 업데이트: {}개", updatedFromTrade);

        // 2. trade_id가 없고 symbol이 있는 경우 기본값으로 업데이트
        int updatedFromSymbol = journalRepository.updateExchangeFromSymbol();
        log.info("[JournalExchangeUpdater] symbol 기반 업데이트: {}개", updatedFromSymbol);

        // 3. 나머지 NULL 값은 'UNKNOWN'으로 설정
        int updatedUnknown = journalRepository.updateExchangeUnknown();
        log.info("[JournalExchangeUpdater] UNKNOWN 설정: {}개", updatedUnknown);

        log.info("[JournalExchangeUpdater] NULL 값 업데이트 완료 - 총 {}개 업데이트",
                updatedFromTrade + updatedFromSymbol + updatedUnknown);
    }

    // [용도] 업데이트 전 NULL 값 개수 확인 / [호출] 관리자 기능
    @Transactional(readOnly = true)
    public long countNullExchanges() {
        return journalRepository.countByExchangeIsNull();
    }

    // [용도] 업데이트할 대상 목록 조회 / [호출] 관리자 기능
    @Transactional(readOnly = true)
    public List<TradeJournal> findNullExchanges() {
        return journalRepository.findByExchangeIsNull();
    }
}