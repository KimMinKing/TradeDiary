// [파일 용도] 트레이더 유형 AI 코칭 결과 저장 및 조회 Repository

package com.tradediary.trader;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

// [클래스] trader_type_advice 테이블 JPA Repository
public interface TraderTypeAdviceRepository extends JpaRepository<TraderTypeAdvice, Long> {

    // [용도] 사용자별 코칭 결과 조회 (1:1) / [호출] TraderTypeService.getAdvice()
    Optional<TraderTypeAdvice> findByUserId(Long userId);
    void deleteByUserId(Long userId);
}
