// [파일 용도] 대시보드 종합 통계 및 규칙 기반 인사이트 + 매매계획/실적 비교 서비스

package com.tradediary.dashboard;

import com.tradediary.journal.TradeJournal;
import com.tradediary.journal.TradeJournalRepository;
import com.tradediary.plan.TradePlan;
import com.tradediary.plan.TradePlanRepository;
import com.tradediary.position.Position;
import com.tradediary.position.PositionRepository;
import com.tradediary.user.User;
import com.tradediary.user.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.util.*;
import java.util.stream.Collectors;

// [클래스] 대시보드용 핵심 지표 + 규칙 기반 인사이트 + 매매계획 비교 조합 서비스
@Service
@RequiredArgsConstructor
public class DashboardService {

    private final PositionRepository     positionRepository;
    private final TradeJournalRepository journalRepository;
    private final TradePlanRepository    planRepository;
    private final UserRepository         userRepository;

    // [용도] 대시보드 전체 데이터 조회 / [호출] DashboardController.getDashboard()
    @Transactional(readOnly = true)
    public DashboardResponse getDashboard(Long userId) {
        User user = userRepository.findById(userId).orElseThrow();

        YearMonth thisYM = YearMonth.now();
        YearMonth lastYM = thisYM.minusMonths(1);

        // 이번 달 / 지난 달 포지션만 DB에서 조회 (전체 로딩 대신)
        LocalDateTime thisMonthStart = thisYM.atDay(1).atStartOfDay();
        LocalDateTime thisMonthEnd   = thisYM.plusMonths(1).atDay(1).atStartOfDay();
        LocalDateTime lastMonthStart = lastYM.atDay(1).atStartOfDay();

        List<Position> thisMonth = positionRepository.findByUserIdAndClosedAtBetween(
                userId, thisMonthStart, thisMonthEnd);
        List<Position> lastMonth = positionRepository.findByUserIdAndClosedAtBetween(
                userId, lastMonthStart, thisMonthStart);

        // 최근 포지션 5개만 (LIMIT 쿼리)
        List<Position> recent = positionRepository.findRecentByUserId(userId, 5);

        // 전체 통계는 thisMonth + lastMonth 합산으로 근사 (정확한 전체 로딩 대신)
        List<Position> recentForOverall = positionRepository.findRecentByUserId(userId, 1000);
        List<TradeJournal> journals = journalRepository.findAllByUserId(userId);

        // 다음 매매 계획 (오늘 이후 미완료)
        List<DashboardResponse.UpcomingPlan> upcomingPlans = getUpcomingPlans(userId);

        // 계획 vs 실적 비교 (최근 7일)
        List<DashboardResponse.PlanComparison> planComparisons = getPlanComparisons(userId);

        return new DashboardResponse(
                user.getNickname(),
                calcPeriodStats(thisMonth),
                calcPeriodStats(lastMonth),
                calcOverallStats(recentForOverall),
                recentPositions(recent),
                calcInsights(recentForOverall, journals),
                upcomingPlans,
                planComparisons
        );
    }

    // [용도] 다음 매매 계획 조회 (오늘~미래, 미완료) / [호출] getDashboard()
    private List<DashboardResponse.UpcomingPlan> getUpcomingPlans(Long userId) {
        LocalDate today = LocalDate.now();
        List<TradePlan> plans = planRepository
                .findAllByUserIdAndPlanDateGreaterThanEqualAndDoneFalseOrderByPlanDateAscCreatedAtAsc(userId, today);

        return plans.stream()
                .map(p -> new DashboardResponse.UpcomingPlan(
                        p.getId(),
                        p.getPlanDate().toString(),
                        p.getSymbol(),
                        p.getDirection(),
                        p.getContent(),
                        p.getPlanDate().equals(today)
                ))
                .toList();
    }

