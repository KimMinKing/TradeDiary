// [파일 용도] 거래소 API Key 저장/조회/삭제 비즈니스 로직

package com.tradediary.exchange;

import com.tradediary.common.exception.BusinessException;
import com.tradediary.common.exception.ErrorCode;
import com.tradediary.common.util.AesUtil;
import com.tradediary.journal.TradeJournalService;
import com.tradediary.position.PositionService;
import com.tradediary.position.PositionRepository;
import com.tradediary.trade.TradeRepository;
import com.tradediary.user.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.jdbc.core.JdbcTemplate;

import java.util.List;

// [클래스] 거래소 API Key 암호화 저장 및 관리
@Slf4j
@Service
@RequiredArgsConstructor
public class ExchangeKeyService {

    private final ExchangeKeyRepository exchangeKeyRepository;
    private final UserRepository userRepository;
    private final AesUtil aesUtil;
    private final PositionService positionService;
    private final TradeRepository tradeRepository;
    private final TradeJournalService journalService;
    private final JdbcTemplate jdbc;

    // [용도] API Key 저장 (이미 있으면 덮어쓰기) / [호출] ExchangeKeyController.saveKey()
    @Transactional
    public void saveKey(Long userId, String exchange, String apiKey, String secretKey, String passphrase) {
        ExchangeKey.Exchange exchangeEnum = ExchangeKey.Exchange.valueOf(exchange.toUpperCase());

        String encryptedApiKey = aesUtil.encrypt(apiKey);
        String encryptedSecretKey = aesUtil.encrypt(secretKey);
        String encryptedPassphrase = passphrase != null && !passphrase.isBlank()
                ? aesUtil.encrypt(passphrase) : null;

        var existing = exchangeKeyRepository.findByUserIdAndExchange(userId, exchangeEnum);
        if (existing.isPresent()) {
            ExchangeKey key = existing.get();
            key.replaceCredentials(encryptedApiKey, encryptedSecretKey, encryptedPassphrase);
            exchangeKeyRepository.save(key);
            jdbc.update("""
                    UPDATE exchange_sync_state SET status='QUEUED',priority=100,locked_until=NULL,
                        failure_count=0,last_error=NULL,next_sync_at=CURRENT_TIMESTAMP,
                        latest_ready=FALSE,history_complete=FALSE,sync_phase='QUICK_SYNC',
                        updated_at=CURRENT_TIMESTAMP WHERE exchange_key_id=?
                    """, key.getId());
            return;
        }

        var user = userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));

        exchangeKeyRepository.save(ExchangeKey.builder()
                .user(user)
                .exchange(exchangeEnum)
                .apiKey(encryptedApiKey)
                .secretKey(encryptedSecretKey)
                .passphrase(encryptedPassphrase)
                .build());
    }

    // [용도] 사용자의 등록된 거래소 목록 + 마스킹된 API Key 조회 / [호출] ExchangeKeyController.getMyKeys()
    @Transactional(readOnly = true)
    public List<ExchangeKeyInfo> getMyKeys(Long userId) {
        return exchangeKeyRepository.findAllByUserId(userId).stream()
                .map(key -> {
                    try {
                        String decryptedApiKey = aesUtil.decrypt(key.getApiKey());
                        aesUtil.decrypt(key.getSecretKey());
                        if (key.getPassphrase() != null) aesUtil.decrypt(key.getPassphrase());
                        return new ExchangeKeyInfo(
                                key.getExchange().name(),
                                maskApiKey(decryptedApiKey),
                                false
                        );
                    } catch (RuntimeException e) {
                        log.warn("[ExchangeKey] credential cannot be decrypted - userId={}, exchange={}",
                                userId, key.getExchange());
                        return new ExchangeKeyInfo(key.getExchange().name(), null, true);
                    }
                })
                .toList();
    }

    // [용도] API Key 앞 6자리만 남기고 마스킹 / [호출] getMyKeys()
    private String maskApiKey(String apiKey) {
        if (apiKey == null || apiKey.length() <= 6) return apiKey;
        return apiKey.substring(0, 6) + "...";
    }

    // maskedApiKey: Jackson SNAKE_CASE 전략 우선순위보다 @JsonProperty가 높아 camelCase 유지
    public record ExchangeKeyInfo(
            String exchange,
            @com.fasterxml.jackson.annotation.JsonProperty("maskedApiKey") String maskedApiKey,
            @com.fasterxml.jackson.annotation.JsonProperty("reconnectRequired") boolean reconnectRequired
    ) {}

    // [용도] API Key 삭제 / [호출] ExchangeKeyController.deleteKey()
    @Transactional
    public void deleteKey(Long userId, String exchange, boolean cleanupMode) {
        ExchangeKey.Exchange exchangeEnum = ExchangeKey.Exchange.valueOf(exchange.toUpperCase());

        // 1. API Key 삭제
        ExchangeKey key = exchangeKeyRepository.findByUserIdAndExchange(userId, exchangeEnum)
                .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND));
        exchangeKeyRepository.delete(key);

        if (cleanupMode) {
            // 정리 모드: 해당 거래소의 모든 데이터 삭제
            log.info("[ExchangeKey] 정리 모드 시작 - userId={}, exchange={}", userId, exchange);

            // 2. 해당 거래소의 모든 거래 내역 삭제
            tradeRepository.deleteAllByUserIdAndExchange(userId, exchangeEnum);

            // 3. 해당 거래소의 모든 포지션 삭제
            positionService.deletePositionsByExchange(userId, exchangeEnum);

            // 4. 해당 거래소의 모든 일기 삭제
            journalService.deleteJournalsByExchange(userId, exchangeEnum);

            log.info("[ExchangeKey] 정리 모드 완료");
        } else {
            // 기본 모드: 포지션만 삭제 (거래 내역은 유지)
            log.info("[ExchangeKey] 기본 모드 - 포지션 삭제만 수행");

            // 2. 해당 거래소의 모든 포지션 삭제
            positionService.deletePositionsByExchange(userId, exchangeEnum);

            // 3. 거래 내역은 유지
            log.info("[ExchangeKey] 거래 내역 유지됨");
        }
    }

    // [용도] 복호화된 API Key 반환 (내부 서비스용) / [호출] UpbitClient, BybitClient, BitgetClient
    @Transactional(readOnly = true)
    public DecryptedKey getDecryptedKey(Long userId, ExchangeKey.Exchange exchange) {
        ExchangeKey key = exchangeKeyRepository.findByUserIdAndExchange(userId, exchange)
                .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND));
        String passphrase = key.getPassphrase() != null ? aesUtil.decrypt(key.getPassphrase()) : null;
        return new DecryptedKey(
                aesUtil.decrypt(key.getApiKey()),
                aesUtil.decrypt(key.getSecretKey()),
                passphrase
        );
    }

    public record DecryptedKey(String apiKey, String secretKey, String passphrase) {}
}
