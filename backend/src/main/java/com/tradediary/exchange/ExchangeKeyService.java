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
    public void saveKey(Long userId, String exchange, String apiKey, String secretKey) {
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
                .build());
    }

    // [용도] 사용자의 등록된 거래소 목록 조회 / [호출] ExchangeKeyController.getMyKeys()
    @Transactional(readOnly = true)
    public List<String> getMyKeys(Long userId) {
        return exchangeKeyRepository.findAllByUserId(userId).stream()
                .map(key -> key.getExchange().name())
                .toList();
    }

    // [용도] API Key 삭제 / [호출] ExchangeKeyController.deleteKey()
    @Transactional
    public void deleteKey(Long userId, String exchange) {
        ExchangeKey.Exchange exchangeEnum = ExchangeKey.Exchange.valueOf(exchange.toUpperCase());
        ExchangeKey key = exchangeKeyRepository.findByUserIdAndExchange(userId, exchangeEnum)
                .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND));
        exchangeKeyRepository.delete(key);
    }

    // [용도] 복호화된 API Key 반환 (내부 서비스용) / [호출] UpbitClient
    @Transactional(readOnly = true)
    public DecryptedKey getDecryptedKey(Long userId, ExchangeKey.Exchange exchange) {
        ExchangeKey key = exchangeKeyRepository.findByUserIdAndExchange(userId, exchange)
                .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND));
        return new DecryptedKey(
                aesUtil.decrypt(key.getApiKey()),
                aesUtil.decrypt(key.getSecretKey())
        );
    }

    public record DecryptedKey(String apiKey, String secretKey) {}
}
