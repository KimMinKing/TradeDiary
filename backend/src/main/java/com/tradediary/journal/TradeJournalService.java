// [?뚯씪 ?⑸룄] 留ㅻℓ ?쇨린 CRUD 鍮꾩쫰?덉뒪 濡쒖쭅

package com.tradediary.journal;

import com.tradediary.common.exception.BusinessException;
import com.tradediary.common.exception.ErrorCode;
import com.tradediary.exchange.ExchangeKey;
import com.tradediary.position.Position;
import com.tradediary.position.PositionRepository;
import com.tradediary.plan.TradePlan;
import com.tradediary.plan.TradePlanRepository;
import com.tradediary.trade.Trade;
import com.tradediary.trade.TradeRepository;
import com.tradediary.user.User;
import com.tradediary.user.UserRepository;
import com.tradediary.ai.AiReportClient;
import lombok.RequiredArgsConstructor;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.*;
import java.util.stream.Collectors;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.Data;
// [?대옒?? 留ㅻℓ ?쇨린 紐⑸줉 議고쉶 / ?④굔 議고쉶 / ?묒꽦 / ?섏젙 / ??젣
import lombok.Data;
import lombok.AllArgsConstructor;
import lombok.NoArgsConstructor;
import com.tradediary.trade.TradeSide;
import com.tradediary.journal.TradeJournalController;
@Slf4j
@Service
@RequiredArgsConstructor
public class TradeJournalService {

    private final TradeJournalRepository journalRepository;
    private final StrategyTagRepository tagRepository;
    private final UserRepository userRepository;
    private final TradeRepository tradeRepository;
    private final PositionRepository positionRepository;
    private final TradePlanRepository planRepository;
    private final ChecklistItemRepository checklistItemRepository;
    private final AiReportClient aiReportClient;
    private final JournalImageValidator imageValidator;
    private static final ObjectMapper objectMapper = new ObjectMapper();

    // [?⑸룄] ?쇨린 紐⑸줉 議고쉶 (Java ?ㅽ듃由??꾪꽣) / [?몄텧] TradeJournalController.getJournals()
    // PostgreSQL? null ?뚮씪誘명꽣 ???異붾줎 遺덇? ??JPQL ?꾪꽣 ???Java ?꾪꽣留??ъ슜
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

    // [?⑸룄] ?ㅼ썙??寃??(entryReason, exitReason, memo ??뚮Ц??臾댁떆) / [?몄텧] getJournals()
    private boolean containsKeyword(TradeJournal j, String keyword) {
        return (j.getEntryReason() != null && j.getEntryReason().toLowerCase().contains(keyword))
            || (j.getExitReason()  != null && j.getExitReason().toLowerCase().contains(keyword))
            || (j.getMemo()        != null && j.getMemo().toLowerCase().contains(keyword));
    }

    // [?⑸룄] ?쒓렇 ?꾪꽣 (?쇨린???쒓렇 以?tagFilter 吏묓빀???ы븿??寃껋씠 ?덈뒗吏) / [?몄텧] getJournals()
    private boolean hasTag(TradeJournal j, Set<Long> tagFilter) {
        Set<Long> journalTagIds = j.getJournalStrategyTags().stream()
                .map(jst -> jst.getTag().getId())
                .collect(Collectors.toSet());
        return journalTagIds.containsAll(tagFilter);
    }

