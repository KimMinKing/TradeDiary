// [파일 용도] 포지션 데이터 기반 트레이더 유형 자동 분류 및 AI 코칭 서비스

package com.tradediary.trader;

import com.tradediary.ai.AiReportClient;
import com.tradediary.position.Position;
import com.tradediary.position.PositionRepository;
import com.tradediary.user.UserLanguageService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Duration;
import java.util.List;
import java.util.stream.Collectors;

// [클래스] 포지션 데이터 분석 → 6가지 트레이더 유형 분류 + 유형별 AI 코칭 생성
@Slf4j
@Service
@RequiredArgsConstructor
public class TraderTypeService {

    private final PositionRepository positionRepository;
    private final TraderTypeAdviceRepository adviceRepository;
    private final AiReportClient aiReportClient;
    private final UserLanguageService userLanguageService;

    // [용도] 사용자 트레이더 유형 분석 및 반환 / [호출] TraderTypeController.getTraderType()
    @Transactional
    public TraderTypeResponse analyze(Long userId) {
        List<Position> positions = positionRepository.findByUserIdOrderByClosedAtDesc(userId);

        if (positions.size() < 5) {
            adviceRepository.deleteByUserId(userId);
            return insufficientData(positions.size());
        }

        // 평균 보유 시간 (시간 단위)
        double avgHoldHours = positions.stream()
                .mapToLong(p -> Duration.between(p.getOpenedAt(), p.getClosedAt()).toMinutes())
                .average().orElse(0) / 60.0;

        // 고유 종목 수
        int uniqueSymbols = (int) positions.stream()
                .map(Position::getSymbol)
                .collect(Collectors.toSet()).size();

        // 승률
        int wins = (int) positions.stream()
                .filter(p -> p.getPnl().compareTo(BigDecimal.ZERO) > 0).count();
        double winRate = round2((double) wins / positions.size() * 100);

        // 평균 손익
        double avgPnl = positions.stream()
                .mapToDouble(p -> p.getPnl().doubleValue())
                .average().orElse(0);

        TraderTypeResponse.Stats stats = new TraderTypeResponse.Stats(
                positions.size(),
                round2(avgHoldHours),
                uniqueSymbols,
                winRate,
                round2(avgPnl)
        );

        // 유형 분류 (종목 집중도 우선, 이후 보유시간 기반)
        String typeCode;
        if (uniqueSymbols <= 2) {
            typeCode = "FOCUSED";
        } else if (uniqueSymbols >= 10) {
            typeCode = "DIVERSIFIED";
        } else if (avgHoldHours < 2) {
            typeCode = "SCALPER";
        } else if (avgHoldHours < 24) {
            typeCode = "DAY_TRADER";
        } else if (avgHoldHours < 24 * 14) {
            typeCode = "SWING_TRADER";
        } else {
            typeCode = "POSITION_TRADER";
        }

        return buildResponse(typeCode, stats);
    }

    // [용도] 사용자 AI 코칭 결과 조회 (캐시 우선, 없으면 생성) / [호출] TraderTypeController.getAdvice()
    @Transactional
    public TraderTypeAdviceResponse getAdvice(Long userId) {
        TraderTypeResponse analysis = analyze(userId);
        if ("UNKNOWN".equals(analysis.typeCode())) {
            return TraderTypeAdviceResponse.empty();
        }

        return adviceRepository.findByUserId(userId)
                .map(cached -> {
                    String cachedText = cached.getAdviceText();
                    if (cachedText == null || !cachedText.contains(analysis.typeName())
                            || !userLanguageService.get(userId).equals(cached.getLanguage())) {
                        return generateAdviceOrEmpty(userId);
                    }
                    return new TraderTypeAdviceResponse(cachedText, cached.getGeneratedAt());
                })
                .orElseGet(() -> generateAdviceOrEmpty(userId));
    }

    // [용도] 사용자 AI 코칭 강제 재생성 / [호출] TraderTypeController.refreshAdvice()
    @Transactional
    public TraderTypeAdviceResponse refreshAdvice(Long userId) {
        return generateAdvice(userId);
    }

    // [용도] 유형 분석 → AI 코칭 생성 → DB upsert / [호출] getAdvice(), refreshAdvice()
    private TraderTypeAdviceResponse generateAdvice(Long userId) {
        TraderTypeResponse analysis = analyze(userId);
        if ("UNKNOWN".equals(analysis.typeCode())) {
            return TraderTypeAdviceResponse.empty();
        }

        // AI 요청 생성 (유형 정보 + 통계)
        TraderTypeResponse.Stats s = analysis.stats();
        AiReportClient.TraderTypeAdviceRequest request = new AiReportClient.TraderTypeAdviceRequest(
                userLanguageService.get(userId),
                analysis.typeCode(),
                analysis.typeName(),
                analysis.description(),
                analysis.strength(),
                analysis.weakness(),
                new AiReportClient.TraderTypeAdviceRequest.Stats(
                        s.totalPositions(), s.avgHoldHours(), s.uniqueSymbols(),
                        s.winRate(), s.avgPnlPerTrade()
                )
        );

        String advice = aiReportClient.analyzeTraderTypeAdvice(request);

        // upsert 저장 (기존 있으면 update, 없으면 insert) — unique 제약 충돌 회피
        TraderTypeAdvice entity = adviceRepository.findByUserId(userId)
                .map(existing -> {
                    existing.update(advice, userLanguageService.get(userId));
                    return existing;
                })
                .orElseGet(() -> TraderTypeAdvice.builder()
                        .userId(userId)
                        .adviceText(advice)
                        .language(userLanguageService.get(userId))
                        .build());
        adviceRepository.save(entity);

        return new TraderTypeAdviceResponse(advice, entity.getGeneratedAt());
    }

