// [파일 용도] 포지션 기반 성과 통계 계산 서비스

package com.tradediary.stats;

import com.tradediary.exchange.ExchangeKey;
import com.tradediary.journal.TradeJournal;
import com.tradediary.journal.TradeJournalRepository;
import com.tradediary.position.Position;
import com.tradediary.position.PositionRepository;
import com.tradediary.position.PositionSide;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.DayOfWeek;
import java.util.*;
import java.util.stream.Collectors;
import java.util.stream.IntStream;

// [클래스] 포지션·일기 데이터 기반 성과 통계 계산 (1~3단계 전부 포함)
@Service
@RequiredArgsConstructor
public class StatsService {

    private final PositionRepository     positionRepository;
    private final TradeJournalRepository journalRepository;

    private static final Map<String, String> EMOTION_LABEL = Map.of(
            "CALM",      "😌 냉정",
            "CONFIDENT", "💪 확신",
            "FOMO",      "😰 FOMO",
            "GREEDY",    "🤑 욕심",
            "FEARFUL",   "😨 공포",
            "ANXIOUS",   "😟 불안"
    );
    private static final String[] DAY_NAMES = {"월", "화", "수", "목", "금", "토", "일"};

    // [용도] 통계 전체 조회 / [호출] StatsController.getStats()
    @Transactional(readOnly = true)
    public StatsResponse getStats(Long userId, String exchange) {
        List<Position> positions;
        if (exchange != null && !exchange.isBlank() && !exchange.equalsIgnoreCase("ALL")) {
            positions = positionRepository.findByUserIdAndExchangeOrderByClosedAtDesc(
                    userId, ExchangeKey.Exchange.valueOf(exchange.toUpperCase()));
        } else {
            positions = positionRepository.findByUserIdOrderByClosedAtDesc(userId);
        }

        if (positions.isEmpty()) return StatsResponse.empty();

        // 일기 데이터 (태그 포함, JOIN FETCH)
        List<TradeJournal> journals = journalRepository.findAllByUserId(userId);

        return new StatsResponse(
                calcSummary(positions),
                calcMonthlyPnl(positions),
                calcDailyPnl(positions),
                calcSymbolStats(positions),
                calcSideStats(positions, PositionSide.LONG),
                calcSideStats(positions, PositionSide.SHORT),
                calcEmotionStats(positions, journals),
                calcTagStats(positions, journals),
                calcHourlyStats(positions),
                calcDayOfWeekStats(positions)
        );
    }

    // ─────────────────────────────────────────────────────────────────
    // 1단계: 핵심 지표
    // ─────────────────────────────────────────────────────────────────

    // [용도] 핵심 성과 지표 계산 / [호출] getStats()
    private StatsResponse.SummaryStats calcSummary(List<Position> positions) {
        int total = positions.size();
        List<Position> wins   = positions.stream().filter(p -> p.getPnl().compareTo(BigDecimal.ZERO) > 0).toList();
        List<Position> losses = positions.stream().filter(p -> p.getPnl().compareTo(BigDecimal.ZERO) <= 0).toList();

        double winRate = total > 0 ? round2((double) wins.size() / total * 100) : 0;

        BigDecimal totalWin  = wins.stream().map(Position::getPnl).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal totalLoss = losses.stream().map(Position::getPnl).reduce(BigDecimal.ZERO, BigDecimal::add).abs();

        double profitFactor = totalLoss.compareTo(BigDecimal.ZERO) > 0
                ? round2(totalWin.divide(totalLoss, 4, RoundingMode.HALF_UP).doubleValue()) : 0;

        double avgWin = wins.isEmpty() ? 0
                : round2(totalWin.divide(BigDecimal.valueOf(wins.size()), 4, RoundingMode.HALF_UP).doubleValue());
        double avgLoss = losses.isEmpty() ? 0
                : round2(losses.stream().map(Position::getPnl).reduce(BigDecimal.ZERO, BigDecimal::add)
                .divide(BigDecimal.valueOf(losses.size()), 4, RoundingMode.HALF_UP).doubleValue());

        double rrRatio = avgLoss != 0 ? round2(Math.abs(avgWin / avgLoss)) : 0;

        BigDecimal totalPnl      = positions.stream().map(Position::getPnl).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal maxSingleLoss = positions.stream().map(Position::getPnl).min(Comparator.naturalOrder()).orElse(BigDecimal.ZERO);

        // 최대 연속 수익/손실 (closedAt 오름차순)
        List<Position> sorted = positions.stream().sorted(Comparator.comparing(Position::getClosedAt)).toList();
        int maxWinStreak = 0, maxLossStreak = 0, curWin = 0, curLoss = 0;
        for (Position p : sorted) {
            if (p.getPnl().compareTo(BigDecimal.ZERO) > 0) {
                curWin++;  curLoss = 0;
                maxWinStreak  = Math.max(maxWinStreak,  curWin);
            } else {
                curLoss++; curWin  = 0;
                maxLossStreak = Math.max(maxLossStreak, curLoss);
            }
        }

        return new StatsResponse.SummaryStats(
                total, wins.size(), losses.size(), winRate, profitFactor,
                avgWin, avgLoss, rrRatio,
                maxWinStreak, maxLossStreak,
                maxSingleLoss.setScale(2, RoundingMode.HALF_UP).toPlainString(),
                totalPnl.setScale(2, RoundingMode.HALF_UP).toPlainString()
        );
    }

