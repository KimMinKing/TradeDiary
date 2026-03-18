// [파일 용도] 거래소 API Key 저장/조회/삭제 비즈니스 로직

package com.tradediary.exchange;

import com.tradediary.common.exception.BusinessException;
import com.tradediary.common.exception.ErrorCode;
import com.tradediary.common.util.AesUtil;
import com.tradediary.user.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

// [클래스] 거래소 API Key 암호화 저장 및 관리
@Service
@RequiredArgsConstructor
public class ExchangeKeyService {

    private final ExchangeKeyRepository exchangeKeyRepository;
    private final UserRepository userRepository;
    private final AesUtil aesUtil;

    // [용도] API Key 저장 (이미 있으면 덮어쓰기) / [호출] ExchangeKeyController.saveKey()
    @Transactional
    public void saveKey(Long userId, String exchange, String apiKey, String secretKey, String passphrase) {
        ExchangeKey.Exchange exchangeEnum = ExchangeKey.Exchange.valueOf(exchange.toUpperCase());

        // 기존 Key가 있으면 삭제 후 재등록
        exchangeKeyRepository.findByUserIdAndExchange(userId, exchangeEnum)
                .ifPresent(exchangeKeyRepository::delete);

        var user = userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));

        exchangeKeyRepository.save(ExchangeKey.builder()
                .user(user)
                .exchange(exchangeEnum)
                .apiKey(aesUtil.encrypt(apiKey))
                .secretKey(aesUtil.encrypt(secretKey))
                .passphrase(passphrase != null && !passphrase.isBlank() ? aesUtil.encrypt(passphrase) : null)
                .build());
    }

    // [용도] 사용자의 등록된 거래소 목록 + 마스킹된 API Key 조회 / [호출] ExchangeKeyController.getMyKeys()
    @Transactional(readOnly = true)
    public List<ExchangeKeyInfo> getMyKeys(Long userId) {
        return exchangeKeyRepository.findAllByUserId(userId).stream()
                .map(key -> new ExchangeKeyInfo(
                        key.getExchange().name(),
                        maskApiKey(aesUtil.decrypt(key.getApiKey()))
                ))
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
            @com.fasterxml.jackson.annotation.JsonProperty("maskedApiKey") String maskedApiKey
    ) {}

    // [용도] API Key 삭제 / [호출] ExchangeKeyController.deleteKey()
    @Transactional
    public void deleteKey(Long userId, String exchange) {
        ExchangeKey.Exchange exchangeEnum = ExchangeKey.Exchange.valueOf(exchange.toUpperCase());
        ExchangeKey key = exchangeKeyRepository.findByUserIdAndExchange(userId, exchangeEnum)
                .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND));
        exchangeKeyRepository.delete(key);
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
