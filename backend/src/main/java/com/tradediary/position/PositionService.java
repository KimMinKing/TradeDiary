// [파일 용도] 포지션 묶기 알고리즘 및 조회 서비스

package com.tradediary.position;

import com.tradediary.exchange.ExchangeKey;
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
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

// [클래스] 거래 원본 데이터(trades)를 포지션(positions)으로 묶는 핵심 서비스
@Slf4j
@Service
@RequiredArgsConstructor
public class PositionService {

    private static final BigDecimal ZERO_THRESHOLD = new BigDecimal("0.000001");

    private final PositionRepository positionRepository;
    private final TradeRepository tradeRepository;
    private final UserRepository userRepository;

    // [용도] 특정 거래소 포지션 전체 재계산 / [호출] TradeService.syncUpbitTrades(), syncBybitTrades()
    // 기존 포지션 삭제 후 trades 기반으로 전체 재계산
    @Transactional
    public void rebuildPositions(Long userId, ExchangeKey.Exchange exchange) {
        log.info("[Position] 포지션 재계산 시작 - userId={}, exchange={}", userId, exchange);

        // 기존 포지션 초기화
        positionRepository.deleteByUserIdAndExchange(userId, exchange);

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("사용자를 찾을 수 없습니다."));

        // 해당 거래소 거래를 심볼 오름차순 → 시간 오름차순으로 조회
        List<Trade> trades = tradeRepository
                .findByUserIdAndExchangeOrderBySymbolAscTradedAtAsc(userId, exchange);

        if (trades.isEmpty()) {
            log.info("[Position] 거래 없음 - 포지션 재계산 종료");
            return;
        }

        // 심볼별로 그룹핑하여 각각 포지션 묶기 수행
        Map<String, List<Trade>> bySymbol = trades.stream()
                .collect(Collectors.groupingBy(Trade::getSymbol, LinkedHashMap::new, Collectors.toList()));

        int totalPositions = 0;
        for (Map.Entry<String, List<Trade>> entry : bySymbol.entrySet()) {
            int count = groupBySymbol(user, exchange, entry.getValue());
            totalPositions += count;
            log.info("[Position] 심볼={}: {}개 포지션 생성", entry.getKey(), count);
        }

