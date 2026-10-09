package com.tradediary.journal;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface StrategyTagRepository extends JpaRepository<StrategyTag, Long> {

    @Query("SELECT s FROM StrategyTag s WHERE s.user IS NULL OR s.user.id = :userId ORDER BY s.id ASC")
    List<StrategyTag> findAllByUserIdOrDefault(@Param("userId") Long userId);

    List<StrategyTag> findByUserIsNull();

    boolean existsByIdAndUserId(Long id, Long userId);
}
