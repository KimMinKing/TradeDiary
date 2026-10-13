// [파일 용도] 종합 테스트 데이터 생성 서비스 (10명, 다중 거래소, 2개월치)

package com.tradediary.journal.scripts;

import com.tradediary.common.exception.BusinessException;
import com.tradediary.common.exception.ErrorCode;
import com.tradediary.exchange.ExchangeKey;
import com.tradediary.exchange.ExchangeKeyRepository;
import com.tradediary.journal.TradeJournal;
import com.tradediary.journal.TradeJournalRepository;
import com.tradediary.journal.StrategyTag;
import com.tradediary.journal.StrategyTagRepository;
import com.tradediary.position.Position;
import com.tradediary.position.PositionSide;
import com.tradediary.position.PositionRepository;
import com.tradediary.position.PositionService;
import com.tradediary.trade.Trade;
import com.tradediary.trade.TradeRepository;
import com.tradediary.trade.TradeSide;
import com.tradediary.user.User;
import com.tradediary.user.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.*;

@Slf4j
@Service
@RequiredArgsConstructor
public class ComprehensiveTestDataGenerator {

    private final UserRepository userRepository;
    private final TradeRepository tradeRepository;
    private final PositionRepository positionRepository;
    private final TradeJournalRepository journalRepository;
    private final StrategyTagRepository tagRepository;
    private final ExchangeKeyRepository exchangeKeyRepository;
    private final PositionService positionService;

    // [용도] 종합 테스트 데이터 생성 (10명 x 5개 거래소 x 2개월치)
    public String generateComprehensiveTestData() {
        log.info("[ComprehensiveTestDataGenerator] 종합 테스트 데이터 생성 시작");

        try {
            // 1. 기존 데이터 삭제
            deleteAllData();

            // 2. 테스트 유저 10명 생성
            List<User> users = createTestUsers();

            // 3. 각 유저별 데이터 생성
            for (User user : users) {
                log.info("[ComprehensiveTestDataGenerator] 유저 {} 데이터 생성 시작", user.getEmail());
                createUserExchanges(user);
                createUserTrades(user);
                createPositions(user);
                createUserJournals(user);
                createUserStrategyTags(user);
                log.info("[ComprehensiveTestDataGenerator] 유저 {} 데이터 생성 완료", user.getEmail());
            }

            log.info("[ComprehensiveTestDataGenerator] 종합 테스트 데이터 생성 완료 - 총 {}명의 유저", users.size());
            return "종합 테스트 데이터 생성 완료: " + users.size() + "명의 유" +
                    "저 데이터";
        } catch (Exception e) {
            log.error("[ComprehensiveTestDataGenerator] 테스트 데이터 생성 실패", e);
            return "테스트 데이터 생성 실패: " + e.getMessage();
        }
    }

    // [용도] 기존 모든 데이터 삭제
    private void deleteAllData() {
        log.info("[ComprehensiveTestDataGenerator] 기존 데이터 삭제 시작");

        // 참조 무결성 문제로 순서대로 삭제
        journalRepository.deleteAll();
        positionRepository.deleteAll();
        tradeRepository.deleteAll();
        tagRepository.deleteAll();
        exchangeKeyRepository.deleteAll();
        userRepository.deleteAll();

        log.info("[ComprehensiveTestDataGenerator] 기존 데이터 삭제 완료");
    }

    // [용도] 테스트 유저 10명 생성
    private List<User> createTestUsers() {
        log.info("[ComprehensiveTestDataGenerator] 테스트 유저 생성 시작");

        List<User> users = new ArrayList<>();

        // 테스트 유저 정보
        String[] nicknames = {"매수왕", "매도전사", "트레이더김", "코인대마왕", "뚜벅이트레이더",
                            "파이프마스터", "스윙족장", "데이트레이더", "롱전문가", "숏전문가"};

        for (int i = 0; i < 10; i++) {
            String email = "user" + (i + 1) + "@test.com";
            User user = User.builder()
                    .email(email)
                    .password("$2a$10$7JB720yubVSIs2kI3JY8xOjqV9k06nEjBmJ8mr0ZKAn2q1JCVaAfy") // all123
                    .nickname(nicknames[i])
                    .build();

            // diaryPublic 필드는 setter로 설정
            user.updateDiaryPublic(true);
            user.updateTotalAssets(new BigDecimal(10000 + (i * 1000)));

            users.add(userRepository.save(user));
        }

        log.info("[ComprehensiveTestDataGenerator] 테스트 유저 생성 완료 - {}명", users.size());
        return users;
    }