    // [용도] 월별 PnL 집계 / [호출] getStats()
    private List<StatsResponse.MonthlyPnl> calcMonthlyPnl(List<Position> positions) {
        Map<String, List<Position>> byMonth = positions.stream()
                .collect(Collectors.groupingBy(p ->
                        p.getClosedAt().getYear() + "-" +
                        String.format("%02d", p.getClosedAt().getMonthValue())));

        return byMonth.entrySet().stream()
                .sorted(Map.Entry.comparingByKey())
                .map(e -> {
                    List<Position> g = e.getValue();
                    BigDecimal pnl = g.stream().map(Position::getPnl).reduce(BigDecimal.ZERO, BigDecimal::add);
                    int w = (int) g.stream().filter(p -> p.getPnl().compareTo(BigDecimal.ZERO) > 0).count();
                    return new StatsResponse.MonthlyPnl(e.getKey(),
                            pnl.setScale(2, RoundingMode.HALF_UP).toPlainString(), w, g.size() - w);
                })
                .toList();
    }

    // [용도] 일별 PnL 집계 / [호출] getStats()
    private List<StatsResponse.DailyPnl> calcDailyPnl(List<Position> positions) {
        Map<String, List<Position>> byDay = positions.stream()
                .collect(Collectors.groupingBy(p -> p.getClosedAt().toLocalDate().toString()));

        return byDay.entrySet().stream()
                .sorted(Map.Entry.comparingByKey())
                .map(e -> {
                    List<Position> g = e.getValue();
                    BigDecimal pnl = g.stream().map(Position::getPnl).reduce(BigDecimal.ZERO, BigDecimal::add);
                    int w = (int) g.stream().filter(p -> p.getPnl().compareTo(BigDecimal.ZERO) > 0).count();
                    return new StatsResponse.DailyPnl(e.getKey(),
                            pnl.setScale(2, RoundingMode.HALF_UP).toPlainString(), w, g.size() - w);
                })
                .toList();
    }

    // [용도] 종목별 성과 집계 (수익 높은 순) / [호출] getStats()
    private List<StatsResponse.SymbolStats> calcSymbolStats(List<Position> positions) {
        return positions.stream()
                .collect(Collectors.groupingBy(Position::getSymbol))
                .entrySet().stream()
                .sorted((a, b) -> {
                    BigDecimal pa = a.getValue().stream().map(Position::getPnl).reduce(BigDecimal.ZERO, BigDecimal::add);
                    BigDecimal pb = b.getValue().stream().map(Position::getPnl).reduce(BigDecimal.ZERO, BigDecimal::add);
                    return pb.compareTo(pa);
                })
                .map(e -> {
                    List<Position> g = e.getValue();
                    int total = g.size();
                    int wins  = (int) g.stream().filter(p -> p.getPnl().compareTo(BigDecimal.ZERO) > 0).count();
                    BigDecimal totalPnl = g.stream().map(Position::getPnl).reduce(BigDecimal.ZERO, BigDecimal::add);
                    BigDecimal avgPnl   = totalPnl.divide(BigDecimal.valueOf(total), 2, RoundingMode.HALF_UP);
                    return new StatsResponse.SymbolStats(
                            e.getKey(), total, wins,
                            round2((double) wins / total * 100),
                            totalPnl.setScale(2, RoundingMode.HALF_UP).toPlainString(),
                            avgPnl.toPlainString());
                })
                .toList();
    }

    // [용도] 롱/숏별 성과 집계 / [호출] getStats()
    private StatsResponse.SideStats calcSideStats(List<Position> positions, PositionSide side) {
        List<Position> g = positions.stream().filter(p -> p.getSide() == side).toList();
        if (g.isEmpty()) return new StatsResponse.SideStats(side.name(), 0, 0, 0, "0", "0");
        int total = g.size();
        int wins  = (int) g.stream().filter(p -> p.getPnl().compareTo(BigDecimal.ZERO) > 0).count();
        BigDecimal totalPnl = g.stream().map(Position::getPnl).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal avgPnl   = totalPnl.divide(BigDecimal.valueOf(total), 2, RoundingMode.HALF_UP);
        return new StatsResponse.SideStats(side.name(), total, wins,
                round2((double) wins / total * 100),
                totalPnl.setScale(2, RoundingMode.HALF_UP).toPlainString(),
                avgPnl.toPlainString());
    }

