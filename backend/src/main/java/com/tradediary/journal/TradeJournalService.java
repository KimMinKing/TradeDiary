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
import java.util.HashSet;
import java.util.List;
import java.util.Set;

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
    public List<JournalResponse> getJournals(Long userId, String symbol, String from, String to,
                                              String keyword, List<Long> tagIds) {
        LocalDateTime fromDt = (from != null && !from.isBlank())
                ? LocalDate.parse(from).atStartOfDay() : null;
        LocalDateTime toDt = (to != null && !to.isBlank())
                ? LocalDate.parse(to).atTime(LocalTime.MAX) : null;
        String symbolFilter = (symbol != null && !symbol.isBlank()) ? symbol.toUpperCase() : null;
        String keywordFilter = (keyword != null && !keyword.isBlank()) ? keyword.toLowerCase() : null;
        Set<Long> tagFilter = (tagIds != null && !tagIds.isEmpty())
                ? new HashSet<>(tagIds) : null;

        LocalDate fromD = fromDt != null ? fromDt.toLocalDate() : null;
        LocalDate toD   = toDt   != null ? toDt.toLocalDate()   : null;

        return journalRepository.findAllByUserId(userId).stream()
                .filter(j -> symbolFilter == null ||
                        (j.getSymbol() != null && j.getSymbol().toUpperCase().contains(symbolFilter)))
                .filter(j -> fromD == null || !j.getTradeDate().isBefore(fromD))
                .filter(j -> toD   == null || !j.getTradeDate().isAfter(toD))
                .filter(j -> keywordFilter == null || containsKeyword(j, keywordFilter))
                .filter(j -> tagFilter == null || hasTag(j, tagFilter))
                .map(JournalResponse::from)
                .toList();
    }

    // [용도] 키워드 검색 (entryReason, exitReason, memo 대소문자 무시) / [호출] getJournals()
    private boolean containsKeyword(TradeJournal j, String keyword) {
        return (j.getEntryReason() != null && j.getEntryReason().toLowerCase().contains(keyword))
            || (j.getExitReason()  != null && j.getExitReason().toLowerCase().contains(keyword))
            || (j.getMemo()        != null && j.getMemo().toLowerCase().contains(keyword));
    }

    // [용도] 태그 필터 (일기의 태그 중 tagFilter 집합에 포함된 것이 있는지) / [호출] getJournals()
    private boolean hasTag(TradeJournal j, Set<Long> tagFilter) {
        return j.getJournalStrategyTags().stream()
                .anyMatch(jst -> tagFilter.contains(jst.getTag().getId()));
    }

    // [용도] 일기 단건 조회 / [호출] TradeJournalController.getJournal()
    @Transactional(readOnly = true)
    public JournalDetailResponse getJournal(Long userId, Long journalId) {
        TradeJournal journal = journalRepository.findByIdAndUserId(journalId, userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.JOURNAL_NOT_FOUND));
        return JournalDetailResponse.from(journal);
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
                .tradeRefsJson(request.tradeRefsJson())
                .entryReason(request.entryReason())
                .exitReason(request.exitReason())
                .emotion(request.emotion())
                .memo(request.memo())
                .image(request.image())
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

        journal.update(request.symbol(), request.tradeRefsJson(),
                request.entryReason(), request.exitReason(), request.emotion(), request.memo(),
                request.image());

        // 태그 전체 교체: 기존 삭제 후 flush → 재연결
        journal.clearTags();
        journalRepository.saveAndFlush(journal);
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

        // 중복 태그 ID 제거
        List<Long> uniqueIds = tagIds.stream().distinct().toList();
        List<StrategyTag> tags = tagRepository.findAllById(uniqueIds);
        tags.forEach(tag -> {
            JournalStrategyTag link = JournalStrategyTag.builder()
                    .journal(journal)
                    .tag(tag)
                    .build();
            journal.getJournalStrategyTags().add(link);
        });
    }

    // 일기 목록 응답 DTO (이미지 제외, 응답 크기 절약)
    public record JournalResponse(
            Long id,
            Long tradeId,
            String tradeDate,       // 거래 날짜 (캘린더 기준, 'YYYY-MM-DD')
            String symbol,
            String tradeRefsJson,   // 선택된 거래 스냅샷 JSON
            String entryReason,
            String exitReason,
            String emotion,
            String memo,
            boolean hasImage,       // 이미지 존재 여부만
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
                    j.getTradeRefsJson(),
                    j.getEntryReason(),
                    j.getExitReason(),
                    j.getEmotion(),
                    j.getMemo(),
                    j.getImage() != null,
                    tags,
                    j.getCreatedAt().toString(),
                    j.getUpdatedAt().toString()
            );
        }
    }

    // 일기 단건 응답 DTO (이미지 포함)
    public record JournalDetailResponse(
            Long id,
            Long tradeId,
            String tradeDate,
            String symbol,
            String tradeRefsJson,
            String entryReason,
            String exitReason,
            String emotion,
            String memo,
            String image,
            List<StrategyTagService.TagResponse> tags,
            String createdAt,
            String updatedAt
    ) {
        public static JournalDetailResponse from(TradeJournal j) {
            List<StrategyTagService.TagResponse> tags = j.getJournalStrategyTags().stream()
                    .map(jst -> StrategyTagService.TagResponse.from(jst.getTag()))
                    .toList();

            return new JournalDetailResponse(
                    j.getId(),
                    j.getTrade() != null ? j.getTrade().getId() : null,
                    j.getTradeDate().toString(),
                    j.getSymbol(),
                    j.getTradeRefsJson(),
                    j.getEntryReason(),
                    j.getExitReason(),
                    j.getEmotion(),
                    j.getMemo(),
                    j.getImage(),
                    tags,
                    j.getCreatedAt().toString(),
                    j.getUpdatedAt().toString()
            );
        }
    }

    // 일기 작성 요청 DTO
    public record JournalCreateRequest(
            Long tradeId,
            String tradeDate,       // 거래 날짜 ('YYYY-MM-DD'), 미전송 시 오늘
            String symbol,
            String tradeRefsJson,   // 선택된 거래 스냅샷 JSON
            String entryReason,
            String exitReason,
            String emotion,
            String memo,
            String image,           // 첨부 이미지 (base64, JPEG 압축)
            List<Long> tagIds
    ) {}

    // 일기 수정 요청 DTO
    public record JournalUpdateRequest(
            String symbol,
            String tradeRefsJson,   // 선택된 거래 스냅샷 JSON
            String entryReason,
            String exitReason,
            String emotion,
            String memo,
            String image,           // 첨부 이미지 (base64, JPEG 압축)
            List<Long> tagIds
    ) {}

    // [용도] 특정 사용자의 공개 일기 목록 조회 / [호출] TradeJournalController.getPublicJournals()
    @Transactional(readOnly = true)
    public PublicJournalResponse getPublicJournals(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));

        if (!Boolean.TRUE.equals(user.getDiaryPublic())) {
            throw new BusinessException(ErrorCode.FORBIDDEN);
        }

        List<PublicJournalEntry> journals = journalRepository.findAllByUserId(userId).stream()
                .map(PublicJournalEntry::from)
                .toList();

        return new PublicJournalResponse(user.getNickname(), journals);
    }

    // 공개 일기 응답 DTO
    public record PublicJournalResponse(
            String nickname,
            List<PublicJournalEntry> journals
    ) {}

    // 공개 일기 항목 DTO (가격/수량 등 민감 정보 제외)
    public record PublicJournalEntry(
            Long id,
            String tradeDate,
            String symbol,
            String entryReason,
            String exitReason,
            String emotion,
            String memo,
            String image,
            List<StrategyTagService.TagResponse> tags
    ) {
        public static PublicJournalEntry from(TradeJournal j) {
            List<StrategyTagService.TagResponse> tags = j.getJournalStrategyTags().stream()
                    .map(jst -> StrategyTagService.TagResponse.from(jst.getTag()))
                    .toList();
            return new PublicJournalEntry(
                    j.getId(),
                    j.getTradeDate().toString(),
                    j.getSymbol(),
                    j.getEntryReason(),
                    j.getExitReason(),
                    j.getEmotion(),
                    j.getMemo(),
                    j.getImage(),
                    tags
            );
        }
    }
}