    // [용도] 각 유저별 거래소 키 생성 (5개 거래사 교차)
    private void createUserExchanges(User user) {
        log.info("[ComprehensiveTestDataGenerator] 유저 {} 거래소 키 생성 시작", user.getEmail());

        // 각 유저가 사용할 거래소 5개 선택 (user1: OKX, Bybit, Binance, Upbit, BingX)
        ExchangeKey.Exchange[][] userExchanges = {
            {ExchangeKey.Exchange.OKX, ExchangeKey.Exchange.BYBIT, ExchangeKey.Exchange.BINANCE, ExchangeKey.Exchange.UPBIT, ExchangeKey.Exchange.BINGX},
            {ExchangeKey.Exchange.BYBIT, ExchangeKey.Exchange.BINANCE, ExchangeKey.Exchange.OKX, ExchangeKey.Exchange.BITGET, ExchangeKey.Exchange.UPBIT},
            {ExchangeKey.Exchange.BINANCE, ExchangeKey.Exchange.UPBIT, ExchangeKey.Exchange.OKX, ExchangeKey.Exchange.BYBIT, ExchangeKey.Exchange.BITGET},
            {ExchangeKey.Exchange.UPBIT, ExchangeKey.Exchange.BINGX, ExchangeKey.Exchange.BINANCE, ExchangeKey.Exchange.OKX, ExchangeKey.Exchange.BYBIT},
            {ExchangeKey.Exchange.BITGET, ExchangeKey.Exchange.OKX, ExchangeKey.Exchange.UPBIT, ExchangeKey.Exchange.BINANCE, ExchangeKey.Exchange.BINGX},
            {ExchangeKey.Exchange.BINGX, ExchangeKey.Exchange.BITGET, ExchangeKey.Exchange.BYBIT, ExchangeKey.Exchange.UPBIT, ExchangeKey.Exchange.OKX},
            {ExchangeKey.Exchange.OKX, ExchangeKey.Exchange.BITGET, ExchangeKey.Exchange.BINANCE, ExchangeKey.Exchange.BYBIT, ExchangeKey.Exchange.UPBIT},
            {ExchangeKey.Exchange.BINANCE, ExchangeKey.Exchange.BYBIT, ExchangeKey.Exchange.BINGX, ExchangeKey.Exchange.OKX, ExchangeKey.Exchange.BITGET},
            {ExchangeKey.Exchange.UPBIT, ExchangeKey.Exchange.OKX, ExchangeKey.Exchange.BINANCE, ExchangeKey.Exchange.BITGET, ExchangeKey.Exchange.BYBIT},
            {ExchangeKey.Exchange.BYBIT, ExchangeKey.Exchange.BINGX, ExchangeKey.Exchange.OKX, ExchangeKey.Exchange.UPBIT, ExchangeKey.Exchange.BINANCE}
        };

        for (ExchangeKey.Exchange exchange : userExchanges[user.getId().intValue() - 1]) {
            ExchangeKey exchangeKey = ExchangeKey.builder()
                    .user(user)
                    .exchange(exchange)
                    .apiKey("dummy-encrypted-api-key-" + user.getId() + "-" + exchange.name())
                    .secretKey("dummy-encrypted-secret-key-" + user.getId() + "-" + exchange.name())
                    .passphrase(exchange == ExchangeKey.Exchange.OKX ? "dummy-passphrase" : null)
                    .build();

            exchangeKeyRepository.save(exchangeKey);
        }

        log.info("[ComprehensiveTestDataGenerator] 유저 {} 거래소 키 생성 완료", user.getEmail());
    }