        log.info("[Position] 재계산 완료 - 총 {}개 포지션 생성", totalPositions);
    }

    // [용도] 포지션 목록 조회 / [호출] PositionController.getPositions()
    @Transactional(readOnly = true)
    public List<PositionResponse> getPositions(Long userId, String exchange) {
        List<Position> positions;
        if (exchange != null && !exchange.isBlank()) {
            ExchangeKey.Exchange exchangeEnum = ExchangeKey.Exchange.valueOf(exchange.toUpperCase());
            positions = positionRepository.findByUserIdAndExchangeOrderByClosedAtDesc(userId, exchangeEnum);
        } else {
            positions = positionRepository.findByUserIdOrderByClosedAtDesc(userId);
        }
        return positions.stream().map(PositionResponse::from).toList();
    }

    // [용도] 한 심볼의 거래 목록을 포지션 단위로 묶어 저장 / [호출] rebuildPositions()
    // 핵심 알고리즘: 순수량(Net Position) = 0 이 될 때 포지션 종료
    private int groupBySymbol(User user, ExchangeKey.Exchange exchange, List<Trade> trades) {
        BigDecimal netPosition = BigDecimal.ZERO;
        PositionSide positionSide = null;
        List<Trade> window = new ArrayList<>();
        int savedCount = 0;

        for (Trade trade : trades) {
            // 포지션 시작: 최초 진입 방향으로 side 결정
            if (netPosition.abs().compareTo(ZERO_THRESHOLD) < 0 && window.isEmpty()) {
                positionSide = (trade.getSide() == TradeSide.BUY) ? PositionSide.LONG : PositionSide.SHORT;
            }

            window.add(trade);

            // 순수량 누적 (매수 = +, 매도 = -)
            if (trade.getSide() == TradeSide.BUY) {
                netPosition = netPosition.add(trade.getQty());
            } else {
                netPosition = netPosition.subtract(trade.getQty());
            }

            // 순수량이 0에 수렴 → 포지션 종료
            if (netPosition.abs().compareTo(ZERO_THRESHOLD) < 0) {
                savePosition(user, exchange, positionSide, window);
                savedCount++;
                netPosition = BigDecimal.ZERO;
                positionSide = null;
                window = new ArrayList<>();
            }
        }

        // 미청산 잔여 포지션은 저장하지 않음 (오픈 포지션)
        if (!window.isEmpty()) {
            log.debug("[Position] 미청산 포지션 제외 - 심볼={}, 거래 {}건", trades.get(0).getSymbol(), window.size());
        }

        return savedCount;
    }

    // [용도] 포지션 계산 및 저장 / [호출] groupBySymbol()
    // 진입/청산 거래 분리 → 가중평균가 계산 → PnL 계산
    private void savePosition(User user, ExchangeKey.Exchange exchange,
                               PositionSide side, List<Trade> trades) {
        // LONG이면 진입=BUY, SHORT이면 진입=SELL
        TradeSide entrySide = (side == PositionSide.LONG) ? TradeSide.BUY : TradeSide.SELL;
        TradeSide exitSide  = (side == PositionSide.LONG) ? TradeSide.SELL : TradeSide.BUY;

        List<Trade> entryTrades = trades.stream().filter(t -> t.getSide() == entrySide).toList();
        List<Trade> exitTrades  = trades.stream().filter(t -> t.getSide() == exitSide).toList();

        // 진입 수량 합계
        BigDecimal qty = entryTrades.stream()
                .map(Trade::getQty)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        // 진입 가중평균가 = Σ(price * qty) / Σqty
        BigDecimal entryValue = entryTrades.stream()
                .map(t -> t.getPrice().multiply(t.getQty()))
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal entryPrice = qty.compareTo(BigDecimal.ZERO) > 0
                ? entryValue.divide(qty, 10, RoundingMode.HALF_UP)
                : BigDecimal.ZERO;

        // 청산 가중평균가 = Σ(price * qty) / Σqty
        BigDecimal exitQty = exitTrades.stream()
                .map(Trade::getQty)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal exitValue = exitTrades.stream()
                .map(t -> t.getPrice().multiply(t.getQty()))
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal exitPrice = exitQty.compareTo(BigDecimal.ZERO) > 0
                ? exitValue.divide(exitQty, 10, RoundingMode.HALF_UP)
                : BigDecimal.ZERO;

        // 수수료 합계
        BigDecimal fees = trades.stream()
                .map(Trade::getFee)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        // PnL 계산 (수수료 차감)
        // LONG:  (청산가 - 진입가) * 수량 - 수수료
        // SHORT: (진입가 - 청산가) * 수량 - 수수료
        BigDecimal priceDiff = (side == PositionSide.LONG)
                ? exitPrice.subtract(entryPrice)
                : entryPrice.subtract(exitPrice);
        BigDecimal pnl = priceDiff.multiply(qty).subtract(fees);

        // 손익률 = PnL / (진입가 * 수량) * 100
        BigDecimal cost = entryPrice.multiply(qty);
        BigDecimal pnlRate = cost.compareTo(BigDecimal.ZERO) > 0
                ? pnl.divide(cost, 6, RoundingMode.HALF_UP).multiply(BigDecimal.valueOf(100))
                : BigDecimal.ZERO;

        LocalDateTime openedAt = trades.get(0).getTradedAt();
        LocalDateTime closedAt = trades.get(trades.size() - 1).getTradedAt();

        positionRepository.save(Position.builder()
                .user(user)
                .exchange(exchange)
                .symbol(trades.get(0).getSymbol())
                .side(side)
                .entryPrice(entryPrice)
                .exitPrice(exitPrice)
                .qty(qty)
                .pnl(pnl)
                .pnlRate(pnlRate.setScale(4, RoundingMode.HALF_UP))
                .openedAt(openedAt)
                .closedAt(closedAt)
                .build());
    }

    // 포지션 응답 DTO
    public record PositionResponse(
            Long id,
            String exchange,
            String symbol,
            String side,
            String entryPrice,
            String exitPrice,
            String qty,
            String pnl,
            String pnlRate,
            String openedAt,
            String closedAt
    ) {
        public static PositionResponse from(Position p) {
            return new PositionResponse(
                    p.getId(),
                    p.getExchange().name(),
                    p.getSymbol(),
                    p.getSide().name(),
                    p.getEntryPrice().toPlainString(),
                    p.getExitPrice().toPlainString(),
                    p.getQty().toPlainString(),
                    p.getPnl().toPlainString(),
                    p.getPnlRate().toPlainString(),
                    p.getOpenedAt().toString(),
                    p.getClosedAt().toString()
            );
        }
    }
}