    // ─────────────────────────────────────────────────────────────────
    // 2단계: 일기 데이터 연동 (감정별 / 태그별)
    // ─────────────────────────────────────────────────────────────────

    // [용도] 감정별 승률 계산 (journal.tradeDate + symbol → position 매핑) / [호출] getStats()
    private List<StatsResponse.EmotionStats> calcEmotionStats(List<Position> positions, List<TradeJournal> journals) {
        // date_symbol → emotion 매핑 (감정이 있는 일기만)
        Map<String, String> dateSymbolEmotion = journals.stream()
                .filter(j -> j.getEmotion() != null && !j.getEmotion().isBlank()
                          && j.getSymbol()  != null && !j.getSymbol().isBlank())
                .collect(Collectors.toMap(
                        j -> j.getTradeDate() + "_" + j.getSymbol().toUpperCase(),
                        TradeJournal::getEmotion,
                        (a, b) -> a  // 같은 날 같은 종목 일기가 여러 개면 첫 번째 사용
                ));

        // 포지션을 감정별로 분류
        Map<String, List<Position>> emotionPositions = new LinkedHashMap<>();
        for (Position p : positions) {
            String key = p.getClosedAt().toLocalDate() + "_" + p.getSymbol().toUpperCase();
            String emotion = dateSymbolEmotion.get(key);
            if (emotion != null) {
                emotionPositions.computeIfAbsent(emotion, k -> new ArrayList<>()).add(p);
            }
        }

        return emotionPositions.entrySet().stream()
                .map(e -> {
                    List<Position> g = e.getValue();
                    int total = g.size();
                    int wins  = (int) g.stream().filter(p -> p.getPnl().compareTo(BigDecimal.ZERO) > 0).count();
                    BigDecimal totalPnl = g.stream().map(Position::getPnl).reduce(BigDecimal.ZERO, BigDecimal::add);
                    return new StatsResponse.EmotionStats(
                            e.getKey(),
                            EMOTION_LABEL.getOrDefault(e.getKey(), e.getKey()),
                            total, wins,
                            round2((double) wins / total * 100),
                            totalPnl.setScale(2, RoundingMode.HALF_UP).toPlainString()
                    );
                })
                .sorted(Comparator.comparingDouble(StatsResponse.EmotionStats::winRate).reversed())
                .toList();
    }

    // [용도] 전략 태그별 성과 계산 / [호출] getStats()
    private List<StatsResponse.TagStats> calcTagStats(List<Position> positions, List<TradeJournal> journals) {
        // date_symbol → journal 매핑
        Map<String, TradeJournal> dateSymbolJournal = journals.stream()
                .filter(j -> j.getSymbol() != null && !j.getSymbol().isBlank()
                          && !j.getJournalStrategyTags().isEmpty())
                .collect(Collectors.toMap(
                        j -> j.getTradeDate() + "_" + j.getSymbol().toUpperCase(),
                        j -> j,
                        (a, b) -> a
                ));

        // 태그ID → (tagInfo, positions)
        Map<Long, String> tagName  = new LinkedHashMap<>();
        Map<Long, String> tagColor = new LinkedHashMap<>();
        Map<Long, List<Position>> tagPositions = new LinkedHashMap<>();

        for (Position p : positions) {
            String key = p.getClosedAt().toLocalDate() + "_" + p.getSymbol().toUpperCase();
            TradeJournal j = dateSymbolJournal.get(key);
            if (j == null) continue;
            j.getJournalStrategyTags().forEach(jst -> {
                Long id = jst.getTag().getId();
                tagName.put(id, jst.getTag().getName());
                tagColor.put(id, jst.getTag().getColor());
                tagPositions.computeIfAbsent(id, k -> new ArrayList<>()).add(p);
            });
        }

        return tagPositions.entrySet().stream()
                .map(e -> {
                    List<Position> g = e.getValue();
                    int total = g.size();
                    int wins  = (int) g.stream().filter(p -> p.getPnl().compareTo(BigDecimal.ZERO) > 0).count();
                    BigDecimal totalPnl = g.stream().map(Position::getPnl).reduce(BigDecimal.ZERO, BigDecimal::add);
                    return new StatsResponse.TagStats(
                            tagName.get(e.getKey()),
                            tagColor.getOrDefault(e.getKey(), "#00d4aa"),
                            total, wins,
                            round2((double) wins / total * 100),
                            totalPnl.setScale(2, RoundingMode.HALF_UP).toPlainString()
                    );
                })
                .sorted(Comparator.comparingDouble(StatsResponse.TagStats::winRate).reversed())
                .toList();
    }