    // [용도] 각 유저별 거래 데이터 생성 (11월~12월, 120건 = 60개 포지션)
    private void createUserTrades(User user) {
        log.info("[ComprehensiveTestDataGenerator] 유저 {} 거래 데이터 생성 시작", user.getEmail());

        // 각 유저별로 5개 거래소 각각 24건 거래 생성
        ExchangeKey.Exchange[][] userExchanges = {
            {ExchangeKey.Exchange.OKX, ExchangeKey.Exchange.BYBIT, ExchangeKey.Exchange.BINANCE, ExchangeKey.Exchange.UPBIT, ExchangeKey.Exchange.BINGX},
            {ExchangeKey.Exchange.BYBIT, ExchangeKey.Exchange.BINANCE, ExchangeKey.Exchange.OKX, ExchangeKey.Exchange.BITGET, ExchangeKey.Exchange.UPBIT},
            {ExchangeKey.Exchange.BINANCE, ExchangeKey.Exchange.UPBIT, ExchangeKey.Exchange.OKX, ExchangeKey.Exchange.BYBIT, ExchangeKey.Exchange.BITGET},
            {ExchangeKey.Exchange.UPBIT, ExchangeKey.Exchange.BINGX, ExchangeKey.Exchange.BINANCE, ExchangeKey.Exchange.OKX, ExchangeKey.Exchange.BYBIT},
            {ExchangeKey.Exchange.BITGET, ExchangeKey.Exchange.OKX, ExchangeKey.Exchange.UPBIT, ExchangeKey.Exchange.BINANCE, ExchangeKey.Exchange.BINGX},
            {ExchangeKey.Exchange.BINGX, ExchangeKey.Exchange.BITGET, ExchangeKey.Exchange.BYBIT, ExchangeKey.Exchange.UPBIT, ExchangeKey.Exchange.OKX},
            {ExchangeKey.Exchange.OKX, ExchangeKey.Exchange.BITGET, ExchangeKey.Exchange.BINANCE, ExchangeKey.Exchange.BYBIT, ExchangeKey.Exchange.UPBIT},
            {ExchangeKey.Exchange.BINANCE, ExchangeKey.Exchange.BYBIT, ExchangeKey.Exchange.BINGX, ExchangeKey.Exchange.OKX, ExchangeKey.Exchange.BITGET},
            {ExchangeKey.Exchange.UPBIT, ExchangeKey.Exchange.OKX, ExchangeKey.Exchange.BINANCE, ExchangeKey.Exchange.BITGET, ExchangeKey.Exchange.BYBIT},
            {ExchangeKey.Exchange.BYBIT, ExchangeKey.Exchange.BINGX, ExchangeKey.Exchange.OKX, ExchangeKey.Exchange.UPBIT, ExchangeKey.Exchange.BINANCE}
        };

        // 심볼별 기준 가격 (2025년 11월 기준)
        Map<String, Double> basePrices = Map.of(
            "BTC-USDT-SWAP", 95000.0,
            "ETH-USDT-SWAP", 3500.0,
            "SOL-USDT", 100.0,
            "DOGE-USDT", 0.15,
            "ADA-USDT", 0.5,
            "AVAX-USDT", 30.0
        );

        // 각 거래소별로 거래 생성
        int tradeCount = 0;
        for (ExchangeKey.Exchange exchange : userExchanges[user.getId().intValue() - 1]) {
            // 각 거래소별로 12개 포지션 생성 (24건)
            for (int i = 0; i < 12; i++) {
                String symbol = basePrices.keySet().toArray()[i % basePrices.size()].toString();
                double basePrice = basePrices.get(symbol);

                // 승률 60% 적용
                boolean isWin = Math.random() > 0.4;

                // 수량 설정
                double buyQty = getQtyBySymbol(symbol);

                // 매수 가격 (월별 변동 추가)
                double buyPrice = basePrice + (i * 100) + (Math.random() * 500);

                // 매도 가격
                double sellPrice = isWin ?
                    buyPrice + 500 + Math.random() * 2000 :
                    buyPrice - 200 + Math.random() * 1000;

                // 거래 시간 (11월~12월 분배)
                LocalDateTime tradeDate = LocalDateTime.of(
                    i < 6 ? 2025 : 2026, // 11월: 0~5, 12월: 6~11
                    i < 6 ? 11 : 12,
                    (i % 30) + 1,
                    9 + (i % 4), // 9~12시
                    30 * (i % 2)
                );

                // 매수
                Trade buyTrade = Trade.builder()
                        .user(user)
                        .exchange(exchange)
                        .exchangeTradeId(exchange.name().toLowerCase() + "-" + user.getId() + "-" + (tradeCount * 2 + 1))
                        .symbol(symbol)
                        .side(TradeSide.BUY)
                        .qty(BigDecimal.valueOf(buyQty))
                        .price(BigDecimal.valueOf(buyPrice))
                        .fee(new BigDecimal(0.5 + Math.random() * 2))
                        .tradedAt(tradeDate)
                        .build();

                tradeRepository.save(buyTrade);
                tradeCount++;

                // 매도 (매수 시간보다 1~3시간 뒤)
                Trade sellTrade = Trade.builder()
                        .user(user)
                        .exchange(exchange)
                        .exchangeTradeId(exchange.name().toLowerCase() + "-" + user.getId() + "-" + (tradeCount * 2))
                        .symbol(symbol)
                        .side(TradeSide.SELL)
                        .qty(BigDecimal.valueOf(buyQty))
                        .price(BigDecimal.valueOf(sellPrice))
                        .fee(new BigDecimal(0.5 + Math.random() * 2))
                        .tradedAt(tradeDate.plusHours(1 + (int)(Math.random() * 3)))
                        .build();

                tradeRepository.save(sellTrade);
                tradeCount++;
            }
        }

        log.info("[ComprehensiveTestDataGenerator] 유저 {} 거래 데이터 생성 완료 - 총 {}건 거래", user.getEmail(), tradeCount);
    }

