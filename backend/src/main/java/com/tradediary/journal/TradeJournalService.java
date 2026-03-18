// [파일 용도] 매매 일기 CRUD 비즈니스 로직

package com.tradediary.journal;

import com.tradediary.common.exception.BusinessException;
import com.tradediary.common.exception.ErrorCode;
import com.tradediary.trade.Trade;
import com.tradediary.trade.TradeRepository;
import com.tradediary.user.User;
import com.tradediary.user.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;

// [클래스] 매매 일기 목록 조회 / 단건 조회 / 작성 / 수정 / 삭제
@Service
@RequiredArgsConstructor
public class TradeJournalService {

    private final TradeJournalRepository journalRepository;
    private final StrategyTagRepository tagRepository;
    private final UserRepository userRepository;
    private final TradeRepository tradeRepository;

    // [용도] 일기 목록 조회 (Java 스트림 필터) / [호출] TradeJournalController.getJournals()
    // PostgreSQL은 null 파라미터 타입 추론 불가 → JPQL 필터 대신 Java 필터링 사용
    @Transactional(readOnly = true)
    public List<JournalResponse> getJournals(Long userId, String symbol, String from, String to) {
        LocalDateTime fromDt = (from != null && !from.isBlank())
                ? LocalDate.parse(from).atStartOfDay() : null;
        LocalDateTime toDt = (to != null && !to.isBlank())
                ? LocalDate.parse(to).atTime(LocalTime.MAX) : null;
        String symbolFilter = (symbol != null && !symbol.isBlank()) ? symbol.toUpperCase() : null;

        LocalDate fromD = fromDt != null ? fromDt.toLocalDate() : null;
        LocalDate toD   = toDt   != null ? toDt.toLocalDate()   : null;

        return journalRepository.findAllByUserId(userId).stream()
                .filter(j -> symbolFilter == null ||
                        (j.getSymbol() != null && j.getSymbol().toUpperCase().contains(symbolFilter)))
                .filter(j -> fromD == null || !j.getTradeDate().isBefore(fromD))
                .filter(j -> toD   == null || !j.getTradeDate().isAfter(toD))
                .map(JournalResponse::from)
                .toList();
    }

    // [용도] 일기 단건 조회 / [호출] TradeJournalController.getJournal()
    @Transactional(readOnly = true)
    public JournalResponse getJournal(Long userId, Long journalId) {
        TradeJournal journal = journalRepository.findByIdAndUserId(journalId, userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.JOURNAL_NOT_FOUND));
        return JournalResponse.from(journal);
    }

    // [용도] 일기 작성 / [호출] TradeJournalController.createJournal()
    @Transactional
    public JournalResponse createJournal(Long userId, JournalCreateRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));

        // 거래 연결 (선택사항)
        Trade trade = null;
        if (request.tradeId() != null) {
            trade = tradeRepository.findById(request.tradeId())
                    .filter(t -> t.getUser().getId().equals(userId))
                    .orElseThrow(() -> new BusinessException(ErrorCode.TRADE_NOT_FOUND));
        }

        LocalDate tradeDate = (request.tradeDate() != null && !request.tradeDate().isBlank())
                ? LocalDate.parse(request.tradeDate()) : LocalDate.now();

        TradeJournal journal = TradeJournal.builder()
                .user(user)
                .trade(trade)
                .tradeDate(tradeDate)
                .symbol(request.symbol())
                .entryReason(request.entryReason())
                .exitReason(request.exitReason())
                .emotion(request.emotion())
                .memo(request.memo())
                .build();

        TradeJournal saved = journalRepository.save(journal);

        // 태그 연결
        attachTags(saved, request.tagIds());

        return JournalResponse.from(journalRepository.findByIdAndUserId(saved.getId(), userId)
                .orElseThrow());
    }

    // [용도] 일기 수정 / [호출] TradeJournalController.updateJournal()
    @Transactional
    public JournalResponse updateJournal(Long userId, Long journalId, JournalUpdateRequest request) {
        TradeJournal journal = journalRepository.findByIdAndUserId(journalId, userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.JOURNAL_NOT_FOUND));

        journal.update(request.symbol(), request.entryReason(),
                request.exitReason(), request.emotion(), request.memo());

        // 태그 전체 교체
        journal.clearTags();
        attachTags(journal, request.tagIds());

        return JournalResponse.from(journal);
    }

    // [용도] 일기 삭제 / [호출] TradeJournalController.deleteJournal()
    @Transactional
    public void deleteJournal(Long userId, Long journalId) {
        TradeJournal journal = journalRepository.findByIdAndUserId(journalId, userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.JOURNAL_NOT_FOUND));
        journalRepository.delete(journal);
    }

    // [용도] 일기에 태그 연결 / [호출] createJournal(), updateJournal()
    private void attachTags(TradeJournal journal, List<Long> tagIds) {
        if (tagIds == null || tagIds.isEmpty()) return;

        List<StrategyTag> tags = tagRepository.findAllById(tagIds);
        tags.forEach(tag -> {
            JournalStrategyTag link = JournalStrategyTag.builder()
                    .journal(journal)
                    .tag(tag)
                    .build();
            journal.getJournalStrategyTags().add(link);
        });
    }

    // 일기 응답 DTO
    public record JournalResponse(
            Long id,
            Long tradeId,
            String tradeDate,   // 거래 날짜 (캘린더 기준, 'YYYY-MM-DD')
            String symbol,
            String entryReason,
            String exitReason,
            String emotion,
            String memo,
            List<StrategyTagService.TagResponse> tags,
            String createdAt,
            String updatedAt
    ) {
        public static JournalResponse from(TradeJournal j) {
            List<StrategyTagService.TagResponse> tags = j.getJournalStrategyTags().stream()
                    .map(jst -> StrategyTagService.TagResponse.from(jst.getTag()))
                    .toList();

            return new JournalResponse(
                    j.getId(),
                    j.getTrade() != null ? j.getTrade().getId() : null,
                    j.getTradeDate().toString(),
                    j.getSymbol(),
                    j.getEntryReason(),
                    j.getExitReason(),
                    j.getEmotion(),
                    j.getMemo(),
                    tags,
                    j.getCreatedAt().toString(),
                    j.getUpdatedAt().toString()
            );
        }
    }

    // 일기 작성 요청 DTO
    public record JournalCreateRequest(
            Long tradeId,
            String tradeDate,   // 거래 날짜 ('YYYY-MM-DD'), 미전송 시 오늘
            String symbol,
            String entryReason,
            String exitReason,
            String emotion,
            String memo,
            List<Long> tagIds
    ) {}

    // 일기 수정 요청 DTO
    public record JournalUpdateRequest(
            String symbol,
            String entryReason,
            String exitReason,
            String emotion,
            String memo,
            List<Long> tagIds
    ) {}
}