    // [용도] 과거 계획 vs 실제 거래 비교 / [호출] getDashboard()
    private List<DashboardResponse.PlanComparison> getPlanComparisons(Long userId) {
        LocalDate today = LocalDate.now();
        LocalDate from = today.minusDays(7);

        // 최근 7일간의 계획 조회 (오늘 제외)
        List<TradePlan> plans = planRepository
                .findAllByUserIdAndPlanDateBetweenOrderByPlanDateDesc(userId, from, today.minusDays(1));

        if (plans.isEmpty()) return List.of();

        // 해당 기간 포지션 조회
        LocalDateTime posFrom = from.atStartOfDay();
        LocalDateTime posTo   = today.atStartOfDay();
        List<Position> positions = positionRepository.findByUserIdAndClosedAtRange(userId, posFrom, posTo);

        // 날짜별 포지션 그룹핑
        Map<LocalDate, List<Position>> positionsByDate = positions.stream()
                .collect(Collectors.groupingBy(p -> p.getClosedAt().toLocalDate()));

        List<DashboardResponse.PlanComparison> results = new ArrayList<>();
        for (TradePlan plan : plans) {
            List<Position> dayPositions = positionsByDate
                    .getOrDefault(plan.getPlanDate(), List.of());

            if (dayPositions.isEmpty()) {
                // 해당 날짜에 거래 없음 → 미실행
                results.add(new DashboardResponse.PlanComparison(
                        plan.getId(), plan.getPlanDate().toString(),
                        plan.getSymbol(), plan.getDirection(), plan.getContent(),
                        "NOT_EXECUTED", null, null, null
                ));
                continue;
            }

            // 계획에 심볼이 있으면 매칭 시도
            if (plan.getSymbol() != null && !plan.getSymbol().isBlank()) {
                String plannedSymbol = plan.getSymbol().toUpperCase();
                // 심볼이 포함된 포지션 찾기 (예: BTCUSDT에 BTC로 계획)
                List<Position> matched = dayPositions.stream()
                        .filter(p -> p.getSymbol().toUpperCase().contains(plannedSymbol)
                                || plannedSymbol.contains(p.getSymbol().toUpperCase()))
                        .toList();

                if (matched.isEmpty()) {
                    // 다른 심볼만 거래함
                    Position actual = dayPositions.get(0);
                    results.add(new DashboardResponse.PlanComparison(
                            plan.getId(), plan.getPlanDate().toString(),
                            plan.getSymbol(), plan.getDirection(), plan.getContent(),
                            "DIFFERENT_SYMBOL",
                            actual.getSymbol(), actual.getSide().name(),
                            actual.getPnl().setScale(2, RoundingMode.HALF_UP).toPlainString()
                    ));
                } else {
                    // 심볼 매칭됨 → 방향 비교
                    Position actual = matched.get(0);
                    boolean directionMatch = isDirectionMatch(plan.getDirection(), actual.getSide().name());
                    results.add(new DashboardResponse.PlanComparison(
                            plan.getId(), plan.getPlanDate().toString(),
                            plan.getSymbol(), plan.getDirection(), plan.getContent(),
                            directionMatch ? "MATCHED" : "DIFFERENT_DIRECTION",
                            actual.getSymbol(), actual.getSide().name(),
                            actual.getPnl().setScale(2, RoundingMode.HALF_UP).toPlainString()
                    ));
                }
            } else {
                // 심볼 없는 계획 → 거래 했으면 일단 실행된 것
                Position actual = dayPositions.get(0);
                results.add(new DashboardResponse.PlanComparison(
                        plan.getId(), plan.getPlanDate().toString(),
                        null, plan.getDirection(), plan.getContent(),
                        "MATCHED",
                        actual.getSymbol(), actual.getSide().name(),
                        actual.getPnl().setScale(2, RoundingMode.HALF_UP).toPlainString()
                ));
            }
        }

        return results;
    }

    // [용도] 계획 방향과 실제 방향 일치 여부 / [호출] getPlanComparisons()
    private boolean isDirectionMatch(String plannedDirection, String actualSide) {
        if (plannedDirection == null || plannedDirection.isBlank()) return true;
        return plannedDirection.equalsIgnoreCase(actualSide);
    }

    // [용도] 기간별 통계 계산 / [호출] getDashboard()
    private DashboardResponse.PeriodStats calcPeriodStats(List<Position> positions) {
        if (positions.isEmpty()) return new DashboardResponse.PeriodStats(0, 0, 0.0, "0");
        int total = positions.size();
        int wins  = (int) positions.stream().filter(p -> p.getPnl().compareTo(BigDecimal.ZERO) > 0).count();
        double winRate = round2((double) wins / total * 100);
        BigDecimal totalPnl = positions.stream().map(Position::getPnl)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        return new DashboardResponse.PeriodStats(total, wins, winRate,
                totalPnl.setScale(2, RoundingMode.HALF_UP).toPlainString());
    }