    // [용도] 일반 조회에서 AI 서버 장애가 화면 500으로 번지지 않도록 빈 코칭 반환 / [호출] getAdvice()
    private TraderTypeAdviceResponse generateAdviceOrEmpty(Long userId) {
        try {
            return generateAdvice(userId);
        } catch (RuntimeException e) {
            log.warn("[TraderType] AI 코칭 생성 실패 - userId={}, message={}", userId, e.getMessage());
            return TraderTypeAdviceResponse.empty();
        }
    }

    // [용도] 데이터 부족 시 기본 응답 / [호출] analyze()
    private TraderTypeResponse insufficientData() {
        return insufficientData(0);
    }

    private TraderTypeResponse insufficientData(int currentPositions) {
        return new TraderTypeResponse(
                "UNKNOWN",
                "분석 중",
                "⏳",
                "포지션 데이터가 5건 이상 필요합니다",
                "—",
                "—",
                new TraderTypeResponse.Stats(currentPositions, 0, 0, 0, 0)
        );
    }

    // [용도] 유형 코드 → 응답 DTO 변환 / [호출] analyze()
    private TraderTypeResponse buildResponse(String typeCode, TraderTypeResponse.Stats stats) {
        return switch (typeCode) {
            case "SCALPER" -> new TraderTypeResponse(
                    typeCode, "초단타형 스캘퍼", "⚡",
                    "평균 보유 시간이 2시간 미만으로, 빠른 진입과 청산을 반복하는 초단타 트레이더입니다.",
                    "빠른 반응 속도와 높은 집중력으로 작은 변동에서 수익을 추구합니다.",
                    "수수료 비용이 누적되기 쉽고, 감정적 거래에 취약할 수 있습니다.",
                    stats);
            case "DAY_TRADER" -> new TraderTypeResponse(
                    typeCode, "데이 트레이더", "🌅",
                    "당일 내 포지션을 마감하는 일중 매매 방식으로, 오버나잇 리스크를 최소화합니다.",
                    "시장 흐름을 읽는 능력이 뛰어나고, 하루 단위 리스크 관리가 철저합니다.",
                    "하루 종일 모니터링이 필요하며, 큰 추세 수익을 놓치는 경향이 있습니다.",
                    stats);
            case "SWING_TRADER" -> new TraderTypeResponse(
                    typeCode, "스윙 트레이더", "🌊",
                    "수일~수 주간 포지션을 유지하며 중기적인 가격 움직임을 포착합니다.",
                    "큰 추세에서 높은 수익을 낼 수 있고, 상대적으로 스트레스가 적습니다.",
                    "급격한 시장 변동 시 오버나잇 리스크에 노출될 수 있습니다.",
                    stats);
            case "POSITION_TRADER" -> new TraderTypeResponse(
                    typeCode, "장기 포지션 트레이더", "🏔️",
                    "2주 이상 포지션을 유지하며 장기적인 추세와 가치를 추구합니다.",
                    "대형 트렌드에서 큰 수익을 낼 수 있고, 거래 비용이 낮습니다.",
                    "장기간 자금이 묶이며, 반전 시 큰 손실이 발생할 수 있습니다.",
                    stats);
            case "FOCUSED" -> new TraderTypeResponse(
                    typeCode, "집중 투자형", "🎯",
                    "소수의 종목에 집중하여 깊이 분석하고 반복 거래하는 스타일입니다.",
                    "특정 종목에 대한 높은 이해도와 패턴 인식 능력을 가집니다.",
                    "종목 집중 리스크가 크고, 해당 종목 부진 시 크게 영향받습니다.",
                    stats);
            case "DIVERSIFIED" -> new TraderTypeResponse(
                    typeCode, "분산 투자형", "🌐",
                    "다양한 종목에 분산 투자하여 포트폴리오 리스크를 줄이는 스타일입니다.",
                    "리스크 분산 효과가 크고, 다양한 시장 기회를 포착할 수 있습니다.",
                    "각 종목에 대한 집중도가 낮아 깊은 분석이 어려울 수 있습니다.",
                    stats);
            default -> insufficientData();
        };
    }

    private double round2(double v) { return Math.round(v * 100.0) / 100.0; }
}
