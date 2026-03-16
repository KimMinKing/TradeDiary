// [파일 용도] 거래소 API Key 저장 및 조회 Repository

package com.tradediary.exchange;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

// [클래스] exchange_keys 테이블 JPA Repository
public interface ExchangeKeyRepository extends JpaRepository<ExchangeKey, Long> {

    // [용도] 특정 사용자의 특정 거래소 Key 조회 / [호출] ExchangeKeyService, UpbitClient
    Optional<ExchangeKey> findByUserIdAndExchange(Long userId, ExchangeKey.Exchange exchange);

    // [용도] 특정 사용자의 전체 거래소 Key 목록 조회 / [호출] ExchangeKeyService.getMyKeys()
    List<ExchangeKey> findAllByUserId(Long userId);

    // [용도] 특정 사용자의 특정 거래소 Key 존재 여부 / [호출] ExchangeKeyService.saveKey()
    boolean existsByUserIdAndExchange(Long userId, ExchangeKey.Exchange exchange);
}
