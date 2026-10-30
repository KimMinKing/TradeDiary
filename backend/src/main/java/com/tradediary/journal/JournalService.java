// [파일 용도] 매매 일기 비즈니스 로직

package com.tradediary.journal;

import com.tradediary.user.User;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

// [클래스] 매매 일기 데이터 관리 서비스
@Slf4j
@Service
@RequiredArgsConstructor
public class JournalService {

    private final JournalRepository journalRepository;

    // [용도] 특정 기간의 일기 목록 조회 / [호출] JournalController.analyzeJournals()
    @Transactional(readOnly = true)
    public List<TradeJournal> getJournalsByDateRange(Long userId, LocalDate from, LocalDate to) {
        return journalRepository.findByUserIdAndTradeDateBetweenOrderByTradeDateAsc(userId, from, to);
    }
}