    // [용도] 포지션 데이터 생성 (trades를 묶어서)
    private void createPositions(User user) {
        log.info("[ComprehensiveTestDataGenerator] 유저 {} 포지션 데이터 생성 시작", user.getEmail());

        // 사용자의 전체 거래 조회
        List<Trade> allTrades = tradeRepository.findByUserIdOrderByTradedAtAsc(user.getId());

        // 심볼별로 거래 그룹핑
        Map<String, List<Trade>> symbolTrades = new HashMap<>();
        for (Trade trade : allTrades) {
            symbolTrades.computeIfAbsent(trade.getSymbol(), k -> new ArrayList<>()).add(trade);
        }

        // 각 심볼별로 포지션 묶기
        for (Map.Entry<String, List<Trade>> entry : symbolTrades.entrySet()) {
            List<Trade> trades = entry.getValue();
            if (trades.size() >= 2) {
                processSymbolTrades(user, trades);
            }
        }

        log.info("[ComprehensiveTestDataGenerator] 유저 {} 포지션 데이터 생성 완료", user.getEmail());
    }

    // [용도] 특정 심볼의 거래들을 포지션으로 묶기
    private void processSymbolTrades(User user, List<Trade> trades) {
        double netPosition = 0.0;
        Position currentPosition = null;

        for (Trade trade : trades) {
            if (trade.getSide() == TradeSide.BUY) {
                netPosition += trade.getQty().doubleValue();

                // 현재 포지션이 없으면 새로 생성
                if (currentPosition == null) {
                    currentPosition = Position.builder()
                            .user(user)
                            .exchange(trade.getExchange())
                            .symbol(trade.getSymbol())
                            .qty(trade.getQty())
                            .entryPrice(trade.getPrice())
                            .side(PositionSide.LONG)
                            .openedAt(trade.getTradedAt())
                            .pnl(BigDecimal.ZERO)
                            .pnlRate(BigDecimal.ZERO)
                            .closedAt(null)
                            .build();
                } else {
                    // 기존 포지션에 수량 추가 (평균 가격 계산)
                    BigDecimal currentQty = currentPosition.getQty();
                    BigDecimal newQty = trade.getQty();
                    BigDecimal currentPrice = currentPosition.getEntryPrice();
                    BigDecimal newPrice = trade.getPrice();
                    BigDecimal avgPrice = currentPrice.multiply(currentQty).add(newPrice.multiply(newQty))
                                                   .divide(currentQty.add(newQty), 6, RoundingMode.HALF_UP);

                    // 새로운 포지션으로 업데이트 (JPA에서는 immutable하게 처리)
                    currentPosition = Position.builder()
                            .user(user)
                            .exchange(currentPosition.getExchange())
                            .symbol(currentPosition.getSymbol())
                            .side(currentPosition.getSide())
                            .qty(currentQty.add(newQty))
                            .entryPrice(avgPrice)
                            .exitPrice(null)
                            .pnl(BigDecimal.ZERO)
                            .pnlRate(BigDecimal.ZERO)
                            .openedAt(currentPosition.getOpenedAt())
                            .closedAt(null)
                            .build();
                }

            } else if (trade.getSide() == TradeSide.SELL) {
                netPosition -= trade.getQty().doubleValue();

                if (currentPosition != null) {
                    // 청산 가능한 수량 계산
                    BigDecimal closeQty = trade.getQty().min(currentPosition.getQty());
                    BigDecimal tradeQty = trade.getQty();

                    // P&L 계산
                    BigDecimal pnl = closeQty.multiply(trade.getPrice())
                                    .subtract(closeQty.multiply(currentPosition.getEntryPrice()))
                                    .subtract(trade.getFee());

                    // 포지션 종료
                    Position closedPosition = Position.builder()
                            .user(user)
                            .exchange(currentPosition.getExchange())
                            .symbol(currentPosition.getSymbol())
                            .side(currentPosition.getSide())
                            .entryPrice(currentPosition.getEntryPrice())
                            .exitPrice(trade.getPrice())
                            .qty(closeQty)
                            .pnl(pnl)
                            .pnlRate(pnl.divide(currentPosition.getEntryPrice(), 6, RoundingMode.HALF_UP)
                                    .multiply(BigDecimal.valueOf(100)))
                            .openedAt(currentPosition.getOpenedAt())
                            .closedAt(trade.getTradedAt())
                            .build();

                    positionRepository.save(closedPosition);

                    // 남은 수량이 있으면 포지션 유지
                    BigDecimal remainingQty = currentPosition.getQty().subtract(closeQty);
                    if (remainingQty.compareTo(BigDecimal.valueOf(0.000001)) > 0) {
                        // 남은 수량으로 새로운 포지션 생성
                        currentPosition = Position.builder()
                                .user(user)
                                .exchange(currentPosition.getExchange())
                                .symbol(currentPosition.getSymbol())
                                .side(currentPosition.getSide())
                                .qty(remainingQty)
                                .entryPrice(currentPosition.getEntryPrice())
                                .exitPrice(null)
                                .pnl(BigDecimal.ZERO)
                                .pnlRate(BigDecimal.ZERO)
                                .openedAt(currentPosition.getOpenedAt())
                                .closedAt(null)
                                .build();
                    } else {
                        currentPosition = null;
                    }
                }
            }

            // 포지션이 0에 가까우면 종료
            if (Math.abs(netPosition) < 0.000001 && currentPosition != null) {
                currentPosition = null;
            }
        }

        // 마지막에 남은 포지션은 청산 처리
        if (currentPosition != null) {
            Position closedPosition = Position.builder()
                    .user(user)
                    .exchange(currentPosition.getExchange())
                    .symbol(currentPosition.getSymbol())
                    .side(currentPosition.getSide())
                    .entryPrice(currentPosition.getEntryPrice())
                    .exitPrice(currentPosition.getEntryPrice()) // 마감가 = 진입가
                    .qty(currentPosition.getQty())
                    .pnl(BigDecimal.ZERO)
                    .pnlRate(BigDecimal.ZERO)
                    .openedAt(currentPosition.getOpenedAt())
                    .closedAt(LocalDateTime.now())
                    .build();

            positionRepository.save(closedPosition);
        }
    }