    // [용도] 전체 기간 요약 통계 / [호출] getDashboard()
    private DashboardResponse.OverallStats calcOverallStats(List<Position> all) {
        if (all.isEmpty()) return new DashboardResponse.OverallStats(0, 0.0, "0");
        int total = all.size();
        int wins  = (int) all.stream().filter(p -> p.getPnl().compareTo(BigDecimal.ZERO) > 0).count();
        BigDecimal totalPnl = all.stream().map(Position::getPnl)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        return new DashboardResponse.OverallStats(total, round2((double) wins / total * 100),
                totalPnl.setScale(2, RoundingMode.HALF_UP).toPlainString());
    }

    // [용도] 최근 포지션 5개 DTO 변환 / [호출] getDashboard()
    private List<DashboardResponse.RecentPosition> recentPositions(List<Position> all) {
        return all.stream().limit(5).map(p -> new DashboardResponse.RecentPosition(
                p.getSymbol(),
                p.getExchange().name(),
                p.getSide().name(),
                p.getPnl().setScale(2, RoundingMode.HALF_UP).toPlainString(),
                p.getClosedAt().toLocalDate().toString()
        )).toList();
    }

    // [용도] 규칙 기반 인사이트 생성 / [호출] getDashboard()
    private List<DashboardResponse.Insight> calcInsights(List<Position> all,
                                                          List<TradeJournal> journals) {
        if (all.size() < 5) return List.of();
        List<DashboardResponse.Insight> insights = new ArrayList<>();

        // 1. 베스트 시간대 (최소 5건, 승률 60% 이상)
        bestHourInsight(all).ifPresent(insights::add);

        // 2. 베스트 종목 (최소 3건, 승률 65% 이상)
        bestSymbolInsight(all).ifPresent(insights::add);

        // 3. 감정 경고 (일기 데이터 기반)
        emotionInsight(all, journals).ifPresent(insights::add);

        // 4. 연속 손실 경고
        streakWarning(all).ifPresent(insights::add);

        // 5. 이번 달 성장 비교
        monthlyGrowthInsight(all).ifPresent(insights::add);

        return insights;
    }

    // [용도] 가장 승률 높은 시간대 인사이트 / [호출] calcInsights()
    private Optional<DashboardResponse.Insight> bestHourInsight(List<Position> all) {
        Map<Integer, List<Position>> byHour = all.stream()
                .collect(Collectors.groupingBy(p -> p.getClosedAt().getHour()));

        return byHour.entrySet().stream()
                .filter(e -> e.getValue().size() >= 5)
                .max(Comparator.comparingDouble(e -> {
                    List<Position> g = e.getValue();
                    return (double) g.stream().filter(p -> p.getPnl().compareTo(BigDecimal.ZERO) > 0).count() / g.size();
                }))
                .flatMap(e -> {
                    List<Position> g = e.getValue();
                    int wins = (int) g.stream().filter(p -> p.getPnl().compareTo(BigDecimal.ZERO) > 0).count();
                    double wr = round2((double) wins / g.size() * 100);
                    if (wr < 60) return Optional.empty();
                    return Optional.of(new DashboardResponse.Insight("good",
                            String.format("오전 %s시 거래 승률이 %.0f%%로 가장 높습니다 (%d건)",
                                    e.getKey(), wr, g.size())));
                });
    }

    // [용도] 승률 가장 높은 종목 인사이트 / [호출] calcInsights()
    private Optional<DashboardResponse.Insight> bestSymbolInsight(List<Position> all) {
        return all.stream()
                .collect(Collectors.groupingBy(Position::getSymbol))
                .entrySet().stream()
                .filter(e -> e.getValue().size() >= 3)
                .max(Comparator.comparingDouble(e -> {
                    List<Position> g = e.getValue();
                    return (double) g.stream().filter(p -> p.getPnl().compareTo(BigDecimal.ZERO) > 0).count() / g.size();
                }))
                .flatMap(e -> {
                    List<Position> g = e.getValue();
                    int wins = (int) g.stream().filter(p -> p.getPnl().compareTo(BigDecimal.ZERO) > 0).count();
                    double wr = round2((double) wins / g.size() * 100);
                    if (wr < 65) return Optional.empty();
                    return Optional.of(new DashboardResponse.Insight("good",
                            String.format("%s 거래 승률이 %.0f%%로 가장 높습니다", e.getKey(), wr)));
                });
    }

