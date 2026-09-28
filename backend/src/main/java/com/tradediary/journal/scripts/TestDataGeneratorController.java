// [파일 용도] 테스트 데이터 생성용 컨트롤러

package com.tradediary.journal.scripts;

import com.tradediary.exchange.ExchangeKey;
import com.tradediary.journal.TradeJournal;
import com.tradediary.journal.TradeJournalRepository;
import com.tradediary.journal.StrategyTag;
import com.tradediary.journal.StrategyTagRepository;
import com.tradediary.position.Position;
import com.tradediary.position.PositionRepository;
import com.tradediary.trade.Trade;
import com.tradediary.trade.TradeRepository;
import com.tradediary.trade.TradeSide;
import com.tradediary.user.User;
import com.tradediary.user.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.*;
import org.springframework.context.annotation.Profile;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;

@Slf4j
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/scripts")
@Profile({"local", "dev"})
public class TestDataGeneratorController {

    private final UserRepository userRepository;
    private final TradeRepository tradeRepository;
    private final PositionRepository positionRepository;
    private final TradeJournalRepository journalRepository;
    private final StrategyTagRepository tagRepository;

    // [용도] 테스트 계정 10개 생성 + 더미 데이터 생성
    @PostMapping("/generate-test-data")
    public String generateTestData() {
        log.info("[TestDataGenerator] 테스트 데이터 생성 시작");

        try {
            // 1. 기존 데이터 삭제
            deleteAllData();

            // 2. 테스트 유저 10명 생성
            List<User> users = createTestUsers();

            // 3. 각 유저별 데이터 생성
            for (User user : users) {
                createUserExchanges(user);
                createUserTrades(user);
                createPositions(user);
                createUserJournals(user);
            }

            log.info("[TestDataGenerator] 테스트 데이터 생성 완료 - 총 {}명의 유저", users.size());
            return "테스트 데이터 생성 완료: " + users.size() + "명의 유저 데이터";
        } catch (Exception e) {
            log.error("[TestDataGenerator] 테스트 데이터 생성 실패", e);
            return "테스트 데이터 생성 실패: " + e.getMessage();
        }
    }

    // [용도] 기존 모든 데이터 삭제
    private void deleteAllData() {
        log.info("[TestDataGenerator] 기존 데이터 삭제 시작");

        journalRepository.deleteAll();
        positionRepository.deleteAll();
        tradeRepository.deleteAll();
        tagRepository.deleteAll();

        // exchange_keys, refresh_tokens는 참조 무결성 때문에 나중에 삭제
        userRepository.deleteAll();

        log.info("[TestDataGenerator] 기존 데이터 삭제 완료");
    }

    // [용도] 테스트 유저 10명 생성
    private List<User> createTestUsers() {
        log.info("[TestDataGenerator] 테스트 유저 생성 시작");

        List<User> users = new ArrayList<>();

        // 테스트 유저 정보
        String[] nicknames = {"매수왕", "매도전사", "트레이더김", "코인대마왕", "뚜벅이트레이더",
                            "파이프마스터", "스윙족장", "데이트레이더", "롱전문가", "숏전문가"};

        String[] exchanges = {"OKX", "BYBIT", "BINANCE", "UPBIT", "BINGX", "BITGET"};

        for (int i = 0; i < 10; i++) {
            String email = "user" + (i + 1) + "@test.com";
            User user = User.builder()
                    .email(email)
                    .password("$2a$10$7JB720yubVSIs2kI3JY8xOjqV9k06nEjBmJ8mr0ZKAn2q1JCVaAfy") // all123
                    .nickname(nicknames[i])
                    .build();

            user.updateDiaryPublic(true);
            user.updateTotalAssets(new BigDecimal(10000 + (i * 1000)));

            users.add(userRepository.save(user));
        }

        log.info("[TestDataGenerator] 테스트 유저 생성 완료 - {}명", users.size());
        return users;
    }