    // [용도] 각 유저별 일기 데이터 생성 (11월~12월, 60개)
    private void createUserJournals(User user) {
        log.info("[ComprehensiveTestDataGenerator] 유저 {} 일기 데이터 생성 시작", user.getEmail());

        // 일기 템플릿
        String[] entryReasons = {
                "추세추종 전략으로 진입",
                "지지선에서 반등 기대",
                "브레이크아웃 패턴 확인",
                "거래량 급증 확인",
                "RSI 과매도 구간 진입",
                "펀딩레이트 이익 실현",
                "알트코인 연동 상승 기대",
                "선물 만기일 근접",
                "피벗 지점에서 진입",
                "볼린저 밴드 하단 매수"
        };

        String[] exitReasons = {
                "목표가 도달 후 익절",
                "손절가 터치",
                "시장 전환 청산",
                "이익 실현",
                "물타기 실패",
                "뉴스 악재 청산",
                "오버트레이딩 중지",
                "기술적 지지선 이탈",
                "상승 모멘턴 약화",
                "익절 라인 도달"
        };

        String[] emotions = {"CALM", "CONFIDENT", "GREEDY", "FEARFUL", "ANXIOUS"};
        String[] memos = {
                "차트 패턴이 깔끔하게 나왔다",
                "계획대로 실행했음",
                "다음엔 더 빨리 손절해야지",
                "감정 관리 잘 됨",
                "시장을 너무 예측하려고 했다",
                "분할 매수 전략 효과 좋았음",
                "레버리지 조절이 필요함",
                "체크리스트 확인이 도움이 됨",
                "빠른 청산이 오히려 좋았다",
                "시간차 매매가 성공했다"
        };

        // 11월~12월 데이터 생성 (하루 1개 일기)
        LocalDate currentDate = LocalDate.of(2025, 11, 1);
        int journalCount = 0;

        for (int day = 0; day < 61; day++) { // 11월(30) + 12월(31) = 61일
            // 이 날의 거래 목록
            List<Trade> dayTrades = tradeRepository.findByUserIdAndTradedAtBetween(
                    user.getId(),
                    currentDate.atStartOfDay(),
                    currentDate.atTime(23, 59, 59)
            );

            // 이 날의 포지션 목록
            List<Position> dayPositions = positionRepository.findByUserIdAndClosedAtBetween(
                    user.getId(),
                    currentDate.atStartOfDay(),
                    currentDate.atTime(23, 59, 59)
            );

            // 일기 생성 (거래 또는 포지션이 있을 때만)
            if (!dayTrades.isEmpty() || !dayPositions.isEmpty()) {
                // 무작위로 거래 또는 포지션 선택
                Trade trade = dayTrades.isEmpty() ? null : dayTrades.get((int)(Math.random() * dayTrades.size()));
                Position position = dayPositions.isEmpty() ? null : dayPositions.get((int)(Math.random() * dayPositions.size()));

                String symbol = trade != null ? trade.getSymbol() : (position != null ? position.getSymbol() : "BTC-USDT");
                ExchangeKey.Exchange exchange = trade != null ? trade.getExchange() : (position != null ? position.getExchange() : ExchangeKey.Exchange.OKX);

                TradeJournal journal = TradeJournal.builder()
                        .user(user)
                        .exchange(exchange)
                        .tradeDate(currentDate)
                        .symbol(symbol)
                        .entryReason(entryReasons[(int)(Math.random() * entryReasons.length)])
                        .exitReason(exitReasons[(int)(Math.random() * exitReasons.length)])
                        .emotion(emotions[(int)(Math.random() * emotions.length)])
                        .memo(memos[(int)(Math.random() * memos.length)])
                        .build();

                journalRepository.save(journal);
                journalCount++;
            }

            currentDate = currentDate.plusDays(1);
        }

        log.info("[ComprehensiveTestDataGenerator] 유저 {} 일기 데이터 생성 완료 - 총 {}개 일기",
                user.getEmail(), journalCount);
    }