    // [용도] 감정별 손익 분석 → 가장 위험한 감정 경고 / [호출] calcInsights()
    private Optional<DashboardResponse.Insight> emotionInsight(List<Position> all,
                                                                 List<TradeJournal> journals) {
        Map<String, String> dateSymbolEmotion = journals.stream()
                .filter(j -> j.getEmotion() != null && !j.getEmotion().isBlank()
                          && j.getSymbol() != null)
                .collect(Collectors.toMap(
                        j -> j.getTradeDate() + "_" + j.getSymbol().toUpperCase(),
                        TradeJournal::getEmotion, (a, b) -> a));

        Map<String, List<BigDecimal>> emotionPnl = new HashMap<>();
        for (Position p : all) {
            String key = p.getClosedAt().toLocalDate() + "_" + p.getSymbol().toUpperCase();
            String emotion = dateSymbolEmotion.get(key);
            if (emotion != null) {
                emotionPnl.computeIfAbsent(emotion, k -> new ArrayList<>()).add(p.getPnl());
            }
        }
        if (emotionPnl.isEmpty()) return Optional.empty();

        // 전체 평균 손익
        double overallAvg = all.stream()
                .mapToDouble(p -> p.getPnl().doubleValue()).average().orElse(0);

        // 평균 손익이 가장 낮은 감정 (최소 2건)
        return emotionPnl.entrySet().stream()
                .filter(e -> e.getValue().size() >= 2)
                .min(Comparator.comparingDouble(e ->
                        e.getValue().stream().mapToDouble(BigDecimal::doubleValue).average().orElse(0)))
                .flatMap(e -> {
                    double avg = e.getValue().stream().mapToDouble(BigDecimal::doubleValue).average().orElse(0);
                    if (avg >= overallAvg) return Optional.empty();
                    Map<String, String> labels = Map.of(
                            "FOMO", "FOMO", "GREEDY", "욕심", "FEARFUL", "공포",
                            "ANXIOUS", "불안", "CALM", "냉정", "CONFIDENT", "확신");
                    String label = labels.getOrDefault(e.getKey(), e.getKey());
                    return Optional.of(new DashboardResponse.Insight("warning",
                            String.format("'%s' 감정일 때 평균 손익이 가장 낮습니다. 해당 상태에서 진입을 주의하세요", label)));
                });
    }

    // [용도] 최근 연속 손실 경고 / [호출] calcInsights()
    private Optional<DashboardResponse.Insight> streakWarning(List<Position> all) {
        int streak = 0;
        for (Position p : all) { // 이미 최신순 정렬
            if (p.getPnl().compareTo(BigDecimal.ZERO) < 0) streak++;
            else break;
        }
        if (streak < 3) return Optional.empty();
        return Optional.of(new DashboardResponse.Insight("warning",
                String.format("현재 %d연속 손실 중입니다. 포지션 크기를 줄이거나 잠시 쉬어가세요", streak)));
    }

    // [용도] 이번 달 vs 지난 달 승률 성장 인사이트 / [호출] calcInsights()
    private Optional<DashboardResponse.Insight> monthlyGrowthInsight(List<Position> all) {
        YearMonth thisYM = YearMonth.now();
        YearMonth lastYM = thisYM.minusMonths(1);

        List<Position> thisMonth = all.stream()
                .filter(p -> YearMonth.from(p.getClosedAt()).equals(thisYM)).toList();
        List<Position> lastMonth = all.stream()
                .filter(p -> YearMonth.from(p.getClosedAt()).equals(lastYM)).toList();

        if (thisMonth.size() < 3 || lastMonth.size() < 3) return Optional.empty();

        double thisWr = round2((double) thisMonth.stream()
                .filter(p -> p.getPnl().compareTo(BigDecimal.ZERO) > 0).count() / thisMonth.size() * 100);
        double lastWr = round2((double) lastMonth.stream()
                .filter(p -> p.getPnl().compareTo(BigDecimal.ZERO) > 0).count() / lastMonth.size() * 100);

        double diff = round2(thisWr - lastWr);
        if (Math.abs(diff) < 3) return Optional.empty();

        if (diff > 0) {
            return Optional.of(new DashboardResponse.Insight("good",
                    String.format("이번 달 승률이 전달 대비 +%.0f%%p 상승했습니다 (%.0f%% → %.0f%%)",
                            diff, lastWr, thisWr)));
        } else {
            return Optional.of(new DashboardResponse.Insight("warning",
                    String.format("이번 달 승률이 전달 대비 %.0f%%p 하락했습니다 (%.0f%% → %.0f%%)",
                            diff, lastWr, thisWr)));
        }
    }

    private double round2(double v) { return Math.round(v * 100.0) / 100.0; }
}