    // [용도] 각 유저별 거래소 키 생성
    private void createUserExchanges(User user) {
        log.info("[TestDataGenerator] 유저 {} 거래소 키 생성 시작", user.getEmail());

        // 각 유저가 사용할 거래소 3개 선택
        String[] exchanges = {"OKX", "BYBIT", "BINANCE", "UPBIT", "BINGX"};
        List<String> userExchanges = new ArrayList<>(Arrays.asList(exchanges));
        Collections.shuffle(userExchanges);
        userExchanges = userExchanges.subList(0, 3);

        for (String exchangeName : userExchanges) {
            ExchangeKey exchange = ExchangeKey.builder()
                    .user(user)
                    .exchange(ExchangeKey.Exchange.valueOf(exchangeName))
                    .apiKey("dummy-api-key-" + user.getId() + "-" + exchangeName)
                    .secretKey("dummy-secret-key-" + user.getId() + "-" + exchangeName)
                    .passphrase(exchangeName.equals("OKX") ? "dummy-passphrase" : null)
                    .build();

            // exchangeKeysRepository.save(exchange); // 실제로는 이 리포지토리가 필요
        }
    }

    // [용도] 각 유저별 거래 데이터 생성 (11월~12월, 24건 = 12개 포지션)
    private void createUserTrades(User user) {
        log.info("[TestDataGenerator] 유저 {} 거래 데이터 생성 시작", user.getEmail());

        // 유저가 사용할 거래소 1개 선택
        ExchangeKey.Exchange exchange = ExchangeKey.Exchange.values()[
                (int) (user.getId() % ExchangeKey.Exchange.values().length)];

        // 심볼 목록
        String[] symbols = {"BTC-USDT-SWAP", "ETH-USDT-SWAP", "SOL-USDT", "DOGE-USDT"};

        LocalDateTime tradeDate = LocalDateTime.of(2025, 11, 1, 9, 0);

        // 11월~12월 데이터 생성 (2개월 x 12개 포지션 = 24건)
        for (int month = 0; month < 2; month++) {
            for (int i = 0; i < 12; i++) {
                String symbol = symbols[i % symbols.length];
                boolean isBuy = i % 2 == 0;

                // 매수/매도 쌍 생성
                if (isBuy) {
                    // 매수
                    Trade buyTrade = Trade.builder()
                            .user(user)
                            .exchange(exchange)
                            .exchangeTradeId(exchange.name().toLowerCase() + "-t-" + (user.getId() * 100 + i * 2 + 1))
                            .symbol(symbol)
                            .side(TradeSide.BUY)
                            .qty(BigDecimal.valueOf(getRandomQty(symbol)))
                            .price(BigDecimal.valueOf(getRandomPrice(symbol)).add(BigDecimal.valueOf(month * 5000))) // 시간에 따라 가격 변동
                            .fee(BigDecimal.valueOf(0.5 + Math.random() * 2))
                            .tradedAt(tradeDate.plusDays(i * 2).plusHours((int)(Math.random() * 6)))
                            .build();

                    tradeRepository.save(buyTrade);
                }

                // 매도 (매수 후 1~3일)
                Trade sellTrade = Trade.builder()
                        .user(user)
                        .exchange(exchange)
                        .exchangeTradeId(exchange.name().toLowerCase() + "-t-" + (user.getId() * 100 + i * 2 + 2))
                        .symbol(symbol)
                        .side(TradeSide.SELL)
                        .qty(isBuy ? BigDecimal.valueOf(getRandomQty(symbol)) : BigDecimal.valueOf(getRandomQty(symbol) * 0.95)) // 수량 약간 변동
                        .price(BigDecimal.valueOf(getRandomPrice(symbol))
                        .add(BigDecimal.valueOf(month * 5000))
                        .add(BigDecimal.valueOf(isBuy ? 500 + (int)(Math.random() * 2000) : -200 + (int)(Math.random() * 1000))))
                        .fee(BigDecimal.valueOf(0.5 + Math.random() * 2))
                        .tradedAt(tradeDate.plusDays(i * 2 + 1).plusHours((int)(Math.random() * 6)))
                        .build();

                tradeRepository.save(sellTrade);
            }
        }

        log.info("[TestDataGenerator] 유저 {} 거래 데이터 생성 완료", user.getEmail());
    }