    // [?⑸룄] ?쇨린 ?④굔 議고쉶 / [?몄텧] TradeJournalController.getJournal()
    @Transactional(readOnly = true)
    public JournalDetailResponse getJournal(Long userId, Long journalId) {
        TradeJournal journal = journalRepository.findByIdAndUserId(journalId, userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.JOURNAL_NOT_FOUND));
        return JournalDetailResponse.from(journal);
    }

    // [?⑸룄] ?쇨린 ?묒꽦 / [?몄텧] TradeJournalController.createJournal()
    @Transactional
    public JournalResponse createJournal(Long userId, JournalCreateRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));

        // 嫄곕옒 ?곌껐 (?좏깮?ы빆)
        Trade trade = null;
        if (request.tradeId() != null) {
            trade = tradeRepository.findById(request.tradeId())
                    .filter(t -> t.getUser().getId().equals(userId))
                    .orElseThrow(() -> new BusinessException(ErrorCode.TRADE_NOT_FOUND));
        }

        LocalDate tradeDate = parseTradeDate(request.tradeDate());
        validateTradeReferences(userId, request.tradeRefsJson());

        // 嫄곕옒???뺣낫 異붿텧
        ExchangeKey.Exchange exchange = null;
        if (request.exchange() != null && !request.exchange().isBlank()) {
            try {
                exchange = ExchangeKey.Exchange.valueOf(request.exchange().trim().toUpperCase());
            } catch (Exception ignored) {
                // fallback below
            }
        }
        if (trade != null) {
            // ?⑥씪 嫄곕옒 ?곌껐 寃쎌슦
            exchange = trade.getExchange();
        } else if (request.tradeRefsJson() != null && !request.tradeRefsJson().isBlank()) {
            // ?щ윭 嫄곕옒 ?좏깮??寃쎌슦 - 泥?踰덉㎏ 嫄곕옒?먯꽌 嫄곕옒??異붿텧
            try {
                List<Map<String, Object>> tradeRefs = parseTradeRefsJson(request.tradeRefsJson());
                if (!tradeRefs.isEmpty()) {
                    String exchangeName = (String) tradeRefs.get(0).get("exchange");
                    exchange = ExchangeKey.Exchange.valueOf(exchangeName);
                }
            } catch (Exception e) {
                log.warn("Failed to parse tradeRefsJson for exchange extraction: {}", e.getMessage());
            }
        }

        if (exchange == null && request.symbol() != null && !request.symbol().isBlank()) {
            String symbol = request.symbol().toUpperCase();
            if (symbol.contains("USDT")) {
                exchange = ExchangeKey.Exchange.BINANCE;
            } else if (symbol.startsWith("KRW-")) {
                exchange = ExchangeKey.Exchange.UPBIT;
            }
        }
        if (exchange == null) {
            exchange = ExchangeKey.Exchange.UPBIT;
        }

        TradeJournal journal = TradeJournal.builder()
                .user(user)
                .exchange(exchange)
                .trade(trade)
                .tradeDate(tradeDate)
                .symbol(request.symbol())
                .tradeRefsJson(request.tradeRefsJson())
                .entryReason(request.entryReason())
                .exitReason(request.exitReason())
                .emotion(request.emotion())
                .memo(request.memo())
                .image(imageValidator.validate(request.image()))
                .visibility(parseVisibility(request.visibility(), TradeJournal.Visibility.PRIVATE))
                .build();

        TradeJournal saved = journalRepository.save(journal);

        // ?쒓렇 ?곌껐
        attachTags(saved, request.tagIds(), userId);

        // 泥댄겕由ъ뒪???곌껐
        attachChecklists(saved, request.checklist(), userId);

        return JournalResponse.from(journalRepository.findByIdAndUserId(saved.getId(), userId)
                .orElseThrow());
    }

    // [?⑸룄] ?쇨린 ?섏젙 / [?몄텧] TradeJournalController.updateJournal()
    @Transactional
    public JournalResponse updateJournal(Long userId, Long journalId, JournalUpdateRequest request) {
        TradeJournal journal = journalRepository.findByIdAndUserId(journalId, userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.JOURNAL_NOT_FOUND));

        validateTradeReferences(userId, request.tradeRefsJson());

        journal.update(request.symbol(), request.tradeRefsJson(),
                request.entryReason(), request.exitReason(), request.emotion(), request.memo(),
                imageValidator.validate(request.image()), parseVisibility(request.visibility(), null));

        // ?쒓렇 ?꾩껜 援먯껜: 湲곗〈 ??젣 ??flush ???ъ뿰寃?
        journal.clearTags();
        journalRepository.saveAndFlush(journal);
        attachTags(journal, request.tagIds(), userId);

        // 泥댄겕由ъ뒪???꾩껜 援먯껜: 湲곗〈 ??젣 ??flush ???ъ뿰寃?
        journal.getJournalChecklists().clear();
        journalRepository.saveAndFlush(journal);
        attachChecklists(journal, request.checklist(), userId);

        return JournalResponse.from(journal);
    }

    // [?⑸룄] ?쇨린 ??젣 / [?몄텧] TradeJournalController.deleteJournal()
    @Transactional
    public void deleteJournal(Long userId, Long journalId) {
        TradeJournal journal = journalRepository.findByIdAndUserId(journalId, userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.JOURNAL_NOT_FOUND));
        journalRepository.delete(journal);
    }

    // [?⑸룄] tradeRefsJson ?뚯떛 / [?몄텧] createJournal(), updateJournal()
    private List<Map<String, Object>> parseTradeRefsJson(String tradeRefsJson) {
        try {
            return objectMapper.readValue(tradeRefsJson, new TypeReference<List<Map<String, Object>>>() {});
        } catch (Exception e) {
            throw new BusinessException(ErrorCode.INVALID_INPUT);
        }
    }

    private LocalDate parseTradeDate(String value) {
        if (value == null || value.isBlank()) return LocalDate.now();
        try {
            return LocalDate.parse(value);
        } catch (RuntimeException error) {
            throw new BusinessException(ErrorCode.INVALID_INPUT);
        }
    }

    private void validateTradeReferences(Long userId, String tradeRefsJson) {
        if (tradeRefsJson == null || tradeRefsJson.isBlank()) return;
        List<Map<String, Object>> refs = parseTradeRefsJson(tradeRefsJson);
        if (refs.size() > 100) throw new BusinessException(ErrorCode.INVALID_INPUT);
        for (Map<String, Object> ref : refs) {
            Object rawId = ref.get("id");
            if (rawId == null) continue;
            final long tradeId;
            try {
                tradeId = rawId instanceof Number number
                        ? number.longValue() : Long.parseLong(rawId.toString());
            } catch (RuntimeException error) {
                throw new BusinessException(ErrorCode.INVALID_INPUT);
            }
            if (!tradeRepository.existsByIdAndUserId(tradeId, userId)) {
                throw new BusinessException(ErrorCode.TRADE_NOT_FOUND);
            }
        }
    }

    // [?⑸룄] ?쇨린???쒓렇 ?곌껐 / [?몄텧] createJournal(), updateJournal()
    private void attachTags(TradeJournal journal, List<Long> tagIds, Long userId) {
        if (tagIds == null || tagIds.isEmpty()) return;

        // 以묐났 ?쒓렇 ID ?쒓굅
        List<Long> uniqueIds = tagIds.stream().distinct().toList();
        List<StrategyTag> tags = tagRepository.findAllById(uniqueIds);
        if (tags.size() != uniqueIds.size() || tags.stream().anyMatch(tag ->
                tag.getUser() != null && !tag.getUser().getId().equals(userId))) {
            throw new BusinessException(ErrorCode.FORBIDDEN);
        }
        tags.forEach(tag -> {
            JournalStrategyTag link = JournalStrategyTag.builder()
                    .journal(journal)
                    .tag(tag)
                    .build();
            journal.getJournalStrategyTags().add(link);
        });
    }

    // [?⑸룄] ?쇨린??泥댄겕由ъ뒪???곌껐 / [?몄텧] createJournal(), updateJournal()
    private void attachChecklists(TradeJournal journal, Map<Long, Boolean> checklist, Long userId) {
        if (checklist == null || checklist.isEmpty()) return;

        // 湲곗〈 泥댄겕由ъ뒪??紐⑤몢 ??젣
        journal.getJournalChecklists().clear();

        // ?덈줈??泥댄겕由ъ뒪??異붽?
        checklist.forEach((checklistId, checked) -> {
            ChecklistItem item = checklistItemRepository.findById(checklistId)
                    .orElseThrow(() -> new BusinessException(ErrorCode.CHECKLIST_NOT_FOUND));
            if (item.getUser() != null && !item.getUser().getId().equals(userId)) {
                throw new BusinessException(ErrorCode.FORBIDDEN);
            }

            JournalChecklist link = JournalChecklist.builder()
                    .journal(journal)
                    .checklist(item)
                    .checked(checked)
                    .build();
            journal.getJournalChecklists().add(link);
        });
    }

    // ?쇨린 紐⑸줉 ?묐떟 DTO (?대?吏 ?쒖쇅, ?묐떟 ?ш린 ?덉빟)
    public record JournalResponse(
            Long id,
            Long tradeId,
            String tradeDate,       // 嫄곕옒 ?좎쭨 (罹섎┛??湲곗?, 'YYYY-MM-DD')
            String symbol,
            String exchange,
            String tradeRefsJson,   // ?좏깮??嫄곕옒 ?ㅻ깄??JSON
            String entryReason,
            String exitReason,
            String emotion,
            String memo,
            String visibility,
            boolean hasImage,
            List<StrategyTagService.TagResponse> tags,
            int checklistCount,     // 珥?泥댄겕由ъ뒪????ぉ ??
            int checkedCount,       // ?꾨즺??泥댄겕由ъ뒪????
            String createdAt,
            String updatedAt
    ) {
        public static JournalResponse from(TradeJournal j) {
            List<StrategyTagService.TagResponse> tags = j.getJournalStrategyTags().stream()
                    .map(jst -> StrategyTagService.TagResponse.from(jst.getTag()))
                    .toList();

            // 泥댄겕由ъ뒪???듦퀎 怨꾩궛
            int checklistCount = j.getJournalChecklists().size();
            int checkedCount = (int) j.getJournalChecklists().stream()
                    .filter(JournalChecklist::isChecked)
                    .count();

            return new JournalResponse(
                    j.getId(),
                    j.getTrade() != null ? j.getTrade().getId() : null,
                    j.getTradeDate().toString(),
                    j.getSymbol(),
                    j.getExchange() != null ? j.getExchange().name() : null,
                    j.getTradeRefsJson(),
                    j.getEntryReason(),
                    j.getExitReason(),
                    j.getEmotion(),
                    j.getMemo(),
                    j.getVisibility().name(),
                    j.getImage() != null,
                    tags,
                    checklistCount,
                    checkedCount,
                    j.getCreatedAt().toString(),
                    j.getUpdatedAt().toString()
            );
        }
    }

    // ?쇨린 ?④굔 ?묐떟 DTO (?대?吏 ?ы븿)
    public record JournalDetailResponse(
            Long id,
            Long tradeId,
            String tradeDate,
            String symbol,
            String exchange,
            String tradeRefsJson,
            String entryReason,
            String exitReason,
            String emotion,
            String memo,
            String image,
            String visibility,
            List<StrategyTagService.TagResponse> tags,
            List<JournalChecklistResponse> checklist, // 泥댄겕由ъ뒪???곹깭 紐⑸줉
            String createdAt,
            String updatedAt
    ) {
        // 泥댄겕由ъ뒪???곹깭 ?묐떟 DTO
    public record JournalChecklistResponse(
            Long checklistId,
            String category,
            String content,
            boolean checked
    ) {
        public static JournalChecklistResponse from(JournalChecklist jc) {
            return new JournalChecklistResponse(
                    jc.getChecklist().getId(),
                    jc.getChecklist().getCategory(),
                    jc.getChecklist().getContent(),
                    jc.isChecked()
            );
        }
    }

    public static JournalDetailResponse from(TradeJournal j) {
            List<StrategyTagService.TagResponse> tags = j.getJournalStrategyTags().stream()
                    .map(jst -> StrategyTagService.TagResponse.from(jst.getTag()))
                    .toList();

            List<JournalChecklistResponse> checklist = j.getJournalChecklists().stream()
                    .map(JournalChecklistResponse::from)
                    .toList();

            return new JournalDetailResponse(
                    j.getId(),
                    j.getTrade() != null ? j.getTrade().getId() : null,
                    j.getTradeDate().toString(),
                    j.getSymbol(),
                    j.getExchange() != null ? j.getExchange().name() : null,
                    j.getTradeRefsJson(),
                    j.getEntryReason(),
                    j.getExitReason(),
                    j.getEmotion(),
                    j.getMemo(),
                    j.getImage(),
                    j.getVisibility().name(),
                    tags,
                    checklist,
                    j.getCreatedAt().toString(),
                    j.getUpdatedAt().toString()
            );
        }
    }

    // ?쇨린 ?묒꽦 ?붿껌 DTO
    public record JournalCreateRequest(
            Long tradeId,
            @Pattern(regexp = "^$|\\d{4}-\\d{2}-\\d{2}$")
            String tradeDate,       // 嫄곕옒 ?좎쭨 ('YYYY-MM-DD'), 誘몄쟾?????ㅻ뒛
            @Size(max = 80)
            String symbol,
            @Size(max = 20)
            String exchange,
            @Size(max = 100_000)
            String tradeRefsJson,   // ?좏깮??嫄곕옒 ?ㅻ깄??JSON
            @Size(max = 10_000)
            String entryReason,
            @Size(max = 10_000)
            String exitReason,
            @Size(max = 20)
            String emotion,
            @Size(max = 30_000)
            String memo,
            String image,
            @Pattern(regexp = "(?i)^$|PRIVATE|PUBLIC")
            String visibility,
            @Size(max = 50)
            List<Long> tagIds,
            @Size(max = 100)
            Map<Long, Boolean> checklist
    ) {}

    // ?쇨린 ?섏젙 ?붿껌 DTO
    public record JournalUpdateRequest(
            @Size(max = 80)
            String symbol,
            @Size(max = 20)
            String exchange,
            @Size(max = 100_000)
            String tradeRefsJson,   // ?좏깮??嫄곕옒 ?ㅻ깄??JSON
            @Size(max = 10_000)
            String entryReason,
            @Size(max = 10_000)
            String exitReason,
            @Size(max = 20)
            String emotion,
            @Size(max = 30_000)
            String memo,
            String image,
            @Pattern(regexp = "(?i)^$|PRIVATE|PUBLIC")
            String visibility,
            @Size(max = 50)
            List<Long> tagIds,
            @Size(max = 100)
            Map<Long, Boolean> checklist
    ) {}

    // [?⑸룄] ?뱀젙 ?ъ슜?먯쓽 怨듦컻 ?쇨린 紐⑸줉 議고쉶 / [?몄텧] TradeJournalController.getPublicJournals()
    @Transactional(readOnly = true)
    public PublicJournalResponse getPublicJournals(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.PRIVATE_RESOURCE_NOT_FOUND));

        if (!Boolean.TRUE.equals(user.getProfilePublic()) || !Boolean.TRUE.equals(user.getDiaryPublic())) {
            throw new BusinessException(ErrorCode.PRIVATE_RESOURCE_NOT_FOUND);
        }

        List<PublicJournalEntry> journals = journalRepository
                .findByUserIdAndVisibilityOrderByTradeDateDescIdDesc(userId, TradeJournal.Visibility.PUBLIC).stream()
                .map(PublicJournalEntry::from)
                .toList();

        return new PublicJournalResponse(user.getNickname(), journals);
    }

    // 怨듦컻 ?쇨린 ?묐떟 DTO
    public record PublicJournalResponse(
            String nickname,
            List<PublicJournalEntry> journals
    ) {}

    // 怨듦컻 ?쇨린 ??ぉ DTO (媛寃??섎웾 ??誘쇨컧 ?뺣낫 ?쒖쇅)
    public record PublicJournalEntry(
            Long id,
            String tradeDate,
            String symbol,
            String entryReason,
            String exitReason,
            String emotion,
            String memo,
            boolean hasImage,
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
                    j.getImage() != null,
                    tags
            );
        }
    }

    // [?⑸룄] 媛쒕퀎 ?쇨린 AI ?쇰뱶諛??앹꽦 / [?몄텧] TradeJournalController.getJournalFeedback()
    @Transactional(readOnly = true)
    public String getPublicJournalImage(Long userId, Long journalId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.PRIVATE_RESOURCE_NOT_FOUND));
        if (!Boolean.TRUE.equals(user.getProfilePublic()) || !Boolean.TRUE.equals(user.getDiaryPublic()))
            throw new BusinessException(ErrorCode.PRIVATE_RESOURCE_NOT_FOUND);
        TradeJournal journal = journalRepository.findByIdAndUserIdAndVisibility(
                        journalId, userId, TradeJournal.Visibility.PUBLIC)
                .orElseThrow(() -> new BusinessException(ErrorCode.JOURNAL_NOT_FOUND));
        String image = imageValidator.validate(journal.getImage());
        if (image == null) throw new BusinessException(ErrorCode.JOURNAL_NOT_FOUND);
        return image;
    }

    private TradeJournal.Visibility parseVisibility(String visibility, TradeJournal.Visibility fallback) {
        if (visibility == null || visibility.isBlank()) return fallback;
        try {
            return TradeJournal.Visibility.valueOf(visibility.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException exception) {
            throw new BusinessException(ErrorCode.INVALID_INPUT);
        }
    }

    @Transactional(readOnly = true)
    public String getJournalFeedback(Long userId, Long journalId, boolean refresh) {
        TradeJournal journal = journalRepository.findByIdAndUserId(journalId, userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.JOURNAL_NOT_FOUND));

        if (!refresh && journal.getAiFeedback() != null && !journal.getAiFeedback().isBlank()
                && preferredLanguage(userId).equals(journal.getAiFeedbackLanguage())) {
            return journal.getAiFeedback();
        }

        // ?곌껐???ъ???PnL 議고쉶
        Position position = null;
        if (journal.getTrade() != null) {
            position = positionRepository.findByTradeId(journal.getTrade().getId());
        }
        String positionPnl = position != null ? position.getCurrentPnl().toString() : null;

        // ?쒓렇 ?대쫫 異붿텧
        List<String> tags = journal.getJournalStrategyTags().stream()
                .map(jst -> jst.getTag().getName())
                .toList();

        // 泥댄겕由ъ뒪???꾨즺??怨꾩궛
        double checklistRate = journal.getJournalChecklists().isEmpty() ? 0.0 :
                (double) journal.getJournalChecklists().stream()
                        .filter(JournalChecklist::isChecked)
                        .count() / journal.getJournalChecklists().size();

        // AI ?붿껌 ?앹꽦
        AiReportClient.JournalFeedbackRequest request = new AiReportClient.JournalFeedbackRequest(
                preferredLanguage(userId),
                journalId,
                journal.getTradeDate().toString(),
                journal.getSymbol(),
                journal.getEntryReason(),
                journal.getExitReason(),
                journal.getEmotion(),
                journal.getMemo(),
                tags,
                checklistRate,
                positionPnl
        );

        String feedback = aiReportClient.analyzeJournal(request);
        journal.updateAiFeedback(feedback, preferredLanguage(userId));
        return feedback;
    }

    // [용도] 날짜별 매매 계획 AI 한줄평 생성 / [호출] TradeJournalController.getPlanReview()
    @Transactional(readOnly = true)
    public String getPlanReview(Long userId, String tradeDate, String symbol, String entryReason, String exitReason, String emotion, String memo) {
        LocalDate targetDate = (tradeDate != null && !tradeDate.isBlank())
                ? LocalDate.parse(tradeDate)
                : LocalDate.now();

        List<TradePlan> plans = planRepository.findAllByUserIdAndPlanDateOrderByCreatedAtAsc(userId, targetDate);
        if (plans.isEmpty()) {
            return "이 날짜에는 등록된 매매 계획이 없습니다. 계획을 먼저 적어두면 AI가 실행 여부를 같이 점검해줍니다.";
        }

        List<AiReportClient.PlanSummary> planSummaries = plans.stream()
                .map(p -> new AiReportClient.PlanSummary(
                        p.getPlanDate().toString(),
                        p.getSymbol(),
                        p.getDirection(),
                        p.getContent(),
                        p.isDone()
                ))
                .toList();

        AiReportClient.JournalDraft draft = new AiReportClient.JournalDraft(
                symbol,
                entryReason,
                exitReason,
                emotion,
                memo
        );

        AiReportClient.PlanReviewRequest request = new AiReportClient.PlanReviewRequest(
                preferredLanguage(userId),
                targetDate.toString(),
                planSummaries,
                draft
        );

        return aiReportClient.analyzePlanReview(request);
    }

    public String getPeriodReview(Long userId, String period, String from, String to) {
        LocalDate fromD = LocalDate.parse(from);
        LocalDate toD = LocalDate.parse(to);

        // ?대떦 湲곌컙???쇨린 議고쉶
        List<TradeJournal> journals = journalRepository.findByUserIdAndTradeDateBetween(userId, fromD, toD);

        // ?대떦 湲곌컙???ъ???議고쉶
        List<Position> positions = positionRepository.findByUserIdAndClosedAtBetween(userId, fromD.atStartOfDay(), toD.atStartOfDay().plusDays(1));

        // ?쇨린媛 ?녿뒗 寃쎌슦
        if (journals.isEmpty()) {
            return String.format(
                "%s ~ %s 湲곌컙???묒꽦???쇨린媛 ?놁뒿?덈떎. AI 由щ럭瑜??앹꽦?????놁뒿?덈떎.",
                from, to
            );
        }

        // ?쇨린 ?붿빟 ?앹꽦
        List<AiReportClient.JournalSummary> journalSummaries = journals.stream()
                .map(j -> new AiReportClient.JournalSummary(
                        j.getId(),
                        j.getTradeDate().toString(),
                        j.getSymbol(),
                        j.getEntryReason(),
                        j.getExitReason(),
                        j.getEmotion(),
                        j.getMemo(),
                        j.getJournalStrategyTags().stream()
                                .map(jst -> jst.getTag().getName())
                                .toList()
                ))
                .toList();

        // ?ъ????붿빟 ?앹꽦
        List<AiReportClient.PositionSummary> positionSummaries = positions.stream()
                .map(p -> new AiReportClient.PositionSummary(
                        p.getId(),
                        p.getSymbol(),
                        p.getCurrentPnl().toString()
                ))
                .toList();

        // journals瑜?Map<String, String> 由ъ뒪?몃줈 蹂??
        List<Map<String, String>> journalsMap = journalSummaries.stream()
                .map(js -> {
                    Map<String, String> map = new HashMap<>();
                    map.put("trade_date", js.tradeDate());
                    map.put("content", String.format("%s\n留ㅼ닔 ?댁쑀: %s\n留ㅻ룄 ?댁쑀: %s\n媛먯젙: %s",
                            js.memo(), js.entryReason(), js.exitReason(), js.emotion()));
                    return map;
                })
                .toList();

        // AI ?붿껌 ?앹꽦
        AiReportClient.PeriodReviewRequest request = new AiReportClient.PeriodReviewRequest(
                preferredLanguage(userId),
                period,
                from,
                to,
                journalsMap
        );

        return aiReportClient.analyzePeriod(request);
    }

    private String preferredLanguage(Long userId) {
        return userRepository.findById(userId).map(User::getPreferredLanguage).orElse("en");
    }

    // [?⑸룄] 媛먯젙 ?몃젋???곗씠??議고쉶 / [?몄텧] TradeJournalController.getEmotionTimeline()
    // Java ?ㅽ듃由쇱쑝濡??좎쭨蹂?媛먯젙 遺꾪룷 吏묎퀎 + ?대떦???ъ???PnL 留ㅽ븨
    @Transactional(readOnly = true)
    public List<EmotionTimeline> getEmotionTimeline(Long userId, String from, String to) {
        LocalDate fromD = (from != null && !from.isBlank()) ? LocalDate.parse(from) : null;
        LocalDate toD = (to != null && !to.isBlank()) ? LocalDate.parse(to) : null;

        // 1. ?대떦 ?ъ슜?먯쓽 紐⑤뱺 ?쇨린 議고쉶 (湲곗〈 findAllByUserId 諛⑹떇 ?좎?)
        List<TradeJournal> journals = journalRepository.findAllByUserId(userId);

        // 2. ?좎쭨蹂?媛먯젙 吏묎퀎
        Map<LocalDate, Map<String, Integer>> emotionCountByDate = new HashMap<>();

        for (TradeJournal journal : journals) {
            if (fromD != null && journal.getTradeDate().isBefore(fromD)) continue;
            if (toD != null && journal.getTradeDate().isAfter(toD)) continue;

            LocalDate date = journal.getTradeDate();
            String emotion = journal.getEmotion();

            if (emotion != null) {
                emotionCountByDate.computeIfAbsent(date, d -> new HashMap<>())
                                 .merge(emotion, 1, Integer::sum);
            }
        }

        // 3. ?좎쭨蹂?PnL 議고쉶 (?대떦 ?좎쭨??泥?궛???ъ???
        Map<LocalDate, Double> pnlByDate = positionRepository
            .findByUserIdAndClosedAtBetween(userId,
                fromD != null ? fromD.atStartOfDay() : LocalDateTime.now().minusYears(1).withDayOfYear(1),
                toD != null ? toD.atTime(LocalTime.MAX) : LocalDateTime.now())
            .stream()
            .collect(Collectors.groupingBy(
                p -> p.getClosedAt().toLocalDate(),
                Collectors.summingDouble(p -> p.getPnl().doubleValue())
            ));

        // 4. ??꾨씪???곗씠??蹂??
        LocalDate current = fromD != null ? fromD : LocalDate.now().minusMonths(1);
        LocalDate end = toD != null ? toD : LocalDate.now();

        List<EmotionTimeline> timeline = new ArrayList<>();
        while (!current.isAfter(end)) {
            Map<String, Integer> emotionCounts = emotionCountByDate.getOrDefault(current, new HashMap<>());
            Double pnl = pnlByDate.get(current);

            timeline.add(new EmotionTimeline(
                current.toString(),
                emotionCounts,
                pnl != null ? pnl : 0.0
            ));
            current = current.plusDays(1);
        }

        return timeline;
    }

    // 媛먯젙 ?몃젋???묐떟 DTO
    public record EmotionTimeline(
            String date,
            Map<String, Integer> emotionCounts,
            Double pnl
    ) {}

    // [?⑸룄] ?뱀젙 嫄곕옒?뚯쓽 紐⑤뱺 ?쇨린 ??젣 / [?몄텧] ExchangeKeyService.deleteKey()
    @Transactional
    public void deleteJournalsByExchange(Long userId, ExchangeKey.Exchange exchange) {
        log.info("[Journal] 嫄곕옒????젣濡??명븳 ?쇨린 ??젣 ?쒖옉 - userId={}, exchange={}", userId, exchange.name());

        // ?대떦 嫄곕옒?뚯쓽 紐⑤뱺 ?쇨린 議고쉶
        List<TradeJournal> journals = journalRepository.findByUserIdAndExchange(userId, exchange);

        // ?쇨린 ??젣 (?곌????곗씠?곕룄 ?④퍡 ??젣)
        for (TradeJournal journal : journals) {
            // ?쇨린 ?쒓렇 ?곌? ??젣 (JPA CascadeType.ALL ?먮뒗 orphanRemoval???ㅼ젙??寃쎌슦)
            // ?섎룞 ??젣 ?꾩슂 ??異붽? 援ы쁽
            journalRepository.delete(journal);
        }

        log.info("[Journal] ?쇨린 ??젣 ?꾨즺 - 珥?{}媛???젣", journals.size());
    }

    // [?⑸룄] 理쒓렐 1二쇱씪 嫄곕옒 ?붿빟 AI 由щ럭 ?앹꽦 / [?몄텧] TradeJournalController.getWeeklyReview()
    @Transactional(readOnly = true)
    public TradeJournalController.WeeklyReviewResponse getWeeklyReview(Long userId) {
        log.info("[Journal] 理쒓렐 1二쇱씪 AI 由щ럭 ?앹꽦 ?쒖옉 - userId={}", userId);

        // 1二쇱씪 ???쒓컙 怨꾩궛
        LocalDateTime oneWeekAgo = LocalDateTime.now().minusWeeks(1);

        // 理쒓렐 1二쇱씪 嫄곕옒 ?곗씠??議고쉶
        List<Trade> recentTrades = tradeRepository.findByUserIdAndTradedAtBetween(userId, oneWeekAgo, LocalDateTime.now());
        if (recentTrades.isEmpty()) {
            TradeJournalController.WeeklyReviewResponse response =
                    new TradeJournalController.WeeklyReviewResponse();

            response.setReview("理쒓렐 1二쇱씪媛꾩쓽 嫄곕옒 ?댁뿭???놁뒿?덈떎.");
            response.setCreated_at(LocalDateTime.now());
            return response;
        }

        String review = generateWeeklyReview(recentTrades);

        TradeJournalController.WeeklyReviewResponse response =
                new TradeJournalController.WeeklyReviewResponse();

        response.setReview(review);
        response.setCreated_at(LocalDateTime.now());

        return response;
    }

    // [?⑸룄] 1二쇱씪 嫄곕옒 ?곗씠??湲곕컲 AI 由щ럭 ?띿뒪???앹꽦 / [?몄텧] getWeeklyReview()
    private String generateWeeklyReview(List<Trade> trades) {
        // ?듦퀎 怨꾩궛
        long totalTrades = trades.size();
        long buyTrades = trades.stream().filter(t -> t.getSide() == TradeSide.BUY).count();
        long sellTrades = trades.stream().filter(t -> t.getSide() == TradeSide.SELL).count();

        double totalVolume = trades.stream()
        .mapToDouble(t -> t.getQty().doubleValue())
        .sum();
        double totalAmount = trades.stream()
        .mapToDouble(t -> t.getPrice().doubleValue() * t.getQty().doubleValue())
        .sum();

        // ?밸쪧 怨꾩궛 (媛꾨떒?? ?ㅼ젣濡쒕뒗 PnL 湲곗??쇰줈 ?댁빞 ??
        double winRate = 0.5; // ?꾩떆 媛?

        StringBuilder review = new StringBuilder();
        review.append("?뱤 **理쒓렐 1二쇱씪 嫄곕옒 ?붿빟**\n\n");
        review.append(String.format("??珥?嫄곕옒 嫄댁닔: %d嫄?(留ㅼ닔 %d, 留ㅻ룄 %d)\n", totalTrades, buyTrades, sellTrades));
        review.append(String.format("??珥?嫄곕옒?? %.4f\n", totalVolume));
        review.append(String.format("??珥?嫄곕옒 湲덉븸: ??,.0f\n", totalAmount));
        review.append(String.format("??異붿젙 ?밸쪧: %.1f%%\n\n", winRate * 100));

        // 嫄곕옒 ?⑦꽩 遺꾩꽍
        Map<String, Long> symbolCounts = trades.stream()
                .collect(java.util.stream.Collectors.groupingBy(Trade::getSymbol, java.util.stream.Collectors.counting()));

        if (!symbolCounts.isEmpty()) {
            review.append("?렞 **二쇱슂 嫄곕옒 醫낅ぉ**\n");
            symbolCounts.entrySet().stream()
                    .sorted(Map.Entry.<String, Long>comparingByValue().reversed())
                    .limit(3)
                    .forEach(entry ->
                            review.append(String.format("??%s: %d嫄?n", entry.getKey(), entry.getValue())));
            review.append("\n");
        }

        // 개선 안내
        review.append("**개선 제안**\n");
        review.append("- 오늘의 계획과 실제 매매가 얼마나 일치했는지 먼저 확인하세요.\n");
        review.append("- 계획과 다르게 움직였다면, 진입/청산 근거가 무엇이었는지 짚어보세요.\n");
        review.append("- 매수/매도 비중과 종목별 패턴도 함께 보면 좋습니다.\n");

        return review.toString();
    }

    }
