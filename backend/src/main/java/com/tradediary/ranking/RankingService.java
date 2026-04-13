// [파일 용도] 월별 트레이더 수익률 랭킹 계산 서비스

package com.tradediary.ranking;

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
import java.util.*;
import java.util.stream.Collectors;

// [클래스] 이번 달 포지션 기준 전체 사용자 승률 랭킹 계산
@Service
@RequiredArgsConstructor
public class RankingService {

    private final PositionRepository positionRepository;
    private final UserRepository     userRepository;

    private static final int MIN_TRADES = 5;  // 랭킹 집계 최소 거래 수

    // [용도] 이번 달 승률 기준 전체 랭킹 조회 / [호출] RankingController.getRanking()
    @Transactional(readOnly = true)
    public RankingResponse getRanking(Long myUserId) {
        YearMonth thisYM = YearMonth.now();
        String ymStr = thisYM.format(DateTimeFormatter.ofPattern("yyyy-MM"));

        // 모든 포지션 중 이번 달 포지션 필터링 후 userId별 그룹화
        Map<Long, List<Position>> byUser = positionRepository.findAll().stream()
                .filter(p -> YearMonth.from(p.getClosedAt()).equals(thisYM))
                .collect(Collectors.groupingBy(p -> p.getUser().getId()));

        // 사용자 ID → 닉네임 매핑
        Map<Long, String> nicknameMap = userRepository.findAll().stream()
                .collect(Collectors.toMap(User::getId, User::getNickname));

        // 유저별 집계 후 승률 내림차순 정렬
        List<UserStats> ranked = byUser.entrySet().stream()
                .filter(e -> e.getValue().size() >= MIN_TRADES)
                .map(e -> calcStats(e.getKey(), e.getValue(), nicknameMap))
                .sorted(Comparator.comparingDouble(UserStats::winRate).reversed()
                        .thenComparing(Comparator.comparingDouble(UserStats::totalPnlValue).reversed()))
                .toList();

        // 랭킹 번호 부여 + RankEntry 변환
        List<RankingResponse.RankEntry> entries = new ArrayList<>();
        for (int i = 0; i < ranked.size(); i++) {
            UserStats s = ranked.get(i);
            entries.add(new RankingResponse.RankEntry(
                    i + 1,
                    s.userId().equals(myUserId) ? s.nickname() : maskNickname(s.nickname()),
                    s.tradeCount(),
                    s.winRate(),
                    s.totalPnl(),
                    s.userId().equals(myUserId)
            ));
        }

        // 내 랭킹 계산
        RankingResponse.MyRank myRank = calcMyRank(myUserId, byUser, ranked, nicknameMap);

        return new RankingResponse(ymStr, entries, myRank);
    }

    // [용도] 사용자 한 명의 통계 계산 / [호출] getRanking()
    private UserStats calcStats(Long userId, List<Position> positions, Map<Long, String> nicknameMap) {
        int wins = (int) positions.stream()
                .filter(p -> p.getPnl().compareTo(BigDecimal.ZERO) > 0).count();
        double winRate = Math.round((double) wins / positions.size() * 10000.0) / 100.0;
        BigDecimal totalPnl = positions.stream().map(Position::getPnl)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        return new UserStats(
                userId,
                nicknameMap.getOrDefault(userId, "알 수 없음"),
                positions.size(),
                winRate,
                totalPnl.setScale(2, RoundingMode.HALF_UP).toPlainString(),
                totalPnl.doubleValue()
        );
    }

    // [용도] 내 랭킹 정보 계산 (집계 기준 미달 처리 포함) / [호출] getRanking()
    private RankingResponse.MyRank calcMyRank(Long myUserId, Map<Long, List<Position>> byUser,
                                               List<UserStats> ranked, Map<Long, String> nicknameMap) {
        List<Position> myPositions = byUser.getOrDefault(myUserId, List.of());

        int myCount = myPositions.size();
        double myWinRate = 0.0;
        String myPnl = "0";

        if (!myPositions.isEmpty()) {
            int wins = (int) myPositions.stream()
                    .filter(p -> p.getPnl().compareTo(BigDecimal.ZERO) > 0).count();
            myWinRate = Math.round((double) wins / myPositions.size() * 10000.0) / 100.0;
            BigDecimal totalPnl = myPositions.stream().map(Position::getPnl)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
            myPnl = totalPnl.setScale(2, RoundingMode.HALF_UP).toPlainString();
        }

        if (myCount < MIN_TRADES) {
            return new RankingResponse.MyRank(
                    null, myCount, myWinRate, myPnl,
                    String.format("랭킹 집계는 이번 달 %d건 이상 필요합니다 (현재 %d건)", MIN_TRADES, myCount)
            );
        }

        int myRankIdx = -1;
        for (int i = 0; i < ranked.size(); i++) {
            if (ranked.get(i).userId().equals(myUserId)) {
                myRankIdx = i + 1;
                break;
            }
        }

        return new RankingResponse.MyRank(myRankIdx == -1 ? null : myRankIdx,
                myCount, myWinRate, myPnl, null);
    }

    // [용도] 다른 사용자 닉네임 마스킹 (첫 글자 + ***) / [호출] getRanking()
    private String maskNickname(String nickname) {
        if (nickname == null || nickname.isEmpty()) return "***";
        return nickname.charAt(0) + "***";
    }

    // [용도] 내부 집계용 사용자 통계 레코드 / [호출] getRanking(), calcStats()
    private record UserStats(
            Long userId, String nickname, int tradeCount,
            double winRate, String totalPnl, double totalPnlValue
    ) {}
}