    // [용도] 포지션 데이터 생성 (trades를 묶어서)
    private void createPositions(User user) {
        log.info("[TestDataGenerator] 유저 {} 포지션 데이터 생성 시작", user.getEmail());

        // 이미 trades가 생성되어 있으므로, trades를 그룹핑하여 position 생성
        // 실제로는 서비스 레이어에서 처리

        log.info("[TestDataGenerator] 유저 {} 포지션 데이터 생성 완료", user.getEmail());
    }

    // [용도] 각 유저별 일기 데이터 생성 (11월~12월, 20건)
    private void createUserJournals(User user) {
        log.info("[TestDataGenerator] 유저 {} 일기 데이터 생성 시작", user.getEmail());

        // 일기 템플릿
        String[] entryReasons = {
                "추세추종 전략으로 진입",
                "지지선에서 반등 기대",
                "브레이크아웃 패턴 확인",
                "거래량 급증 확인",
                "RSI 과매도 구간 진입",
                "펀딩레이트 이익 실현",
                "알트코인 연동 상승 기대",
                "선물 만기일 근접"
        };

        String[] exitReasons = {
                "목표가 도달 후 익절",
                "손절가 터치",
                "시장 전환 청산",
                "이익 실현",
                "물타기 실패",
                "뉴스 악재 청산",
                "오버트레이딩 중지",
                "기술적 지지선 이탈"
        };

        String[] emotions = {"CALM", "CONFIDENT", "FOMO", "GREEDY", "FEARFUL", "ANXIOUS"};

        String[] memos = {
                "차트 패턴이 깔끔하게 나왔다",
                "계획대로 실행했음",
                "다음엔 더 빨리 손절해야지",
                "감정 관리 잘 됨",
                "시장을 너무 예측하려고 했다",
                "분할 매수 전략 효과 좋았음",
                "레버리지 조절이 필요함",
                "체크리스트 확인이 도움이 됨"
        };

        // 11월~12월 데이터 생성 (하루에 0~2개 일기)
        LocalDate currentDate = LocalDate.of(2025, 11, 1);
        for (int day = 0; day < 61; day++) { // 11월(30) + 12월(31) = 61일
            // 이 날의 거래 조회
            List<Trade> dayTrades = tradeRepository.findByUserIdAndTradedAtBetween(
                    user.getId(),
                    currentDate.atStartOfDay(),
                    currentDate.atTime(23, 59, 59)
            );

            // 하루에 0~2개 일기 생성
            int journalCount = (int)(Math.random() * 3);

            for (int i = 0; i < journalCount && i < dayTrades.size(); i++) {
                Trade trade = dayTrades.get(i);

                TradeJournal journal = TradeJournal.builder()
                        .user(user)
                        .exchange(trade.getExchange())
                        .tradeDate(currentDate)
                        .symbol(trade.getSymbol())
                        .entryReason(entryReasons[(int)(Math.random() * entryReasons.length)])
                        .exitReason(exitReasons[(int)(Math.random() * exitReasons.length)])
                        .emotion(emotions[(int)(Math.random() * emotions.length)])
                        .memo(memos[(int)(Math.random() * memos.length)])
                        // createdAt and updatedAt are automatically set in the builder
                        .build();

                journalRepository.save(journal);
            }

            currentDate = currentDate.plusDays(1);
        }

        log.info("[TestDataGenerator] 유저 {} 일기 데이터 생성 완료 - 총 {}개 일기",
                user.getEmail(), journalRepository.count());
    }

    // [용도] 랜덤 수량 생성
    private double getRandomQty(String symbol) {
        switch (symbol) {
            case "BTC-USDT-SWAP":
                return 0.01 + Math.random() * 0.05;
            case "ETH-USDT-SWAP":
                return 1 + Math.random() * 3;
            case "SOL-USDT":
                return 20 + Math.random() * 50;
            case "DOGE-USDT":
                return 10000 + Math.random() * 20000;
            default:
                return 1;
        }
    }

    // [용도] 랜덤 가격 생성
    private double getRandomPrice(String symbol) {
        switch (symbol) {
            case "BTC-USDT-SWAP":
                return 90000 + Math.random() * 20000;
            case "ETH-USDT-SWAP":
                return 3000 + Math.random() * 2000;
            case "SOL-USDT":
                return 80 + Math.random() * 100;
            case "DOGE-USDT":
                return 0.1 + Math.random() * 0.2;
            default:
                return 100;
        }
    }
}