    // ─────────────────────────────────────────────────────────────────
    // 3단계: 시간대별 / 요일별 분석
    // ─────────────────────────────────────────────────────────────────

    // [용도] 시간대별 (0~23시) 성과 집계 / [호출] getStats()
    private List<StatsResponse.HourlyStats> calcHourlyStats(List<Position> positions) {
        Map<Integer, List<Position>> byHour = positions.stream()
                .collect(Collectors.groupingBy(p -> p.getClosedAt().getHour()));

        return IntStream.range(0, 24).mapToObj(h -> {
            List<Position> g = byHour.getOrDefault(h, List.of());
            if (g.isEmpty()) return new StatsResponse.HourlyStats(h, 0, 0, 0, "0");
            int wins = (int) g.stream().filter(p -> p.getPnl().compareTo(BigDecimal.ZERO) > 0).count();
            BigDecimal totalPnl = g.stream().map(Position::getPnl).reduce(BigDecimal.ZERO, BigDecimal::add);
            return new StatsResponse.HourlyStats(h, g.size(), wins,
                    round2((double) wins / g.size() * 100),
                    totalPnl.setScale(2, RoundingMode.HALF_UP).toPlainString());
        }).toList();
    }

    // [용도] 요일별 성과 집계 (월~일) / [호출] getStats()
    private List<StatsResponse.DayOfWeekStats> calcDayOfWeekStats(List<Position> positions) {
        Map<DayOfWeek, List<Position>> byDay = positions.stream()
                .collect(Collectors.groupingBy(p -> p.getClosedAt().getDayOfWeek()));

        return Arrays.stream(DayOfWeek.values()).map(dow -> {
            List<Position> g = byDay.getOrDefault(dow, List.of());
            String name = DAY_NAMES[dow.getValue() - 1]; // MONDAY=1
            if (g.isEmpty()) return new StatsResponse.DayOfWeekStats(name, 0, 0, 0, "0");
            int wins = (int) g.stream().filter(p -> p.getPnl().compareTo(BigDecimal.ZERO) > 0).count();
            BigDecimal totalPnl = g.stream().map(Position::getPnl).reduce(BigDecimal.ZERO, BigDecimal::add);
            return new StatsResponse.DayOfWeekStats(name, g.size(), wins,
                    round2((double) wins / g.size() * 100),
                    totalPnl.setScale(2, RoundingMode.HALF_UP).toPlainString());
        }).toList();
    }

    // ─────────────────────────────────────────────────────────────────
    // 공통 유틸
    // ─────────────────────────────────────────────────────────────────
    private double round2(double v) { return Math.round(v * 100.0) / 100.0; }

    // ─────────────────────────────────────────────────────────────────
    // 응답 DTO
    // ─────────────────────────────────────────────────────────────────
    public record StatsResponse(
            SummaryStats        summary,
            List<MonthlyPnl>    monthlyPnl,
            List<DailyPnl>      dailyPnl,
            List<SymbolStats>   symbolStats,
            SideStats           longStats,
            SideStats           shortStats,
            List<EmotionStats>  emotionStats,
            List<TagStats>      tagStats,
            List<HourlyStats>   hourlyStats,
            List<DayOfWeekStats> dayOfWeekStats
    ) {
        public static StatsResponse empty() {
            return new StatsResponse(
                    new SummaryStats(0,0,0,0,0,0,0,0,0,0,"0","0"),
                    List.of(), List.of(), List.of(),
                    new SideStats("LONG",0,0,0,"0","0"),
                    new SideStats("SHORT",0,0,0,"0","0"),
                    List.of(), List.of(), List.of(), List.of()
            );
        }

        public record SummaryStats(
                int totalPositions, int winCount, int lossCount,
                double winRate, double profitFactor,
                double avgWin, double avgLoss, double rrRatio,
                int maxWinStreak, int maxLossStreak,
                String maxSingleLoss, String totalPnl
        ) {}

        public record MonthlyPnl(String month, String pnl, int winCount, int lossCount) {}

        public record DailyPnl(String date, String pnl, int winCount, int lossCount) {}

        public record SymbolStats(
                String symbol, int totalCount, int winCount,
                double winRate, String totalPnl, String avgPnl
        ) {}

        public record SideStats(
                String side, int totalCount, int winCount,
                double winRate, String totalPnl, String avgPnl
        ) {}

        public record EmotionStats(
                String emotion, String label,
                int totalCount, int winCount,
                double winRate, String totalPnl
        ) {}

        public record TagStats(
                String tagName, String tagColor,
                int totalCount, int winCount,
                double winRate, String totalPnl
        ) {}

        public record HourlyStats(int hour, int totalCount, int winCount, double winRate, String pnl) {}

        public record DayOfWeekStats(
                String dayName, int totalCount, int winCount,
                double winRate, String totalPnl
        ) {}
    }
}
