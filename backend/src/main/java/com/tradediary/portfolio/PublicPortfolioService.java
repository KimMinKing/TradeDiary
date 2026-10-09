package com.tradediary.portfolio;

import com.tradediary.common.exception.BusinessException;
import com.tradediary.common.exception.ErrorCode;
import com.tradediary.common.service.PnlCalculationService;
import com.tradediary.position.Position;
import com.tradediary.position.PositionRepository;
import com.tradediary.user.User;
import com.tradediary.user.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class PublicPortfolioService {
    private final UserRepository userRepository;
    private final PositionRepository positionRepository;
    private final PnlCalculationService pnlCalculationService;

    @Transactional(readOnly = true)
    public PortfolioResponse get(Long userId, String requestedPeriod) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.PRIVATE_RESOURCE_NOT_FOUND));
        if (!Boolean.TRUE.equals(user.getProfilePublic()) || !Boolean.TRUE.equals(user.getStatsPublic())
                || !Boolean.TRUE.equals(user.getPositionsPublic())) {
            throw new BusinessException(ErrorCode.PRIVATE_RESOURCE_NOT_FOUND);
        }

        Period period = Period.parse(requestedPeriod);
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime from = period.from(now);
        List<Position> positions = from == null
                ? positionRepository.findByUserIdOrderByClosedAtDesc(userId)
                : positionRepository.findByUserIdAndClosedAtBetween(userId, from, now.plusNanos(1));
        positions = positions.stream().sorted(Comparator.comparing(Position::getClosedAt)).toList();

        BigDecimal rate = pnlCalculationService.getKrwPerUsdt();
        BigDecimal realizedPnl = pnlCalculationService.sumKrw(positions);
        BigDecimal investedCapital = positions.stream()
                .map(p -> pnlCalculationService.amountToKrw(p, p.getEntryPrice().multiply(p.getQty()).abs()))
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal capitalReturn = percent(realizedPnl, investedCapital);

        int wins = (int) positions.stream().filter(p -> p.getPnl().signum() > 0).count();
        BigDecimal running = BigDecimal.ZERO;
        BigDecimal peak = BigDecimal.ZERO;
        BigDecimal maxDrawdown = BigDecimal.ZERO;
        Map<LocalDate, BigDecimal> daily = new LinkedHashMap<>();
        long totalHoldingSeconds = 0;
        for (Position position : positions) {
            BigDecimal pnl = pnlCalculationService.toKrw(position);
            running = running.add(pnl);
            peak = peak.max(running);
            maxDrawdown = maxDrawdown.max(peak.subtract(running));
            daily.merge(position.getClosedAt().toLocalDate(), pnl, BigDecimal::add);
            totalHoldingSeconds += Math.max(0, Duration.between(position.getOpenedAt(), position.getClosedAt()).toSeconds());
        }

        BigDecimal currentAssetsUsd = user.getTotalAssets();
        BigDecimal currentAssetsKrw = currentAssetsUsd == null ? null : currentAssetsUsd.multiply(rate);
        BigDecimal drawdownPct = percent(maxDrawdown, investedCapital);
        double elapsedDays = positions.size() < 2 ? 1.0
                : Math.max(1.0, Duration.between(positions.get(0).getClosedAt(), positions.get(positions.size() - 1).getClosedAt()).toHours() / 24.0);
        double tradesPer30Days = round2(positions.size() / elapsedDays * 30.0);
        double averageHoldingHours = positions.isEmpty() ? 0 : round2(totalHoldingSeconds / 3600.0 / positions.size());

        List<DailyPerformance> curve = new ArrayList<>();
        BigDecimal cumulative = BigDecimal.ZERO;
        for (Map.Entry<LocalDate, BigDecimal> entry : daily.entrySet()) {
            cumulative = cumulative.add(entry.getValue());
            curve.add(new DailyPerformance(entry.getKey().toString(), money(entry.getValue()), money(cumulative)));
        }

        LocalDateTime monthStart = YearMonth.now().atDay(1).atStartOfDay();
        LocalDateTime monthEnd = YearMonth.now().plusMonths(1).atDay(1).atStartOfDay();
        BigDecimal monthPnl = pnlCalculationService.sumKrw(
                positionRepository.findByUserIdAndClosedAtBetween(userId, monthStart, monthEnd));

        List<PositionResult> recent = positions.stream().sorted(Comparator.comparing(Position::getClosedAt).reversed())
                .limit(10).map(p -> new PositionResult(p.getExchange().name(), p.getSymbol(), p.getSide().name(),
                        p.getClosedAt().toString(), p.getPnlRate().setScale(2, RoundingMode.HALF_UP).toPlainString(),
                        money(pnlCalculationService.toKrw(p)))).toList();

        return new PortfolioResponse(
                period.apiValue, from == null ? null : from.toString(), now.toString(), "KRW", rate.toPlainString(),
                nullableMoney(currentAssetsUsd), nullableMoney(currentAssetsKrw), money(realizedPnl), money(monthPnl),
                money(investedCapital), capitalReturn.toPlainString(), money(maxDrawdown), drawdownPct.toPlainString(),
                positions.size(), wins, positions.isEmpty() ? 0 : round2(wins * 100.0 / positions.size()),
                averageHoldingHours, tradesPer30Days, risk(drawdownPct),
                new CashFlowStatus(false, null, null, null, "Balance history and deposits/withdrawals are not collected yet."),
                curve, recent
        );
    }

    private BigDecimal percent(BigDecimal numerator, BigDecimal denominator) {
        return denominator.signum() == 0 ? BigDecimal.ZERO
                : numerator.divide(denominator, 8, RoundingMode.HALF_UP).multiply(BigDecimal.valueOf(100)).setScale(2, RoundingMode.HALF_UP);
    }
    private String risk(BigDecimal drawdownPct) {
        if (drawdownPct.compareTo(BigDecimal.valueOf(10)) >= 0) return "HIGH";
        if (drawdownPct.compareTo(BigDecimal.valueOf(5)) >= 0) return "MEDIUM";
        return "LOW";
    }
    private String money(BigDecimal value) { return value.setScale(2, RoundingMode.HALF_UP).toPlainString(); }
    private String nullableMoney(BigDecimal value) { return value == null ? null : money(value); }
    private double round2(double value) { return Math.round(value * 100.0) / 100.0; }

    enum Period {
        D1("1d", 1), D7("7d", 7), D30("30d", 30), ALL("all", null);
        final String apiValue; final Integer days;
        Period(String apiValue, Integer days) { this.apiValue = apiValue; this.days = days; }
        LocalDateTime from(LocalDateTime now) { return days == null ? null : now.minusDays(days); }
        static Period parse(String value) {
            String normalized = value == null ? "all" : value.trim().toLowerCase();
            for (Period period : values()) if (period.apiValue.equals(normalized)) return period;
            throw new IllegalArgumentException("period must be one of 1d, 7d, 30d, all");
        }
    }

    public record PortfolioResponse(String period, String periodStart, String periodEnd, String baseCurrency,
                                    String krwPerUsdt, String currentAssetsUsd, String currentAssetsKrw,
                                    String realizedTradingPnl, String currentMonthPnl, String investedCapital,
                                    String capitalWeightedReturnPct, String maximumDrawdown, String maximumDrawdownPct,
                                    int tradeCount, int winCount, double winRate, double averageHoldingHours,
                                    double tradesPer30Days, String riskLevel, CashFlowStatus cashFlow,
                                    List<DailyPerformance> dailyPerformance, List<PositionResult> recentPositions) {}
    public record CashFlowStatus(boolean tracked, String deposits, String withdrawals, String timeWeightedReturnPct, String notice) {}
    public record DailyPerformance(String date, String dailyPnl, String cumulativePnl) {}
    public record PositionResult(String exchange, String symbol, String side, String closedAt,
                                 String pnlRate, String realizedPnl) {}
}