    // [용도] 각 유저별 전략 태그 생성
    private void createUserStrategyTags(User user) {
        log.info("[ComprehensiveTestDataGenerator] 유저 {} 전략 태그 생성 시작", user.getEmail());

        String[] tagNames = {"추세추종", "역추세", "브레이크아웃", "단타", "스윙", "스캘핑", "알트코인", "선물", "투자", "거래량"};
        String[] tagColors = {"#00d4aa", "#ff6b6b", "#4ecdc4", "#ffe66d", "#a78bfa", "#fb923c", "#34d399", "#f87171", "#60a5fa", "#fbbf24"};

        for (int i = 0; i < tagNames.length; i++) {
            StrategyTag tag = StrategyTag.builder()
                    .user(user)
                    .name(tagNames[i])
                    .color(tagColors[i])
                    .build();

            tagRepository.save(tag);
        }

        log.info("[ComprehensiveTestDataGenerator] 유저 {} 전략 태그 생성 완료 - {}개 태그", user.getEmail(), tagNames.length);
    }

    // [용도] 심볼별 랜덤 수량 생성
    private double getQtyBySymbol(String symbol) {
        switch (symbol) {
            case "BTC-USDT-SWAP":
                return 0.01 + Math.random() * 0.05;
            case "ETH-USDT-SWAP":
                return 1 + Math.random() * 3;
            case "SOL-USDT":
                return 20 + Math.random() * 50;
            case "DOGE-USDT":
                return 10000 + Math.random() * 20000;
            case "ADA-USDT":
                return 5000 + Math.random() * 10000;
            case "AVAX-USDT":
                return 100 + Math.random() * 200;
            default:
                return 1;
        }
    }
}
