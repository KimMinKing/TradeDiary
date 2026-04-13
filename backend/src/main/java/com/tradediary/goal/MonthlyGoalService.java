// [파일 용도] 월별 거래 목표 설정 및 달성률 계산 서비스

package com.tradediary.goal;

import com.tradediary.position.Position;
import com.tradediary.position.PositionRepository;
import com.tradediary.user.User;
import com.tradediary.user.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.util.List;

// [클래스] 이번 달 목표 저장/조회 + 현재 진행 상황 계산
@Service
@RequiredArgsConstructor
public class MonthlyGoalService {

    private final MonthlyGoalRepository goalRepository;
    private final PositionRepository    positionRepository;
    private final UserRepository        userRepository;

    private static final DateTimeFormatter YM_FMT = DateTimeFormatter.ofPattern("yyyy-MM");

    // [용도] 이번 달 목표 + 현재 진행 상황 조회 / [호출] MonthlyGoalController.getGoal()
    @Transactional(readOnly = true)
    public MonthlyGoalResponse getGoal(Long userId) {
        String ym = YearMonth.now().format(YM_FMT);
        MonthlyGoal goal = goalRepository.findByUserIdAndYearMonth(userId, ym).orElse(null);

        // 이번 달 포지션 집계
        YearMonth thisYM = YearMonth.now();
        List<Position> thisMonth = positionRepository.findByUserIdOrderByClosedAtDesc(userId)
                .stream().filter(p -> YearMonth.from(p.getClosedAt()).equals(thisYM)).toList();

        int currentTradeCount = thisMonth.size();
        double currentWinRate = 0.0;
        String currentPnl = "0";

        if (!thisMonth.isEmpty()) {
            int wins = (int) thisMonth.stream()
                    .filter(p -> p.getPnl().compareTo(BigDecimal.ZERO) > 0).count();
            currentWinRate = Math.round((double) wins / thisMonth.size() * 10000.0) / 100.0;
            BigDecimal totalPnl = thisMonth.stream().map(Position::getPnl)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
            currentPnl = totalPnl.setScale(2, RoundingMode.HALF_UP).toPlainString();
        }

        return new MonthlyGoalResponse(
                ym,
                goal != null ? goal.getTargetWinRate() : null,
                goal != null ? goal.getTargetPnl() : null,
                goal != null ? goal.getTargetTradeCount() : null,
                currentWinRate,
                currentPnl,
                currentTradeCount
        );
    }

    // [용도] 이번 달 목표 저장 또는 수정 / [호출] MonthlyGoalController.saveGoal()
    @Transactional
    public MonthlyGoalResponse saveGoal(Long userId, MonthlyGoalRequest request) {
        String ym = YearMonth.now().format(YM_FMT);
        User user = userRepository.findById(userId).orElseThrow();

        MonthlyGoal goal = goalRepository.findByUserIdAndYearMonth(userId, ym)
                .orElseGet(() -> goalRepository.save(
                        MonthlyGoal.builder()
                                .user(user)
                                .yearMonth(ym)
                                .targetWinRate(request.targetWinRate())
                                .targetPnl(request.targetPnl())
                                .targetTradeCount(request.targetTradeCount())
                                .build()
                ));

        goal.update(request.targetWinRate(), request.targetPnl(), request.targetTradeCount());

        return getGoal(userId);
    }

    // [용도] 목표 요청 DTO / [호출] MonthlyGoalController
    public record MonthlyGoalRequest(
            BigDecimal targetWinRate,
            BigDecimal targetPnl,
            Integer targetTradeCount
    ) {}
}
